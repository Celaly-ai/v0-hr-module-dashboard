-- =====================================================================
-- FeyRoute Core V1 — Customers & Phone Matching Layer
-- Phase-1B: additive only. Mevcut tablolara dokunmaz.
-- Supabase SQL Editor'de sirayla calistirin: 015 → 016 → 017 → 018 → 019
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- core_customers — kalici musteri kimligi
-- ---------------------------------------------------------------------
create table if not exists public.core_customers (
  id                  uuid primary key default gen_random_uuid(),
  sirket_id           uuid not null,
  display_name        text,
  primary_phone_id    uuid,
  il                  text,
  ilce                text,
  mahalle             text,
  adres               text,
  enlem               numeric(10, 7),
  boylam              numeric(10, 7),
  match_status        text not null default 'created'
                        check (match_status in (
                          'matched', 'created', 'review_required', 'unmatched_phone'
                        )),
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.core_customers is
  'Core V1 kalici musteri kimligi. customer_id (id) asla degismez ve yeniden kullanilmaz.';

create index if not exists core_customers_sirket_idx
  on public.core_customers (sirket_id);

create index if not exists core_customers_match_status_idx
  on public.core_customers (sirket_id, match_status);

create index if not exists core_customers_last_seen_idx
  on public.core_customers (sirket_id, last_seen_at desc);

create index if not exists core_customers_display_name_idx
  on public.core_customers (sirket_id, lower(display_name));

-- ---------------------------------------------------------------------
-- core_customer_phones — eslestirme katmani (telefon gecmisi korunur)
-- ---------------------------------------------------------------------
create table if not exists public.core_customer_phones (
  id                  uuid primary key default gen_random_uuid(),
  sirket_id           uuid not null,
  customer_id         uuid not null references public.core_customers(id),
  phone_normalized    text not null,
  phone_raw           text,
  is_primary          boolean not null default false,
  valid_from          timestamptz not null default now(),
  valid_to            timestamptz,
  source_system       text,
  source_reference    text,
  created_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null,
  updated_at          timestamptz not null default now()
);

comment on table public.core_customer_phones is
  'Telefon eslestirme katmani. Gecmis satirlar silinmez; valid_to ile emekli edilir.';

create index if not exists core_customer_phones_customer_idx
  on public.core_customer_phones (customer_id);

create index if not exists core_customer_phones_sirket_idx
  on public.core_customer_phones (sirket_id);

-- Aktif telefon eslestirmesi (tenant + normalize edilmis numara)
create unique index if not exists core_customer_phones_active_uniq
  on public.core_customer_phones (sirket_id, phone_normalized)
  where valid_to is null;

create index if not exists core_customer_phones_normalized_idx
  on public.core_customer_phones (sirket_id, phone_normalized)
  where valid_to is null;

create index if not exists core_customer_phones_primary_idx
  on public.core_customer_phones (customer_id, is_primary)
  where valid_to is null;

-- primary_phone_id FK (telefon tablosu olusturulduktan sonra)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'core_customers_primary_phone_id_fkey'
  ) then
    alter table public.core_customers
      add constraint core_customers_primary_phone_id_fkey
      foreign key (primary_phone_id)
      references public.core_customer_phones(id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists core_customers_set_updated_at on public.core_customers;
create trigger core_customers_set_updated_at
  before update on public.core_customers
  for each row execute function public.set_updated_at();

drop trigger if exists core_customer_phones_set_updated_at on public.core_customer_phones;
create trigger core_customer_phones_set_updated_at
  before update on public.core_customer_phones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Kurumsal hafiza: hard delete yasak
-- ---------------------------------------------------------------------
create or replace function public.core_v1_deny_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception '% satirlari silinemez (Core V1 kurumsal hafiza kurali)', TG_TABLE_NAME
    using errcode = '42501';
end;
$$;

drop trigger if exists core_customers_deny_delete on public.core_customers;
create trigger core_customers_deny_delete
  before delete on public.core_customers
  for each row execute function public.core_v1_deny_delete();

drop trigger if exists core_customer_phones_deny_delete on public.core_customer_phones;
create trigger core_customer_phones_deny_delete
  before delete on public.core_customer_phones
  for each row execute function public.core_v1_deny_delete();
