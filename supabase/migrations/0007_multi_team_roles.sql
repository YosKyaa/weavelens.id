-- Satu anggota tim bisa punya BEBERAPA peran tim; izinnya digabung (gabungan semua peran).
-- Jalankan setelah 0006: `npm run db:push`.
-- Kolom lama profiles.team_role_id dibiarkan (tidak dipakai lagi) supaya versi aplikasi yang
-- sedang berjalan tetap bisa login selama jeda antara db:push dan deploy.

create table if not exists public.profile_team_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  team_role_id uuid not null references public.team_roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, team_role_id)
);
create index if not exists profile_team_roles_role_idx on public.profile_team_roles (team_role_id);

-- Pindahkan peran tunggal yang sudah ada.
insert into public.profile_team_roles (profile_id, team_role_id)
select id, team_role_id from public.profiles where team_role_id is not null
on conflict do nothing;

comment on column public.profiles.team_role_id is
  'Usang sejak 0007; peran tim ada di profile_team_roles.';

/** Admin selalu punya semua izin; anggota tim aktif jika SALAH SATU perannya punya izin itu. */
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
    join public.profile_team_roles pr on pr.profile_id = p.id
    join public.team_roles r on r.id = pr.team_role_id
    where p.id = auth.uid() and p.role = 'team' and p.active and permission = any (r.permissions)
  );
$$;

alter table public.profile_team_roles enable row level security;
drop policy if exists "admin all" on public.profile_team_roles;
create policy "admin all" on public.profile_team_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Anggota hanya bisa MEMBACA perannya sendiri (untuk menu & izin di aplikasi).
drop policy if exists "own read" on public.profile_team_roles;
create policy "own read" on public.profile_team_roles for select to authenticated
  using (profile_id = auth.uid());
