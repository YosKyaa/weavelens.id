-- Logo proyek (opsional): tampil di admin, portal klien, dan link klien.
-- Jalankan setelah 0008: `npm run db:push`. Hanya menambah kolom & bucket (aman untuk versi berjalan).

alter table public.projects add column if not exists logo_path text;

-- Bucket publik khusus logo (bukan rahasia; bisa di-cache CDN). SVG sengaja tidak diizinkan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Path: logos/<project_id>/<file>. Tulis/hapus: admin & tim yang boleh mengerjakan proyek itu.
drop policy if exists "logos staff insert" on storage.objects;
create policy "logos staff insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and public.can_work_on_project(public.storage_first_uuid(name))
  );
drop policy if exists "logos staff update" on storage.objects;
create policy "logos staff update" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.can_work_on_project(public.storage_first_uuid(name)))
  with check (bucket_id = 'logos' and public.can_work_on_project(public.storage_first_uuid(name)));
drop policy if exists "logos staff delete" on storage.objects;
create policy "logos staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.can_work_on_project(public.storage_first_uuid(name)));
