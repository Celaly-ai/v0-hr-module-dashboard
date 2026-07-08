-- Ürün Takip Zinciri V1
-- Seri no + model üzerinden ürün takip ve zimmet zinciri

-- ---------------------------------------------------------------------
-- urun_takip_kayitlari
-- ---------------------------------------------------------------------
create table if not exists public.urun_takip_kayitlari (
  id uuid primary key default gen_random_uuid(),
  fis_no text not null,
  seri_no text not null,
  model text not null,
  barkod text null,
  hasar_durumu text not null default 'hasarsiz'
    check (hasar_durumu in ('hasarsiz', 'hasarli')),
  hasar_aciklama text null,
  hasar_foto_url text null,
  kaynak text null
    check (kaynak is null or kaynak in ('musteri', 'bod', 'bayii', 'kargo', 'degisim')),
  bayi_kodu text null,
  durum text not null default 'serviste'
    check (durum in (
      'serviste',
      'teknisyende',
      'atolyede',
      'teslim_edildi',
      'iade_edildi',
      'nakliye',
      'nakliye_montaj'
    )),
  zimmetli_personel_id uuid null,
  zimmetli_personel_ad text null,
  aktif_zimmet boolean not null default true,
  son_islem_tipi text null,
  son_islem_at timestamptz null,
  son_konum_lat numeric null,
  son_konum_lng numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint urun_takip_kayitlari_seri_model_unique unique (seri_no, model)
);

create index if not exists urun_takip_kayitlari_created_idx
  on public.urun_takip_kayitlari (created_at desc);

create index if not exists urun_takip_kayitlari_aktif_idx
  on public.urun_takip_kayitlari (aktif_zimmet, durum);

create index if not exists urun_takip_kayitlari_personel_aktif_idx
  on public.urun_takip_kayitlari (zimmetli_personel_id)
  where aktif_zimmet = true;

-- ---------------------------------------------------------------------
-- Hasar fotoğrafları storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('urun-takip', 'urun-takip', true)
on conflict (id) do update set public = true;

drop policy if exists urun_takip_storage_read on storage.objects;
create policy urun_takip_storage_read on storage.objects
  for select to authenticated
  using (bucket_id = 'urun-takip');

drop policy if exists urun_takip_storage_insert on storage.objects;
create policy urun_takip_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'urun-takip');

drop policy if exists urun_takip_storage_update on storage.objects;
create policy urun_takip_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'urun-takip')
  with check (bucket_id = 'urun-takip');

-- ---------------------------------------------------------------------
-- urun_takip_loglari
-- ---------------------------------------------------------------------
create table if not exists public.urun_takip_loglari (
  id uuid primary key default gen_random_uuid(),
  urun_takip_id uuid not null references public.urun_takip_kayitlari(id) on delete cascade,
  fis_no text null,
  seri_no text not null,
  model text not null,
  barkod text null,
  islem_tipi text not null,
  onceki_durum text null,
  yeni_durum text null,
  aciklama text null,
  personel_id uuid null,
  personel_ad text null,
  konum_lat numeric null,
  konum_lng numeric null,
  created_at timestamptz not null default now()
);

create index if not exists urun_takip_loglari_urun_idx
  on public.urun_takip_loglari (urun_takip_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_urun_takip_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_urun_takip_kayitlari_updated_at on public.urun_takip_kayitlari;
create trigger trg_urun_takip_kayitlari_updated_at
  before update on public.urun_takip_kayitlari
  for each row
  execute function public.set_urun_takip_updated_at();

-- ---------------------------------------------------------------------
-- RLS (select / insert / update — delete yok)
-- ---------------------------------------------------------------------
alter table public.urun_takip_kayitlari enable row level security;
alter table public.urun_takip_loglari enable row level security;

drop policy if exists urun_takip_kayitlari_select on public.urun_takip_kayitlari;
create policy urun_takip_kayitlari_select on public.urun_takip_kayitlari
  for select to authenticated using (true);

drop policy if exists urun_takip_kayitlari_insert on public.urun_takip_kayitlari;
create policy urun_takip_kayitlari_insert on public.urun_takip_kayitlari
  for insert to authenticated with check (true);

drop policy if exists urun_takip_kayitlari_update on public.urun_takip_kayitlari;
create policy urun_takip_kayitlari_update on public.urun_takip_kayitlari
  for update to authenticated using (true) with check (true);

drop policy if exists urun_takip_loglari_select on public.urun_takip_loglari;
create policy urun_takip_loglari_select on public.urun_takip_loglari
  for select to authenticated using (true);

drop policy if exists urun_takip_loglari_insert on public.urun_takip_loglari;
create policy urun_takip_loglari_insert on public.urun_takip_loglari
  for insert to authenticated with check (true);

drop policy if exists urun_takip_loglari_update on public.urun_takip_loglari;
create policy urun_takip_loglari_update on public.urun_takip_loglari
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- moduller kaydı
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'moduller'
  ) then
    insert into public.moduller (kod, ad, aciklama, kategori, standart, aktif, sira)
    select
      'urun_takip_zinciri',
      'Ürün Takip Zinciri',
      'Mobil barkod ile zimmet alma ve zimmet düşme.',
      'operasyon',
      false,
      true,
      130
    where not exists (
      select 1 from public.moduller where kod = 'urun_takip_zinciri'
    );

    update public.moduller
    set
      ad = 'Ürün Takip Zinciri',
      aciklama = 'Mobil barkod ile zimmet alma ve zimmet düşme.',
      kategori = 'operasyon',
      standart = false,
      aktif = true,
      sira = 130
    where kod = 'urun_takip_zinciri';
  end if;
end$$;
