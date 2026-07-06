-- ---------------------------------------------------------------------
-- 041_ekip_gorev_tipleri.sql
-- Ekip görev tipi merkezi tanımları
-- Idempotent. Supabase SQL Editor'de çalıştırın.
-- ---------------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.ekip_gorev_tipleri (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  ad text not null,
  performans_seti text not null,
  varsayilan_personel_sayisi integer null,
  varsayilan_arac_tipi text null,
  sira integer not null default 100,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

create index if not exists ekip_gorev_tipleri_aktif_sira_idx
  on public.ekip_gorev_tipleri (aktif, sira);

insert into public.ekip_gorev_tipleri (
  kod,
  ad,
  performans_seti,
  varsayilan_personel_sayisi,
  varsayilan_arac_tipi,
  sira
)
values
  ('ariza', 'Arıza', 'ariza', 1, 'Servis Aracı', 10),
  ('montaj', 'Montaj', 'montaj', 2, 'Panelvan', 20),
  ('nakliye', 'Nakliye', 'nakliye', 2, 'Kamyonet', 30),
  ('nakliye_montaj', 'Nakliye + Montaj', 'nakliye_montaj', 2, 'Kamyonet', 40),
  ('servis', 'Genel Servis', 'genel', 1, 'Servis Aracı', 50)
on conflict (kod) do update set
  ad = excluded.ad,
  performans_seti = excluded.performans_seti,
  varsayilan_personel_sayisi = excluded.varsayilan_personel_sayisi,
  varsayilan_arac_tipi = excluded.varsayilan_arac_tipi,
  sira = excluded.sira,
  aktif = true,
  updated_at = now();
