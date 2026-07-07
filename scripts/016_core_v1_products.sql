-- =====================================================================
-- FeyRoute Core V1 — Products
-- Phase-1B: additive only. Mevcut tablolara dokunmaz.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- core_products — fiziksel urun kimligi (AI analiz nesnesi)
-- ---------------------------------------------------------------------
create table if not exists public.core_products (
  id                      uuid primary key default gen_random_uuid(),
  sirket_id               uuid not null,
  customer_id             uuid not null references public.core_customers(id),
  brand                   text,
  product_code            text,
  model_code              text,
  serial_number           text,
  product_identity_key    text not null,
  identity_completeness   text not null default 'minimal'
                            check (identity_completeness in ('full', 'partial', 'minimal')),
  urun_kategori           text,
  first_seen_at           timestamptz not null default now(),
  last_seen_at            timestamptz not null default now(),
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.core_products is
  'Fiziksel urun birimi. Kimlik: marka + urun kodu + model kodu + seri no. Servis emri kimligi degildir.';

create unique index if not exists core_products_identity_uniq
  on public.core_products (sirket_id, product_identity_key);

create index if not exists core_products_sirket_idx
  on public.core_products (sirket_id);

create index if not exists core_products_customer_idx
  on public.core_products (customer_id);

create index if not exists core_products_serial_idx
  on public.core_products (sirket_id, serial_number)
  where serial_number is not null and serial_number <> '';

create index if not exists core_products_brand_model_idx
  on public.core_products (sirket_id, brand, model_code);

create index if not exists core_products_kategori_idx
  on public.core_products (sirket_id, urun_kategori);

create index if not exists core_products_last_seen_idx
  on public.core_products (sirket_id, last_seen_at desc);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
drop trigger if exists core_products_set_updated_at on public.core_products;
create trigger core_products_set_updated_at
  before update on public.core_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Kurumsal hafiza: hard delete yasak
-- ---------------------------------------------------------------------
drop trigger if exists core_products_deny_delete on public.core_products;
create trigger core_products_deny_delete
  before delete on public.core_products
  for each row execute function public.core_v1_deny_delete();
