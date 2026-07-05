-- ---------------------------------------------------------------------
-- KYM V1.1 Manuel Yükümlülük / Belge Ekleme Altyapısı
-- Dosya: scripts/kym/002_manual_yukumluluk.sql
-- Amaç: AI listesinde olmayan belge, izin, ruhsat, sözleşme veya özel
-- yükümlülüklerin işletme tarafından manuel eklenebilmesi.
-- Mevcut FeyRoute tablolarına dokunmaz.
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. Manuel yükümlülük kaynak tipleri için açıklayıcı alanlar
-- ---------------------------------------------------------------------

create table if not exists public.kym_ozel_yukumluluklar (
  id uuid primary key default uuid_generate_v4(),

  isletme_id uuid not null references public.kym_isletmeler(id) on delete cascade,

  kaynak_tipi text not null default 'manuel',
  kaynak_aciklama text,

  kayit_tipi text not null default 'belge',
  baslik text not null,
  kategori text not null,
  alt_kategori text,

  zorunluluk_tipi text not null default 'manuel',
  hukuki_dayanak text,
  denetleyen_kurum text,

  basvuru_yeri text,
  yenileme_periyodu text,

  aciklama text,
  risk_puani integer not null default 50 check (risk_puani between 0 and 100),
  oncelik text not null default 'P3',

  ai_ogrenme_havuzuna_alinsin boolean not null default true,
  aktif boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint kym_ozel_yukumluluklar_kaynak_tipi_check
    check (kaynak_tipi in (
      'kanun',
      'yonetmelik',
      'teblig',
      'belediye',
      'sgk',
      'vergi',
      'marka',
      'osgb',
      'avukat',
      'mali_musavir',
      'musteri',
      'iso',
      'sirket_politikasi',
      'yonetim_karari',
      'manuel',
      'diger'
    )),

  constraint kym_ozel_yukumluluklar_kayit_tipi_check
    check (kayit_tipi in (
      'yukumluluk',
      'belge',
      'izin',
      'ruhsat',
      'sozlesme',
      'taahhutname',
      'form',
      'denetim_evraki',
      'egitim',
      'prosedur',
      'diger'
    ))
);

-- ---------------------------------------------------------------------
-- 2. Updated at trigger
-- ---------------------------------------------------------------------

drop trigger if exists trg_kym_ozel_yukumluluklar_updated_at on public.kym_ozel_yukumluluklar;

create trigger trg_kym_ozel_yukumluluklar_updated_at
before update on public.kym_ozel_yukumluluklar
for each row execute function public.kym_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Manuel yükümlülüğü ana KYM yapısına aktaran fonksiyon
-- Bu fonksiyon:
-- 1) kym_yukumluluklar kaydı oluşturur
-- 2) kym_belge_tanimlari kaydı oluşturur
-- 3) kym_isletme_belgeleri kaydı oluşturur
-- ---------------------------------------------------------------------

create or replace function public.kym_ozel_yukumlulugu_aktiflestir(
  p_ozel_yukumluluk_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_ozel public.kym_ozel_yukumluluklar%rowtype;
  v_modul_id uuid;
  v_yukumluluk_id uuid;
  v_belge_tanim_id uuid;
  v_yukumluluk_kodu text;
  v_belge_kodu text;
begin
  select *
  into v_ozel
  from public.kym_ozel_yukumluluklar
  where id = p_ozel_yukumluluk_id
    and aktif = true;

  if not found then
    raise exception 'Özel yükümlülük bulunamadı veya aktif değil: %', p_ozel_yukumluluk_id;
  end if;

  select id
  into v_modul_id
  from public.kym_moduller
  where kod = 'KYM-11';

  if v_modul_id is null then
    insert into public.kym_moduller (kod, ad, aciklama, sira)
    values (
      'KYM-11',
      'Manuel ve Özel Yükümlülükler',
      'AI listesinde olmayan, işletme veya kurum tarafından sonradan eklenen özel yükümlülükler',
      11
    )
    returning id into v_modul_id;
  end if;

  v_yukumluluk_kodu := 'MAN-YUK-' || upper(substr(replace(v_ozel.id::text, '-', ''), 1, 10));
  v_belge_kodu := 'MAN-BEL-' || upper(substr(replace(v_ozel.id::text, '-', ''), 1, 10));

  insert into public.kym_yukumluluklar (
    modul_id,
    kod,
    baslik,
    kategori,
    alt_kategori,
    yukumluluk_tipi,
    hukuki_dayanak,
    denetleyen_kurum,
    aciklama,
    risk_puani,
    oncelik,
    aktif
  )
  values (
    v_modul_id,
    v_yukumluluk_kodu,
    v_ozel.baslik,
    v_ozel.kategori,
    v_ozel.alt_kategori,
    v_ozel.zorunluluk_tipi,
    v_ozel.hukuki_dayanak,
    v_ozel.denetleyen_kurum,
    v_ozel.aciklama,
    v_ozel.risk_puani,
    v_ozel.oncelik,
    true
  )
  on conflict (kod) do update set
    baslik = excluded.baslik,
    kategori = excluded.kategori,
    alt_kategori = excluded.alt_kategori,
    yukumluluk_tipi = excluded.yukumluluk_tipi,
    hukuki_dayanak = excluded.hukuki_dayanak,
    denetleyen_kurum = excluded.denetleyen_kurum,
    aciklama = excluded.aciklama,
    risk_puani = excluded.risk_puani,
    oncelik = excluded.oncelik,
    aktif = true
  returning id into v_yukumluluk_id;

  insert into public.kym_belge_tanimlari (
    yukumluluk_id,
    kod,
    ad,
    kategori,
    alt_kategori,
    basvuru_yeri,
    yenileme_periyodu,
    aciklama,
    aktif
  )
  values (
    v_yukumluluk_id,
    v_belge_kodu,
    v_ozel.baslik,
    v_ozel.kategori,
    v_ozel.alt_kategori,
    v_ozel.basvuru_yeri,
    v_ozel.yenileme_periyodu,
    v_ozel.aciklama,
    true
  )
  on conflict (kod) do update set
    ad = excluded.ad,
    kategori = excluded.kategori,
    alt_kategori = excluded.alt_kategori,
    basvuru_yeri = excluded.basvuru_yeri,
    yenileme_periyodu = excluded.yenileme_periyodu,
    aciklama = excluded.aciklama,
    aktif = true
  returning id into v_belge_tanim_id;

  insert into public.kym_isletme_belgeleri (
    isletme_id,
    belge_tanim_id,
    durum,
    mevcut_mu,
    notlar
  )
  values (
    v_ozel.isletme_id,
    v_belge_tanim_id,
    'yok',
    false,
    'Manuel/özel yükümlülük olarak eklenmiştir.'
  )
  on conflict (isletme_id, belge_tanim_id) do nothing;

  return v_belge_tanim_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. RLS test izinleri
-- V1 test aşamasında anon/authenticated okuma-yazma izni verilir.
-- Canlıya geçmeden önce şirket/kullanıcı bazlı sıkı politika yazılacak.
-- ---------------------------------------------------------------------

alter table public.kym_ozel_yukumluluklar enable row level security;

drop policy if exists "kym_ozel_yukumluluklar_public_read" on public.kym_ozel_yukumluluklar;
create policy "kym_ozel_yukumluluklar_public_read"
on public.kym_ozel_yukumluluklar
for select
to anon, authenticated
using (true);

drop policy if exists "kym_ozel_yukumluluklar_public_insert" on public.kym_ozel_yukumluluklar;
create policy "kym_ozel_yukumluluklar_public_insert"
on public.kym_ozel_yukumluluklar
for insert
to anon, authenticated
with check (true);

drop policy if exists "kym_ozel_yukumluluklar_public_update" on public.kym_ozel_yukumluluklar;
create policy "kym_ozel_yukumluluklar_public_update"
on public.kym_ozel_yukumluluklar
for update
to anon, authenticated
using (true)
with check (true);

-- ---------------------------------------------------------------------
-- 5. Test view
-- ---------------------------------------------------------------------

create or replace view public.v_kym_ozel_yukumluluklar as
select
  oy.id,
  oy.isletme_id,
  i.isletme_adi,
  oy.kaynak_tipi,
  oy.kaynak_aciklama,
  oy.kayit_tipi,
  oy.baslik,
  oy.kategori,
  oy.alt_kategori,
  oy.zorunluluk_tipi,
  oy.hukuki_dayanak,
  oy.denetleyen_kurum,
  oy.basvuru_yeri,
  oy.yenileme_periyodu,
  oy.aciklama,
  oy.risk_puani,
  oy.oncelik,
  oy.ai_ogrenme_havuzuna_alinsin,
  oy.aktif,
  oy.created_at,
  oy.updated_at
from public.kym_ozel_yukumluluklar oy
join public.kym_isletmeler i on i.id = oy.isletme_id
order by oy.created_at desc;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------
