/* ============================================================
   GOAL DIGGERS BOOK CLUB — SHARED JAVASCRIPT
   Powers: mobile menu, scroll reveals, scroll-flying birds
   (GSAP), the donation checkout (MTN MoMo USSD dial), the
   contact form, and toasts. Edit points are marked EDIT HERE.
   ============================================================ */

/* ---------- Mobile menu ---------- */
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.navbar__links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.textContent = navLinks.classList.contains('open') ? 'CLOSE' : 'MENU';
  });
}

/* ---------- Reveal on scroll (works even if GSAP fails to load) ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- Logo fallback: hide broken image until logo.jpeg exists ---------- */
document.querySelectorAll('img[src="logo.jpeg"]').forEach((img) => {
  img.addEventListener('error', () => { img.style.display = 'none'; });
});

/* ---------- Birds that glide across as you scroll (GSAP) ----------
   Birds are <div class="bird"> elements placed in the page.
   Each gets a different speed so the flock feels alive.           */
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('.bird').forEach((bird, i) => {
    const drift = 1 + (i % 3) * 0.6;           // different speeds
    const rise  = 40 + (i % 4) * 30;           // different climb heights
    gsap.to(bird, {
      x: () => window.innerWidth * 0.7 * drift,
      y: -rise,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'max',
        scrub: 1.2 + i * 0.3,
      },
    });
  });

  /* Gentle parallax on framed photos */
  document.querySelectorAll('.photo-frame img').forEach((img) => {
    gsap.fromTo(img, { y: -18 }, {
      y: 18, ease: 'none',
      scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ---------- Toast ---------- */
function showToast(msg, ms = 4000) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ============================================================
   DONATION FORM (donate.html)
   ============================================================ */

/* ============================================================
   EDIT HERE — MOBILE MONEY NUMBER
   This is the MTN MoMo number donations are sent to.
   The checkout builds the dial code:
   *182*1*1*<NUMBER>*<AMOUNT>#
   ============================================================ */
const MOMO_NUMBER = '0787430951';

let currentFreq = 'monthly';
function setFreq(freq) {
  currentFreq = freq;
  const m = document.getElementById('freq-monthly');
  const o = document.getElementById('freq-once');
  if (!m || !o) return;
  m.classList.toggle('active', freq === 'monthly');
  o.classList.toggle('active', freq === 'once');
  const note = document.getElementById('donate-note');
  if (note) note.innerHTML = freq === 'monthly'
    ? "You're setting up a <strong>monthly</strong> gift. Dial the same code each month — we'll remind you."
    : "You're making a <strong>one-time</strong> gift. Thank you so much!";
  updateCheckoutLabel();
}

function selectPill(btn) {
  document.querySelectorAll('.quick-pill').forEach((p) => p.classList.remove('selected'));
  btn.classList.add('selected');
  const input = document.getElementById('amount-input');
  if (input) input.value = btn.dataset.amount;
  updateCheckoutLabel();
}
function clearPillSelection() {
  document.querySelectorAll('.quick-pill').forEach((p) => p.classList.remove('selected'));
}

function updateCheckoutLabel() {
  const amountEl = document.getElementById('amount-input');
  const label = document.getElementById('checkout-label');
  if (!amountEl || !label) return;
  const amount = parseFloat(amountEl.value);
  label.textContent = amount > 0
    ? `Proceed to Checkout — ${amount.toLocaleString()} RWF${currentFreq === 'monthly' ? '/mo' : ''}`
    : 'Proceed to Checkout';
}

/* ------------------------------------------------------------
   CHECKOUT — dials MTN Mobile Money directly:
   *182*1*1*0787430951*AMOUNT#
   On a phone this opens the dialer with the code ready.
   On a computer (which can't dial) the code is shown with a
   Copy button instead, so nobody hits a dead end.
   ------------------------------------------------------------ */
function handleCheckout() {
  const amountEl = document.getElementById('amount-input');
  const amount = amountEl ? parseInt(amountEl.value, 10) : 0;
  if (!amount || amount <= 0) {
    showToast('Please choose or enter a donation amount first.');
    return;
  }

  const ussd = `*182*1*1*${MOMO_NUMBER}*${amount}#`;

  // Show the code on the page (works everywhere)
  const box = document.getElementById('ussd-box');
  if (box) {
    box.style.display = 'block';
    document.getElementById('ussd-code').textContent = ussd;
  }

  // On phones: open the dialer with the code pre-filled ("#" must be encoded as %23)
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = 'tel:' + encodeURIComponent(ussd);
  } else {
    showToast('On a computer we can\u2019t open the dialer \u2014 the MoMo code is shown below. Dial it on your phone.');
  }
}

function copyUssd() {
  const code = document.getElementById('ussd-code');
  if (!code) return;
  navigator.clipboard.writeText(code.textContent).then(
    () => showToast('MoMo code copied \u2014 dial it on your phone \uD83D\uDC9A'),
    () => showToast('Could not copy automatically \u2014 long-press the code to copy it.')
  );
}

/* ============================================================
   CONTACT FORM (contact.html) — opens visitor's email app
   EDIT HERE: change the email address below to the club's.
   ============================================================ */
const CLUB_EMAIL = 'hello@goaldiggersrw.com';

function handleContactForm(event) {
  event.preventDefault();
  const name = document.getElementById('contact-name').value;
  const subject = document.getElementById('contact-subject').value;
  const body = document.getElementById('contact-message').value;
  window.location.href = `mailto:${CLUB_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n— ' + name)}`;
  showToast(`Thank you, ${name}! Your email app is opening\u2026`);
}