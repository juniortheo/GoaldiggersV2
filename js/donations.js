(function () {
  const form = document.getElementById('donation-form');
  if (!form) return;
  const amount = document.getElementById('amount-input');
  const currency = document.getElementById('currency-select');
  const frequencyButtons = [...document.querySelectorAll('[data-frequency]')];
  let frequency = 'once';

  function setAmount(value, selectedButton) {
    amount.value = value;
    document.querySelectorAll('.quick-pill').forEach((button) => button.classList.toggle('selected', button === selectedButton));
    updateManualCode();
  }

  function updateManualCode() {
    const code = document.getElementById('momo-code');
    const amountValue = Number(amount.value);
    code.textContent = currency.value === 'RWF' && amountValue > 0
      ? `*182*8*1*92452*${Math.floor(amountValue)}#`
      : '*182*8*1*92452*<amount>#';
  }

  document.querySelectorAll('.quick-pill').forEach((button) => {
    button.addEventListener('click', () => setAmount(currency.value === 'USD' ? (button.dataset.description ? '25' : ({ 10000: '10', 50000: '50', 100000: '100' }[button.dataset.rwf])) : button.dataset.rwf, button));
  });
  frequencyButtons.forEach((button) => button.addEventListener('click', () => {
    frequency = button.dataset.frequency;
    frequencyButtons.forEach((choice) => {
      const active = choice === button;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('donate-note').textContent = frequency === 'monthly'
      ? 'Your monthly donation is charged automatically each month through Flutterwave. Cancel by emailing hello@goaldiggersrw.com.'
      : 'One-time gifts are securely processed by Flutterwave.';
  }));
  currency.addEventListener('change', () => {
      amount.step = currency.value === 'USD' ? '0.01' : '1';
      amount.max = currency.value === 'USD' ? '10000' : '100000000';
    document.querySelectorAll('.quick-pill').forEach((button) => {
      button.textContent = currency.value === 'USD' ? `$${button.dataset.description ? '25' : ({ 10000: '10', 50000: '50', 100000: '100' }[button.dataset.rwf])}` : `${Number(button.dataset.rwf).toLocaleString()} RWF`;
      if (button.dataset.description) button.innerHTML = `<strong>${currency.value === 'USD' ? '$25 USD' : '25,000 RWF'}</strong><span>${button.dataset.description}</span>`;
    });
    amount.value = '';
    document.querySelectorAll('.quick-pill').forEach((button) => button.classList.remove('selected'));
    updateManualCode();
  });
  amount.addEventListener('input', () => {
    document.querySelectorAll('.quick-pill').forEach((button) => button.classList.remove('selected'));
    updateManualCode();
  });
  document.getElementById('copy-momo').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.getElementById('momo-code').textContent); window.showToast('MoMo code copied.'); }
    catch { window.GoalPayments.showError('Could not copy the code. Select it and copy manually.'); }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const amountValue = Number(amount.value);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      window.GoalPayments.showError('Enter an amount greater than zero.');
      return;
    }
    const payload = {
      amount: amountValue,
      currency: currency.value,
      frequency,
      designation: document.getElementById('donation-designation').value,
      donor_name: document.getElementById('donor-name').value.trim(),
      donor_email: document.getElementById('donor-email').value.trim(),
      donor_phone: document.getElementById('donor-phone').value.trim(),
      message: document.getElementById('donor-message').value.trim(),
      is_anonymous: document.getElementById('donation-anonymous').checked,
    };
    window.GoalPayments.startCheckout('donation', payload, document.getElementById('checkout-btn'));
  });

  fetch('/.netlify/functions/public-stats').then((response) => response.json()).then((stats) => {
    if (stats.error) throw new Error(stats.error);
    const usd = Number(stats.total_usd) ? ` · ${Number(stats.total_usd).toLocaleString()} USD` : '';
    document.getElementById('donation-stats').textContent = `${Number(stats.total_rwf).toLocaleString()} RWF${usd} raised · ${Number(stats.donor_count).toLocaleString()} donors`;
  }).catch(() => { document.getElementById('donation-stats').textContent = 'Thank you for helping our community grow.'; });
  const retry = new URLSearchParams(window.location.search);
  if (retry.has('amount')) {
    currency.value = retry.get('currency') === 'USD' ? 'USD' : 'RWF';
    currency.dispatchEvent(new Event('change'));
    amount.value = retry.get('amount');
    updateManualCode();
  }
  updateManualCode();
})();