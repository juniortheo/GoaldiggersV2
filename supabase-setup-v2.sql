-- ============================================================
-- GOAL DIGGERS — DATABASE EXTENSION (v2)
-- Run this ONCE after the first setup file. Adds:
--   books, blog_posts, events, products, gallery tables
--   + storage buckets for images (public) and PDFs (private)
-- Safe to re-run — everything uses "if not exists".
-- ============================================================

-- ============ TABLES ============

-- BOOKS: public sees cover + description, members see the PDF
create table if not exists public.books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  author         text not null,
  description    text,
  cover_url      text,           -- public image URL
  pdf_path       text,           -- private bucket path (members only)
  reading_month  text,           -- e.g. "March 2026"
  is_current     boolean not null default false,
  created_at     timestamptz not null default now()
);

-- BLOG POSTS: Substack link + auto-fetched preview
create table if not exists public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  title        text not null,
  description  text,
  image_url    text,
  created_at   timestamptz not null default now()
);

-- EVENTS
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  event_date   timestamptz not null,
  venue        text,
  ticket_url   text,
  image_url    text,
  created_at   timestamptz not null default now()
);

-- PRODUCTS (shop)
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  price_rwf    integer,
  image_url    text,
  available    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- GALLERY (photos)
create table if not exists public.gallery (
  id           uuid primary key default gen_random_uuid(),
  image_url    text not null,
  caption      text,
  featured     boolean not null default false,   -- true = show on homepage
  created_at   timestamptz not null default now()
);

-- ============ SECURITY (Row Level Security) ============
-- Everything readable by anyone; only admins can write.
-- Book PDFs are protected separately at the storage layer.

alter table public.books      enable row level security;
alter table public.blog_posts enable row level security;
alter table public.events     enable row level security;
alter table public.products   enable row level security;
alter table public.gallery    enable row level security;

-- Books
drop policy if exists "public read books"  on public.books;
drop policy if exists "admin write books"  on public.books;
create policy "public read books" on public.books for select using (true);
create policy "admin write books" on public.books for all using (public.is_admin()) with check (public.is_admin());

-- Blog posts
drop policy if exists "public read blog"   on public.blog_posts;
drop policy if exists "admin write blog"   on public.blog_posts;
create policy "public read blog" on public.blog_posts for select using (true);
create policy "admin write blog" on public.blog_posts for all using (public.is_admin()) with check (public.is_admin());

-- Events
drop policy if exists "public read events" on public.events;
drop policy if exists "admin write events" on public.events;
create policy "public read events" on public.events for select using (true);
create policy "admin write events" on public.events for all using (public.is_admin()) with check (public.is_admin());

-- Products
drop policy if exists "public read products" on public.products;
drop policy if exists "admin write products" on public.products;
create policy "public read products" on public.products for select using (true);
create policy "admin write products" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- Gallery
drop policy if exists "public read gallery" on public.gallery;
drop policy if exists "admin write gallery" on public.gallery;
create policy "public read gallery" on public.gallery for select using (true);
create policy "admin write gallery" on public.gallery for all using (public.is_admin()) with check (public.is_admin());

-- ============ STORAGE BUCKETS ============

-- Public bucket for covers, event photos, product photos, gallery
insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do nothing;

-- Private bucket for book PDFs (only members can download)
insert into storage.buckets (id, name, public)
values ('book-pdfs', 'book-pdfs', false)
on conflict (id) do nothing;

-- ============ STORAGE POLICIES ============
-- Everyone can view public images
drop policy if exists "public read images"  on storage.objects;
create policy "public read images" on storage.objects
  for select using (bucket_id = 'public-images');

-- Admins can upload/replace/delete public images
drop policy if exists "admin write images" on storage.objects;
create policy "admin write images" on storage.objects
  for all
  using (bucket_id = 'public-images' and public.is_admin())
  with check (bucket_id = 'public-images' and public.is_admin());

-- Only active members can read book PDFs
drop policy if exists "members read pdfs" on storage.objects;
create policy "members read pdfs" on storage.objects
  for select using (
    bucket_id = 'book-pdfs'
    and exists (select 1 from public.profiles
                where id = auth.uid() and active = true)
  );

-- Admins can upload/replace/delete PDFs
drop policy if exists "admin write pdfs" on storage.objects;
create policy "admin write pdfs" on storage.objects
  for all
  using (bucket_id = 'book-pdfs' and public.is_admin())
  with check (bucket_id = 'book-pdfs' and public.is_admin());

-- Done!
