-- =====================================================================
-- FeyRoute Core V1 — Operation Events & Identity Match Log
-- Phase-1B: additive only. Mevcut tablolara dokunmaz.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- core_operation_events — append-only operasyon olay gunlugu
-- ---------------------------------------------------------------------
create table if not exists public.core_operation_events (
  id                        uuid primary key default gen_random_uuid(),
  event_type                text not null,
  event_version             integer not null default 1 check (event_version >= 1),
  occurred_at               timestamptz not null default now(),
  recorded_at               timestamptz not null default now(),
  sirket_id                 uuid not null,
  customer_id               uuid references public.core_customers(id) on delete set null,
  product_id                uuid references public.core_products(id) on delete set null,
  service_order_id          uuid references public.core_service_orders(id) on delete set null,
  source_system             text,
  source_reference          text,
  actor_type                text not null default 'system'
                              check (actor_type in ('system', 'human', 'ai', 'connector')),
  actor_id                  uuid,
  actor_label               text,
  event_payload             jsonb not null default '{}'::jsonb,
  correlates_to_event_id    uuid references public.core_operation_events(id) on delete set null,
  ingest_batch_id           uuid,
  idempotency_key           text,
  created_at                timestamptz not null default now()
);

comment on table public.core_operation_events is
  'Append-only olay gunlugu. UPDATE/DELETE yasak. Duzeltmeler yeni olay ile yapilir.';

-- Idempotency: ayni olay tekrar yazilmaz
create unique index if not exists core_operation_events_idempotency_uniq
  on public.core_operation_events (idempotency_key)
  where idempotency_key is not null;

create index if not exists core_operation_events_sirket_idx
  on public.core_operation_events (sirket_id, recorded_at desc);

create index if not exists core_operation_events_type_idx
  on public.core_operation_events (sirket_id, event_type, recorded_at desc);

create index if not exists core_operation_events_service_order_idx
  on public.core_operation_events (service_order_id, recorded_at desc)
  where service_order_id is not null;

create index if not exists core_operation_events_customer_idx
  on public.core_operation_events (customer_id, recorded_at desc)
  where customer_id is not null;

create index if not exists core_operation_events_product_idx
  on public.core_operation_events (product_id, recorded_at desc)
  where product_id is not null;

create index if not exists core_operation_events_batch_idx
  on public.core_operation_events (ingest_batch_id)
  where ingest_batch_id is not null;

create index if not exists core_operation_events_source_ref_idx
  on public.core_operation_events (sirket_id, source_system, source_reference)
  where source_reference is not null;

create index if not exists core_operation_events_correlates_idx
  on public.core_operation_events (correlates_to_event_id)
  where correlates_to_event_id is not null;

-- ---------------------------------------------------------------------
-- core_identity_match_log — ingest eslestirme karar gunlugu
-- ---------------------------------------------------------------------
create table if not exists public.core_identity_match_log (
  id                  uuid primary key default gen_random_uuid(),
  sirket_id           uuid not null,
  ingest_batch_id     uuid,
  source_system       text not null,
  source_reference    text,
  match_type          text not null
                        check (match_type in (
                          'customer_phone', 'product_serial',
                          'service_order_external', 'product_identity_key'
                        )),
  match_result        text not null
                        check (match_result in (
                          'matched', 'created', 'conflict', 'skipped', 'review_required'
                        )),
  input_snapshot      jsonb not null default '{}'::jsonb,
  output_entity_id    uuid,
  decision_reason     text,
  created_at          timestamptz not null default now()
);

comment on table public.core_identity_match_log is
  'Ingest eslestirme kararlarinin kalici kaydi. Append-only.';

create index if not exists core_identity_match_log_sirket_idx
  on public.core_identity_match_log (sirket_id, created_at desc);

create index if not exists core_identity_match_log_batch_idx
  on public.core_identity_match_log (ingest_batch_id)
  where ingest_batch_id is not null;

create index if not exists core_identity_match_log_source_idx
  on public.core_identity_match_log (sirket_id, source_system, source_reference);

create index if not exists core_identity_match_log_result_idx
  on public.core_identity_match_log (sirket_id, match_type, match_result);

-- ---------------------------------------------------------------------
-- Append-only koruma: UPDATE ve DELETE yasak
-- ---------------------------------------------------------------------
create or replace function public.core_v1_deny_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% satirlari degistirilemez (Core V1 append-only kurali)', TG_TABLE_NAME
    using errcode = '42501';
end;
$$;

drop trigger if exists core_operation_events_deny_update on public.core_operation_events;
create trigger core_operation_events_deny_update
  before update on public.core_operation_events
  for each row execute function public.core_v1_deny_mutation();

drop trigger if exists core_operation_events_deny_delete on public.core_operation_events;
create trigger core_operation_events_deny_delete
  before delete on public.core_operation_events
  for each row execute function public.core_v1_deny_delete();

drop trigger if exists core_identity_match_log_deny_update on public.core_identity_match_log;
create trigger core_identity_match_log_deny_update
  before update on public.core_identity_match_log
  for each row execute function public.core_v1_deny_mutation();

drop trigger if exists core_identity_match_log_deny_delete on public.core_identity_match_log;
create trigger core_identity_match_log_deny_delete
  before delete on public.core_identity_match_log
  for each row execute function public.core_v1_deny_delete();
