-- WeaveLens Booth (aplikasi photobooth tablet, repo YosKyaa/photoboothWL) di proyek Supabase portal.
-- Jalankan setelah 0011: `npm run db:push`.
--
-- Skema booth sekarang SATU sumber dengan portal: semua migrasi Supabase ada di repo web ini, supaya
-- `supabase db push` dari satu repo tidak menolak versi migrasi milik repo lain. Repo booth hanya berisi
-- Edge Function (`supabase/functions`), yang di-deploy terpisah dan tidak menyentuh riwayat migrasi.
--
-- Isi:
--   1. Skema asli booth (dulu 20261005000000_booth.sql, 20261106000000_vouchers.sql,
--      20261106000100_gallery_gif.sql di repo booth), tidak diubah.
--   2. Penyesuaian dengan portal: admin booth = admin portal atau tim dengan izin "booth",
--      kolom QR di frame, izin kelola voucher per perangkat.

-- ═════════════════════════════════════════ 1a. Skema booth
-- WeaveLens Booth: tabel, bucket, dan RLS (SPEC E2).
-- Semua nama memakai awalan booth_ agar tidak bentrok dengan tabel portal weavelens.id di proyek yang sama.
--
-- Model akses:
--   * Tablet memakai publishable/anon key + token perangkat. Anon hanya boleh MEMBACA data publik
--     (profil, paket, frame). Semua penulisan tablet lewat Edge Function yang memverifikasi token
--     perangkat lalu menulis dengan service role.
--   * Admin portal (pengguna login dengan app_metadata.role = 'admin') boleh mengelola semua tabel booth.
--   * Halaman galeri /g/[code] membaca lewat server Next.js dengan service role, bukan dari browser.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- helper
create or replace function public.booth_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create or replace function public.booth_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- perangkat
create table if not exists public.booth_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- SHA-256 hex dari token perangkat; token asli hanya ada di tablet (EncryptedSharedPreferences).
  token_hash text not null unique,
  active boolean not null default true,
  last_seen timestamptz,
  app_version text,
  created_at timestamptz not null default now()
);

-- Membuat perangkat baru dan mengembalikan tokennya sekali. Jalankan dari SQL editor:
--   select public.booth_register_device('Booth 1');
create or replace function public.booth_register_device(device_name text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into public.booth_devices (name, token_hash)
  values (device_name, encode(extensions.digest(token, 'sha256'), 'hex'));
  return token;
end;
$$;
revoke all on function public.booth_register_device(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- profil, paket, frame
create table if not exists public.booth_events (
  id text primary key,
  name text not null,
  profile jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.booth_packages (
  id text primary key,
  event_id text not null references public.booth_events(id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0),
  output text not null check (output in ('print', 'digital', 'both')),
  print_copies integer not null default 1 check (print_copies >= 0),
  layouts text[] not null default array['strip'],
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists booth_packages_event_idx on public.booth_packages(event_id);

create table if not exists public.booth_frames (
  id text primary key,
  name text not null,
  layout text not null check (layout in ('strip', '4r', 'grid', 'story')),
  version integer not null default 1,
  canvas_w integer not null,
  canvas_h integer not null,
  slots jsonb not null,
  print jsonb not null default '{"duplicate": 1, "paper": "4R"}'::jsonb,
  -- Lokasi PNG di bucket "frames": <id>/v<version>/frame.png
  png_path text not null,
  active_from date,
  active_to date,
  -- Klien portal yang menyetujui frame lewat alur review desain (opsional).
  client_id uuid,
  -- Soft delete: frame yang pernah dipakai sesi tidak dihapus permanen (SPEC D6).
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- sesi dan foto
create table if not exists public.booth_sessions (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  event_id text,
  device_id uuid references public.booth_devices(id),
  package_id text,
  package_name text,
  price_snapshot integer not null default 0,
  pay_mode text,
  layout text,
  frame_id text,
  frame_version integer,
  filter text,
  print_copies integer not null default 0,
  email text,
  email_sent_at timestamptz,
  -- Cadangan kecil di bucket "booth" (SPEC D10).
  composition_path text,
  thumb_path text,
  -- Salinan utama di Google Drive.
  drive_folder_id text,
  drive_composition_id text,
  created_at timestamptz,
  finished_at timestamptz,
  synced_at timestamptz not null default now()
);
create index if not exists booth_sessions_event_idx on public.booth_sessions(event_id, created_at desc);

create table if not exists public.booth_photos (
  session_code text not null references public.booth_sessions(code) on delete cascade,
  index integer not null,
  drive_file_id text,
  created_at timestamptz not null default now(),
  primary key (session_code, index)
);

-- ---------------------------------------------------------------- pembayaran
create table if not exists public.booth_payments (
  order_id text primary key,
  session_code text not null,
  method text not null check (method in ('qris', 'cash', 'free')),
  amount integer not null check (amount >= 0),
  status text not null check (status in ('pending', 'paid', 'expired', 'failed', 'cancelled')),
  qr_string text,
  expires_at timestamptz,
  paid_at timestamptz,
  midtrans_transaction_id text,
  -- Notifikasi terakhir dari Midtrans, untuk audit.
  raw jsonb,
  device_id uuid references public.booth_devices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists booth_payments_session_idx on public.booth_payments(session_code);
create index if not exists booth_payments_created_idx on public.booth_payments(created_at desc);

-- ---------------------------------------------------------------- trigger updated_at
drop trigger if exists booth_events_touch on public.booth_events;
create trigger booth_events_touch before update on public.booth_events
  for each row execute function public.booth_touch_updated_at();
drop trigger if exists booth_packages_touch on public.booth_packages;
create trigger booth_packages_touch before update on public.booth_packages
  for each row execute function public.booth_touch_updated_at();
drop trigger if exists booth_frames_touch on public.booth_frames;
create trigger booth_frames_touch before update on public.booth_frames
  for each row execute function public.booth_touch_updated_at();
drop trigger if exists booth_payments_touch on public.booth_payments;
create trigger booth_payments_touch before update on public.booth_payments
  for each row execute function public.booth_touch_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.booth_devices enable row level security;
alter table public.booth_events enable row level security;
alter table public.booth_packages enable row level security;
alter table public.booth_frames enable row level security;
alter table public.booth_sessions enable row level security;
alter table public.booth_photos enable row level security;
alter table public.booth_payments enable row level security;

-- Data publik yang dibaca tablet untuk sinkron (tidak ada yang rahasia).
drop policy if exists booth_events_read on public.booth_events;
create policy booth_events_read on public.booth_events for select to anon, authenticated using (active);
drop policy if exists booth_packages_read on public.booth_packages;
create policy booth_packages_read on public.booth_packages for select to anon, authenticated using (active);
drop policy if exists booth_frames_read on public.booth_frames;
create policy booth_frames_read on public.booth_frames for select to anon, authenticated using (deleted_at is null);

-- Admin portal mengelola semuanya.
do $$
declare
  t text;
begin
  foreach t in array array['booth_devices', 'booth_events', 'booth_packages', 'booth_frames',
                           'booth_sessions', 'booth_photos', 'booth_payments']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.booth_is_admin()) with check (public.booth_is_admin())',
      t || '_admin', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- storage
-- "booth": komposisi + thumbnail cadangan (privat; galeri memakai signed URL dari server).
-- "frames": PNG frame (publik, agar tablet bisa mengunduh tanpa login).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booth', 'booth', false, 10485760, array['image/jpeg']),
       ('frames', 'frames', true, 10485760, array['image/png', 'application/json'])
on conflict (id) do nothing;

drop policy if exists booth_frames_admin_write on storage.objects;
create policy booth_frames_admin_write on storage.objects for all to authenticated
  using (bucket_id in ('frames', 'booth') and public.booth_is_admin())
  with check (bucket_id in ('frames', 'booth') and public.booth_is_admin());

-- ---------------------------------------------------------------- pemeliharaan
-- Path cadangan di bucket "booth" yang lebih tua dari N hari; dihapus lewat Storage API oleh
-- Edge Function booth-maintenance (menghapus baris storage.objects langsung tidak menghapus file).
create or replace function public.booth_old_backup_paths(days integer)
returns table (name text)
language sql
security definer
set search_path = storage, public
as $$
  select o.name from storage.objects o
  where o.bucket_id = 'booth' and o.created_at < now() - make_interval(days => days)
  order by o.created_at
  limit 1000
$$;
revoke all on function public.booth_old_backup_paths(integer) from public, anon, authenticated;

-- ═════════════════════════════════════════ 1b. Voucher
-- WeaveLens Booth: voucher potongan harga (Figma 04a-04d, A11, A12).
--
-- Model akses sama dengan migrasi booth: anon TIDAK punya akses ke tabel voucher (kode voucher rahasia).
-- Tablet mengecek dan mengelola voucher hanya lewat Edge Function check-voucher / manage-vouchers
-- (token perangkat, service role). Admin portal boleh mengelola lewat kebijakan *_admin.
--
-- Kuota: booth_vouchers.used hanya naik saat pembayaran yang memakai voucher berstatus 'paid'
-- (QRIS lunas, atau tunai/gratis yang disinkron tablet). Cek kode tidak mengurangi kuota.

-- ---------------------------------------------------------------- voucher
create table if not exists public.booth_vouchers (
  -- Huruf besar A-Z dan angka, 4-12 karakter (sama dengan VoucherRules.normalize di tablet).
  code text primary key check (code ~ '^[A-Z0-9]{4,12}$'),
  kind text not null check (kind in ('rupiah', 'percent', 'free')),
  -- rupiah: potongan dalam rupiah; percent: 1..100; free: diabaikan (0).
  value bigint not null default 0,
  -- Kosong = berlaku untuk semua paket.
  package_ids text[] not null default '{}',
  -- 0 = tanpa batas.
  max_uses integer not null default 0 check (max_uses >= 0),
  -- Jumlah pembayaran lunas yang memakai kode ini; hanya diubah trigger, tidak pernah oleh klien.
  used integer not null default 0 check (used >= 0),
  -- Hari terakhir berlaku (tanggal WIB); null = tanpa batas waktu.
  valid_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booth_vouchers_value_check check (
    (kind = 'rupiah' and value >= 1)
    or (kind = 'percent' and value between 1 and 100)
    or (kind = 'free' and value >= 0)
  )
);

drop trigger if exists booth_vouchers_touch on public.booth_vouchers;
create trigger booth_vouchers_touch before update on public.booth_vouchers
  for each row execute function public.booth_touch_updated_at();

-- ---------------------------------------------------------------- pembayaran
-- amount tetap = yang ditagih (setelah potongan). base_amount = harga paket sebelum potongan.
alter table public.booth_payments add column if not exists voucher_code text;
alter table public.booth_payments add column if not exists discount bigint not null default 0;
alter table public.booth_payments add column if not exists base_amount bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'booth_payments_discount_check') then
    alter table public.booth_payments add constraint booth_payments_discount_check check (discount >= 0);
  end if;
end;
$$;

create index if not exists booth_payments_voucher_idx on public.booth_payments(voucher_code)
  where voucher_code is not null;

-- ---------------------------------------------------------------- pemakaian
-- Satu baris per pembayaran lunas yang memakai voucher. Primary key order_id membuat hitungan idempoten:
-- notifikasi Midtrans yang berulang atau sinkron tunai yang diulang tidak menambah kuota dua kali.
-- Kode voucher sengaja tanpa foreign key: pembayaran tunai yang disinkron belakangan tetap tercatat
-- walau vouchernya sudah tidak ada. Menghapus pembayaran ikut menghapus barisnya, tanpa menurunkan used.
create table if not exists public.booth_voucher_redemptions (
  order_id text primary key references public.booth_payments(order_id) on delete cascade,
  voucher_code text not null,
  redeemed_at timestamptz not null default now()
);
create index if not exists booth_voucher_redemptions_code_idx on public.booth_voucher_redemptions(voucher_code);

create or replace function public.booth_redeem_voucher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  insert into public.booth_voucher_redemptions (order_id, voucher_code)
  values (new.order_id, new.voucher_code)
  on conflict (order_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    update public.booth_vouchers set used = used + 1 where code = new.voucher_code;
  end if;
  return new;
end;
$$;
revoke all on function public.booth_redeem_voucher() from public, anon, authenticated;

-- AFTER agar baris pembayaran sudah ada saat redemption (foreign key) ditulis.
drop trigger if exists booth_payments_redeem_voucher on public.booth_payments;
create trigger booth_payments_redeem_voucher after insert or update on public.booth_payments
  for each row
  when (new.status = 'paid' and new.voucher_code is not null)
  execute function public.booth_redeem_voucher();

-- ---------------------------------------------------------------- RLS
-- Tanpa kebijakan anon: tablet hanya lewat Edge Function (service role melewati RLS).
alter table public.booth_vouchers enable row level security;
alter table public.booth_voucher_redemptions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['booth_vouchers', 'booth_voucher_redemptions']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.booth_is_admin()) with check (public.booth_is_admin())',
      t || '_admin', t);
  end loop;
end;
$$;

-- ═════════════════════════════════════════ 1c. GIF galeri
-- GIF galeri (Figma G3): tablet mengunggah gerak.gif ke bucket "booth" di samping komposisi dan pratinjau.jpg.
-- Bucket awal hanya menerima JPEG; GIF ditambahkan tanpa mengubah batas ukuran 10 MB.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/gif']
where id = 'booth';


-- ═════════════════════════════════════════ 2. Penyesuaian dengan portal

-- ─── Izin tim "booth" ──────────────────────────────────────────────────────
-- Admin selalu boleh; anggota tim boleh mengelola booth bila salah satu perannya punya izin "booth".
alter table public.team_roles drop constraint if exists team_roles_permissions_check;
alter table public.team_roles add constraint team_roles_permissions_check check (
  permissions <@ array['projects.all', 'projects.manage', 'clients', 'cms', 'analytics', 'booth']::text[]
);

-- Admin booth = peran portal (profiles.role/team_roles), bukan app_metadata seperti versi awal.
-- Semua kebijakan *_admin booth memanggil fungsi ini, jadi cukup diganti di sini.
create or replace function public.booth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('booth');
$$;

-- ─── Kotak QR di frame ─────────────────────────────────────────────────────
-- Tablet (RemoteSync.FrameRow.qr) langsung memakai kolom ini: { x, y, size, caption, caption_side }.
alter table public.booth_frames add column if not exists qr jsonb;

-- ─── Perangkat ─────────────────────────────────────────────────────────────
-- Edge Function manage-vouchers hanya melayani perangkat yang diizinkan dari portal.
alter table public.booth_devices add column if not exists manage_vouchers boolean not null default true;
alter table public.booth_devices add column if not exists revoked_at timestamptz;

-- Laporan cepat untuk portal: sesi dan pembayaran terbaru dibaca lewat RLS admin booth.
create index if not exists booth_sessions_created_idx on public.booth_sessions(created_at desc);
