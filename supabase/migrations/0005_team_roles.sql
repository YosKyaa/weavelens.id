-- Peran tim WeaveLens dengan akses terbatas.
--   admin → semua (termasuk invoice, analitik, CMS, pengaturan, klien, tim).
--   team  → HANYA proyek yang ditugaskan admin (konten, galeri, rencana, link klien, aktivitas).
--   client → tidak berubah.
-- Jalankan setelah 0004: `npm run db:push`.

-- ─── Peran & status aktif ──────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'team', 'client'));
alter table public.profiles add column if not exists active boolean not null default true;

-- Akun yang dinonaktifkan langsung kehilangan semua hak, walau sesinya masih ada.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and active
  );
$$;

create or replace function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'team' and active
  );
$$;

-- ─── Penugasan proyek ──────────────────────────────────────────────────────
create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);
create index if not exists project_members_profile_idx on public.project_members (profile_id);

/** Admin, atau anggota tim aktif yang ditugaskan ke proyek ini. */
create or replace function public.can_work_on_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or (
    public.is_team() and exists (
      select 1 from public.project_members
      where project_id = pid and profile_id = auth.uid()
    )
  );
$$;

create or replace function public.design_asset_project(aid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select project_id from public.design_assets where id = aid;
$$;

-- ─── RLS untuk tim ─────────────────────────────────────────────────────────
alter table public.project_members enable row level security;
drop policy if exists "admin all" on public.project_members;
create policy "admin all" on public.project_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "team read own" on public.project_members;
create policy "team read own" on public.project_members for select to authenticated
  using (public.can_work_on_project(project_id));

-- Proyek: tim boleh melihat & memperbarui, tidak boleh membuat/menghapus.
drop policy if exists "team read" on public.projects;
create policy "team read" on public.projects for select to authenticated
  using (public.can_work_on_project(id));
drop policy if exists "team update" on public.projects;
create policy "team update" on public.projects for update to authenticated
  using (public.can_work_on_project(id)) with check (public.can_work_on_project(id));

-- Klien & brand: hanya yang terkait proyek yang ditugaskan, baca saja.
drop policy if exists "team read" on public.clients;
create policy "team read" on public.clients for select to authenticated
  using (public.is_team() and exists (
    select 1 from public.projects p where p.client_id = clients.id and public.can_work_on_project(p.id)
  ));
drop policy if exists "team read" on public.brands;
create policy "team read" on public.brands for select to authenticated
  using (public.is_team() and exists (
    select 1 from public.projects p where p.client_id = brands.client_id and public.can_work_on_project(p.id)
  ));

-- Nama sesama tim (untuk komentar, penugasan, aktivitas).
drop policy if exists "team read staff" on public.profiles;
create policy "team read staff" on public.profiles for select to authenticated
  using (public.is_team() and role in ('admin', 'team'));

-- Isi proyek: akses penuh untuk proyek yang ditugaskan.
do $$
declare
  t text;
begin
  foreach t in array array['plan_items', 'design_assets', 'photo_sets', 'share_links', 'activity_log'] loop
    execute format('drop policy if exists "team all" on public.%I', t);
    execute format(
      'create policy "team all" on public.%I for all to authenticated
         using (public.is_team() and public.can_work_on_project(project_id))
         with check (public.is_team() and public.can_work_on_project(project_id))', t);
  end loop;
end $$;

drop policy if exists "team all" on public.design_versions;
create policy "team all" on public.design_versions for all to authenticated
  using (public.is_team() and public.can_work_on_project(public.design_asset_project(asset_id)))
  with check (public.is_team() and public.can_work_on_project(public.design_asset_project(asset_id)));

drop policy if exists "team all" on public.design_comments;
create policy "team all" on public.design_comments for all to authenticated
  using (public.is_team() and public.can_work_on_project(public.design_version_project(version_id)))
  with check (public.is_team() and public.can_work_on_project(public.design_version_project(version_id)));

drop policy if exists "team all" on public.photos;
create policy "team all" on public.photos for all to authenticated
  using (public.is_team() and public.can_work_on_project(public.photo_set_project(set_id)))
  with check (public.is_team() and public.can_work_on_project(public.photo_set_project(set_id)));

drop policy if exists "team all" on public.photo_selections;
create policy "team all" on public.photo_selections for all to authenticated
  using (public.is_team() and public.can_work_on_project(public.photo_set_project(set_id)))
  with check (public.is_team() and public.can_work_on_project(public.photo_set_project(set_id)));

-- File desain: tim boleh unggah/hapus di folder proyek yang ditugaskan (designs/<project_id>/…).
drop policy if exists "team project files" on storage.objects;
create policy "team project files" on storage.objects for all to authenticated
  using (
    bucket_id = 'designs'
    and public.is_team()
    and public.can_work_on_project(public.storage_first_uuid(name))
  )
  with check (
    bucket_id = 'designs'
    and public.is_team()
    and public.can_work_on_project(public.storage_first_uuid(name))
  );

-- Catatan: invoices, invoice_items, invoice_counters, company_settings, analytics_events,
-- tabel CMS, dan cms_admins TIDAK punya policy untuk tim → tetap khusus admin.
