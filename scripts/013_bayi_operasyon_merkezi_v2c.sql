-- =====================================================================
-- Bayii Operasyon Merkezi V2c
-- Bilgilendirme dis referans + webhook log
-- 012 sonrası calistirin.
-- =====================================================================

alter table public.bayi_bilgilendirme_kuyrugu
  add column if not exists dis_ref text;

create index if not exists bayi_bilgilendirme_dis_ref_idx
  on public.bayi_bilgilendirme_kuyrugu (dis_ref)
  where dis_ref is not null;

-- ---------------------------------------------------------------------
-- bayi_whatsapp_webhook_loglari
-- ---------------------------------------------------------------------
create table if not exists public.bayi_whatsapp_webhook_loglari (
  id              uuid primary key default gen_random_uuid(),
  sirket_id       uuid,
  kaynak          text not null default 'meta'
                    check (kaynak in ('meta', 'stub', 'test')),
  telefon         text,
  mesaj           text,
  meta_message_id text,
  talep_id        uuid references public.bayi_talepleri(id) on delete set null,
  durum           text not null default 'islendi'
                    check (durum in ('islendi', 'hata', 'yok_sayildi')),
  hata_mesaji     text,
  created_at      timestamptz not null default now()
);

create index if not exists bayi_whatsapp_webhook_log_created_idx
  on public.bayi_whatsapp_webhook_loglari (created_at desc);

alter table public.bayi_whatsapp_webhook_loglari enable row level security;

drop policy if exists bayi_whatsapp_webhook_log_auth_all on public.bayi_whatsapp_webhook_loglari;
create policy bayi_whatsapp_webhook_log_auth_all on public.bayi_whatsapp_webhook_loglari
  for all to authenticated using (true) with check (true);
