# Goal Diggers — Member Login Setup Guide

You now have a real backend without running any servers. Supabase (a free service) stores your members and announcements, and your website talks to it. Total setup time: about 20 minutes.

## What you got

| File | What it is |
|---|---|
| `login.html` | The sign-in page (matches your site's design) |
| `members.html` | Members-only area — shows announcements to signed-in members |
| `admin.html` | Your dashboard — block/unblock members, post & delete announcements |
| `auth.js` | The shared login code (you paste 2 keys into it, step 3) |
| `supabase-setup.sql` | Database setup — you run it once (step 2) |

Copy all four `.html`/`.js` files into the same folder as your other website files (next to `index.html`).

## Step 1 — Create your free Supabase project (5 min)

1. Go to **supabase.com** and sign up (the free plan is plenty for a book club).
2. Click **New project**. Name it `goal-diggers`, choose a strong database password (save it somewhere safe — you rarely need it again), and pick a region (Europe/Frankfurt is closest to Kigali).
3. Wait a minute or two while it sets up.

## Step 2 — Set up the database (2 min)

1. In your Supabase project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase-setup.sql`, copy **everything**, paste it in, and click **Run**.
3. You should see "Success. No rows returned". That's it — your database now has member profiles, announcements, and security rules.

## Step 3 — Connect your website (2 min)

1. In Supabase, go to **Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `auth.js` and paste them at the top where it says `PASTE-YOUR-PROJECT-URL-HERE` and `PASTE-YOUR-ANON-KEY-HERE`.

⚠️ The **anon** key is safe to put in a website. Never copy the **service_role** key into any of these files — that one is secret.

## Step 4 — Add yourself as the first admin (3 min)

1. In Supabase, go to **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your email and a password. Tick **Auto confirm user**.
3. Now make yourself admin: go to **Table Editor** → **profiles** → find your row → change `role` from `member` to `admin` → save.
4. Open `login.html` on your site, sign in — you'll land on your admin dashboard.

## Adding a member (this is your "backend registration")

Whenever someone joins the club:

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter their email + a starter password, tick **Auto confirm user**.
3. (Optional) Click the new user → **User metadata** → add `full_name` with their name, so the site greets them properly. You can also just type their name into the **profiles** table.
4. Send them the login page link + their email + password. Done — they can sign in immediately.

## Blocking someone

Open your **admin dashboard** on the website → find them in the member list → **Block access**. They're locked out instantly (and you can restore them any time). No need to touch Supabase for this.

## Step 5 — Put the site online (10 min, free)

Your site isn't hosted yet. The easiest free option:

1. Go to **netlify.com** and sign up.
2. Drag your whole website folder onto the Netlify dashboard ("deploy manually").
3. You get a live link like `goaldiggers.netlify.app` immediately. You can attach a custom domain later.

Note: the login pages talk to Supabase over the internet, so they only fully work once the files are together in one folder — they work both locally (double-clicking `login.html`) and online.

## How the security actually works (good to know)

- Pages redirect visitors who aren't signed in — but the *real* protection is in the database rules you ran in Step 2. Even a clever visitor who opens `members.html` directly gets an empty page: the database refuses to hand announcements to anyone who isn't an active member.
- Because of that, **anything truly private should live in Supabase** (announcements, and later: venues, member lists, documents) rather than typed directly into the HTML files. If you later want more private content types (e.g. a members-only book archive), ask me and I'll add a table + section for it.

## Common problems

- **"Sign-in failed" but the password is right** → check Step 3: are the URL and anon key pasted correctly, with no extra spaces?
- **Member list won't load on admin page** → make sure your own profile row has `role` = `admin` exactly (lowercase).
- **New member's name shows as "—"** → open Table Editor → profiles → type their name into `full_name`.
