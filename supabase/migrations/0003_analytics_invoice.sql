-- Analitik pengunjung (tanpa cookie) + invoice generator bebas + data perusahaan.
-- Jalankan setelah 0002_portal.sql: `npm run db:push`.

-- ─── Analitik ──────────────────────────────────────────────────────────────
-- Satu baris per tampilan halaman atau klik CTA. Ditulis hanya oleh server (/api/t)
-- memakai service role; pengunjung tidak pernah bisa membaca atau menulis langsung.
-- visitor_hash = sha256(salt harian + IP + user agent): tidak menyimpan IP, tidak memakai cookie.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null check (type in ('pageview', 'cta')),
  path text not null check (char_length(path) <= 300),
  source text not null default 'Langsung',
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text check (device in ('mobile', 'tablet', 'desktop')),
  country text,
  city text,
  visitor_hash text not null,
  section text,
  admin_id text
);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
create index if not exists analytics_events_type_created_idx on public.analytics_events (type, created_at);

alter table public.analytics_events enable row level security;
drop policy if exists "admin read" on public.analytics_events;
create policy "admin read" on public.analytics_events for select to authenticated
  using (public.is_admin());

-- Ringkasan satu rentang waktu.
create or replace function public.analytics_overview(p_from timestamptz, p_to timestamptz)
returns table (visitors bigint, pageviews bigint, cta_clicks bigint, cta_visitors bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(distinct visitor_hash) filter (where type = 'pageview'),
    count(*) filter (where type = 'pageview'),
    count(*) filter (where type = 'cta'),
    count(distinct visitor_hash) filter (where type = 'cta')
  from public.analytics_events
  where created_at >= p_from and created_at < p_to;
$$;

-- Deret harian (zona Jakarta), hari tanpa kunjungan tetap muncul dengan angka 0.
create or replace function public.analytics_daily(p_from timestamptz, p_to timestamptz)
returns table (day date, visitors bigint, pageviews bigint, cta_clicks bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with days as (
    select generate_series(
      (p_from at time zone 'Asia/Jakarta')::date,
      ((p_to - interval '1 second') at time zone 'Asia/Jakarta')::date,
      interval '1 day'
    )::date as day
  ),
  events as (
    select (created_at at time zone 'Asia/Jakarta')::date as day, type, visitor_hash
    from public.analytics_events
    where created_at >= p_from and created_at < p_to
  )
  select
    d.day,
    count(distinct e.visitor_hash) filter (where e.type = 'pageview'),
    count(e.visitor_hash) filter (where e.type = 'pageview'),
    count(e.visitor_hash) filter (where e.type = 'cta')
  from days d
  left join events e on e.day = d.day
  group by d.day
  order by d.day;
$$;

-- Rincian per dimensi. Nama dimensi dibatasi daftar tetap (bukan SQL dinamis).
create or replace function public.analytics_breakdown(
  p_from timestamptz,
  p_to timestamptz,
  p_dimension text,
  p_limit integer default 8
)
returns table (label text, visitors bigint, pageviews bigint, cta_clicks bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(nullif(case p_dimension
      when 'source' then source
      when 'path' then path
      when 'device' then device
      when 'city' then city
      when 'country' then country
      when 'section' then section
      when 'admin' then admin_id
    end, ''), '(tidak diketahui)') as label,
    count(distinct visitor_hash) filter (where type = 'pageview'),
    count(*) filter (where type = 'pageview'),
    count(*) filter (where type = 'cta')
  from public.analytics_events
  where created_at >= p_from and created_at < p_to
    and p_dimension in ('source', 'path', 'device', 'city', 'country', 'section', 'admin')
    and (p_dimension not in ('section', 'admin') or type = 'cta')
  group by 1
  order by 2 desc, 4 desc, 3 desc
  limit greatest(1, least(p_limit, 50));
$$;

-- ─── Invoice generator ─────────────────────────────────────────────────────
-- Invoice bisa untuk siapa saja: klien terdaftar opsional, penerima ditulis bebas.
alter table public.invoices alter column client_id drop not null;
alter table public.invoices add column if not exists bill_to_name text;
alter table public.invoices add column if not exists bill_to_company text;
alter table public.invoices add column if not exists bill_to_contact text;
alter table public.invoices add column if not exists bill_to_address text;
alter table public.invoices add column if not exists discount bigint not null default 0;
alter table public.invoices add column if not exists payment_details text;
alter table public.invoices add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_discount_check') then
    alter table public.invoices add constraint invoices_discount_check check (discount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoices_bill_to_check') then
    alter table public.invoices add constraint invoices_bill_to_check
      check (client_id is not null or nullif(trim(bill_to_name), '') is not null);
  end if;
end $$;

-- ─── Data perusahaan ───────────────────────────────────────────────────────
alter table public.company_settings add column if not exists email text;
alter table public.company_settings add column if not exists bank_details text;
