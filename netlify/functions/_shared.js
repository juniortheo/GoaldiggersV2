const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function readBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return null; }
}

function requireConfig(...keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing server configuration: ${missing.join(', ')}`);
}

async function dbRequest(path, options = {}) {
  requireConfig('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  const result = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await result.text();
  const data = text ? JSON.parse(text) : null;
  if (!result.ok) throw new Error(data?.message || data?.hint || 'Database request failed');
  return data;
}

async function flutterwaveVerify(transactionId) {
  requireConfig('FLW_SECRET_KEY');
  const result = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
  });
  const body = await result.json();
  if (!result.ok || body.status !== 'success' || !body.data) throw new Error('Flutterwave could not verify this transaction');
  return body.data;
}

function newReference(prefix = 'GD') {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function validAmount(amount, currency) {
  const max = currency === 'USD' ? 10000 : 100000000;
  return Number.isFinite(amount) && amount > 0 && amount <= max &&
    (currency === 'RWF' ? Number.isInteger(amount) : Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8);
}

async function findPayment(txRef) {
  for (const table of ['donations', 'tickets', 'orders']) {
    const rows = await dbRequest(`${table}?tx_ref=eq.${encodeURIComponent(txRef)}&select=*&limit=1`);
    if (rows?.[0]) return { table, row: rows[0] };
  }
  return null;
}

async function recordRecurringDonation(subscriptionId, transaction) {
  requireConfig('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  if (transaction.status !== 'successful' || !transaction.tx_ref || !transaction.id) {
    throw new Error('Flutterwave did not return a successful recurring charge');
  }
  await dbRequest('rpc/record_recurring_donation', {
    method: 'POST',
    body: JSON.stringify({
      p_subscription_id: String(subscriptionId),
      p_tx_ref: String(transaction.tx_ref),
      p_transaction_id: String(transaction.id),
      p_amount: Number(transaction.amount),
      p_currency: transaction.currency,
      p_payment_method: transaction.payment_type || null,
    }),
  });
}

async function settlePayment(txRef, transaction) {
  const pending = await findPayment(txRef);
  if (!pending) throw new Error('No pending payment matches this reference');
  const { table, row } = pending;
  const amount = Number(transaction.amount);
    if (transaction.status !== 'successful' || transaction.tx_ref !== txRef ||
      Math.abs(amount - Number(row.amount)) > 0.01 || transaction.currency !== row.currency) {
    throw new Error('Payment status, amount, or currency did not match the pending transaction');
  }
  if (row.status === 'successful') return { table, row };

  await dbRequest('rpc/complete_payment', {
    method: 'POST',
    body: JSON.stringify({
      p_tx_ref: txRef,
      p_transaction_id: String(transaction.id),
      p_payment_method: transaction.payment_type || null,
      p_subscription_id: transaction.subscription_id ? String(transaction.subscription_id) : null,
    }),
  });
  const updated = await dbRequest(`${table}?tx_ref=eq.${encodeURIComponent(txRef)}&select=*&limit=1`);
  return { table, row: updated?.[0] || row };
}

async function markPaymentFailed(txRef, transaction) {
  const payment = await findPayment(txRef);
  if (!payment || transaction.tx_ref !== txRef || transaction.status !== 'failed' ||
      Math.abs(Number(transaction.amount) - Number(payment.row.amount)) > 0.01 || transaction.currency !== payment.row.currency) return;
  await dbRequest(`${payment.table}?tx_ref=eq.${encodeURIComponent(txRef)}&status=eq.pending`, {
    method: 'PATCH', body: JSON.stringify({ status: 'failed' }),
  });
}

async function sendTicketEmail(ticket) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !ticket?.buyer_email || !ticket.ticket_reference) return false;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(ticket.ticket_reference)}`;
  const safe = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        'Idempotency-Key': ticket.ticket_reference,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [ticket.buyer_email],
        subject: `Your ${ticket.event_name} ticket`,
        html: `<h1>You're on the list</h1><p>${safe(ticket.quantity)} x ${safe(ticket.tier)} for ${safe(ticket.event_name)}</p><p>Show this QR code at the door:</p><img src="${qrUrl}" width="260" height="260" alt="Ticket QR code"/><p>Ticket reference: <strong>${safe(ticket.ticket_reference)}</strong></p>`,
      }),
    });
    if (!result.ok) throw new Error('Resend rejected the ticket email');
    await dbRequest(`tickets?tx_ref=eq.${encodeURIComponent(ticket.tx_ref)}&status=eq.successful`, {
      method: 'PATCH', body: JSON.stringify({ email_sent_at: new Date().toISOString() }),
    });
    return true;
  } catch (error) {
    console.error('ticket email:', error.message);
    return false;
  }
}

module.exports = { dbRequest, findPayment, flutterwaveVerify, markPaymentFailed, newReference, readBody, recordRecurringDonation, requireConfig, response, sendTicketEmail, settlePayment, validAmount };