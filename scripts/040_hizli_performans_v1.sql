-- ---------------------------------------------------------------------
-- 040_hizli_performans_v1.sql
-- Hızlı Performans Veri Modülü V1
-- Bağımsız modül
-- Matris veri seti destekli
-- ---------------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.hizli_performans_kayitlari (
  id uuid primary key default gen_random_uuid(),

  tarih date not null default current_date,

  kaynak text not null default 'matris_veri',
  veri_turu text not null default 'puan',
  baslik text,

  teknisyen_id uuid,
  teknisyen_ad_soyad text not null default 'Belirtilmemiş',

  nps numeric(10,2) not null default 0,
  sikayet numeric(10,2) not null default 0,
  randevu numeric(10,2) not null default 0,
  tamamlayici numeric(10,2) not null default 0,
  ek_garanti numeric(10,2) not null default 0,
  puan numeric(10,2) not null default 0,

  durum text not null default 'aktif'
    check (durum in ('aktif', 'haric')),

  haric_nedeni text,
  aciklama text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hizli_performans_tarih
on public.hizli_performans_kayitlari (tarih);

create index if not exists idx_hizli_performans_durum
on public.hizli_performans_kayitlari (durum);

create index if not exists idx_hizli_performans_teknisyen
on public.hizli_performans_kayitlari (teknisyen_ad_soyad);

create index if not exists idx_hizli_performans_veri_turu
on public.hizli_performans_kayitlari (veri_turu);

create or replace function public.set_hizli_performans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hizli_performans_updated_at
on public.hizli_performans_kayitlari;

create trigger trg_hizli_performans_updated_at
before update on public.hizli_performans_kayitlari
for each row
execute function public.set_hizli_performans_updated_at();

alter table public.hizli_performans_kayitlari enable row level security;

drop policy if exists "hizli_performans_select_authenticated"
on public.hizli_performans_kayitlari;

create policy "hizli_performans_select_authenticated"
on public.hizli_performans_kayitlari
for select
to authenticated
using (true);

drop policy if exists "hizli_performans_insert_authenticated"
on public.hizli_performans_kayitlari;

create policy "hizli_performans_insert_authenticated"
on public.hizli_performans_kayitlari
for insert
to authenticated
with check (true);

drop policy if exists "hizli_performans_update_authenticated"
on public.hizli_performans_kayitlari;

create policy "hizli_performans_update_authenticated"
on public.hizli_performans_kayitlari
for update
to authenticated
using (true)
with check (true);

drop policy if exists "hizli_performans_delete_authenticated"
on public.hizli_performans_kayitlari;

create policy "hizli_performans_delete_authenticated"
on public.hizli_performans_kayitlari
for delete
to authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.hizli_performans_kayitlari to authenticated;
grant select on public.hizli_performans_kayitlari to anon;

notify pgrst, 'reload schema';

select
  to_regclass('public.hizli_performans_kayitlari') as tablo_kontrol;
  