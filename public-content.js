/* ============================================================
   GOAL DIGGERS — PUBLIC CONTENT LOADER
   Loads books, blog posts, events, products, and gallery photos
   from the database and inserts them into each page.

   ================================================
   EDIT HERE — the club's WhatsApp number for shop buttons.
   International format, no + or spaces.
   Rwanda country code is 250. So 0787430951 becomes 250787430951.
   ================================================ */
const WHATSAPP_NUMBER = '250787430951';

/* Every page uses the same Supabase connection from auth.js — no keys here. */

/* ---------- BOOK PAGE ---------- */
async function loadCurrentBook(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const { data: book } = await db.from('books').select('*').eq('is_current', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!book) { wrap.innerHTML = '<p style="text-align:center;color:var(--color-muted)">No book selected yet — check back soon.</p>'; return; }

  const { data: { session } } = await db.auth.getSession();
  const isMember = !!session;
  let readBtn = '';
  if (isMember && book.pdf_path) {
    readBtn = `<button class="btn btn-green mt-16" onclick="openBookPdf('${book.pdf_path}')">Read the PDF</button>`;
  } else if (!isMember && book.pdf_path) {
    readBtn = `<a href="login.html" class="btn btn-outline-green mt-16">Members sign in to read</a>`;
  }

  wrap.innerHTML = `
    <div class="grid-2" style="align-items:center;gap:40px">
      <div class="photo-frame"><img src="${book.cover_url || ''}" alt="" onerror="this.style.opacity=.2" /></div>
      <div>
        <p class="section-label">${book.reading_month || 'Book of the Month'}</p>
        <h2 class="section-title" style="font-size:clamp(2rem,4vw,3rem)"></h2>
        <div class="divider"></div>
        <p style="font-family:'Jost',sans-serif;letter-spacing:.06em;color:var(--color-muted);margin-bottom:14px">by <span id="__author"></span></p>
        <p class="section-body" style="white-space:pre-line" id="__desc"></p>
        ${readBtn}
      </div>
    </div>`;
  wrap.querySelector('h2').textContent = book.title;
  wrap.querySelector('#__author').textContent = book.author;
  wrap.querySelector('#__desc').textContent = book.description || '';
}
async function openBookPdf(path) {
  const { data, error } = await db.storage.from('book-pdfs').createSignedUrl(path, 3600);
  if (error || !data) { alert('Could not open the PDF. Sign in again and retry.'); return; }
  window.open(data.signedUrl, '_blank');
}
async function loadPastBooks(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const { data: books } = await db.from('books').select('*').eq('is_current', false).order('created_at', { ascending: false }).limit(6);
  if (!books || !books.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = books.map(b => `
    <div class="card">
      <div class="card-photo"><img src="${b.cover_url || ''}" onerror="this.style.opacity=.2" /></div>
      <span class="tag">${b.reading_month || 'Past read'}</span>
      <h3></h3>
      <p style="font-size:.9rem;color:var(--color-muted)">by <span></span></p>
    </div>`).join('');
  wrap.querySelectorAll('.card').forEach((c, i) => {
    c.querySelector('h3').textContent = books[i].title;
    c.querySelector('span:not(.tag)').textContent = books[i].author;
  });
}

/* ---------- BLOG PAGE ---------- */
async function loadBlogPosts(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const { data: posts } = await db.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (!posts || !posts.length) { wrap.innerHTML = '<p style="text-align:center;color:var(--color-muted);grid-column:1/-1">No essays yet — visit our Substack directly.</p>'; return; }
  wrap.innerHTML = posts.map(p => `
    <article class="card">
      <div class="card-photo"><img src="${p.image_url || ''}" alt="" onerror="this.style.opacity=.2" /></div>
      <span class="tag">Substack</span>
      <h3></h3>
      <p></p>
      <p class="mt-16"><a href="${p.url}" target="_blank" rel="noopener" style="color:var(--color-gold);font-weight:500">Read more →</a></p>
    </article>`).join('');
  wrap.querySelectorAll('article').forEach((el, i) => {
    el.querySelector('h3').textContent = posts[i].title;
    el.querySelector('p:not(.mt-16)').textContent = posts[i].description || '';
  });
}

/* ---------- EVENTS PAGE ---------- */
async function loadEvents(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const nowIso = new Date().toISOString();
  const { data: events } = await db.from('events').select('*').gte('event_date', nowIso).order('event_date', { ascending: true });
  if (!events || !events.length) { wrap.innerHTML = '<p style="text-align:center;color:var(--color-muted);grid-column:1/-1">No events scheduled — follow us for the next announcement.</p>'; return; }
  wrap.innerHTML = events.map(ev => {
    const d = new Date(ev.event_date);
    const dateStr = d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
    const timeStr = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    const ticket = ev.ticket_url
      ? `<a href="${ev.ticket_url}" target="_blank" rel="noopener" class="btn btn-green mt-16">Purchase Ticket</a>`
      : `<span class="tag mt-16">Free event</span>`;
    return `
      <article class="card">
        <div class="card-photo"><img src="${ev.image_url || ''}" alt="" onerror="this.style.opacity=.2" /></div>
        <span class="tag">${dateStr} · ${timeStr}</span>
        <h3></h3>
        <p style="font-size:.9rem;color:var(--color-muted)"></p>
        <p style="white-space:pre-line"></p>
        ${ticket}
      </article>`;
  }).join('');
  wrap.querySelectorAll('article').forEach((el, i) => {
    el.querySelector('h3').textContent = events[i].title;
    el.querySelector('p[style*="color:var(--color-muted)"]').textContent = events[i].venue || '';
    el.querySelector('p[style*="white-space"]').textContent = events[i].description || '';
  });
}

/* ---------- SHOP PAGE ---------- */
async function loadProducts(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const { data: prods } = await db.from('products').select('*').eq('available', true).order('created_at', { ascending: false });
  if (!prods || !prods.length) { wrap.innerHTML = '<p style="text-align:center;color:var(--color-muted);grid-column:1/-1">The shop is being restocked. Check back soon.</p>'; return; }
  wrap.innerHTML = prods.map(p => {
    const price = p.price_rwf ? p.price_rwf.toLocaleString() + ' RWF' : '';
    const msg = encodeURIComponent(`Hi Goal Diggers! I'd like to buy: ${p.name}${price ? ' (' + price + ')' : ''}. How do I pay?`);
    return `
      <div class="card">
        <div class="card-photo"><img src="${p.image_url || ''}" alt="" onerror="this.style.opacity=.2" /></div>
        <span class="tag">${price || 'Contact for price'}</span>
        <h3></h3>
        <p></p>
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${msg}" target="_blank" rel="noopener" class="btn btn-green mt-16">Buy on WhatsApp</a>
      </div>`;
  }).join('');
  wrap.querySelectorAll('.card').forEach((el, i) => {
    el.querySelector('h3').textContent = prods[i].name;
    el.querySelector('p:not(.mt-16)').textContent = prods[i].description || '';
  });
}

/* ---------- GALLERY ---------- */
async function loadGalleryGrid(containerId, opts = {}) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  let q = db.from('gallery').select('*').order('created_at', { ascending: false });
  if (opts.featuredOnly) q = q.eq('featured', true);
  if (opts.limit) q = q.limit(opts.limit);
  const { data: photos } = await q;
  if (!photos || !photos.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = photos.map(p => `
    <figure class="gallery-item" style="margin:0">
      <img src="${p.image_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block" />
      ${p.caption ? '<figcaption style="font-size:.82rem;color:var(--color-muted);margin-top:6px"></figcaption>' : ''}
    </figure>`).join('');
  wrap.querySelectorAll('figcaption').forEach((el, i) => {
    if (photos[i].caption) el.textContent = photos[i].caption;
  });
}
