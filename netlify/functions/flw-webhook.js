const crypto = require('node:crypto');
const { findPayment, flutterwaveVerify, markPaymentFailed, recordRecurringDonation, response, sendTicketEmail, settlePayment } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });
  const supplied = event.headers['verif-hash'] || event.headers['Verif-Hash'];
  const expected = process.env.FLW_WEBHOOK_HASH || '';
    const suppliedBytes = Buffer.from(supplied || '');
    const expectedBytes = Buffer.from(expected);
    if (!supplied || !expected || suppliedBytes.length !== expectedBytes.length ||
      !crypto.timingSafeEqual(suppliedBytes, expectedBytes)) {
    return response(401, { error: 'Invalid webhook signature' });
  }
  try {
    const payload = JSON.parse(event.body || '{}');
    const transactionId = payload.data?.id || payload.id;
    const txRef = payload.data?.tx_ref || payload.tx_ref;
    if (payload.event === 'charge.completed' && transactionId && txRef) {
      const transaction = await flutterwaveVerify(String(transactionId));
      if (transaction.status === 'successful') {
        const existing = await findPayment(String(txRef));
        if (existing) {
          const payment = await settlePayment(String(txRef), transaction);
          if (payment.table === 'tickets' && !await sendTicketEmail(payment.row)) throw new Error('Ticket email could not be delivered');
        } else if (transaction.subscription_id) {
          await recordRecurringDonation(String(transaction.subscription_id), transaction);
        } else {
          throw new Error('No pending payment matches this reference');
        }
      } else {
        await markPaymentFailed(String(txRef), transaction);
      }
    }
    if (payload.event === 'subscription.cancelled' && payload.data?.id) {
      const { dbRequest } = require('./_shared');
      await dbRequest(`subscriptions?flw_subscription_id=eq.${encodeURIComponent(payload.data.id)}`, {
        method: 'PATCH', body: JSON.stringify({ status: 'cancelled', cancelled_at: new Date().toISOString() }),
      });
    }
    if (['subscription.created', 'subscription.activated'].includes(payload.event) && payload.data?.id && payload.data?.plan_id) {
      const { dbRequest } = require('./_shared');
      const email = payload.data.customer?.email || payload.data.customer_email;
      if (email) await dbRequest('rpc/attach_flutterwave_subscription', {
        method: 'POST', body: JSON.stringify({
          p_plan_id: payload.data.plan_id, p_email: email, p_subscription_id: String(payload.data.id),
        }),
      });
    }
    return response(200, { received: true });
  } catch (error) {
    console.error('flw-webhook:', error.message);
    return response(500, { error: 'Webhook processing failed' });
  }
};