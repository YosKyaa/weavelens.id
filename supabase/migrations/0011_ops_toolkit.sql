-- Paket operasional: penanggung jawab & tayang, pengingat review, aset brand, kirim invoice,
-- log error, backup. Jalankan setelah 0010: `npm run db:push`.
--
-- Aman untuk versi yang sedang berjalan: hanya kolom/tabel/bucket baru. Relasi baru
-- (design_assets → profiles, brand_files → brands/profiles) tidak berpasangan dengan embed
-- yang sudah ada di aplikasi, jadi tidak ada relasi PostgREST yang menjadi ambigu.

-- ─── Konten: penanggung jawab & bukti tayang ───────────────────────────────
alter table public.design_assets
  add column if not exists assignee_id uuid references public.profiles (id) on delete set null,
  add column if not exists published_url text,
  add column if not exists published_at timestamptz;
create index if not exists design_assets_assignee_idx on public.design_assets (assignee_id);

-- ─── Pengingat review: kapan terakhir klien diingatkan untuk versi ini ─────
alter table public.design_versions add column if not exists reminded_at timestamptz;

-- ─── Aset brand ────────────────────────────────────────────────────────────
alter table public.brands
  add column if not exists guideline text,
  add column if not exists voice text,
  add column if not exists palette text[] not null default '{}',
  add column if not exists fonts text,
  add column if not exists asset_url text;

create table if not exists public.brand_files (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  path text not null unique,
  name text not null check (char_length(name) between 1 and 200),
  size bigint,
  content_type text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists brand_files_brand_idx on public.brand_files (brand_id, created_at desc);

alter table public.brand_files enable row level security;
drop policy if exists "admin all" on public.brand_files;
create policy "admin all" on public.brand_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Semua tim boleh melihat & mengunduh (bahan desain); kelola = izin Klien & brand.
drop policy if exists "team read" on public.brand_files;
create policy "team read" on public.brand_files for select to authenticated
  using (public.is_team());
drop policy if exists "team manage" on public.brand_files;
create policy "team manage" on public.brand_files for all to authenticated
  using (public.is_team() and public.has_permission('clients'))
  with check (public.is_team() and public.has_permission('clients'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('brand-assets', 'brand-assets', false, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "brand assets read" on storage.objects;
create policy "brand assets read" on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and (public.is_admin() or public.is_team()));
drop policy if exists "brand assets write" on storage.objects;
create policy "brand assets write" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.has_permission('clients'));
drop policy if exists "brand assets delete" on storage.objects;
create policy "brand assets delete" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and public.has_permission('clients'));

-- ─── Invoice: link lihat/unduh untuk klien (dikirim lewat WhatsApp/email) ──
alter table public.invoices add column if not exists share_token text unique;

-- ─── Log error aplikasi (pengganti Sentry; ditulis server dengan service role) ─
create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('client', 'server')),
  message text not null,
  digest text,
  path text,
  user_id uuid,
  user_agent text
);
create index if not exists error_events_created_idx on public.error_events (created_at desc);
alter table public.error_events enable row level security;
drop policy if exists "admin read" on public.error_events;
create policy "admin read" on public.error_events for select to authenticated
  using (public.is_admin());

-- ─── Backup harian (JSON) — hanya service role; admin mengunduh lewat server ──
insert into storage.buckets (id, name, public, file_size_limit)
values ('backups', 'backups', false, 104857600)
on conflict (id) do update set public = excluded.public;

-- ─── 2FA (TOTP): status per profil sebagai kolom terhitung `profiles.mfa_enabled` ──
-- Dibaca bersama profil saat login (tanpa query tambahan). Sumbernya auth.mfa_factors,
-- jadi tidak bisa diubah user lewat API.
create or replace function public.mfa_enabled(p public.profiles)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified'
  );
$$;
revoke execute on function public.mfa_enabled(public.profiles) from public, anon;
grant execute on function public.mfa_enabled(public.profiles) to authenticated;
