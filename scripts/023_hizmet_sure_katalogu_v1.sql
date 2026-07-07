-- Hizmet Süre Kataloğu V1 — referans süre tablosu + modül kaydı
-- Idempotent. Supabase SQL Editor'de çalıştırın.

create extension if not exists "pgcrypto";

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
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint hizmet_sure_katalogu_kod_unique unique (hizmet_kodu)
);

create index if not exists hizmet_sure_katalogu_aktif_idx
  on public.hizmet_sure_katalogu (aktif);

create index if not exists hizmet_sure_katalogu_is_tipi_idx
  on public.hizmet_sure_katalogu (is_tipi);

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
