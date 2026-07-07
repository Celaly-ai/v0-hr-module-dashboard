-- ---------------------------------------------------------------------
-- 042_ekip_calisma_tipleri.sql
-- Ekip çalışma tipi merkezi tanımları + ekipler kolonları
-- Idempotent. Supabase SQL Editor'de çalıştırın.
-- ---------------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.ekip_calisma_tipleri (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  ad text not null,
  aciklama text null,
  sira integer not null default 100,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

create index if not exists ekip_calisma_tipleri_aktif_sira_idx
  on public.ekip_calisma_tipleri (aktif, sira);

insert into public.ekip_calisma_tipleri (
  kod,
  ad,
  aciklama,
  sira
)
values
  ('normal', 'Normal', 'Bölgesinde çalışan standart ekip', 10),
  ('joker', 'Joker', 'Acil ve yük dengelemede kullanılan ekip', 20),
  ('mobil', 'Mobil', 'Bölgeden bağımsız dolaşan ekip', 30),
  ('proje', 'Proje', 'Geçici proje ekibi', 40),
  ('gece', 'Gece', 'Gece vardiyası', 50),
  ('hafta_sonu', 'Hafta Sonu', 'Hafta sonu çalışan ekip', 60),
  ('vip', 'VIP', 'VIP müşterilere hizmet veren ekip', 70),
  ('yedek', 'Yedek', 'Gerektiğinde devreye giren ekip', 80)
on conflict (kod) do update set
  ad = excluded.ad,
  aciklama = excluded.aciklama,
  sira = excluded.sira,
  aktif = true,
  updated_at = now();

alter table public.ekipler
  add column if not exists calisma_tipi text not null default 'normal';

alter table public.ekipler
  add column if not exists oncelik integer not null default 50;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ekipler_calisma_tipi_check'
      and conrelid = 'public.ekipler'::regclass
  ) then
    alter table public.ekipler
      add constraint ekipler_calisma_tipi_check
      check (
        calisma_tipi in (
          'normal',
          'joker',
          'mobil',
          'proje',
          'gece',
          'hafta_sonu',
          'vip',
          'yedek'
        )
      );
  end if;
end $$;
