-- =====================================================================
-- Bayii Operasyon Merkezi V1
-- Paralel modul: mevcut operasyon tablolarina dokunmaz.
-- Supabase SQL Editor'de calistirin.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- bayi_kartlari (muhasebe_cariler bayi kaydina ek CRM alanlari)
-- ---------------------------------------------------------------------
create table if not exists public.bayi_kartlari (
  id                  uuid primary key default gen_random_uuid(),
  sirket_id           uuid not null,
  bayi_cari_id        uuid,
  bayi_adi            text not null,
  yetkili_kisi        text,
  telefon             text,
  whatsapp            text,
  email               text,
  magaza_adresi       text,
  depo_adresi         text,
  son_ziyaret_tarihi  date,
  son_gorusme_tarihi  timestamptz,
  son_sikayet         text,
  son_tesekkur        text,
  sadakat_skoru       integer default 0 check (sadakat_skoru >= 0 and sadakat_skoru <= 100),
  risk_skoru          integer default 0 check (risk_skoru >= 0 and risk_skoru <= 100),
  risk_seviyesi       text default 'dusuk'
                        check (risk_seviyesi in ('dusuk', 'orta', 'yuksek', 'kritik')),
  aylik_is_hacmi      integer default 0,
  performans_puani    integer default 0 check (performans_puani >= 0 and performans_puani <= 100),
  durum               text not null default 'aktif'
                        check (durum in ('aktif', 'pasif')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bayi_kartlari_sirket_idx on public.bayi_kartlari (sirket_id);
create index if not exists bayi_kartlari_cari_idx on public.bayi_kartlari (bayi_cari_id);
create index if not exists bayi_kartlari_risk_idx on public.bayi_kartlari (risk_seviyesi);

-- ---------------------------------------------------------------------
-- bayi_talepleri
-- ---------------------------------------------------------------------
create table if not exists public.bayi_talepleri (
  id                    uuid primary key default gen_random_uuid(),
  sirket_id             uuid not null,
  bayi_kart_id          uuid references public.bayi_kartlari(id) on delete set null,
  bayi_cari_id          uuid,
  talep_no              text,
  talep_turu            text not null
                          check (talep_turu in (
                            'montaj', 'ariza', 'acil', 'tekrar_servis',
                            'randevu_sorgu', 'randevu_degisiklik',
                            'adres_guncelle', 'telefon_guncelle',
                            'musteri_bilgi', 'sikayet'
                          )),
  durum                 text not null default 'alindi'
                          check (durum in (
                            'alindi', 'inceleniyor', 'planlandi', 'atandi',
                            'yolda', 'tamamlandi', 'ulasilamadi', 'kapandi', 'iptal'
                          )),
  oncelik               text not null default 'normal'
                          check (oncelik in ('normal', 'acil', 'kritik')),
  musteri_adi           text,
  telefon               text,
  alternatif_telefon    text,
  adres                 text,
  il                    text,
  ilce                  text,
  mahalle               text,
  urun_turu             text,
  model                 text,
  seri_no               text,
  satis_tarihi          date,
  aciklama              text,
  personel_notu         text,
  ai_analiz_json        jsonb,
  ai_guven_skoru        numeric(5, 2),
  sorumlu_departman     text
                          check (sorumlu_departman is null or sorumlu_departman in (
                            'operasyon', 'depo', 'muhasebe',
                            'teknik_destek', 'yonetici', 'bayi_iliskileri'
                          )),
  sla_hedef_dk          integer,
  sla_asildi_mi         boolean not null default false,
  kaynak                text not null default 'portal'
                          check (kaynak in ('portal', 'whatsapp', 'manuel', 'ai')),
  olusturan_kisi        text,
  olusturan_personel_id uuid,
  ilgili_is_emri_id     uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists bayi_talepleri_sirket_idx on public.bayi_talepleri (sirket_id);
create index if not exists bayi_talepleri_bayi_kart_idx on public.bayi_talepleri (bayi_kart_id);
create index if not exists bayi_talepleri_durum_idx on public.bayi_talepleri (durum);
create index if not exists bayi_talepleri_tur_idx on public.bayi_talepleri (talep_turu);
create index if not exists bayi_talepleri_oncelik_idx on public.bayi_talepleri (oncelik);
create index if not exists bayi_talepleri_created_idx on public.bayi_talepleri (created_at desc);

-- ---------------------------------------------------------------------
-- bayi_talep_belgeleri
-- ---------------------------------------------------------------------
create table if not exists public.bayi_talep_belgeleri (
  id              uuid primary key default gen_random_uuid(),
  sirket_id       uuid not null,
  bayi_talep_id   uuid not null references public.bayi_talepleri(id) on delete cascade,
  storage_bucket  text not null default 'belgeler',
  storage_path    text not null,
  public_url      text,
  dosya_adi       text,
  mime_type       text,
  ocr_json        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists bayi_talep_belgeleri_talep_idx on public.bayi_talep_belgeleri (bayi_talep_id);

-- ---------------------------------------------------------------------
-- bayi_talep_mesajlari
-- ---------------------------------------------------------------------
create table if not exists public.bayi_talep_mesajlari (
  id                uuid primary key default gen_random_uuid(),
  sirket_id         uuid not null,
  bayi_talep_id     uuid not null references public.bayi_talepleri(id) on delete cascade,
  gonderen_tip      text not null default 'personel'
                      check (gonderen_tip in ('bayi', 'personel', 'sistem', 'ai')),
  gonderen_ad       text,
  gonderen_personel_id uuid,
  mesaj_icerik      text not null,
  ai_analiz_json    jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists bayi_talep_mesajlari_talep_idx on public.bayi_talep_mesajlari (bayi_talep_id, created_at);

-- ---------------------------------------------------------------------
-- updated_at trigger (paylasimli fonksiyon varsa kullan)
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

drop trigger if exists bayi_kartlari_set_updated_at on public.bayi_kartlari;
create trigger bayi_kartlari_set_updated_at
  before update on public.bayi_kartlari
  for each row execute function public.set_updated_at();

drop trigger if exists bayi_talepleri_set_updated_at on public.bayi_talepleri;
create trigger bayi_talepleri_set_updated_at
  before update on public.bayi_talepleri
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.bayi_kartlari enable row level security;
alter table public.bayi_talepleri enable row level security;
alter table public.bayi_talep_belgeleri enable row level security;
alter table public.bayi_talep_mesajlari enable row level security;

drop policy if exists bayi_kartlari_auth_all on public.bayi_kartlari;
create policy bayi_kartlari_auth_all on public.bayi_kartlari
  for all to authenticated using (true) with check (true);

drop policy if exists bayi_talepleri_auth_all on public.bayi_talepleri;
create policy bayi_talepleri_auth_all on public.bayi_talepleri
  for all to authenticated using (true) with check (true);

drop policy if exists bayi_talep_belgeleri_auth_all on public.bayi_talep_belgeleri;
create policy bayi_talep_belgeleri_auth_all on public.bayi_talep_belgeleri
  for all to authenticated using (true) with check (true);

drop policy if exists bayi_talep_mesajlari_auth_all on public.bayi_talep_mesajlari;
create policy bayi_talep_mesajlari_auth_all on public.bayi_talep_mesajlari
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- moduller kaydi
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'moduller'
  ) then
    insert into public.moduller (kod, ad, aciklama, kategori, standart, aktif, sira)
    select
      'bayi_operasyon_merkezi',
      'Bayii Operasyon Merkezi',
      'Bayi talepleri, montaj, arıza, acil servis ve operasyon takibi',
      'operasyon',
      false,
      true,
      120
    where not exists (
      select 1 from public.moduller where kod = 'bayi_operasyon_merkezi'
    );
  end if;
end$$;
