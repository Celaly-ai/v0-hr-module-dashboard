-- 006_create_personeller_schema.sql
-- LEGACY WARNING:
-- This file reflects an older personeller schema with English column names.
-- Do not run it against the current live pilot database unless you have
-- verified it matches the active schema. Current app code uses fields such as
-- ad, soyad, durum, auth_id, kullanici_id, sirket_id and telefon_normalized.
--
-- Creates public.personeller so the Calisanlar page can replace its
-- hardcoded mock dataset with real Supabase rows.
--
-- Columns mirror the `Employee` TypeScript interface in lib/hr-data.ts,
-- converted to snake_case.  The repo helper in lib/personnel-repo.ts
-- handles camelCase <-> snake_case.
--
-- Safe to re-run: uses `if not exists` / `drop policy if exists` guards.

create extension if not exists "pgcrypto";

create table if not exists public.personeller (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  email                     text not null,
  avatar                    text          default '',
  department                text          default '',
  position                  text          default '',
  status                    text not null default 'active'
                              check (status in ('active', 'on-leave', 'remote')),
  start_date                date,
  phone                     text          default '',
  location                  text          default '',
  -- Kisisel Bilgiler
  tc_kimlik_no              text          default '',
  birth_date                date,
  blood_type                text          default ''
                              check (blood_type in ('', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-')),
  emergency_contact_name    text          default '',
  emergency_contact_phone   text          default '',
  education_level           text          default 'lisans'
                              check (education_level in ('ilkokul', 'ortaokul', 'lise', 'onlisans', 'lisans', 'yukseklisans', 'doktora')),
  military_status           text          default 'yapilmadi'
                              check (military_status in ('yapildi', 'muaf', 'tecilli', 'yapilmadi')),
  -- Gorev Bilgileri
  contract_type             text          default 'belirsiz'
                              check (contract_type in ('belirsiz', 'belirli', 'staj')),
  contract_end_date         date,
  work_type                 text          default 'tam-zamanli',
  sgk_start_date            date,
  probation_end_date        date,
  -- Mali Bilgiler
  iban                      text          default '',
  gross_salary              numeric(14, 2) default 0,
  -- Sistem alanlari
  created_at                timestamptz   not null default now(),
  updated_at                timestamptz   not null default now(),
  created_by                uuid          references auth.users(id) on delete set null
);

-- Hizli arama / filtreleme icin indeksler
create index if not exists personeller_department_idx on public.personeller (department);
create index if not exists personeller_status_idx     on public.personeller (status);
create index if not exists personeller_name_idx       on public.personeller (lower(name));

-- updated_at otomatik guncelleme
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personeller_set_updated_at on public.personeller;
create trigger personeller_set_updated_at
  before update on public.personeller
  for each row execute function public.set_updated_at();

-- RLS: authenticated kullanicilar okuyabilir; yazma sadece IK rollerine.
alter table public.personeller enable row level security;

drop policy if exists personeller_select_authenticated on public.personeller;
create policy personeller_select_authenticated
  on public.personeller
  for select
  to authenticated
  using (true);

drop policy if exists personeller_insert_hr on public.personeller;
create policy personeller_insert_hr
  on public.personeller
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'servis_yoneticisi', 'urun_sorumlusu')
    )
  );

drop policy if exists personeller_update_hr on public.personeller;
create policy personeller_update_hr
  on public.personeller
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'servis_yoneticisi', 'urun_sorumlusu')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'servis_yoneticisi', 'urun_sorumlusu')
    )
  );

drop policy if exists personeller_delete_admin on public.personeller;
create policy personeller_delete_admin
  on public.personeller
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Realtime INSERT/UPDATE/DELETE yayini
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'personeller'
  ) then
    alter publication supabase_realtime add table public.personeller;
  end if;
end $$;
