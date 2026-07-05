-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.5.2
-- Profil Sorusu Tekrar Etme Düzeltmesi
--
-- Sorun:
-- kym_bekleyen_profil_sorulari fonksiyonu, bir profil alanı
-- cevaplanmış olsa bile, bilgi_gerekli durumundaki bir belgede aynı
-- uygulanabilirlik anahtarını gördüğünde soruyu yeniden listeleyebiliyordu.
--
-- Örnek:
-- musteri_verisi_isleniyor = true olarak cevaplandı.
-- 12 belge çözüldü.
-- Ancak başka nedenle bilgi_gerekli kalan ve JSON koşulunda aynı alanı
-- taşıyan kayıtlar nedeniyle PROFIL-003 yeniden gösterildi.
--
-- Çözüm:
-- Bir profil alanı NULL değilse o alanın sorusu tekrar sorulmaz.
--
-- Mevcut FeyRoute tablolarına dokunmaz.
-- Yalnız KYM soru motorunu düzeltir.
-- ---------------------------------------------------------------------

create or replace function public.kym_bekleyen_profil_sorulari(
  p_isletme_id uuid
)
returns table (
  soru_id uuid,
  kod text,
  profil_alani text,
  soru text,
  aciklama text,
  sira integer,
  etkilenen_belge_sayisi integer,
  en_yuksek_risk integer
)
language plpgsql
stable
as $$
begin

  return query

  select
    ps.id as soru_id,

    ps.kod,

    ps.profil_alani,

    ps.soru,

    ps.aciklama,

    ps.sira,

    count(
      distinct vu.isletme_belge_id
    )::integer
      as etkilenen_belge_sayisi,

    max(
      vu.risk_puani
    )::integer
      as en_yuksek_risk

  from public.kym_profil_sorulari ps

  join public.kym_isletme_uyum_profilleri up
    on up.isletme_id = p_isletme_id

  join public.v_kym_belge_uygulanabilirlik vu
    on vu.isletme_id = p_isletme_id

  where ps.aktif = true

    and vu.uygulanabilirlik_durumu =
      'bilgi_gerekli'

    and (
      vu.uygulanabilirlik_kosulu
      ? ps.profil_alani
    )

    and (

      (
        ps.profil_alani = 'kamera_var'
        and up.kamera_var is null
      )

      or

      (
        ps.profil_alani = 'gps_konum_isleniyor'
        and up.gps_konum_isleniyor is null
      )

      or

      (
        ps.profil_alani = 'musteri_verisi_isleniyor'
        and up.musteri_verisi_isleniyor is null
      )

      or

      (
        ps.profil_alani = 'kurumsal_telefon_var'
        and up.kurumsal_telefon_var is null
      )

      or

      (
        ps.profil_alani = 'whatsapp_sms_kullaniliyor'
        and up.whatsapp_sms_kullaniliyor is null
      )

      or

      (
        ps.profil_alani = 'taseron_var'
        and up.taseron_var is null
      )

      or

      (
        ps.profil_alani = 'kiralik_isyeri'
        and up.kiralik_isyeri is null
      )

      or

      (
        ps.profil_alani = 'e_ticaret_var'
        and up.e_ticaret_var is null
      )

      or

      (
        ps.profil_alani = 'yakit_karti_var'
        and up.yakit_karti_var is null
      )

      or

      (
        ps.profil_alani = 'hgs_var'
        and up.hgs_var is null
      )

      or

      (
        ps.profil_alani = 'elektronik_atik_var'
        and up.elektronik_atik_var is null
      )

      or

      (
        ps.profil_alani = 'tehlikeli_atik_var'
        and up.tehlikeli_atik_var is null
      )

      or

      (
        ps.profil_alani = 'basinc_sistemi_var'
        and up.basinc_sistemi_var is null
      )

      or

      (
        ps.profil_alani = 'kaldirma_ekipmani_var'
        and up.kaldirma_ekipmani_var is null
      )

      or

      (
        ps.profil_alani = 'yangin_tesisati_var'
        and up.yangin_tesisati_var is null
      )

      or

      (
        ps.profil_alani = 'osgb_hizmeti_var'
        and up.osgb_hizmeti_var is null
      )

      or

      (
        ps.profil_alani = 'isg_uzmani_var'
        and up.isg_uzmani_var is null
      )

      or

      (
        ps.profil_alani = 'isyeri_hekimi_var'
        and up.isyeri_hekimi_var is null
      )

      or

      (
        ps.profil_alani = 'marka_yetkilendirmesi_var'
        and up.marka_yetkilendirmesi_var is null
      )

    )

  group by
    ps.id,
    ps.kod,
    ps.profil_alani,
    ps.soru,
    ps.aciklama,
    ps.sira

  order by
    max(
      vu.risk_puani
    ) desc,

    count(
      distinct vu.isletme_belge_id
    ) desc,

    ps.sira asc;

end;
$$;

-- ---------------------------------------------------------------------
-- Fonksiyon güvenlik ayarlarını koru
-- ---------------------------------------------------------------------

alter function public.kym_bekleyen_profil_sorulari(uuid)
security definer;

alter function public.kym_bekleyen_profil_sorulari(uuid)
set search_path = public;

revoke all
on function public.kym_bekleyen_profil_sorulari(uuid)
from public;

grant execute
on function public.kym_bekleyen_profil_sorulari(uuid)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- Profil tamamlama özetini yeniden oluştur
-- ---------------------------------------------------------------------

drop view if exists public.v_kym_profil_tamamlama_ozeti;

create view public.v_kym_profil_tamamlama_ozeti as

select
  i.id as isletme_id,

  i.isletme_adi,

  (
    select
      count(*)::integer

    from public.kym_bekleyen_profil_sorulari(
      i.id
    )
  ) as bekleyen_soru,

  (
    select
      count(*)::integer

    from public.v_kym_belge_uygulanabilirlik vu

    where vu.isletme_id = i.id

      and vu.uygulanabilirlik_durumu =
        'bilgi_gerekli'
  ) as bilgi_gerekli_belge,

  (
    select
      count(*)::integer

    from public.v_kym_belge_uygulanabilirlik vu

    where vu.isletme_id = i.id

      and vu.uygulanabilirlik_durumu =
        'uygulanir'
  ) as uygulanir_belge,

  (
    select
      count(*)::integer

    from public.v_kym_belge_uygulanabilirlik vu

    where vu.isletme_id = i.id

      and vu.uygulanabilirlik_durumu =
        'uygulanmiyor'
  ) as uygulanmayan_belge

from public.kym_isletmeler i

where i.aktif = true;

-- ---------------------------------------------------------------------
-- 1. Güncel profil değerleri
-- ---------------------------------------------------------------------

select
  i.isletme_adi,

  up.kamera_var,

  up.gps_konum_isleniyor,

  up.musteri_verisi_isleniyor,

  up.kurumsal_telefon_var,

  up.whatsapp_sms_kullaniliyor,

  up.taseron_var,

  up.kiralik_isyeri,

  up.e_ticaret_var,

  up.yakit_karti_var,

  up.hgs_var,

  up.elektronik_atik_var,

  up.tehlikeli_atik_var,

  up.basinc_sistemi_var,

  up.kaldirma_ekipmani_var,

  up.yangin_tesisati_var,

  up.osgb_hizmeti_var,

  up.isg_uzmani_var,

  up.isyeri_hekimi_var,

  up.marka_yetkilendirmesi_var

from public.kym_isletmeler i

join public.kym_isletme_uyum_profilleri up
  on up.isletme_id = i.id

where i.aktif = true

order by i.isletme_adi;

-- ---------------------------------------------------------------------
-- 2. Güncel bekleyen sorular
-- PROFIL-003 cevaplandıysa burada tekrar görünmemelidir.
-- ---------------------------------------------------------------------

select
  i.isletme_adi,

  s.kod,

  s.profil_alani,

  s.soru,

  s.etkilenen_belge_sayisi,

  s.en_yuksek_risk

from public.kym_isletmeler i

cross join lateral
  public.kym_bekleyen_profil_sorulari(
    i.id
  ) s

where i.aktif = true

order by
  i.isletme_adi,
  s.en_yuksek_risk desc,
  s.etkilenen_belge_sayisi desc,
  s.sira asc;

-- ---------------------------------------------------------------------
-- 3. Profil özeti
-- ---------------------------------------------------------------------

select
  isletme_adi,

  bekleyen_soru,

  bilgi_gerekli_belge,

  uygulanir_belge,

  uygulanmayan_belge

from public.v_kym_profil_tamamlama_ozeti

order by isletme_adi;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------