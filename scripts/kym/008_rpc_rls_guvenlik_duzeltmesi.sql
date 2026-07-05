-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.5.1
-- RPC / RLS Güvenlik Düzeltmesi
--
-- Sorun:
-- kym_profil_sorusunu_cevapla RPC'si profil cevabı sonrası
-- kym_isletme_belge_havuzunu_senkronize_et fonksiyonunu çalıştırır.
--
-- Senkronizasyon fonksiyonu kym_isletme_belgeleri tablosunda
-- INSERT / UPDATE yapmaktadır.
--
-- Browser istemcisi anon/authenticated rolüyle RPC çağırdığında
-- tablo RLS politikaları doğrudan yazma işlemini engellemektedir.
--
-- Çözüm:
-- KYM'nin kontrollü çekirdek fonksiyonları SECURITY DEFINER olarak
-- çalıştırılır.
--
-- Kullanıcıya kym_isletme_belgeleri tablosunda genel INSERT / UPDATE
-- yetkisi verilmez.
--
-- Mevcut FeyRoute tablolarına dokunmaz.
-- Yalnız bağımsız KYM fonksiyon güvenliğini düzenler.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. İşletme belge havuzu senkronizasyon motoru
-- ---------------------------------------------------------------------

alter function public.kym_isletme_belge_havuzunu_senkronize_et(uuid)
security definer;

alter function public.kym_isletme_belge_havuzunu_senkronize_et(uuid)
set search_path = public;

-- ---------------------------------------------------------------------
-- 2. Profil bilinenlerini doldurma motoru
-- ---------------------------------------------------------------------

alter function public.kym_profil_bilinenleri_doldur(uuid)
security definer;

alter function public.kym_profil_bilinenleri_doldur(uuid)
set search_path = public;

-- ---------------------------------------------------------------------
-- 3. Profil soru cevap motoru
-- ---------------------------------------------------------------------

alter function public.kym_profil_sorusunu_cevapla(
  uuid,
  uuid,
  boolean,
  text,
  text
)
security definer;

alter function public.kym_profil_sorusunu_cevapla(
  uuid,
  uuid,
  boolean,
  text,
  text
)
set search_path = public;

-- ---------------------------------------------------------------------
-- 4. Belge doğrulama / durum motoru
-- Aynı RLS sorununun AI belge analizinde çıkmasını önler.
-- ---------------------------------------------------------------------

alter function public.kym_belge_dogrulama_kaydet(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  date,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
)
security definer;

alter function public.kym_belge_dogrulama_kaydet(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  date,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
)
set search_path = public;

-- ---------------------------------------------------------------------
-- 5. Özel yükümlülük aktifleştirme motoru
-- Manuel/özel KYM kayıtlarının ana havuza aktarımında RLS sorunu
-- yaşamaması için kontrollü fonksiyon olarak düzenlenir.
-- ---------------------------------------------------------------------

alter function public.kym_ozel_yukumlulugu_aktiflestir(uuid)
security definer;

alter function public.kym_ozel_yukumlulugu_aktiflestir(uuid)
set search_path = public;

-- ---------------------------------------------------------------------
-- 6. Execute izinleri
--
-- Test aşamasında /kym bağımsız çalıştığı için anon ve authenticated
-- rolleri kontrollü RPC fonksiyonlarını çağırabilir.
--
-- Kullanıcı doğrudan tablo yazma yetkisi kazanmaz.
-- ---------------------------------------------------------------------

revoke all
on function public.kym_isletme_belge_havuzunu_senkronize_et(uuid)
from public;

grant execute
on function public.kym_isletme_belge_havuzunu_senkronize_et(uuid)
to anon, authenticated;

revoke all
on function public.kym_profil_bilinenleri_doldur(uuid)
from public;

grant execute
on function public.kym_profil_bilinenleri_doldur(uuid)
to anon, authenticated;

revoke all
on function public.kym_profil_sorusunu_cevapla(
  uuid,
  uuid,
  boolean,
  text,
  text
)
from public;

grant execute
on function public.kym_profil_sorusunu_cevapla(
  uuid,
  uuid,
  boolean,
  text,
  text
)
to anon, authenticated;

revoke all
on function public.kym_belge_dogrulama_kaydet(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  date,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
)
from public;

grant execute
on function public.kym_belge_dogrulama_kaydet(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  date,
  date,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
)
to anon, authenticated;

revoke all
on function public.kym_ozel_yukumlulugu_aktiflestir(uuid)
from public;

grant execute
on function public.kym_ozel_yukumlulugu_aktiflestir(uuid)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Güvenlik kontrolü
-- ---------------------------------------------------------------------

select
  n.nspname as schema_adi,
  p.proname as fonksiyon_adi,
  p.prosecdef as security_definer,
  coalesce(
    array_to_string(
      p.proconfig,
      ', '
    ),
    '-'
  ) as fonksiyon_ayarlari

from pg_proc p

join pg_namespace n
  on n.oid = p.pronamespace

where n.nspname = 'public'

  and p.proname in (
    'kym_isletme_belge_havuzunu_senkronize_et',
    'kym_profil_bilinenleri_doldur',
    'kym_profil_sorusunu_cevapla',
    'kym_belge_dogrulama_kaydet',
    'kym_ozel_yukumlulugu_aktiflestir'
  )

order by p.proname;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------
