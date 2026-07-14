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
| `events.html` | Events + volunteer call |
| `blog.html` | Blog (links to Substack) |
| `shop.html` | Shop — coming soon layout |
| `contact.html` | Contact form + details |
| `styles.css` | ALL the design (colors at the top in the COLOR CONTROL PANEL) |
| `script.js` | Menu, animations, birds, donation checkout, contact form |

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

## 7. The Mobile Money checkout (donate page)

When a visitor picks an amount and taps **Proceed to Checkout**:
- **On a phone:** their dialer opens with `*182*1*1*0787430951*AMOUNT#` ready — they just press call to send the MoMo payment.
- **On a computer:** computers can't dial, so the code is displayed with a **Copy Code** button and a note to dial it on their phone.

To change the receiving number: open `script.js` and edit **`MOMO_NUMBER`** (near the top, marked EDIT HERE). To change the suggested amounts: edit the `data-amount` numbers on the pills in `donate.html`.

> Note: "Monthly" here is a promise, not an automatic charge — USSD can't auto-bill. Donors dial the same code each month (the form says so honestly).

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
