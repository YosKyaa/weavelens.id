-- Peran tim yang bisa diatur admin (berbasis izin).
--   Admin  : akses penuh (tetap), satu-satunya yang bisa invoice, pengaturan, dan Tim & akses.
--   Tim    : proyek yang ditugaskan + izin dari "peran tim" yang dipilih admin.
-- Jalankan setelah 0005: `npm run db:push`.

-- ─── Peran tim ─────────────────────────────────────────────────────────────
create table if not exists public.team_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40),
  description text,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint team_roles_permissions_check check (
    permissions <@ array['projects.all', 'projects.manage', 'clients', 'cms', 'analytics']::text[]
  )
);

alter table public.profiles
  add column if not exists team_role_id uuid references public.team_roles (id) on delete set null;

insert into public.team_roles (name, description, permissions) values
  ('Tim proyek', 'Mengerjakan proyek yang ditugaskan saja.', '{}'),
  ('Editor CMS', 'Proyek yang ditugaskan + mengelola konten website.', '{cms}'),
  ('Project manager', 'Semua proyek, membuat proyek, menugaskan tim, dan mengelola klien.',
    '{projects.all,projects.manage,clients}')
on conflict (name) do nothing;

/** Admin selalu punya semua izin; anggota tim aktif sesuai peran timnya. */
create or replace function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.profiles p
    join public.team_roles r on r.id = p.team_role_id
    where p.id = auth.uid() and p.role = 'team' and p.active and permission = any (r.permissions)
  );
$$;

-- ─── Izin dipakai oleh fungsi akses yang sudah ada ─────────────────────────
-- Proyek: tim dengan izin "semua proyek" tidak perlu ditugaskan satu per satu.
create or replace function public.can_work_on_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or (
    public.is_team() and (
      public.has_permission('projects.all') or exists (
        select 1 from public.project_members
        where project_id = pid and profile_id = auth.uid()
      )
    )
  );
$$;

-- CMS: admin, daftar cms_admins lama, atau tim dengan izin "cms" (termasuk unggah foto CMS).
create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('cms') or exists (
    select 1 from public.cms_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ─── RLS tambahan untuk izin ───────────────────────────────────────────────
alter table public.team_roles enable row level security;
drop policy if exists "admin all" on public.team_roles;
create policy "admin all" on public.team_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "team read" on public.team_roles;
create policy "team read" on public.team_roles for select to authenticated using (public.is_team());

-- Buat/hapus proyek & atur penugasan.
drop policy if exists "team manage projects" on public.projects;
create policy "team manage projects" on public.projects for all to authenticated
  using (public.is_team() and public.has_permission('projects.manage'))
  with check (public.is_team() and public.has_permission('projects.manage'));
drop policy if exists "team manage members" on public.project_members;
create policy "team manage members" on public.project_members for all to authenticated
  using (public.is_team() and public.has_permission('projects.manage'))
  with check (public.is_team() and public.has_permission('projects.manage'));

-- Klien & brand.
drop policy if exists "team manage clients" on public.clients;
create policy "team manage clients" on public.clients for all to authenticated
  using (public.is_team() and public.has_permission('clients'))
  with check (public.is_team() and public.has_permission('clients'));
drop policy if exists "team manage brands" on public.brands;
create policy "team manage brands" on public.brands for all to authenticated
  using (public.is_team() and public.has_permission('clients'))
  with check (public.is_team() and public.has_permission('clients'));

-- Analitik (baca saja).
drop policy if exists "team analytics" on public.analytics_events;
create policy "team analytics" on public.analytics_events for select to authenticated
  using (public.is_team() and public.has_permission('analytics'));

-- Catatan: invoices, invoice_items, invoice_counters, company_settings, dan profil/peran tim
-- TIDAK punya policy izin → tetap khusus admin.

-- ─── Metode pembayaran terstruktur (dropdown + nomor rekening) ─────────────
-- Format: [{ "method": "bca", "number": "1234567890", "holder": "WeaveLens" }, …]
-- Kolom teks lama (payment_methods/payment_details/bank_details) tetap diisi sebagai ringkasan.
alter table public.invoices add column if not exists payment_accounts jsonb not null default '[]'::jsonb;
alter table public.company_settings add column if not exists payment_accounts jsonb not null default '[]'::jsonb;
