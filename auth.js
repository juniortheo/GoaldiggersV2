/* ============================================================
   GOAL DIGGERS — MEMBER LOGIN SYSTEM (powered by Supabase)

   EDIT HERE — paste your own project keys below.
   Where to find them: supabase.com → your project →
   Settings (gear icon) → API →
     • "Project URL"      → SUPABASE_URL
     • "anon public" key  → SUPABASE_ANON_KEY
   The anon key is SAFE to put in a website. Never paste the
   "service_role" key anywhere in these files.
   ============================================================ */
const SUPABASE_URL = 'https://zxqqsrcttkxqbsbbgsqh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXFzcmN0dGt4cWJzYmJnc3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDYwMjUsImV4cCI6MjA5ODk4MjAyNX0.Ltd7N60IA_BdvpY1hp3iFMrCxVocvt12EFqiJqD35i8';

/* ------------------------------------------------------------
   Everything below works out of the box — no edits needed.
   ------------------------------------------------------------ */
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Small toast (reuses the site's .toast styling from styles.css) */
function authToast(msg, ms = 4500) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms);
}

/* Get the logged-in user's profile (name, role, active flag) */
async function getMyProfile() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return null;
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  return profile;
}

/* ---------- LOGIN (used by login.html) ---------- */
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in…';

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    btn.disabled = false; btn.textContent = 'Sign In';
    authToast('Sign-in failed: wrong email or password. Contact the club if you need help.');
    return;
  }

  // Check the member is still allowed in (the "active" switch)
  const profile = await getMyProfile();
  if (!profile || profile.active === false) {
    await db.auth.signOut();
    btn.disabled = false; btn.textContent = 'Sign In';
    authToast('This account is not active. Please contact the club.');
    return;
  }

  // Admins land on the dashboard, members on the members area
  window.location.href = profile.role === 'admin' ? 'admin.html' : 'members.html';
}

/* ---------- LOGOUT (used on members.html and admin.html) ---------- */
async function handleLogout() {
  await db.auth.signOut();
  window.location.href = 'login.html';
}

/* ---------- PAGE GUARDS ----------
   Put requireMember() at the top of any members-only page,
   and requireAdmin() at the top of admin-only pages.
   They redirect visitors who shouldn't be there.            */
async function requireMember() {
  const profile = await getMyProfile();
  if (!profile || profile.active === false) {
    window.location.href = 'login.html';
    return null;
  }
  return profile;
}

async function requireAdmin() {
  const profile = await getMyProfile();
  if (!profile || profile.active === false) {
    window.location.href = 'login.html';
    return null;
  }
  if (profile.role !== 'admin') {
    window.location.href = 'members.html';
    return null;
  }
  return profile;
}
