(function () {
  const form = document.getElementById('donation-form');
  if (!form) return;
  const amount = document.getElementById('amount-input');
  const currency = document.getElementById('currency-select');
  const designation = document.getElementById('donation-designation');
  const impact = document.getElementById('donation-impact');
  const impactResult = document.getElementById('impact-result');
  const impactCount = document.getElementById('impact-count');
  const impactUnit = document.getElementById('impact-unit');
  const impactMessage = document.getElementById('impact-message');
  const impactProgress = document.querySelector('.impact-progress');
  const impactProgressFill = document.getElementById('impact-progress-fill');
  const manualPaymentToggle = document.getElementById('manual-payment-toggle');
  const manualPaymentPanel = document.getElementById('manual-payment');
  const frequencyButtons = [...document.querySelectorAll('[data-frequency]')];
  let frequency = 'once';
  let manualPaymentCollapseTimeout;

  function updateManualCode() {
    const code = document.getElementById('momo-code');
    const amountValue = Number(amount.value);
    code.textContent = currency.value === 'RWF' && amountValue > 0
      ? `*182*8*1*92452*${Math.floor(amountValue)}#`
      : '*182*8*1*92452*<amount>#';
  }

  function updateImpact() {
    const amountValue = Number(amount.value);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      impact.hidden = true;
      return;
    }

    impact.hidden = false;
    const supportUnit = currency.value === 'RWF' ? 25000 : 25;
    const units = Math.floor(amountValue / supportUnit);
    const remainder = amountValue % supportUnit;
    const progress = units > 0 && remainder === 0 ? 100 : Math.round((remainder / supportUnit) * 100);
    const numberFormat = new Intl.NumberFormat(currency.value === 'RWF' ? 'en-RW' : 'en-US');
    impactProgress.setAttribute('aria-valuenow', String(progress));
    impactProgressFill.style.width = `${progress}%`;
    impactResult.hidden = units === 0;

    if (units > 0) {
      if (impactCount.textContent !== String(units)) {
        impactCount.textContent = String(units);
        impactCount.classList.remove('impact-count-pop');
        void impactCount.offsetWidth;
        impactCount.classList.add('impact-count-pop');
      }
      if (designation.value === 'Scholarship Program') {
        impactUnit.textContent = `${units === 1 ? 'child' : 'children'} supported for one month`;
      } else if (designation.value === 'Insurance Program (Mutuelle)') {
        impactUnit.textContent = `${units === 1 ? 'watchman family' : 'watchman families'} insured for one year`;
      } else {
        impactUnit.textContent = `${units === 1 ? 'support unit' : 'support units'}`;
      }
    }

    const nextUnitAmount = numberFormat.format(supportUnit - remainder);
    if (designation.value === 'Scholarship Program') {
      impactMessage.textContent = units === 0
        ? `Your gift is ${progress}% of the way toward one child's school fees for a month.`
        : remainder > 0
          ? `An additional ${currency.value} ${nextUnitAmount} could support one more child for a month.`
          : 'Each support unit could cover one child\'s school fees for a month.';
    } else if (designation.value === 'Insurance Program (Mutuelle)') {
      impactMessage.textContent = units === 0
        ? `Your gift is ${progress}% of the way toward one watchman family's insurance for a year.`
        : remainder > 0
          ? `An additional ${currency.value} ${nextUnitAmount} could insure one more watchman family for a year.`
          : 'Each support unit could cover one watchman family\'s insurance for a year.';
    } else {
      impactMessage.textContent = units === 0
        ? `Your gift is ${progress}% of the way toward a support unit.`
        : 'Each unit is equivalent to one child-month of school support or one watchman family insured for a year; allocation follows current needs.';
    }
  }

  manualPaymentToggle.addEventListener('click', () => {
    const expanded = manualPaymentToggle.getAttribute('aria-expanded') === 'true';
    window.clearTimeout(manualPaymentCollapseTimeout);
    manualPaymentToggle.setAttribute('aria-expanded', String(!expanded));
    manualPaymentPanel.setAttribute('aria-hidden', String(expanded));
    manualPaymentPanel.inert = expanded;
    if (expanded) {
      manualPaymentPanel.classList.add('is-collapsing');
      manualPaymentCollapseTimeout = window.setTimeout(() => {
        if (manualPaymentToggle.getAttribute('aria-expanded') === 'false') {
          manualPaymentPanel.hidden = true;
          manualPaymentPanel.classList.remove('is-collapsing');
        }
      }, 260);
      return;
    }
    manualPaymentPanel.hidden = false;
    manualPaymentPanel.classList.add('is-collapsing');
    requestAnimationFrame(() => manualPaymentPanel.classList.remove('is-collapsing'));
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
    updateManualCode();
    updateImpact();
  });
  amount.addEventListener('input', () => {
    updateManualCode();
    updateImpact();
  });
  designation.addEventListener('change', updateImpact);
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
  }).catch(() => { document.getElementById('donation-stats').textContent = 'Community giving totals are temporarily unavailable.'; });
  const retry = new URLSearchParams(window.location.search);
  if (retry.has('amount')) {
    currency.value = retry.get('currency') === 'USD' ? 'USD' : 'RWF';
    currency.dispatchEvent(new Event('change'));
    amount.value = retry.get('amount');
    updateManualCode();
    updateImpact();
  }
  const swiftCode = document.getElementById('bank-swift').textContent.trim();
  document.getElementById('bank-swift-line').hidden = !swiftCode;
  updateManualCode();
})();