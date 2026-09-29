-- WeaveLens Client Portal: tabel SPEC-PORTAL A3, RLS, nomor invoice, dan bucket privat.
-- Jalankan setelah 0001_cms.sql (SQL Editor atau `supabase db push`).
--
-- Prinsip RLS:
--   admin  → semua baris.
--   client → hanya baris milik client_id di profilnya; tulis hanya komentar desain
--            dan pilihan foto pada proyeknya sendiri. Tulisan lain lewat Server Action admin.

-- ─── Nama tabel CMS ────────────────────────────────────────────────────────
-- Versi awal 0001_cms.sql menamai daftar logo landing page `clients`. Nama itu kini
-- dipakai organisasi klien portal, jadi tabel lama (yang punya kolom `logo`) diganti `partners`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'logo'
  ) then
    alter table public.clients rename to partners;
  end if;
end $$;

-- ─── Profil & peran ────────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  drive_folder_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  client_id uuid references public.clients (id) on delete set null,
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_client_id_idx on public.profiles (client_id);

-- Setiap user baru otomatis punya profil `client` tanpa organisasi.
-- Peran admin dan client_id hanya diisi server (service role), tidak pernah dari metadata user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid() and role = 'client';
$$;

-- Admin portal otomatis juga admin CMS landing page (fungsi dari 0001_cms.sql diperluas).
create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.cms_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ─── Proyek ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  type text not null check (type in ('design', 'photo', 'video', 'mixed')),
  title text not null,
  event_date date,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'in_review', 'revision', 'approved', 'delivered', 'closed')),
  drive_folder_id text,
  created_at timestamptz not null default now()
);
create index if not exists projects_client_id_idx on public.projects (client_id);

create or replace function public.can_view_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.projects p
    where p.id = pid and p.client_id = public.my_client_id()
  );
$$;

create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  "order" integer not null default 0,
  title text not null,
  description text,
  due_date date,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists plan_items_project_idx on public.plan_items (project_id, "order");

-- ─── Modul desain ──────────────────────────────────────────────────────────
create table if not exists public.design_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
create index if not exists design_assets_project_idx on public.design_assets (project_id);

create table if not exists public.design_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.design_assets (id) on delete cascade,
  version_no integer not null check (version_no > 0),
  file_path text not null,
  note text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'changes_requested', 'approved')),
  created_at timestamptz not null default now(),
  unique (asset_id, version_no)
);

create table if not exists public.design_comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.design_versions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  x double precision check (x between 0 and 1),
  y double precision check (y between 0 and 1),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  check ((x is null) = (y is null))
);
create index if not exists design_comments_version_idx on public.design_comments (version_id);

create or replace function public.design_version_project(vid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.project_id from public.design_versions v
  join public.design_assets a on a.id = v.asset_id
  where v.id = vid;
$$;

-- ─── Modul foto ────────────────────────────────────────────────────────────
create table if not exists public.photo_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  drive_folder_id text,
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'selecting', 'selection_closed', 'editing', 'delivered')),
  max_selection integer check (max_selection > 0),
  deadline timestamptz,
  -- Kunci sinkronisasi Drive: satu proses per set (SPEC A8).
  sync_locked_at timestamptz,
  edited_share_url text,
  created_at timestamptz not null default now()
);
create index if not exists photo_sets_project_idx on public.photo_sets (project_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.photo_sets (id) on delete cascade,
  drive_file_id text not null,
  filename text not null,
  thumb_path text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  unique (set_id, drive_file_id)
);
create index if not exists photos_set_idx on public.photos (set_id, sort_order);

create table if not exists public.photo_selections (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.photo_sets (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  selected_by uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (photo_id, set_id)
);
create index if not exists photo_selections_set_idx on public.photo_selections (set_id);

create or replace function public.photo_set_project(sid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select project_id from public.photo_sets where id = sid;
$$;

-- Klien hanya boleh mengubah pilihan selama set berstatus `selecting`.
create or replace function public.photo_set_open(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.photo_sets
    where id = sid and status = 'selecting' and (deadline is null or deadline > now())
  );
$$;

-- ─── Modul invoice ─────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  project_id uuid references public.projects (id) on delete set null,
  number text not null unique,
  issue_date date not null default current_date,
  due_date date not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  tax_rate integer not null default 0 check (tax_rate in (0, 11)),
  notes text,
  payment_methods text,
  signer_name text,
  signer_role text,
  pdf_path text,
  paid_at date,
  created_at timestamptz not null default now()
);
create index if not exists invoices_client_idx on public.invoices (client_id, status);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  "order" integer not null default 0,
  description text not null,
  unit_price bigint not null check (unit_price >= 0),
  qty integer not null default 1 check (qty > 0)
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id, "order");

-- Penghitung per tahun. Nomor dibuat atomik di Postgres: tidak pernah duplikat,
-- dan nomor invoice yang dibatalkan tidak dipakai ulang.
create table if not exists public.invoice_counters (
  year integer primary key,
  last_value integer not null default 0
);

create or replace function public.next_invoice_number(issue date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from issue)::integer;
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membuat nomor invoice' using errcode = '42501';
  end if;
  insert into public.invoice_counters as c (year, last_value)
  values (y, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning last_value into n;
  return format('WL-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

-- Data perusahaan untuk invoice (satu baris, diubah di /admin/settings).
create table if not exists public.company_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null,
  phone text not null,
  website text not null,
  address text not null,
  payment_methods text not null,
  signer_name text not null,
  signer_role text not null,
  updated_at timestamptz not null default now()
);

-- ─── Umum ──────────────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_project_idx on public.activity_log (project_id, created_at desc);

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.plan_items enable row level security;
alter table public.design_assets enable row level security;
alter table public.design_versions enable row level security;
alter table public.design_comments enable row level security;
alter table public.photo_sets enable row level security;
alter table public.photos enable row level security;
alter table public.photo_selections enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.company_settings enable row level security;
alter table public.activity_log enable row level security;

-- Admin: akses penuh ke semua tabel portal.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'clients', 'projects', 'plan_items', 'design_assets', 'design_versions',
    'design_comments', 'photo_sets', 'photos', 'photo_selections', 'invoices',
    'invoice_items', 'invoice_counters', 'company_settings', 'activity_log'
  ] loop
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format(
      'create policy "admin all" on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Klien: baca data miliknya.
drop policy if exists "self read" on public.profiles;
create policy "self read" on public.profiles for select to authenticated
  using (id = auth.uid() or (client_id is not null and client_id = public.my_client_id()));

drop policy if exists "client read" on public.clients;
create policy "client read" on public.clients for select to authenticated
  using (id = public.my_client_id());

drop policy if exists "client read" on public.projects;
create policy "client read" on public.projects for select to authenticated
  using (client_id = public.my_client_id());

drop policy if exists "client read" on public.plan_items;
create policy "client read" on public.plan_items for select to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "client read" on public.design_assets;
create policy "client read" on public.design_assets for select to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "client read" on public.design_versions;
create policy "client read" on public.design_versions for select to authenticated
  using (public.can_view_project(public.design_version_project(id)));

drop policy if exists "client read" on public.design_comments;
create policy "client read" on public.design_comments for select to authenticated
  using (public.can_view_project(public.design_version_project(version_id)));

drop policy if exists "client insert" on public.design_comments;
create policy "client insert" on public.design_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and resolved = false
    and public.can_view_project(public.design_version_project(version_id))
  );

drop policy if exists "client read" on public.photo_sets;
create policy "client read" on public.photo_sets for select to authenticated
  using (public.can_view_project(project_id));

drop policy if exists "client read" on public.photos;
create policy "client read" on public.photos for select to authenticated
  using (public.can_view_project(public.photo_set_project(set_id)));

drop policy if exists "client read" on public.photo_selections;
create policy "client read" on public.photo_selections for select to authenticated
  using (public.can_view_project(public.photo_set_project(set_id)));

-- Pilih, beri catatan, dan batal pilih hanya selama seleksi dibuka.
drop policy if exists "client insert" on public.photo_selections;
create policy "client insert" on public.photo_selections for insert to authenticated
  with check (
    selected_by = auth.uid()
    and public.photo_set_open(set_id)
    and public.can_view_project(public.photo_set_project(set_id))
    and exists (select 1 from public.photos p where p.id = photo_id and p.set_id = photo_selections.set_id)
  );

drop policy if exists "client update" on public.photo_selections;
create policy "client update" on public.photo_selections for update to authenticated
  using (public.photo_set_open(set_id) and public.can_view_project(public.photo_set_project(set_id)))
  with check (public.photo_set_open(set_id) and public.can_view_project(public.photo_set_project(set_id)));

drop policy if exists "client delete" on public.photo_selections;
create policy "client delete" on public.photo_selections for delete to authenticated
  using (public.photo_set_open(set_id) and public.can_view_project(public.photo_set_project(set_id)));

-- Draf invoice tidak pernah terlihat oleh klien.
drop policy if exists "client read" on public.invoices;
create policy "client read" on public.invoices for select to authenticated
  using (client_id = public.my_client_id() and status <> 'draft');

drop policy if exists "client read" on public.invoice_items;
create policy "client read" on public.invoice_items for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.client_id = public.my_client_id() and i.status <> 'draft'
  ));

drop policy if exists "client read" on public.company_settings;
create policy "client read" on public.company_settings for select to authenticated using (true);

drop policy if exists "client read" on public.activity_log;
create policy "client read" on public.activity_log for select to authenticated
  using (project_id is not null and public.can_view_project(project_id));

-- ─── Storage (semua privat, diakses lewat URL bertanda tangan 1 jam) ───────
-- Konvensi path: designs/<project_id>/…, thumbs/<project_id>/…, invoices/<client_id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('designs', 'designs', false, 52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('thumbs', 'thumbs', false, 5242880, array['image/webp', 'image/jpeg']),
  ('invoices', 'invoices', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create or replace function public.storage_first_uuid(object_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return (storage.foldername(object_name))[1]::uuid;
exception when others then
  return null;
end;
$$;

drop policy if exists "portal admin all" on storage.objects;
create policy "portal admin all" on storage.objects for all to authenticated
  using (bucket_id in ('designs', 'thumbs', 'invoices') and public.is_admin())
  with check (bucket_id in ('designs', 'thumbs', 'invoices') and public.is_admin());

drop policy if exists "portal client read project files" on storage.objects;
create policy "portal client read project files" on storage.objects for select to authenticated
  using (
    bucket_id in ('designs', 'thumbs')
    and public.can_view_project(public.storage_first_uuid(name))
  );

drop policy if exists "portal client read invoices" on storage.objects;
create policy "portal client read invoices" on storage.objects for select to authenticated
  using (
    bucket_id = 'invoices'
    and public.storage_first_uuid(name) = public.my_client_id()
  );
