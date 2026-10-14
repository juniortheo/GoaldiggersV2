(function () {
  const options = 'card, banktransfer, mobilemoneyrwanda, ussd, account';

  function showError(message, targetId) {
    const target = document.getElementById(targetId || 'payment-message');
    if (target) {
      target.textContent = message;
      target.hidden = false;
      target.setAttribute('role', 'alert');
    } else if (window.showToast) {
      window.showToast(message);
    } else {
      window.alert(message);
    }
  }

  async function startCheckout(paymentType, payload, button, messageId) {
    if (button) { button.disabled = true; button.dataset.label = button.textContent; button.textContent = 'Opening secure checkout…'; }
    try {
      if (typeof window.FlutterwaveCheckout !== 'function') throw new Error('Secure checkout did not load. Check your connection and try again.');
      const response = await fetch('/.netlify/functions/create-payment', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, payment_type: paymentType }),
      });
      const checkout = await response.json();
      if (!response.ok) throw new Error(checkout.error || 'Could not start checkout. Please try again.');
      window.FlutterwaveCheckout({
        public_key: checkout.publicKey,
        tx_ref: checkout.tx_ref,
        amount: checkout.amount,
        currency: checkout.currency,
        payment_options: options,
        payment_plan: checkout.payment_plan || undefined,
        meta: [{ metaname: 'payment_type', metavalue: paymentType }],
        customer: checkout.customer,
        customizations: { title: 'Goal Diggers Book Club', description: paymentType === 'donation' ? 'Support our community programmes' : paymentType === 'ticket' ? 'Event ticket' : 'Shop order', logo: `${window.location.origin}/logo gold.png` },
        callback: async (result) => {
          try {
            const verificationResponse = await fetch('/.netlify/functions/verify-payment', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ transaction_id: result.transaction_id, tx_ref: checkout.tx_ref }),
            });
            const verified = await verificationResponse.json();
            if (!verificationResponse.ok || verified.status !== 'successful') throw new Error(verified.error || 'Payment could not be confirmed.');
            sessionStorage.setItem('gd-payment-result', JSON.stringify({ ...verified, tx_ref: checkout.tx_ref, frequency: payload.frequency }));
            window.location.assign('thank-you.html');
          } catch (error) {
            const retryUrl = paymentType === 'ticket' ? `event.html?id=${encodeURIComponent(payload.event_id)}` : paymentType === 'order' ? 'shop.html' : `donate.html?amount=${encodeURIComponent(checkout.amount)}&currency=${encodeURIComponent(checkout.currency)}`;
            sessionStorage.setItem('gd-payment-error', JSON.stringify({ message: error.message, tx_ref: checkout.tx_ref, amount: checkout.amount, currency: checkout.currency, payment_type: paymentType, retry_url: retryUrl }));
            window.location.assign('payment-failed.html');
          }
        },
        onclose: () => { if (button) { button.disabled = false; button.textContent = button.dataset.label || 'Donate'; } },
      });
    } catch (error) {
      showError(error.message || 'Something went wrong. Please try again.', messageId);
      if (button) { button.disabled = false; button.textContent = button.dataset.label || 'Donate'; }
    }
  }

  window.GoalPayments = { startCheckout, showError };
})();