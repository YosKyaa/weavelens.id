-- Proyek khusus satu brand (opsional). Kosong = proyek gabungan beberapa brand milik klien.
-- Jalankan setelah 0009: `npm run db:push`.
-- Aman untuk versi yang sedang berjalan: hanya satu FK baru projects → brands; belum ada embed
-- projects↔brands di aplikasi, jadi tidak ada relasi PostgREST yang menjadi ambigu.
-- Kecocokan brand dengan klien proyek diperiksa di server action (bukan FK komposit, supaya
-- tidak ada dua relasi projects → brands).

alter table public.projects
  add column if not exists brand_id uuid references public.brands (id) on delete set null;

create index if not exists projects_brand_idx on public.projects (brand_id);
