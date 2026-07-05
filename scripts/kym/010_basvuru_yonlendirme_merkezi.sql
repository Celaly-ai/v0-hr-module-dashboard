-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.6
-- Başvuru ve Yönlendirme Merkezi
--
-- Amaç:
-- Eksik belgeyi yalnız göstermek yerine kullanıcıya:
--
-- - neden gerekli
-- - hangi koşullarda uygulanır
-- - nereden alınır
-- - başvuru kanalı
-- - gerekli belgeler
-- - başvuru adımları
-- - dilekçe / başvuru metni
-- - dikkat edilecekler
-- - resmi kaynak
--
-- bilgilerini sunmak.
--
-- Mevcut FeyRoute tablolarına dokunmaz.
-- Yalnız bağımsız KYM çekirdeğini genişletir.
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. Mevcut başvuru rehberi tablosunu genişlet
-- ---------------------------------------------------------------------

alter table public.kym_basvuru_rehberi
  add column if not exists rehber_basligi text,
  add column if not exists neden_gerekli text,
  add column if not exists hangi_kosullarda_gerekli text,
  add column if not exists basvuru_kanali text,
  add column if not exists resmi_kurum text,
  add column if not exists resmi_kaynak_url text,
  add column if not exists online_basvuru_url text,
  add column if not exists tahmini_sure_notu text,
  add column if not exists ucret_notu text,
  add column if not exists on_kontrol_listesi jsonb
    not null default '[]'::jsonb,
  add column if not exists gerekli_evraklar_json jsonb
    not null default '[]'::jsonb,
  add column if not exists basvuru_adimlari_json jsonb
    not null default '[]'::jsonb,
  add column if not exists dikkat_edilecekler_json jsonb
    not null default '[]'::jsonb,
  add column if not exists dilekce_basligi text,
  add column if not exists dilekce_metni text,
  add column if not exists hukuki_uyari text,
  add column if not exists kaynak_dogrulama_durumu text
    not null default 'bekliyor',
  add column if not exists kaynak_son_kontrol_tarihi date,
  add column if not exists aktif boolean
    not null default true,
  add column if not exists updated_at timestamptz
    not null default now();

-- ---------------------------------------------------------------------
-- 2. Doğrulama durumu constraint
-- ---------------------------------------------------------------------

alter table public.kym_basvuru_rehberi
  drop constraint if exists
  kym_basvuru_rehberi_kaynak_dogrulama_durumu_check;

alter table public.kym_basvuru_rehberi
  add constraint
  kym_basvuru_rehberi_kaynak_dogrulama_durumu_check
  check (
    kaynak_dogrulama_durumu in (
      'bekliyor',
      'resmi_kaynak_dogrulandi',
      'uzman_incelemesi_gerekli',
      'guncelleme_gerekli'
    )
  );

-- ---------------------------------------------------------------------
-- 3. Başvuru kanalı constraint
-- ---------------------------------------------------------------------

alter table public.kym_basvuru_rehberi
  drop constraint if exists
  kym_basvuru_rehberi_basvuru_kanali_check;

alter table public.kym_basvuru_rehberi
  add constraint
  kym_basvuru_rehberi_basvuru_kanali_check
  check (
    basvuru_kanali is null
    or basvuru_kanali in (
      'online',
      'e_devlet',
      'kurum_portali',
      'yuz_yuze',
      'posta',
      'kep',
      'e_tebligat',
      'sirket_ici',
      'marka_sistemi',
      'karma',
      'bilgi_gerekli'
    )
  );

-- ---------------------------------------------------------------------
-- 4. Updated at trigger
-- ---------------------------------------------------------------------

drop trigger if exists
trg_kym_basvuru_rehberi_updated_at
on public.kym_basvuru_rehberi;

create trigger
trg_kym_basvuru_rehberi_updated_at
before update
on public.kym_basvuru_rehberi
for each row
execute function public.kym_set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Her aktif belge için rehber kaydı aç
--
-- Bilgi uydurulmaz.
-- Doğrulanmamış rehberler "bekliyor" olarak oluşturulur.
-- ---------------------------------------------------------------------

insert into public.kym_basvuru_rehberi (
  belge_tanim_id,
  rehber_basligi,
  neden_gerekli,
  hangi_kosullarda_gerekli,
  basvuru_yeri,
  basvuru_kanali,
  gerekli_evraklar,
  basvuru_adimlari,
  dilekce_ornegi,
  dikkat_edilecekler,
  on_kontrol_listesi,
  gerekli_evraklar_json,
  basvuru_adimlari_json,
  dikkat_edilecekler_json,
  hukuki_uyari,
  kaynak_dogrulama_durumu,
  aktif
)

select
  bt.id,

  bt.ad || ' Başvuru ve Tamamlama Rehberi',

  'Bu belge veya kayıt KYM tarafından işletmenin kurumsal uyum havuzunda izlenmektedir.',

  case
    when bt.uygulanabilirlik_tipi = 'genel'
      then 'KYM işletme profiline göre genel kapsamda değerlendirilmektedir.'

    when bt.uygulanabilirlik_tipi = 'kosullu'
      then 'Belgenin gerekliliği işletmenin faaliyet, personel, araç, depo veya diğer profil koşullarına göre belirlenir.'

    when bt.uygulanabilirlik_tipi = 'kurum_talebi'
      then 'İlgili kurumdan talep, bildirim, denetim veya resmi yazı bulunması halinde değerlendirilir.'

    when bt.uygulanabilirlik_tipi = 'sirket_politikasi'
      then 'Şirket içi yönetim ve kurumsal kontrol sürecinde değerlendirilir.'

    else
      'Belgenin uygulanabilirliği için ek kapsam değerlendirmesi gerekebilir.'
  end,

  bt.basvuru_yeri,

  case
    when bt.uygulanabilirlik_tipi = 'sirket_politikasi'
      then 'sirket_ici'

    when bt.uygulanabilirlik_tipi = 'kurum_talebi'
      then 'bilgi_gerekli'

    else
      'bilgi_gerekli'
  end,

  null,

  null,

  null,

  null,

  jsonb_build_array(
    'İşletme bilgilerinin güncel olduğunu kontrol edin.',
    'Belgenin işletmeye uygulanabilir olduğunu doğrulayın.',
    'Varsa mevcut veya eski belgeyi hazırlayın.'
  ),

  '[]'::jsonb,

  jsonb_build_array(
    'KYM rehberindeki resmi kaynak ve kurum bilgisini kontrol edin.',
    'Gerekli evrakları hazırlayın.',
    'Belirtilen başvuru kanalından işlemi başlatın.',
    'Başvuru veya sonuç belgesini KYM sistemine yükleyin.'
  ),

  jsonb_build_array(
    'Doğrulanmamış kurum veya belge bilgisini kesin bilgi olarak kabul etmeyin.',
    'Resmi kurumun güncel belge ve başvuru şartlarını kontrol edin.',
    'Belge tarihini ve geçerlilik süresini KYM sistemine yüklenen belge üzerinden doğrulatın.'
  ),

  'KYM yönlendirme bilgileri operasyonel destek amacı taşır. Resmi kurumun güncel işlem şartları ve mevzuatı esas alınmalıdır.',

  'bekliyor',

  true

from public.kym_belge_tanimlari bt

where bt.aktif = true

and not exists (

  select 1

  from public.kym_basvuru_rehberi br

  where br.belge_tanim_id = bt.id

);

-- ---------------------------------------------------------------------
-- 6. Aynı belge için tek aktif rehber
-- ---------------------------------------------------------------------

create unique index if not exists
ux_kym_basvuru_rehberi_belge
on public.kym_basvuru_rehberi (
  belge_tanim_id
);

-- ---------------------------------------------------------------------
-- 7. Başvuru rehberi görünümü
-- ---------------------------------------------------------------------

drop view if exists public.v_kym_basvuru_yonlendirme;

create view public.v_kym_basvuru_yonlendirme as

select
  br.id as rehber_id,

  br.belge_tanim_id,

  bt.kod as belge_kodu,

  bt.ad as belge_adi,

  y.id as yukumluluk_id,

  y.kod as yukumluluk_kodu,

  y.baslik as yukumluluk_basligi,

  y.kategori,

  y.alt_kategori,

  y.hukuki_dayanak,

  y.denetleyen_kurum,

  y.risk_puani,

  y.oncelik,

  bt.uygulanabilirlik_tipi,

  bt.uygulanabilirlik_kosulu,

  br.rehber_basligi,

  br.neden_gerekli,

  br.hangi_kosullarda_gerekli,

  coalesce(
    br.resmi_kurum,
    y.denetleyen_kurum
  ) as resmi_kurum,

  coalesce(
    br.basvuru_yeri,
    bt.basvuru_yeri
  ) as basvuru_yeri,

  br.basvuru_kanali,

  br.resmi_kaynak_url,

  br.online_basvuru_url,

  br.tahmini_sure_notu,

  br.ucret_notu,

  br.on_kontrol_listesi,

  br.gerekli_evraklar_json,

  br.basvuru_adimlari_json,

  br.dikkat_edilecekler_json,

  br.dilekce_basligi,

  coalesce(
    br.dilekce_metni,
    br.dilekce_ornegi
  ) as dilekce_metni,

  br.hukuki_uyari,

  br.kaynak_dogrulama_durumu,

  br.kaynak_son_kontrol_tarihi,

  br.aktif

from public.kym_basvuru_rehberi br

join public.kym_belge_tanimlari bt
  on bt.id = br.belge_tanim_id

join public.kym_yukumluluklar y
  on y.id = bt.yukumluluk_id

where br.aktif = true;

-- ---------------------------------------------------------------------
-- 8. İşletmeye özel eksik belge yönlendirme görünümü
-- ---------------------------------------------------------------------

drop view if exists public.v_kym_eksik_belge_yonlendirme;

create view public.v_kym_eksik_belge_yonlendirme as

select
  ib.isletme_id,

  i.isletme_adi,

  ib.id as isletme_belge_id,

  ib.durum as belge_durumu,

  ib.gecerlilik_bitis,

  ib.ai_ozet,

  ib.ai_eksikler,

  yon.*

from public.kym_isletme_belgeleri ib

join public.kym_isletmeler i
  on i.id = ib.isletme_id

join public.v_kym_basvuru_yonlendirme yon
  on yon.belge_tanim_id = ib.belge_tanim_id

where ib.durum in (
  'yok',
  'yanlis_belge',
  'eksik_bilgi_var',
  'suresi_doldu',
  'manuel_inceleme_gerekli'
);

-- ---------------------------------------------------------------------
-- 9. Başvuru yapıldı durumuna alan kontrollü RPC
--
-- Kullanıcı doğrudan durum seçmez.
-- Yalnız rehber ekranından "Başvuru Yapıldı" aksiyonu verilir.
-- ---------------------------------------------------------------------

create or replace function public.kym_basvuru_yapildi_kaydet(
  p_isletme_belge_id uuid,
  p_not text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

  update public.kym_isletme_belgeleri

  set
    durum = 'basvuru_yapildi',

    mevcut_mu = false,

    notlar = case
      when p_not is null
        or trim(p_not) = ''
        then 'KYM yönlendirme merkezi üzerinden başvuru yapıldı olarak işaretlendi.'

      else p_not
    end,

    son_kontrol_tarihi = current_date

  where id = p_isletme_belge_id;

  if not found then
    raise exception
      'KYM işletme belge kaydı bulunamadı: %',
      p_isletme_belge_id;
  end if;

  return true;

end;
$$;

revoke all
on function public.kym_basvuru_yapildi_kaydet(
  uuid,
  text
)
from public;

grant execute
on function public.kym_basvuru_yapildi_kaydet(
  uuid,
  text
)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. RLS
-- ---------------------------------------------------------------------

alter table public.kym_basvuru_rehberi
enable row level security;

drop policy if exists
"kym_basvuru_rehberi_test_read"
on public.kym_basvuru_rehberi;

create policy
"kym_basvuru_rehberi_test_read"
on public.kym_basvuru_rehberi
for select
to anon, authenticated
using (
  aktif = true
);

-- ---------------------------------------------------------------------
-- 11. Kontrol
-- ---------------------------------------------------------------------

select
  'aktif_belge' as kontrol,
  count(*)::integer as adet

from public.kym_belge_tanimlari

where aktif = true

union all

select
  'aktif_rehber',
  count(*)::integer

from public.kym_basvuru_rehberi

where aktif = true

union all

select
  'yonlendirme_view',
  count(*)::integer

from public.v_kym_basvuru_yonlendirme

union all

select
  'eksik_belge_yonlendirme',
  count(*)::integer

from public.v_kym_eksik_belge_yonlendirme;

-- ---------------------------------------------------------------------
-- 12. Rehber doğrulama dağılımı
-- ---------------------------------------------------------------------

select
  kaynak_dogrulama_durumu,

  count(*)::integer as adet

from public.kym_basvuru_rehberi

where aktif = true

group by kaynak_dogrulama_durumu

order by kaynak_dogrulama_durumu;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------