-- ARON Ham Veri Merkezi V1
-- Eski ARON'dan çekilen ham verilerin arşivlenmesi

-- ---------------------------------------------------------------------
-- aron_ham_veri_arsivi
-- ---------------------------------------------------------------------
create table if not exists public.aron_ham_veri_arsivi (
  id uuid primary key default gen_random_uuid(),
  veri_kaynagi text not null,
  veri_adi text not null,
  kaynak_tipi text not null default 'angular_scope',
  tarih_baslangic date null,
  tarih_bitis date null,
  kayit_sayisi integer not null default 0,
  ham_json jsonb not null,
  kaynak_sayfa text null,
  dosya_yolu text null,
  durum text not null default 'basarili',
  hata text null,
  checksum text null,
  created_at timestamptz not null default now()
);

create index if not exists aron_ham_veri_arsivi_veri_kaynagi_idx
  on public.aron_ham_veri_arsivi (veri_kaynagi);

create index if not exists aron_ham_veri_arsivi_veri_adi_idx
  on public.aron_ham_veri_arsivi (veri_adi);

create index if not exists aron_ham_veri_arsivi_created_at_idx
  on public.aron_ham_veri_arsivi (created_at desc);

create index if not exists aron_ham_veri_arsivi_tarih_araligi_idx
  on public.aron_ham_veri_arsivi (tarih_baslangic, tarih_bitis);

comment on table public.aron_ham_veri_arsivi is
  'Eski ARON''dan alınan ham JSON arşivi. Kayıtlar silinmez; sonradan analiz ve AI için işlenir.';

-- ---------------------------------------------------------------------
-- RLS (select / insert — delete yok)
-- ---------------------------------------------------------------------
alter table public.aron_ham_veri_arsivi enable row level security;

drop policy if exists aron_ham_veri_arsivi_select on public.aron_ham_veri_arsivi;
create policy aron_ham_veri_arsivi_select on public.aron_ham_veri_arsivi
  for select to authenticated using (true);

drop policy if exists aron_ham_veri_arsivi_insert on public.aron_ham_veri_arsivi;
create policy aron_ham_veri_arsivi_insert on public.aron_ham_veri_arsivi
  for insert to authenticated with check (true);

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
      'aron_ham_veri_merkezi',
      'ARON Ham Veri Merkezi',
      'Eski ARON''dan çekilen tüm verileri ham arşiv olarak saklar.',
      'operasyon',
      false,
      true,
      140
    where not exists (
      select 1 from public.moduller where kod = 'aron_ham_veri_merkezi'
    );

    update public.moduller
    set
      ad = 'ARON Ham Veri Merkezi',
      aciklama = 'Eski ARON''dan çekilen tüm verileri ham arşiv olarak saklar.',
      kategori = 'operasyon',
      standart = false,
      aktif = true,
      sira = 140
    where kod = 'aron_ham_veri_merkezi';
  end if;
end$$;
