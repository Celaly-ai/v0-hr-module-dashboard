-- =====================================================================
-- Bayii Operasyon Merkezi V2
-- Operasyon köprüsü, SLA uyarıları, operasyon bekleyen kuyruk
-- Supabase SQL Editor'de 010 sonrası calistirin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- bayi_talepleri ek kolonlar
-- ---------------------------------------------------------------------
alter table public.bayi_talepleri
  add column if not exists operasyon_fis_no text,
  add column if not exists operasyon_aktarildi_mi boolean not null default false,
  add column if not exists operasyon_aktarim_tarihi timestamptz;

create index if not exists bayi_talepleri_operasyon_fis_idx
  on public.bayi_talepleri (operasyon_fis_no)
  where operasyon_fis_no is not null;

-- ---------------------------------------------------------------------
-- bayi_talep_operasyon_bekleyen (havuz aktarım kuyruğu)
-- ---------------------------------------------------------------------
create table if not exists public.bayi_talep_operasyon_bekleyen (
  id                    uuid primary key default gen_random_uuid(),
  sirket_id             uuid not null,
  bayi_talep_id         uuid not null references public.bayi_talepleri(id) on delete cascade,
  fis_no                text not null,
  havuz_payload         jsonb not null default '{}'::jsonb,
  durum                 text not null default 'bekliyor'
                          check (durum in ('bekliyor', 'aktarildi', 'hata')),
  operasyon_havuzu_id   uuid,
  hata_mesaji           text,
  aktaran_personel_id   uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (bayi_talep_id),
  unique (fis_no)
);

create index if not exists bayi_talep_operasyon_bekleyen_durum_idx
  on public.bayi_talep_operasyon_bekleyen (durum, created_at desc);

-- ---------------------------------------------------------------------
-- bayi_sla_uyarilari (yönetici SLA bildirimleri)
-- ---------------------------------------------------------------------
create table if not exists public.bayi_sla_uyarilari (
  id              uuid primary key default gen_random_uuid(),
  sirket_id       uuid not null,
  bayi_talep_id   uuid not null references public.bayi_talepleri(id) on delete cascade,
  uyari_tipi      text not null
                    check (uyari_tipi in ('sla_asildi', 'acil_bekleyen', 'kritik_bayi')),
  mesaj           text not null,
  okundu_mi       boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists bayi_sla_uyarilari_okunmamis_idx
  on public.bayi_sla_uyarilari (sirket_id, okundu_mi, created_at desc);

create index if not exists bayi_sla_uyarilari_talep_idx
  on public.bayi_sla_uyarilari (bayi_talep_id, uyari_tipi, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
drop trigger if exists bayi_talep_operasyon_bekleyen_set_updated_at
  on public.bayi_talep_operasyon_bekleyen;
create trigger bayi_talep_operasyon_bekleyen_set_updated_at
  before update on public.bayi_talep_operasyon_bekleyen
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.bayi_talep_operasyon_bekleyen enable row level security;
alter table public.bayi_sla_uyarilari enable row level security;

drop policy if exists bayi_talep_operasyon_bekleyen_auth_all on public.bayi_talep_operasyon_bekleyen;
create policy bayi_talep_operasyon_bekleyen_auth_all on public.bayi_talep_operasyon_bekleyen
  for all to authenticated using (true) with check (true);

drop policy if exists bayi_sla_uyarilari_auth_all on public.bayi_sla_uyarilari;
create policy bayi_sla_uyarilari_auth_all on public.bayi_sla_uyarilari
  for all to authenticated using (true) with check (true);
