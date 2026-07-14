# Goal Diggers — Content System Update

You now have a full content management system: books with member-only PDFs, Substack blog posts with auto-preview, events with ticket links, a shop with WhatsApp checkout, and a photo gallery. Everything runs through your admin dashboard.

## What's new

| File | What to do |
|---|---|
| `supabase-setup-v2.sql` | Run once (new tables + storage buckets) |
| `admin.html` | **Replace** your existing admin.html |
| `public-content.js` | New file — the shared script all public pages use |
| `gallery.html` | New page |
| `book.html`, `blog.html`, `events.html`, `shop.html` | Small changes — see "Wiring up public pages" below |
| `index.html` | Optional — add homepage highlights section |

---

## Step 1 — Run the new SQL (2 min)

1. In Supabase → **SQL Editor** → **New query**
2. Open `supabase-setup-v2.sql`, copy everything, paste, click **Run**
3. Look for "Success"

Now check that storage buckets were created: sidebar → **Storage**. You should see two buckets: **public-images** (public) and **book-pdfs** (private). If they're not there, the SQL failed — tell me the error.

## Step 2 — Set your WhatsApp number (30 sec)

Open `public-content.js` in Notepad. At the top, replace the placeholder with the club's WhatsApp number in international format:

```js
const WHATSAPP_NUMBER = '250787430951';   // 250 = Rwanda, then the number without the leading 0
```

## Step 3 — Copy the new files into your project folder

Drop these into the same folder as your other website files:
- `admin.html` (replace the old one)
- `public-content.js` (new)
- `gallery.html` (new)

## Step 4 — Wire up your existing public pages

Each page needs a small change: **replace the hardcoded content section** with a container div, then load the scripts at the bottom. Here's exactly what to change on each page.

### book.html

Find your `<section>` that shows the current book (usually starts with something like `<div class="container grid-2">`). Replace its contents with a single container:

```html
<section>
  <div class="container">
    <div id="current-book">Loading…</div>
  </div>
</section>

<section style="background:var(--color-cream)">
  <div class="container">
    <p class="section-label text-center">Past reads</p>
    <div class="grid-3 mt-40" id="past-books"></div>
  </div>
</section>
```

Then just before `</body>`, ADD these three lines (right after your existing script tags):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth.js"></script>
<script src="public-content.js"></script>
<script>loadCurrentBook('current-book'); loadPastBooks('past-books');</script>
```

### blog.html

Find your `<div class="grid-3">` that contains the three hardcoded blog cards. Replace the three `<article>` cards with just:

```html
<div class="grid-3" id="blog-posts">Loading…</div>
```

Then before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth.js"></script>
<script src="public-content.js"></script>
<script>loadBlogPosts('blog-posts');</script>
```

### events.html

Replace the hardcoded events grid content with:

```html
<div class="grid-3" id="events-list">Loading…</div>
```

Add before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth.js"></script>
<script src="public-content.js"></script>
<script>loadEvents('events-list');</script>
```

### shop.html

Replace the three hardcoded product cards with:

```html
<div class="grid-3" id="products-list">Loading…</div>
```

Add before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth.js"></script>
<script src="public-content.js"></script>
<script>loadProducts('products-list');</script>
```

### index.html (optional — homepage gallery highlights)

Before the footer, add:

```html
<section style="background:var(--color-cream)">
  <div class="container text-center">
    <p class="section-label">The Club, in Pictures</p>
    <h2 class="section-title">Recent <em>moments</em></h2>
    <div class="divider"></div>
    <div class="grid-3 mt-40" id="home-highlights"></div>
    <div class="mt-40"><a href="gallery.html" class="btn btn-green">See the Gallery</a></div>
  </div>
</section>
```

And before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth.js"></script>
<script src="public-content.js"></script>
<script>loadGalleryGrid('home-highlights', { featuredOnly: true, limit: 6 });</script>
```

### Navbars — add the Gallery link

On each page's desktop navbar (`.navbar__links`) and mobile navbar (`.mobile-nav`), add a Gallery link between Blog and Shop:

```html
<a href="gallery.html">Gallery</a>
```

And in the mobile menu:
```html
<a href="gallery.html" onclick="closeMenu()">Gallery</a>
```

(You can do this in VS Code the same way you added Members — one search-and-replace across all files.)

---

## Step 5 — Test it (5 min)

1. Open `admin.html`, sign in as admin
2. Click through the tabs — they should all load empty lists ("No books yet", "No events yet"…)
3. Add a test book: upload a cover image, a small PDF, tick "current"
4. Open `book.html` in a new tab → your book should appear
5. Sign out, refresh `book.html` → you should see the book, but "Read the PDF" changes to "Members sign in to read"
6. Add a test event, product, blog post, gallery photo — check each shows on its page

---

## Using the admin day-to-day

- **New book of the month:** Books tab → fill the form, upload cover + PDF, tick "current". Setting one book as current automatically makes the previous one a "past read" — nothing gets lost.
- **New Substack essay:** Blog tab → paste the URL → click **Fetch Preview**. The service reads Substack's own page and pulls out the image, title, and description. Edit anything you don't like, then Publish.
- **New event:** Events tab → fill it in. If it's a paid event, paste the ticket URL (Eventbrite, Google Form, etc.) — a "Purchase Ticket" button appears automatically. Leave blank for free events.
- **New shop item:** Shop tab → add name, price, photo. Buyers click "Buy on WhatsApp" and it opens WhatsApp with a message pre-filled ("Hi Goal Diggers! I'd like to buy: Reader's Tote…"). You confirm and share payment details there.
- **New photo:** Gallery tab → upload → tick "Feature on homepage" if you want it in the homepage highlights too.

---

## How the security actually works

- **Everything public** (books' cover/description, events, products, photos, blog posts) is readable by anyone — but only admins can write.
- **PDFs are private.** They live in a separate bucket that requires a signed URL. When a logged-in member clicks "Read the PDF", we generate a URL that only works for 1 hour, only for that member. If someone tries to guess a PDF URL directly, they get denied. If a member shares their link, it expires within an hour.
- **Blocked members can't read PDFs either** — the block flag from the Members tab applies here too.

## Common issues

- **Substack preview fails** → the free service (Microlink) has a small daily quota. You can also just fill in the fields by hand — the URL, title, description, and image URL are all editable.
- **"Failed to upload" on cover/photo** → check the file isn't too big (keep images under 5MB; PDFs under 50MB). Supabase's free tier gives you 1GB total storage, which is plenty for a book club.
- **Product prices missing WhatsApp message** → check `WHATSAPP_NUMBER` in `public-content.js` is set correctly, no leading `+` or spaces.
