-- UX review klien & tim: notifikasi, komentar caption.
-- Jalankan setelah 0007: `npm run db:push`. Aman untuk versi aplikasi yang sedang berjalan.

-- Notifikasi tim diambil dari activity_log (aksi klien); ini penanda "sudah dibaca sampai kapan".
alter table public.profiles
  add column if not exists notifications_seen_at timestamptz not null default now();

-- Komentar bisa untuk desain (bawaan) atau untuk caption.
alter table public.design_comments
  add column if not exists target text not null default 'design';
alter table public.design_comments drop constraint if exists design_comments_target_check;
alter table public.design_comments
  add constraint design_comments_target_check check (target in ('design', 'caption'));

-- Lonceng notifikasi membaca aktivitas terbaru lintas proyek.
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
