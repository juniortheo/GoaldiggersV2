# Goal Diggers Book Club — Website Guide

Everything you need to run this site, in plain language.

---

## 1. What's in the folder

| File | What it is |
|---|---|
| `index.html` | Home — slim landing page (photo background, floating logo, glowing lines, birds) |
| `about.html` | About Us |
| `book.html` | Book of the Month (with download button) |
| `donate.html` | Donate — the 5 children + Mobile Money checkout |
| `thank-you.html` / `payment-failed.html` | Verified payment result and retry states |
| `event.html` | Per-event ticket tiers and checkout |
| `events.html` | Events + volunteer call |
| `blog.html` | Blog (links to Substack) |
| `shop.html` | Shop — coming soon layout |
| `contact.html` | Contact form + details |
| `styles.css` | ALL the design (colors at the top in the COLOR CONTROL PANEL) |
| `script.js` | Menu, animations, birds, contact form |
| `js/payments.js` | Shared Flutterwave checkout for donations, tickets, and shop orders |
| `netlify/functions/` | Server-side payment creation, verification, webhook, and admin endpoints |
| `supabase-payments.sql` | Payment, subscription, ticket, product-stock, and order schema/RPCs |

**Keep every file in the SAME folder** — the pages share `styles.css` and `script.js`.

## 2. Previewing

Double-click `index.html`. You need internet for the photos, fonts, and the bird animation library (GSAP) to load — fine, since the real site lives online.

## 3. Editing anything

Open a file in TextEdit or VS Code, press **Cmd+F**, search **EDIT HERE**. Every placeholder has one of these comments with instructions: hero headline, book title, children's names, event dates, products, email. Save, refresh the browser.

## 4. Your logo (the floating one)

Save your logo as exactly **`logo.png`** in the folder. It appears automatically in the navbar of every page AND floats gently in the home hero. Nothing to edit.

## 5. The home background photo + green overlay

The photo sits behind a green color overlay (as requested). Both live in `styles.css` — search **"EDIT HERE — HOME BACKGROUND PHOTO"**:
- To use your own photo: save it as `hero.jpg` in the folder and change the `url(...)` line to `url("hero.jpg")`.
- To make the overlay lighter/darker: change the `.93`, `.82`, `.88` numbers in the gradient just below (lower = more photo shows through).

## 6. Glowing lines & birds

- **Glowing lines** are `<span class="glow-line" ...>` elements. Copy/paste one to add more; change `top`/`left`/`width` to move it; `animation-delay` staggers them.
- **Birds** fly forward as visitors scroll (powered by GSAP). They're `<div class="bird">` elements — copy one to add more. Add class `small` for a distant bird.

## 7. Payments and Netlify setup

Deploy the repository through Netlify with the repository root as the publish directory. Add these values in **Netlify → Site configuration → Environment variables**; do not add real keys to this repository or any frontend file:

| Variable | Purpose |
|---|---|
| `FLW_PUBLIC_KEY` | Flutterwave inline checkout public key |
| `FLW_SECRET_KEY` | Netlify-only transaction verification and payment-plan creation |
| `FLW_WEBHOOK_HASH` | Secret value configured in Flutterwave webhook settings |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public Supabase key used to validate admin sessions |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify-only database access; never expose this key |
| `RESEND_API_KEY` | Optional until ticket email delivery is enabled |
| `RESEND_FROM_EMAIL` | Verified sender address used for ticket delivery |

Run `supabase-setup.sql`, `supabase-setup-v2.sql`, then `supabase-payments.sql` in the Supabase SQL Editor. The last migration gives public visitors only an aggregate donation view; donor, order, and attendee details are service-role-only. After adding the Netlify variables, redeploy the site so the Functions use them.

In Flutterwave, configure the webhook URL as `https://goaldiggers.rw/.netlify/functions/flw-webhook`, set its secret hash to the same `FLW_WEBHOOK_HASH`, and enable charge-completed plus subscription-created/activated/cancelled events. Ticket email delivery requires a Resend account with the sender domain verified and `RESEND_API_KEY`/`RESEND_FROM_EMAIL` configured. The QR contains the ticket's unique reference.

To test, use Flutterwave **test** public and secret keys together (`FLWPUBK_TEST-…` and `FLWSECK_TEST-…`) and test-mode webhook configuration. For production, replace both with the matching **live** keys (`FLWPUBK-…` and `FLWSECK-…`), update the live webhook secret hash, and redeploy. Never mix a test public key with a live secret key or vice versa. The frontend receives only the public key from a Netlify Function; the secret remains server-side.

Monthly gifts use Flutterwave payment plans and are charged automatically. Donors can request cancellation by emailing `hello@goaldiggers.rw`; the club must cancel the plan in Flutterwave, after which the cancellation webhook updates the admin status. To sell tickets, add the event's date, venue, description, image, tiers, capacities, and sales cutoff in **Admin → Events**. To sell products, set their RWF price and stock in **Admin → Shop**. Replace the visible bank-account placeholders in `donate.html` before launch.

The Flutterwave inline flow supports card, bank transfer, Rwanda mobile money (MTN/Airtel), USSD, and account payments. MTN MoMo Pay remains visible as a manual RWF alternative.

## 8. The five children (privacy)

Cards show **initials only by default** — the safe choice for minors. Edit names/grades/stories in `donate.html` (marked EDIT HERE). To add a photo **only with written guardian consent**: save it as `kid1-photo.jpg` (etc.), then in that child's card delete the `.kid-initial` div and remove the `<!--` and `-->` around the `<img>` line.

## 9. Book of the Month download

In `book.html`: put the PDF in the folder, change `href="#"` to `href="your-file.pdf"`. ⚠ Only share books you legally may distribute.

## 10. Contact form & email

The form opens the visitor's email app. Change the club email in **two places**: `CLUB_EMAIL` at the bottom of `script.js`, and the visible address in `contact.html`.

## 11. Hosting for free

**Netlify (easiest):** netlify.com → Add new site → Deploy manually → drag the whole folder in. Done.

**GitHub Pages:** create a public repo → Add file → Upload files → drag ALL files in (including `logo.png`) → commit → Settings → Pages → Branch: main, / (root) → Save. Live at `https://USERNAME.github.io/REPO/` in about a minute. To update, upload the changed files again.

## 12. Troubleshooting

- **Birds not moving?** GSAP loads from the internet — check your connection. Everything else still works without it.
- **Design broken?** `styles.css` must be in the same folder.
- **Checkout does nothing on your laptop?** That's expected — the dial code appears below the button instead. Test on a phone.
- **Edited but nothing changed?** Save (Cmd+S), then hard-refresh (Cmd+Shift+R).
