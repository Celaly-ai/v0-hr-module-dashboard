-- Hizmet Süre Kataloğu V1 — referans süre tablosu + modül kaydı
-- Idempotent. Supabase SQL Editor'de çalıştırın.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Merkezi hizmet tipi sözlüğü
-- ---------------------------------------------------------------------------

create table if not exists public.hizmet_tipleri (
  id                  uuid primary key default gen_random_uuid(),
  kod                 text not null,
  ad                  text not null,
  kategori            text,
  varsayilan_sure_dk  integer,
  varsayilan_yetenek  text,
  sira                integer not null default 100,
  aktif               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  constraint hizmet_tipleri_kod_unique unique (kod)
);

create index if not exists hizmet_tipleri_aktif_sira_idx
  on public.hizmet_tipleri (aktif, sira, ad);

insert into public.hizmet_tipleri (kod, ad, sira)
values
  ('A',  'Arıza',                         10),
  ('K',  'Keşif',                         20),
  ('B',  'Bakım',                         30),
  ('P',  'Periyodik Bakım',               40),
  ('D',  'Demontaj',                      50),
  ('M',  'Montaj',                        60),
  ('N',  'Nakliye',                       70),
  ('NM', 'Nakliye + Montaj',              80),
  ('KM', 'Kurulum + Montaj',              90),
  ('NK', 'Nakliye + Kurulum',            100),
  ('EG', 'Ek Garanti',                   110),
  ('TS', 'Tamamlayıcı Satış',            120),
  ('IA', 'İade Alma',                    130),
  ('HT', 'Hurda Toplama',                140),
  ('YP', 'Yerinde Parça',                150),
  ('TP', 'Teknik Planlama',              160),
  ('EK', 'Eğitim / Kullanıcı Bilgilendirme', 170),
  ('DK', 'Değişim Kurulumu',             180),
  ('SK', 'Söküm',                        190),
  ('TK', 'Tekrar Kontrol',               200)
on conflict (kod) do update set
  ad = excluded.ad,
  sira = excluded.sira,
  aktif = true,
  updated_at = now();

alter table public.hizmet_tipleri enable row level security;

drop policy if exists "hizmet_tipleri_select_authenticated"
  on public.hizmet_tipleri;

create policy "hizmet_tipleri_select_authenticated"
  on public.hizmet_tipleri
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Hizmet süre kataloğu
-- ---------------------------------------------------------------------------

create table if not exists public.hizmet_sure_katalogu (
  id                  uuid primary key default gen_random_uuid(),
  hizmet_kodu         text not null,
  hizmet_adi          text not null,
  is_tipi             text,
  gerekli_yetenek     text,
  referans_sure_dk    integer not null check (referans_sure_dk > 0),
  zorluk_katsayisi    numeric(5, 2) not null default 1.00
                        check (zorluk_katsayisi > 0),
  aktif               boolean not null default true,
  kaynak              text not null default 'manuel'
                        check (kaynak in ('manuel', 'saha_ogrenimi')),
  aciklama            text,
  ogrenmeye_acik      boolean not null default true,
  ai_guncelleyebilir  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint hizmet_sure_katalogu_kod_unique unique (hizmet_kodu)
);

create index if not exists hizmet_sure_katalogu_aktif_idx
  on public.hizmet_sure_katalogu (aktif);

create index if not exists hizmet_sure_katalogu_is_tipi_idx
  on public.hizmet_sure_katalogu (is_tipi);

alter table public.hizmet_sure_katalogu
  add column if not exists ogrenmeye_acik boolean not null default true;

alter table public.hizmet_sure_katalogu
  add column if not exists ai_guncelleyebilir boolean not null default false;

create table if not exists public.hizmet_sure_katalogu_yukleme_loglari (
  id              uuid primary key default gen_random_uuid(),
  dosya_adi       text not null,
  toplam_satir    integer not null default 0,
  yeni_eklenen    integer not null default 0,
  guncellenen     integer not null default 0,
  hatali          integer not null default 0,
  hata_detayi     jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists hizmet_sure_katalogu_yukleme_loglari_created_idx
  on public.hizmet_sure_katalogu_yukleme_loglari (created_at desc);

insert into public.hizmet_sure_katalogu (
  hizmet_kodu,
  hizmet_adi,
  is_tipi,
  gerekli_yetenek,
  referans_sure_dk,
  aciklama
)
values
  ('N', 'Nakliye', 'N', null, 45, 'Standart nakliye süresi'),
  ('M', 'Montaj', 'M', null, 60, 'Standart montaj süresi'),
  ('NM', 'Nakliye + Montaj', 'NM', null, 90, 'Kombine nakliye ve montaj'),
  ('N_KLIMA', 'Klima Nakliye', 'N', 'klima', 55, 'Klima nakliye'),
  ('M_KLIMA', 'Klima Montaj', 'M', 'klima', 75, 'Klima montaj'),
  ('N_BEYAZ', 'Beyaz Eşya Nakliye', 'N', 'beyaz', 50, 'Beyaz eşya nakliye'),
  ('M_BEYAZ', 'Beyaz Eşya Montaj', 'M', 'beyaz', 70, 'Beyaz eşya montaj')
on conflict (hizmet_kodu) do update set
  hizmet_adi = excluded.hizmet_adi,
  is_tipi = excluded.is_tipi,
  gerekli_yetenek = excluded.gerekli_yetenek,
  referans_sure_dk = excluded.referans_sure_dk,
  aciklama = excluded.aciklama,
  updated_at = now();

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'moduller'
  ) then
    insert into public.moduller (kod, ad, aciklama, kategori, standart, aktif, sira)
    select
      'hizmet_sure_katalogu',
      'Hizmet Süre Kataloğu',
      'Hizmet tipleri için manuel referans süre tanımları. İleride atama motoru kaynağı olacaktır.',
      'operasyon',
      false,
      true,
      109
    where not exists (
      select 1 from public.moduller where kod = 'hizmet_sure_katalogu'
    );

    update public.moduller
    set
      ad = 'Hizmet Süre Kataloğu',
      aciklama = 'Hizmet tipleri için manuel referans süre tanımları. İleride atama motoru kaynağı olacaktır.',
      kategori = 'operasyon',
      standart = false,
      aktif = true
    where kod = 'hizmet_sure_katalogu';
  end if;
end$$;
