-- ============================================================
-- GOAL DIGGERS — DATABASE SETUP
-- Run this ONCE in Supabase: SQL Editor → New query →
-- paste everything → click "Run".
-- ============================================================

-- 1) PROFILES — one row per member (created automatically
--    whenever you add a user in Authentication → Users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       text    not null default 'member',   -- 'member' or 'admin'
  active     boolean not null default true,       -- flip to false to block someone
  created_at timestamptz not null default now()
);

-- 2) ANNOUNCEMENTS — posts that only members can read
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  author     uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- 3) AUTO-CREATE a profile when you add a user.
--    The "Full name" you type in user metadata (key: full_name)
--    is copied in automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) HELPER — is the current user an admin? (safe to use in rules)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

-- 5) SECURITY RULES (Row Level Security)
--    These are what actually protect your data — even if someone
--    is clever with the browser, the database itself says no.
alter table public.profiles      enable row level security;
alter table public.announcements enable row level security;

-- Profiles: members see only their own row; admins see & manage everyone
drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "admin reads all"    on public.profiles;
drop policy if exists "admin updates all"  on public.profiles;

create policy "read own profile"  on public.profiles for select using (auth.uid() = id);
create policy "admin reads all"   on public.profiles for select using (public.is_admin());
create policy "admin updates all" on public.profiles for update using (public.is_admin());

-- Announcements: active members can read; only admins can post/delete
drop policy if exists "members read announcements" on public.announcements;
drop policy if exists "admin writes announcements" on public.announcements;
drop policy if exists "admin deletes announcements" on public.announcements;

create policy "members read announcements" on public.announcements
  for select using (
    exists (select 1 from public.profiles
            where id = auth.uid() and active = true)
  );
create policy "admin writes announcements" on public.announcements
  for insert with check (public.is_admin());
create policy "admin deletes announcements" on public.announcements
  for delete using (public.is_admin());

-- Done! Now follow the setup guide to add yourself as the first admin.
