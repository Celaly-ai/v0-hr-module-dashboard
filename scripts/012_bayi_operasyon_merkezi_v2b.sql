-- =====================================================================
-- Bayii Operasyon Merkezi V2b
-- Ziyaret merkezi + otomatik bilgilendirme kuyrugu
-- 011 sonrası calistirin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- bayi_ziyaretleri
-- ---------------------------------------------------------------------
create table if not exists public.bayi_ziyaretleri (
  id                uuid primary key default gen_random_uuid(),
  sirket_id         uuid not null,
  bayi_kart_id      uuid not null references public.bayi_kartlari(id) on delete cascade,
  ziyaret_tarihi    date not null default current_date,
  ziyaret_tipi      text not null default 'saha'
                      check (ziyaret_tipi in ('saha', 'telefon', 'magaza', 'online')),
  personel_id       uuid,
  personel_adi      text,
  notlar            text,
  aksiyonlar        jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists bayi_ziyaretleri_bayi_idx
  on public.bayi_ziyaretleri (bayi_kart_id, ziyaret_tarihi desc);

create index if not exists bayi_ziyaretleri_sirket_idx
  on public.bayi_ziyaretleri (sirket_id, ziyaret_tarihi desc);

-- ---------------------------------------------------------------------
-- bayi_bilgilendirme_kuyrugu
-- ---------------------------------------------------------------------
create table if not exists public.bayi_bilgilendirme_kuyrugu (
  id              uuid primary key default gen_random_uuid(),
  sirket_id       uuid not null,
  bayi_talep_id   uuid references public.bayi_talepleri(id) on delete set null,
  bayi_kart_id    uuid references public.bayi_kartlari(id) on delete set null,
  kanal           text not null default 'whatsapp'
                    check (kanal in ('portal', 'whatsapp', 'sms')),
  alici           text,
  mesaj           text not null,
  durum           text not null default 'bekliyor'
                    check (durum in ('bekliyor', 'gonderildi', 'hata', 'iptal')),
  hata_mesaji     text,
  created_at      timestamptz not null default now(),
  gonderim_tarihi timestamptz
);

create index if not exists bayi_bilgilendirme_durum_idx
  on public.bayi_bilgilendirme_kuyrugu (sirket_id, durum, created_at desc);

create index if not exists bayi_bilgilendirme_talep_idx
  on public.bayi_bilgilendirme_kuyrugu (bayi_talep_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.bayi_ziyaretleri enable row level security;
alter table public.bayi_bilgilendirme_kuyrugu enable row level security;

drop policy if exists bayi_ziyaretleri_auth_all on public.bayi_ziyaretleri;
create policy bayi_ziyaretleri_auth_all on public.bayi_ziyaretleri
  for all to authenticated using (true) with check (true);

drop policy if exists bayi_bilgilendirme_auth_all on public.bayi_bilgilendirme_kuyrugu;
create policy bayi_bilgilendirme_auth_all on public.bayi_bilgilendirme_kuyrugu
  for all to authenticated using (true) with check (true);
