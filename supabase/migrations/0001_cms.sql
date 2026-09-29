-- WeaveLens CMS: tabel konten, RLS, dan bucket foto.
-- Jalankan sekali di Supabase Dashboard → SQL Editor (atau `supabase db push`).
-- Publik hanya bisa MEMBACA baris yang `visible`. Menulis hanya untuk email di cms_admins.

create extension if not exists pgcrypto;

-- ─── Admin CMS ──────────────────────────────────────────────────────────────
create table if not exists public.cms_admins (
  email text primary key check (email = lower(email))
);

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cms_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ─── Koleksi konten ────────────────────────────────────────────────────────
create table if not exists public.testimonials (
  id text primary key default gen_random_uuid()::text,
  quote text not null check (char_length(quote) between 1 and 400),
  name text not null,
  role text,
  client text,
  service text,
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  tagline text not null default '',
  description text not null default '',
  status text not null default 'available' check (status in ('available', 'coming_soon')),
  cta_label text,
  wa_message text check (wa_message in ('general', 'photo', 'photoVideo', 'video', 'reels', 'design')),
  image_src text,
  image_alt text,
  image_width integer,
  image_height integer,
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_plans (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  price text not null,
  features text[] not null default '{}',
  cta_label text not null,
  wa_message text not null default 'general'
    check (wa_message in ('general', 'photo', 'photoVideo', 'video', 'reels', 'design')),
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id text primary key default gen_random_uuid()::text,
  question text not null,
  answer text not null,
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_images (
  id text primary key default gen_random_uuid()::text,
  src text not null,
  alt text not null,
  category text not null check (category in ('wisuda', 'corporate', 'event')),
  client text,
  year text,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.partners (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  logo text,
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.wa_admins (
  id text primary key default gen_random_uuid()::text,
  number text not null check (number ~ '^62[0-9]{8,13}$'),
  display text not null,
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Satu baris saja (id = 1).
create table if not exists public.site_contact (
  id integer primary key default 1 check (id = 1),
  instagram_handle text not null,
  instagram_url text not null,
  email text not null,
  address text not null,
  area text not null,
  response_hours text not null,
  updated_at timestamptz not null default now()
);

-- ─── RLS ───────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'testimonials', 'services', 'pricing_plans', 'faqs',
    'portfolio_images', 'partners', 'wa_admins'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "public read" on public.%I for select using (visible or public.is_cms_admin())', t);
    execute format(
      'create policy "admin write" on public.%I for all to authenticated
         using (public.is_cms_admin()) with check (public.is_cms_admin())', t);
  end loop;
end $$;

alter table public.site_contact enable row level security;
drop policy if exists "public read" on public.site_contact;
drop policy if exists "admin write" on public.site_contact;
create policy "public read" on public.site_contact for select using (true);
create policy "admin write" on public.site_contact for all to authenticated
  using (public.is_cms_admin()) with check (public.is_cms_admin());

alter table public.cms_admins enable row level security;
drop policy if exists "self read" on public.cms_admins;
create policy "self read" on public.cms_admins for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ─── Storage: foto galeri, layanan, dan logo klien ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin write" on storage.objects;
create policy "media public read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media admin write" on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.is_cms_admin())
  with check (bucket_id = 'media' and public.is_cms_admin());

-- ─── Daftarkan email admin (ganti dengan email login kamu) ─────────────────
-- insert into public.cms_admins (email) values ('email-kamu@contoh.com');
