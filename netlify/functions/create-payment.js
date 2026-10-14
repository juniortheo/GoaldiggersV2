const {
  dbRequest, newReference, readBody, requireConfig, response, validAmount,
} = require('./_shared');

const MAX_AMOUNT = { RWF: 100000000, USD: 10000 };

async function getOrCreatePlan(amount, currency) {
  const existing = await dbRequest(`payment_plans?amount=eq.${amount}&currency=eq.${currency}&select=flw_plan_id&limit=1`);
  if (existing?.[0]?.flw_plan_id) return existing[0].flw_plan_id;
  const result = await fetch('https://api.flutterwave.com/v3/payment-plans', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount, currency, interval: 'monthly', name: `Goal Diggers monthly ${amount} ${currency}` }),
  });
  const body = await result.json();
  if (!result.ok || body.status !== 'success' || !body.data?.id) throw new Error('Could not create the monthly payment plan');
  await dbRequest('payment_plans', {
    method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ amount, currency, flw_plan_id: body.data.id }),
  });
  return body.data.id;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });
  try {
    requireConfig('FLW_PUBLIC_KEY', 'FLW_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
    const body = readBody(event);
    if (!body) return response(400, { error: 'Invalid request body' });
    const type = body.payment_type;
    const currency = body.currency;
    const donorName = String(body.donor_name || '').trim().slice(0, 120);
    const donorEmail = String(body.donor_email || '').trim().toLowerCase().slice(0, 254);
    if (!['donation', 'ticket', 'order'].includes(type)) return response(400, { error: 'Unsupported payment type' });
    if (!donorName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) return response(400, { error: 'Enter your name and a valid email address' });
    if (!['RWF', 'USD'].includes(currency) || (type !== 'donation' && currency !== 'RWF')) return response(400, { error: 'Unsupported currency for this payment' });
    if (type === 'donation' && body.designation && !['Scholarship Program', 'Insurance Program (Mutuelle)', 'Where most needed'].includes(body.designation)) {
      return response(400, { error: 'Choose a valid donation designation' });
    }

    let amount = Number(body.amount);
    let extra = {};
    if (type === 'ticket') {
      const eventRows = await dbRequest(`events?id=eq.${encodeURIComponent(body.event_id)}&select=id,title,name,event_date,ticket_cutoff,ticket_tiers&limit=1`);
      const selectedEvent = eventRows?.[0];
      const tier = selectedEvent?.ticket_tiers?.find((item) => item.name === body.tier);
      const quantity = Number(body.quantity);
      if (!selectedEvent || !tier || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
          (selectedEvent.ticket_cutoff && new Date(selectedEvent.ticket_cutoff) <= new Date())) {
        return response(400, { error: 'That ticket tier is unavailable' });
      }
      amount = Number(tier.price) * quantity;
      extra = { event_id: selectedEvent.id, event_name: selectedEvent.name || selectedEvent.title, tier: tier.name, quantity };
    } else if (type === 'order') {
      if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20) return response(400, { error: 'Your cart is empty or too large' });
      const requested = new Map();
      body.items.forEach((item) => {
        const id = String(item.id);
        requested.set(id, (requested.get(id) || 0) + Number(item.quantity));
      });
      if ([...requested.values()].some((quantity) => !Number.isInteger(quantity) || quantity < 1 || quantity > 20)) return response(400, { error: 'Invalid product quantity' });
      const ids = [...requested.keys()];
      const products = await dbRequest(`products?id=in.(${ids.map(encodeURIComponent).join(',')})&select=id,name,price_rwf,stock,available`);
      const byId = new Map(products.map((product) => [product.id, product]));
      const items = ids.map((id) => {
        const product = byId.get(id);
        const quantity = requested.get(id);
        if (!product || !product.available || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 ||
            (Number.isInteger(product.stock) && product.stock < quantity)) throw new Error('A product is unavailable or the requested quantity is out of stock');
        return { id: product.id, name: product.name, unit_price: Number(product.price_rwf), quantity };
      });
      amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      extra = { items };
    }
    if (!validAmount(amount, currency) || amount > MAX_AMOUNT[currency]) return response(400, { error: 'Enter an amount greater than zero and within the allowed limit' });
    const txRef = newReference(type === 'donation' ? 'GDD' : type === 'ticket' ? 'GDT' : 'GDS');
    const isAnonymous = type === 'donation' && body.is_anonymous === true;
    const row = {
      donor_name: donorName,
      donor_email: donorEmail,
      donor_phone: String(body.donor_phone || '').trim().slice(0, 40) || null,
      amount, currency, tx_ref: txRef, status: 'pending', ...extra,
    };
    let paymentPlanId = null;
    if (type === 'donation') {
      row.designation = String(body.designation || 'Where most needed');
      row.frequency = body.frequency === 'monthly' ? 'monthly' : 'once';
      row.is_anonymous = isAnonymous;
      row.message = String(body.message || '').trim().slice(0, 2000) || null;
      if (row.frequency === 'monthly') {
        paymentPlanId = await getOrCreatePlan(amount, currency);
        row.flw_plan_id = paymentPlanId;
      }
    }
    const table = type === 'donation' ? 'donations' : type === 'ticket' ? 'tickets' : 'orders';
    if (type === 'ticket') {
      await dbRequest('rpc/reserve_event_ticket', {
        method: 'POST',
        body: JSON.stringify({
          p_event_id: extra.event_id, p_tier: extra.tier, p_quantity: extra.quantity,
          p_amount: amount, p_currency: currency, p_tx_ref: txRef, p_ticket_reference: newReference('TKT'),
          p_buyer_name: donorName, p_buyer_email: donorEmail, p_donor_phone: row.donor_phone,
        }),
      });
    } else if (type === 'order') {
      await dbRequest('rpc/reserve_shop_order', {
        method: 'POST',
        body: JSON.stringify({
          p_items: extra.items, p_amount: amount, p_tx_ref: txRef, p_order_reference: newReference('ORD'),
          p_donor_name: donorName, p_donor_email: donorEmail, p_donor_phone: row.donor_phone,
        }),
      });
    } else {
      await dbRequest(table, { method: 'POST', body: JSON.stringify(row) });
    }
    return response(200, {
      publicKey: process.env.FLW_PUBLIC_KEY, tx_ref: txRef, amount, currency,
      payment_plan: paymentPlanId,
      customer: { name: donorName, email: donorEmail, phone_number: row.donor_phone || undefined },
      payment_type: type,
    });
  } catch (error) {
    console.error('create-payment:', error.message);
    return response(400, { error: error.message || 'Could not start payment. Please try again.' });
  }
};