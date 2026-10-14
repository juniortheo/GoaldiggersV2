const { flutterwaveVerify, markPaymentFailed, readBody, response, sendTicketEmail, settlePayment } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });
  try {
    const body = readBody(event);
    if (!body?.transaction_id || !body?.tx_ref) return response(400, { error: 'Transaction details are missing' });
    const transaction = await flutterwaveVerify(String(body.transaction_id));
    if (transaction.status === 'failed') {
      await markPaymentFailed(String(body.tx_ref), transaction);
      throw new Error('Flutterwave reports that this transaction failed');
    }
    const payment = await settlePayment(String(body.tx_ref), transaction);
    const emailSent = payment.table === 'tickets' ? await sendTicketEmail(payment.row) : undefined;
    return response(200, {
      status: 'successful', amount: payment.row.amount, currency: payment.row.currency,
      designation: payment.row.designation || payment.row.event_name || 'Shop order',
      payment_type: payment.table === 'donations' ? 'donation' : payment.table === 'tickets' ? 'ticket' : 'order',
      ticket_reference: payment.row.ticket_reference || null,
      email_sent: emailSent,
    });
  } catch (error) {
    console.error('verify-payment:', error.message);
    return response(400, { error: error.message || 'Payment could not be verified. Contact the club before retrying.' });
  }
};