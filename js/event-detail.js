(async function () {
  const message = document.getElementById('event-load-message');
  const eventId = new URLSearchParams(window.location.search).get('id');
  if (!eventId) { message.textContent = 'Choose an event from the events page.'; return; }
  const { data: eventData, error } = await db.from('events').select('*').eq('id', eventId).maybeSingle();
  if (error || !eventData || !eventData.ticket_tiers?.length) { message.textContent = 'Tickets for this event are not available.'; return; }
  const { data: sales } = await db.from('public_ticket_sales').select('tier,sold').eq('event_id', eventId);
  const soldByTier = new Map((sales || []).map((sale) => [sale.tier, Number(sale.sold)]));
  const isClosed = eventData.ticket_cutoff && new Date(eventData.ticket_cutoff) <= new Date();
  const heading = eventData.name || eventData.title;
  document.title = `${heading} Tickets — Goal Diggers Book Club`;
  document.querySelector('.event-ticket-form .section-label').textContent = `${heading} tickets`;
  document.getElementById('event-name').textContent = heading;
  document.getElementById('event-description').textContent = eventData.description || '';
  document.getElementById('event-venue').textContent = eventData.venue || '';
  document.getElementById('event-date').textContent = new Date(eventData.event_date).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });
  const image = document.getElementById('event-image');
  image.src = eventData.image_url || 'open book.webp';
  image.alt = `${heading} event`;
  document.getElementById('ticket-cutoff').textContent = eventData.ticket_cutoff ? `Sales close ${new Date(eventData.ticket_cutoff).toLocaleString()}` : '';
  const select = document.getElementById('ticket-tier');
  const tiers = document.getElementById('ticket-tiers');
  eventData.ticket_tiers.forEach((tier) => {
    const sold = soldByTier.get(tier.name) || 0;
    const soldOut = sold >= Number(tier.quantity) || isClosed;
    const summary = document.createElement('div');
    summary.className = 'ticket-tier';
    const name = document.createElement('strong'); name.textContent = tier.name;
    const detail = document.createElement('span'); detail.textContent = `${Number(tier.price).toLocaleString()} RWF · ${Math.max(0, Number(tier.quantity) - sold)} left`;
    summary.append(name, detail);
    if (soldOut) { detail.classList.add('ticket-sold-out'); detail.textContent = isClosed ? 'Sales closed' : 'Sold out'; }
    tiers.appendChild(summary);
    const option = new Option(`${tier.name} · ${Number(tier.price).toLocaleString()} RWF`, tier.name, false, false);
    option.disabled = soldOut;
    select.add(option);
  });
  message.hidden = true;
  document.getElementById('event-detail').hidden = false;
  const checkoutButton = document.getElementById('ticket-checkout');
  checkoutButton.disabled = isClosed || [...select.options].every((option) => option.disabled);
  if (checkoutButton.disabled) checkoutButton.textContent = 'Tickets sold out';
  document.getElementById('ticket-quantity').max = String(Math.min(10, ...eventData.ticket_tiers.map((tier) => Number(tier.quantity))));
  document.getElementById('ticket-form').addEventListener('submit', (submitEvent) => {
    submitEvent.preventDefault();
    window.GoalPayments.startCheckout('ticket', {
      currency: 'RWF', event_id: eventData.id,
      tier: select.value, quantity: Number(document.getElementById('ticket-quantity').value),
      donor_name: document.getElementById('ticket-buyer-name').value.trim(),
      donor_email: document.getElementById('ticket-buyer-email').value.trim(),
      donor_phone: document.getElementById('ticket-buyer-phone').value.trim(),
    }, checkoutButton, 'ticket-payment-message');
  });
})();