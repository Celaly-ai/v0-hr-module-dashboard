-- =====================================================================
-- Bayi Operasyon Merkezi P1 — Operasyon Havuzu Köprüsü
-- Additive only. Mevcut kolon/tablo silinmez.
-- Calistirma: 010+ bayi migration'lari sonrasi (011 yoksa bu dosya kapsar).
-- =====================================================================

-- ---------------------------------------------------------------------
-- bayi_talepleri — operasyon aktarım kolonları (011 yedek)
-- ---------------------------------------------------------------------
alter table public.bayi_talepleri
  add column if not exists operasyon_fis_no text,
  add column if not exists operasyon_aktarildi_mi boolean not null default false,
  add column if not exists operasyon_aktarim_tarihi timestamptz;

create index if not exists bayi_talepleri_operasyon_fis_idx
  on public.bayi_talepleri (operasyon_fis_no)
  where operasyon_fis_no is not null;

create index if not exists bayi_talepleri_operasyon_aktarildi_idx
  on public.bayi_talepleri (operasyon_aktarildi_mi, created_at desc)
  where operasyon_aktarildi_mi = true;

-- ---------------------------------------------------------------------
-- bayi_talep_operasyon_bekleyen — aktarım kuyruğu (011 yedek)
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

create index if not exists bayi_talep_operasyon_bekleyen_sirket_idx
  on public.bayi_talep_operasyon_bekleyen (sirket_id, durum);

drop trigger if exists bayi_talep_operasyon_bekleyen_set_updated_at
  on public.bayi_talep_operasyon_bekleyen;
create trigger bayi_talep_operasyon_bekleyen_set_updated_at
  before update on public.bayi_talep_operasyon_bekleyen
  for each row execute function public.set_updated_at();

alter table public.bayi_talep_operasyon_bekleyen enable row level security;

drop policy if exists bayi_talep_operasyon_bekleyen_auth_all on public.bayi_talep_operasyon_bekleyen;
create policy bayi_talep_operasyon_bekleyen_auth_all on public.bayi_talep_operasyon_bekleyen
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- aktif_operasyon_havuzu_v2 — bayi kaynak izleme kolonları
-- ---------------------------------------------------------------------
alter table public.aktif_operasyon_havuzu_v2
  add column if not exists kaynak text,
  add column if not exists bayi_talep_id uuid;

comment on column public.aktif_operasyon_havuzu_v2.kaynak is
  'Kayit kaynagi: aron, bayi_operasyon vb.';

comment on column public.aktif_operasyon_havuzu_v2.bayi_talep_id is
  'Bayi Operasyon Merkezi talep UUID (varsa).';

create index if not exists aktif_operasyon_havuzu_v2_bayi_talep_idx
  on public.aktif_operasyon_havuzu_v2 (bayi_talep_id)
  where bayi_talep_id is not null;

create index if not exists aktif_operasyon_havuzu_v2_kaynak_idx
  on public.aktif_operasyon_havuzu_v2 (kaynak)
  where kaynak is not null;
