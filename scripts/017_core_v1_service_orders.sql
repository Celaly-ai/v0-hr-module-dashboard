-- =====================================================================
-- FeyRoute Core V1 — Service Orders & External References
-- Phase-1B: additive only. Mevcut tablolara dokunmaz.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- core_service_orders — servis talebi (is emri) ornegi
-- ---------------------------------------------------------------------
create table if not exists public.core_service_orders (
  id                      uuid primary key default gen_random_uuid(),
  sirket_id               uuid not null,
  customer_id             uuid not null references public.core_customers(id),
  product_id              uuid references public.core_products(id) on delete set null,
  service_order_type      text not null default 'OTHER'
                            check (service_order_type in (
                              'INSTALLATION', 'DELIVERY', 'DELIVERY_INSTALLATION',
                              'REPAIR', 'MAINTENANCE', 'WARRANTY', 'REPEAT_SERVICE',
                              'GAS_REFILL', 'PART_REPLACEMENT', 'OTHER'
                            )),
  operation_type_code     text
                            check (operation_type_code is null or operation_type_code in ('N', 'M', 'NM', 'I')),
  status                  text not null default 'imported'
                            check (status in (
                              'imported', 'validated', 'pending_assignment',
                              'assigned', 'accepted', 'in_progress', 'arrived',
                              'completed', 'survey_pending', 'archived', 'cancelled'
                            )),
  external_system         text not null default 'ARON',
  external_reference      text not null,
  basvuru_no              text,
  basvuru_nedeni          text,
  basvuru_notu            text,
  bayi                    text,
  randevu_tarihi          timestamptz,
  zaman_slotu             text,
  acik_gun                integer not null default 0 check (acik_gun >= 0),
  assigned_teknisyen      text,
  source_ham_veri_id      uuid,
  first_seen_at           timestamptz not null default now(),
  last_seen_at            timestamptz not null default now(),
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.core_service_orders is
  'Tek servis talebi. ARON FisNo ile 1:1 external_reference. ARON silse bile kayit kalir.';

comment on column public.core_service_orders.source_ham_veri_id is
  'aron_ham_veriler.id referansi (uygulama katmani; FK bilincli olarak eklenmedi — ortam bagimsizligi).';

-- Dis sistem referansi tenant basina tekil (ornegin ARON FisNo)
create unique index if not exists core_service_orders_external_uniq
  on public.core_service_orders (sirket_id, external_system, external_reference);

create index if not exists core_service_orders_sirket_idx
  on public.core_service_orders (sirket_id);

create index if not exists core_service_orders_customer_idx
  on public.core_service_orders (customer_id);

create index if not exists core_service_orders_product_idx
  on public.core_service_orders (product_id)
  where product_id is not null;

create index if not exists core_service_orders_status_idx
  on public.core_service_orders (sirket_id, status);

create index if not exists core_service_orders_type_idx
  on public.core_service_orders (sirket_id, service_order_type);

create index if not exists core_service_orders_randevu_idx
  on public.core_service_orders (sirket_id, randevu_tarihi desc nulls last);

create index if not exists core_service_orders_last_seen_idx
  on public.core_service_orders (sirket_id, last_seen_at desc);

create index if not exists core_service_orders_ham_veri_idx
  on public.core_service_orders (source_ham_veri_id)
  where source_ham_veri_id is not null;

-- ---------------------------------------------------------------------
-- core_external_references — dis sistem ID <-> Core V1 entity koprusu
-- ---------------------------------------------------------------------
create table if not exists public.core_external_references (
  id                uuid primary key default gen_random_uuid(),
  sirket_id         uuid not null,
  entity_type       text not null
                      check (entity_type in ('customer', 'product', 'service_order')),
  entity_id         uuid not null,
  external_system   text not null,
  external_id       text not null,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

comment on table public.core_external_references is
  'Dis sistem anahtarlari ile Core V1 entity eslemesi. Append-only; gecmis korunur.';

create unique index if not exists core_external_references_uniq
  on public.core_external_references (sirket_id, external_system, external_id, entity_type);

create index if not exists core_external_references_entity_idx
  on public.core_external_references (entity_type, entity_id);

create index if not exists core_external_references_lookup_idx
  on public.core_external_references (sirket_id, external_system, external_id);

-- ---------------------------------------------------------------------
-- updated_at trigger (service orders only)
-- ---------------------------------------------------------------------
drop trigger if exists core_service_orders_set_updated_at on public.core_service_orders;
create trigger core_service_orders_set_updated_at
  before update on public.core_service_orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Kurumsal hafiza: hard delete yasak
-- ---------------------------------------------------------------------
drop trigger if exists core_service_orders_deny_delete on public.core_service_orders;
create trigger core_service_orders_deny_delete
  before delete on public.core_service_orders
  for each row execute function public.core_v1_deny_delete();

drop trigger if exists core_external_references_deny_delete on public.core_external_references;
create trigger core_external_references_deny_delete
  before delete on public.core_external_references
  for each row execute function public.core_v1_deny_delete();

create or replace function public.core_v1_deny_update()
returns trigger
language plpgsql
as $$
begin
  raise exception '% satirlari guncellenemez (Core V1 append-only kurali)', TG_TABLE_NAME
    using errcode = '42501';
end;
$$;

drop trigger if exists core_external_references_deny_update on public.core_external_references;
create trigger core_external_references_deny_update
  before update on public.core_external_references
  for each row execute function public.core_v1_deny_update();
