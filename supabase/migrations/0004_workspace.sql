-- Workspace klien: brand, papan konten (kanban), link akses tanpa login, dan galeri foto/video Drive.
-- Jalankan setelah 0003: `npm run db:push`.
--
-- Akses klien lewat link (/share/<token>) TIDAK memakai RLS klien: server memvalidasi token,
-- lalu membaca/menulis memakai service role dengan filter project/brand dari link itu.
-- Karena itu tabel share_links hanya bisa dibaca admin.

-- ─── Brand (mis. 4 perusahaan milik satu klien) ────────────────────────────
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#74342b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  instagram text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists brands_client_idx on public.brands (client_id, sort);

-- ─── Proyek ────────────────────────────────────────────────────────────────
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists updated_at timestamptz not null default now();

-- ─── Konten (kartu kanban) = design_assets yang diperluas ─────────────────
alter table public.design_assets add column if not exists brand_id uuid references public.brands (id) on delete set null;
alter table public.design_assets add column if not exists format text not null default 'feed';
alter table public.design_assets add column if not exists stage text not null default 'brief';
alter table public.design_assets add column if not exists brief text;
alter table public.design_assets add column if not exists caption text;
alter table public.design_assets add column if not exists due_date date;
alter table public.design_assets add column if not exists publish_date date;
alter table public.design_assets add column if not exists sort double precision not null default 0;
alter table public.design_assets add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'design_assets_format_check') then
    alter table public.design_assets add constraint design_assets_format_check
      check (format in ('feed', 'carousel', 'story', 'reels', 'other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'design_assets_stage_check') then
    alter table public.design_assets add constraint design_assets_stage_check
      check (stage in ('brief', 'in_progress', 'client_review', 'revision', 'approved', 'published'));
  end if;
end $$;
create index if not exists design_assets_board_idx on public.design_assets (project_id, stage, sort);

-- Versi: beberapa file (carousel) atau link eksternal (video Reels besar di Drive).
alter table public.design_versions alter column file_path drop not null;
alter table public.design_versions add column if not exists files jsonb not null default '[]'::jsonb;
alter table public.design_versions add column if not exists external_url text;
alter table public.design_versions add column if not exists decided_by text;
alter table public.design_versions add column if not exists decided_at timestamptz;

-- ─── Link akses klien ──────────────────────────────────────────────────────
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (char_length(token) >= 32),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- null = semua brand di proyek; diisi = PIC brand itu hanya melihat kontennya sendiri.
  brand_id uuid references public.brands (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  can_review boolean not null default true,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists share_links_project_idx on public.share_links (project_id);

-- Komentar & keputusan dari tamu (pemegang link) memakai nama yang mereka isi.
alter table public.design_comments alter column author_id drop not null;
alter table public.design_comments add column if not exists guest_name text;
alter table public.design_comments add column if not exists share_link_id uuid references public.share_links (id) on delete set null;
-- Carousel: titik komentar menempel pada slide tertentu (0 = slide pertama).
alter table public.design_comments add column if not exists slide integer not null default 0;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'design_comments_author_check') then
    alter table public.design_comments add constraint design_comments_author_check
      check (author_id is not null or nullif(trim(guest_name), '') is not null);
  end if;
end $$;

-- ─── Galeri foto/video dari Google Drive ───────────────────────────────────
alter table public.photo_sets add column if not exists edited_folder_id text;
alter table public.photo_sets add column if not exists submitted_at timestamptz;
alter table public.photo_sets add column if not exists submitted_by text;
alter table public.photo_sets add column if not exists synced_at timestamptz;

alter table public.photos add column if not exists mime_type text;
alter table public.photos add column if not exists kind text not null default 'image';
alter table public.photos add column if not exists size_bytes bigint;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photos_kind_check') then
    alter table public.photos add constraint photos_kind_check check (kind in ('image', 'video'));
  end if;
end $$;

alter table public.photo_selections add column if not exists guest_name text;

-- ─── Aktivitas ─────────────────────────────────────────────────────────────
alter table public.activity_log add column if not exists actor_name text;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.brands enable row level security;
alter table public.share_links enable row level security;

drop policy if exists "admin all" on public.brands;
create policy "admin all" on public.brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "client read" on public.brands;
create policy "client read" on public.brands for select to authenticated
  using (client_id = public.my_client_id());

drop policy if exists "admin all" on public.share_links;
create policy "admin all" on public.share_links for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Storage: izinkan video Reels (maks. 50 MB per file, batas paket gratis) ─
update storage.buckets
set allowed_mime_types = array[
      'image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime'
    ],
    file_size_limit = 52428800
where id = 'designs';
