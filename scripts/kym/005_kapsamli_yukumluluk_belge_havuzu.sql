-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.4
-- Kapsamlı Yükümlülük / Belge Havuzu
-- Uygulanabilirlik Motoru
--
-- Mevcut FeyRoute tablolarına dokunmaz.
-- Yalnız KYM bağımsız çekirdeğini genişletir.
--
-- ÖNEMLİ:
-- Bu katalog KYM teknik uyum envanteridir.
-- Hukuki kesin zorunluluk değerlendirmesi ayrıca mevzuat doğrulama
-- motoru ve profesyonel kontrol sürecinden geçirilecektir.
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. İşletme KYM uyum profili
-- ---------------------------------------------------------------------

create table if not exists public.kym_isletme_uyum_profilleri (
  id uuid primary key default uuid_generate_v4(),

  isletme_id uuid not null
    references public.kym_isletmeler(id)
    on delete cascade,

  kamera_var boolean,
  gps_konum_isleniyor boolean,
  musteri_verisi_isleniyor boolean,
  kurumsal_telefon_var boolean,
  whatsapp_sms_kullaniliyor boolean,

  taseron_var boolean,
  kiralik_isyeri boolean,
  e_ticaret_var boolean,

  yakit_karti_var boolean,
  hgs_var boolean,

  elektronik_atik_var boolean,
  tehlikeli_atik_var boolean,

  basinc_sistemi_var boolean,
  kaldirma_ekipmani_var boolean,
  yangin_tesisati_var boolean,

  osgb_hizmeti_var boolean,
  isg_uzmani_var boolean,
  isyeri_hekimi_var boolean,

  marka_yetkilendirmesi_var boolean,

  aciklama text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ux_kym_isletme_uyum_profilleri_isletme
    unique (isletme_id)
);

drop trigger if exists
trg_kym_isletme_uyum_profilleri_updated_at
on public.kym_isletme_uyum_profilleri;

create trigger
trg_kym_isletme_uyum_profilleri_updated_at
before update
on public.kym_isletme_uyum_profilleri
for each row
execute function public.kym_set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Belge tanımlarına uygulanabilirlik alanları
-- ---------------------------------------------------------------------

alter table public.kym_belge_tanimlari
  add column if not exists uygulanabilirlik_tipi text
    not null default 'genel',

  add column if not exists uygulanabilirlik_kosulu jsonb
    not null default '{}'::jsonb,

  add column if not exists hukuki_kontrol_gerekli boolean
    not null default true;

alter table public.kym_belge_tanimlari
  drop constraint if exists
  kym_belge_tanimlari_uygulanabilirlik_tipi_check;

alter table public.kym_belge_tanimlari
  add constraint
  kym_belge_tanimlari_uygulanabilirlik_tipi_check
  check (
    uygulanabilirlik_tipi in (
      'genel',
      'kosullu',
      'bilgi',
      'kurum_talebi',
      'sirket_politikasi'
    )
  );

-- ---------------------------------------------------------------------
-- 3. KYM modülleri
-- İlk 10 mevcut çekirdek modül korunur.
-- 11-20 yeni kapsam modülleridir.
-- ---------------------------------------------------------------------

insert into public.kym_moduller (
  kod,
  ad,
  aciklama,
  sira,
  aktif
)
values

(
  'KYM-01',
  'Kurumsal Kimlik',
  'Şirket kimliği, ticaret sicili ve temel tüzel kişi kayıtları',
  1,
  true
),

(
  'KYM-02',
  'Ruhsat ve İzinler',
  'İşyeri, belediye, kullanım, faaliyet ve adres izin süreçleri',
  2,
  true
),

(
  'KYM-03',
  'SGK',
  'İşveren SGK kayıtları, bildirgeler ve sosyal güvenlik süreçleri',
  3,
  true
),

(
  'KYM-04',
  'İnsan Kaynakları',
  'Özlük, sözleşme, izin, disiplin, ücret ve çalışma kayıtları',
  4,
  true
),

(
  'KYM-05',
  'İş Sağlığı ve Güvenliği',
  'Risk, sağlık gözetimi, KKD, iş kazası ve İSG kayıtları',
  5,
  true
),

(
  'KYM-06',
  'KVKK ve Veri Güvenliği',
  'Kişisel veri, aydınlatma, saklama, imha ve veri güvenliği',
  6,
  true
),

(
  'KYM-07',
  'Araç ve Filo',
  'Araç ruhsat, sigorta, bakım, teslim, sürücü ve filo kayıtları',
  7,
  true
),

(
  'KYM-08',
  'Zimmet ve Demirbaş',
  'Cihaz, ekipman, hat, anahtar ve demirbaş zimmetleri',
  8,
  true
),

(
  'KYM-09',
  'Depo ve Stok',
  'Depo, stok, yedek parça, sayım, hurda ve iade kayıtları',
  9,
  true
),

(
  'KYM-10',
  'Mali ve Vergisel Uyum',
  'Vergi, mali kayıt, e-belge ve mali süreç belgeleri',
  10,
  true
),

(
  'KYM-11',
  'Teknik Servis ve Marka',
  'Yetkili servis, marka, teknik operasyon ve ürün hizmet kayıtları',
  11,
  true
),

(
  'KYM-12',
  'Müşteri ve Tüketici Süreçleri',
  'Şikayet, teslim, tüketici başvurusu ve müşteri süreç kayıtları',
  12,
  true
),

(
  'KYM-13',
  'Sözleşmeler',
  'Tedarikçi, taşeron, kira, hizmet ve ticari sözleşmeler',
  13,
  true
),

(
  'KYM-14',
  'Yangın ve Acil Durum',
  'Yangın, tahliye, acil çıkış, tatbikat ve acil durum kayıtları',
  14,
  true
),

(
  'KYM-15',
  'Çevre, Atık ve Hurda',
  'Atık, elektronik atık, hurda ve çevresel teslim kayıtları',
  15,
  true
),

(
  'KYM-16',
  'Tesis ve Periyodik Kontroller',
  'Elektrik, topraklama, ekipman ve tesis kontrol kayıtları',
  16,
  true
),

(
  'KYM-17',
  'Kamera, GPS ve İletişim',
  'Kamera, konum, araç takip ve elektronik iletişim süreçleri',
  17,
  true
),

(
  'KYM-18',
  'Eğitim ve Yetkinlik',
  'Teknik, mesleki, sürücü, marka ve zorunlu eğitim kayıtları',
  18,
  true
),

(
  'KYM-19',
  'Denetim ve Resmi Yazışmalar',
  'Kurum yazıları, denetimler, savunmalar ve resmi bildirimler',
  19,
  true
),

(
  'KYM-20',
  'Şirket İçi Politika ve Prosedürler',
  'İşletme içi yönetim politika, prosedür ve kontrol dokümanları',
  20,
  true
)

on conflict (kod)
do update set
  ad = excluded.ad,
  aciklama = excluded.aciklama,
  sira = excluded.sira,
  aktif = excluded.aktif;

-- ---------------------------------------------------------------------
-- 4. Ana katalog
--
-- Her satır:
-- modul_kodu
-- yukumluluk_kodu
-- yukumluluk_basligi
-- kategori
-- alt_kategori
-- yukumluluk_tipi
-- risk_puani
-- oncelik
-- belge_kodu
-- belge_adi
-- basvuru_yeri
-- yenileme_periyodu
-- uygulanabilirlik_tipi
-- uygulanabilirlik_kosulu
-- ---------------------------------------------------------------------

with katalog as (

  select *
  from (
    values

-- =====================================================================
-- KYM-01 KURUMSAL KİMLİK
-- =====================================================================

(
'KYM-01','YUK-001','Vergi mükellefiyet kimlik kaydı',
'Kurumsal Kimlik','Vergi Kimliği','genel',
100,'P1',
'BEL-001','Vergi Levhası',
'Gelir İdaresi / Vergi Dairesi','Yıllık kontrol',
'genel','{}'::jsonb
),

(
'KYM-01','YUK-006','Ticaret sicili kimlik kaydı',
'Kurumsal Kimlik','Ticaret Sicili','genel',
90,'P1',
'BEL-006','Ticaret Sicil Gazetesi',
'Ticaret Sicili','Şirket değişikliklerinde',
'genel','{}'::jsonb
),

(
'KYM-01','YUK-007','Güncel faaliyet durumunun belgelenmesi',
'Kurumsal Kimlik','Oda Kayıtları','genel',
70,'P2',
'BEL-007','Faaliyet Belgesi',
'Bağlı Oda','İhtiyaç halinde / güncel kontrol',
'genel','{}'::jsonb
),

(
'KYM-01','YUK-008','Oda sicil kaydının izlenmesi',
'Kurumsal Kimlik','Oda Kayıtları','genel',
65,'P2',
'BEL-008','Oda Sicil Kayıt Sureti',
'Bağlı Oda','Güncel kontrol',
'genel','{}'::jsonb
),

(
'KYM-01','YUK-009','Şirket temsil yetkisinin belgelenmesi',
'Kurumsal Kimlik','Yetki','genel',
90,'P1',
'BEL-009','İmza Sirküleri',
'Noter / Yetkili Kurum','Yetki değişikliğinde',
'genel','{}'::jsonb
),

(
'KYM-01','YUK-010','Şirket ana sözleşmesinin arşivlenmesi',
'Kurumsal Kimlik','Şirket Kuruluşu','genel',
75,'P2',
'BEL-010','Şirket Ana Sözleşmesi',
'Ticaret Sicili','Değişikliklerde',
'genel','{}'::jsonb
),

(
'KYM-01','YUK-011','MERSİS şirket kaydının izlenmesi',
'Kurumsal Kimlik','MERSİS','genel',
65,'P2',
'BEL-011','MERSİS Kayıt Bilgileri',
'MERSİS','Şirket değişikliklerinde',
'genel','{}'::jsonb
),

(
'KYM-01','YUK-012','Şirket adres kayıtlarının doğrulanması',
'Kurumsal Kimlik','Adres','genel',
80,'P1',
'BEL-012','Şirket Adres Teyit Belgesi',
'İlgili kayıt / kurum','Adres değişikliğinde',
'genel','{}'::jsonb
),

-- =====================================================================
-- KYM-02 RUHSAT VE İZİNLER
-- =====================================================================

(
'KYM-02','YUK-002','İşyerinin ruhsat durumunun izlenmesi',
'Ruhsat','Belediye','genel',
100,'P1',
'BEL-002','İşyeri Açma ve Çalışma Ruhsatı',
'İlgili Belediye','Faaliyet veya adres değişikliğinde',
'genel','{}'::jsonb
),

(
'KYM-02','YUK-013','İşyeri kullanım durumunun belgelenmesi',
'Ruhsat','Yapı Kullanımı','kosullu',
90,'P1',
'BEL-013','Yapı Kullanma İzin Belgesi',
'Belediye / Yapı Kayıtları','İşyeri değişikliğinde',
'kosullu','{"kiralik_isyeri":true}'::jsonb
),

(
'KYM-02','YUK-014','İşyeri kullanım hakkının belgelenmesi',
'Ruhsat','Mülkiyet','genel',
85,'P1',
'BEL-014','Tapu veya Kira Sözleşmesi',
'Tapu / Taraflar','Adres veya sözleşme değişikliğinde',
'genel','{}'::jsonb
),

(
'KYM-02','YUK-015','Resmi adres ve numarataj kaydının tutulması',
'Ruhsat','Adres','genel',
65,'P2',
'BEL-015','Numarataj veya Resmi Adres Belgesi',
'Belediye','Adres değişikliğinde',
'genel','{}'::jsonb
),

(
'KYM-02','YUK-016','Faaliyet uygunluk evraklarının izlenmesi',
'Ruhsat','Faaliyet','kurum_talebi',
80,'P1',
'BEL-016','Faaliyet Uygunluk veya Kurum Görüş Yazısı',
'İlgili Kurum','Kurum talebinde',
'kurum_talebi','{}'::jsonb
),

(
'KYM-02','YUK-017','Belediye başvuru kayıtlarının saklanması',
'Ruhsat','Belediye','kurum_talebi',
70,'P2',
'BEL-017','Belediye Ruhsat Başvuru Dosyası',
'İlgili Belediye','Başvuru süreçlerinde',
'kurum_talebi','{}'::jsonb
),

-- =====================================================================
-- KYM-03 SGK
-- =====================================================================

(
'KYM-03','YUK-003','SGK işyeri kaydının izlenmesi',
'SGK','İşveren Kaydı','kosullu',
100,'P1',
'BEL-003','SGK İşyeri Sicil Belgesi',
'SGK','İşyeri değişikliğinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-03','YUK-018','SGK işyeri bildirim kaydının saklanması',
'SGK','İşveren Kaydı','kosullu',
95,'P1',
'BEL-018','SGK İşyeri Bildirgesi Kaydı',
'SGK','İşyeri açılış ve değişikliklerinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-03','YUK-019','Personel işe giriş bildirimlerinin izlenmesi',
'SGK','İşe Giriş','kosullu',
100,'P1',
'BEL-019','İşe Giriş Bildirgeleri',
'SGK','Her işe girişte',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-03','YUK-020','Personel işten ayrılış bildirimlerinin izlenmesi',
'SGK','İşten Ayrılış','kosullu',
100,'P1',
'BEL-020','İşten Ayrılış Bildirgeleri',
'SGK','Her işten ayrılışta',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-03','YUK-021','Prim ve hizmet kayıtlarının kontrolü',
'SGK','Prim','kosullu',
95,'P1',
'BEL-021','Aylık Prim ve Hizmet Kontrol Kayıtları',
'SGK / Muhasebe','Aylık',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-03','YUK-022','SGK borç durumunun izlenmesi',
'SGK','Borç','kosullu',
75,'P2',
'BEL-022','SGK Borcu Yoktur Yazısı veya Durum Kaydı',
'SGK','İhtiyaç halinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-03','YUK-023','SGK teşvik süreçlerinin kayıt altına alınması',
'SGK','Teşvik','bilgi',
60,'P3',
'BEL-023','SGK Teşvik Uygunluk ve Kontrol Kaydı',
'SGK / Muhasebe','Dönemsel',
'bilgi','{"personel_var":true}'::jsonb
),

-- =====================================================================
-- KYM-04 İNSAN KAYNAKLARI
-- =====================================================================

(
'KYM-04','YUK-005','Çalışan sözleşme kaydının tutulması',
'İnsan Kaynakları','İşe Giriş','kosullu',
95,'P1',
'BEL-005','İş Sözleşmesi',
'İşveren / İK','İşe giriş ve şart değişikliğinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-024','Personel özlük dosyasının tutulması',
'İnsan Kaynakları','Özlük','kosullu',
100,'P1',
'BEL-024','Personel Özlük Dosyası',
'İşveren / İK','Çalışma süresince',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-025','Personel kimlik kayıtlarının yönetilmesi',
'İnsan Kaynakları','Özlük','kosullu',
80,'P1',
'BEL-025','Personel Kimlik ve İletişim Kayıt Formu',
'İşveren / İK','Değişikliklerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-026','Görev ve sorumlulukların tanımlanması',
'İnsan Kaynakları','Görev','kosullu',
85,'P1',
'BEL-026','Görev Tanımı',
'İşveren / İK','Görev değişikliğinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-027','Ücret ve yan hak kayıtlarının tutulması',
'İnsan Kaynakları','Ücret','kosullu',
90,'P1',
'BEL-027','Ücret ve Yan Hak Kayıtları',
'İK / Muhasebe','Aylık ve değişikliklerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-028','Yıllık izin kayıtlarının izlenmesi',
'İnsan Kaynakları','İzin','kosullu',
90,'P1',
'BEL-028','Yıllık İzin Kayıtları',
'İşveren / İK','Sürekli',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-029','Fazla çalışma kayıtlarının izlenmesi',
'İnsan Kaynakları','Mesai','kosullu',
85,'P1',
'BEL-029','Fazla Çalışma Onay ve Kayıtları',
'İşveren / İK','Çalışma dönemlerinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-030','Personel disiplin kayıtlarının yönetilmesi',
'İnsan Kaynakları','Disiplin','kosullu',
75,'P2',
'BEL-030','Disiplin Tutanakları',
'İşveren / İK','Olay bazlı',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-031','Çalışan savunma süreçlerinin kayıt altına alınması',
'İnsan Kaynakları','Disiplin','kosullu',
80,'P1',
'BEL-031','Savunma İstem ve Savunma Kayıtları',
'İşveren / İK','Olay bazlı',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-032','Personel ihtar süreçlerinin arşivlenmesi',
'İnsan Kaynakları','Disiplin','kosullu',
75,'P2',
'BEL-032','İhtar ve Bildirim Kayıtları',
'İşveren / İK','Olay bazlı',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-033','Fesih süreçlerinin kayıt altına alınması',
'İnsan Kaynakları','İşten Ayrılış','kosullu',
95,'P1',
'BEL-033','Fesih ve İşten Ayrılış Evrakları',
'İşveren / İK','Her fesih veya ayrılışta',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-04','YUK-034','İşten ayrılış teslim süreçlerinin izlenmesi',
'İnsan Kaynakları','İşten Ayrılış','kosullu',
80,'P1',
'BEL-034','İşten Ayrılış Teslim ve Devir Tutanağı',
'İşveren / İK','Her ayrılışta',
'kosullu','{"personel_var":true}'::jsonb
),

-- =====================================================================
-- KYM-05 İSG
-- =====================================================================

(
'KYM-05','YUK-004','İşyeri risk değerlendirmesinin izlenmesi',
'İSG','Risk','kosullu',
100,'P1',
'BEL-004','Risk Değerlendirmesi',
'İSG Süreci','Dönemsel ve değişikliklerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-035','Acil durum planının tutulması',
'İSG','Acil Durum','kosullu',
100,'P1',
'BEL-035','Acil Durum Planı',
'İSG Süreci','Dönemsel ve değişikliklerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-036','İSG eğitim kayıtlarının tutulması',
'İSG','Eğitim','kosullu',
100,'P1',
'BEL-036','İSG Eğitim Kayıtları',
'İSG Süreci','Eğitim dönemlerinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-037','Çalışan temsil sürecinin izlenmesi',
'İSG','Görevlendirme','kosullu',
80,'P1',
'BEL-037','Çalışan Temsilcisi Görevlendirme Kaydı',
'İşveren / İSG','Değişikliklerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-038','Destek elemanı görevlendirmesinin izlenmesi',
'İSG','Görevlendirme','kosullu',
80,'P1',
'BEL-038','Destek Elemanı Görevlendirme Kaydı',
'İşveren / İSG','Değişikliklerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-039','İşyeri hekimi hizmet kayıtlarının izlenmesi',
'İSG','Sağlık','kosullu',
90,'P1',
'BEL-039','İşyeri Hekimi Görevlendirme veya Hizmet Kaydı',
'İSG Süreci','Sözleşme ve görevlendirme döneminde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-040','İSG uzmanı hizmet kayıtlarının izlenmesi',
'İSG','Uzman','kosullu',
90,'P1',
'BEL-040','İSG Uzmanı Görevlendirme veya Hizmet Kaydı',
'İSG Süreci','Sözleşme ve görevlendirme döneminde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-041','OSGB hizmet sözleşmelerinin arşivlenmesi',
'İSG','OSGB','kosullu',
80,'P1',
'BEL-041','OSGB Hizmet Sözleşmesi',
'OSGB / İşveren','Sözleşme döneminde',
'kosullu','{"osgb_hizmeti_var":true}'::jsonb
),

(
'KYM-05','YUK-042','Çalışan sağlık gözetimi kayıtlarının tutulması',
'İSG','Sağlık','kosullu',
100,'P1',
'BEL-042','İşe Giriş Sağlık Raporları',
'İşyeri Hekimi / Sağlık Süreci','İşe girişte',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-043','Periyodik sağlık muayenelerinin izlenmesi',
'İSG','Sağlık','kosullu',
95,'P1',
'BEL-043','Periyodik Sağlık Muayene Kayıtları',
'İşyeri Hekimi / Sağlık Süreci','Periyodik',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-044','KKD teslimlerinin kayıt altına alınması',
'İSG','KKD','kosullu',
95,'P1',
'BEL-044','KKD Teslim Tutanakları',
'İşveren / İSG','Teslim ve yenilemelerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-045','Ramak kala olaylarının izlenmesi',
'İSG','Olay','kosullu',
85,'P1',
'BEL-045','Ramak Kala Kayıtları',
'İşveren / İSG','Olay bazlı',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-046','İş kazası kayıtlarının yönetilmesi',
'İSG','İş Kazası','kosullu',
100,'P1',
'BEL-046','İş Kazası Dosyaları',
'İşveren / SGK / İSG','Olay bazlı',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-05','YUK-047','Acil durum tatbikat kayıtlarının tutulması',
'İSG','Tatbikat','kosullu',
85,'P1',
'BEL-047','Acil Durum Tatbikat Tutanakları',
'İşveren / İSG','Tatbikat dönemlerinde',
'kosullu','{"personel_var":true}'::jsonb
),

-- =====================================================================
-- KYM-06 KVKK VE VERİ GÜVENLİĞİ
-- =====================================================================

(
'KYM-06','YUK-048','Kişisel veri işleme süreçlerinin envanterlenmesi',
'KVKK','Envanter','kosullu',
100,'P1',
'BEL-048','Kişisel Veri İşleme Envanteri',
'Şirket / KVKK Süreci','Süreç değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-06','YUK-049','Genel aydınlatma yükümlülüklerinin yönetilmesi',
'KVKK','Aydınlatma','kosullu',
100,'P1',
'BEL-049','Genel KVKK Aydınlatma Metni',
'Şirket / KVKK Süreci','Süreç değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-06','YUK-050','Çalışan veri işleme sürecinin açıklanması',
'KVKK','Çalışan','kosullu',
100,'P1',
'BEL-050','Çalışan KVKK Aydınlatma Metni',
'Şirket / KVKK Süreci','Süreç değişikliklerinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-06','YUK-051','Müşteri veri işleme sürecinin açıklanması',
'KVKK','Müşteri','kosullu',
100,'P1',
'BEL-051','Müşteri KVKK Aydınlatma Metni',
'Şirket / KVKK Süreci','Süreç değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-06','YUK-052','Veri saklama ve imha süreçlerinin düzenlenmesi',
'KVKK','Saklama','kosullu',
95,'P1',
'BEL-052','Veri Saklama ve İmha Politikası',
'Şirket / KVKK Süreci','Süreç değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-06','YUK-053','Kişisel veri ihlali süreçlerinin hazırlanması',
'KVKK','İhlal','kosullu',
95,'P1',
'BEL-053','Kişisel Veri İhlali Müdahale Prosedürü',
'Şirket / KVKK Süreci','Süreç değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-06','YUK-054','İlgili kişi başvuru süreçlerinin hazırlanması',
'KVKK','Başvuru','kosullu',
90,'P1',
'BEL-054','KVKK İlgili Kişi Başvuru Prosedürü',
'Şirket / KVKK Süreci','Süreç değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-06','YUK-055','Veri işleyen ilişkilerinin kayıt altına alınması',
'KVKK','Tedarikçi','kosullu',
90,'P1',
'BEL-055','Veri İşleyen veya Veri Güvenliği Sözleşmeleri',
'Şirket / Hukuk','Sözleşme değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-06','YUK-056','Personel gizlilik yükümlülüğünün kayıt altına alınması',
'KVKK','Gizlilik','kosullu',
90,'P1',
'BEL-056','Personel Gizlilik Taahhütnameleri',
'Şirket / İK','İşe giriş ve değişikliklerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-06','YUK-057','VERBİS durumunun kayıt altına alınması',
'KVKK','VERBİS','bilgi',
90,'P1',
'BEL-057','VERBİS Durum ve Kapsam Değerlendirme Kaydı',
'KVKK Süreci','Dönemsel kontrol',
'bilgi','{"musteri_verisi_isleniyor":true}'::jsonb
),

-- =====================================================================
-- KYM-07 ARAÇ VE FİLO
-- =====================================================================

(
'KYM-07','YUK-058','Araç ruhsat kayıtlarının izlenmesi',
'Araç ve Filo','Ruhsat','kosullu',
100,'P1',
'BEL-058','Araç Ruhsatları',
'Trafik / Araç Dosyası','Araç değişikliklerinde',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-059','Zorunlu trafik sigortalarının izlenmesi',
'Araç ve Filo','Sigorta','kosullu',
100,'P1',
'BEL-059','Zorunlu Trafik Sigortası Poliçeleri',
'Sigorta Şirketi','Poliçe döneminde',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-060','Kasko kayıtlarının izlenmesi',
'Araç ve Filo','Sigorta','bilgi',
75,'P2',
'BEL-060','Kasko Poliçeleri',
'Sigorta Şirketi','Poliçe döneminde',
'bilgi','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-061','Araç muayene sürelerinin izlenmesi',
'Araç ve Filo','Muayene','kosullu',
100,'P1',
'BEL-061','Araç Muayene Kayıtları',
'Yetkili Muayene Süreci','Periyodik',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-062','Egzoz emisyon süreçlerinin izlenmesi',
'Araç ve Filo','Emisyon','kosullu',
85,'P1',
'BEL-062','Egzoz Emisyon Ölçüm Kayıtları',
'Yetkili Ölçüm Süreci','Periyodik',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-063','Araç teslim ve zimmetlerinin kayıt altına alınması',
'Araç ve Filo','Teslim','kosullu',
90,'P1',
'BEL-063','Araç Teslim ve Zimmet Tutanakları',
'Şirket / Filo','Teslim ve değişikliklerde',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-064','Sürücü görevlendirme kayıtlarının tutulması',
'Araç ve Filo','Sürücü','kosullu',
85,'P1',
'BEL-064','Sürücü Görevlendirme ve Araç Kullanım Kaydı',
'Şirket / Filo','Görevlendirme değişikliklerinde',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-065','Yakıt kartlarının zimmetlenmesi',
'Araç ve Filo','Yakıt','kosullu',
75,'P2',
'BEL-065','Yakıt Kartı Zimmet Kayıtları',
'Şirket / Filo','Teslim değişikliklerinde',
'kosullu','{"yakit_karti_var":true}'::jsonb
),

(
'KYM-07','YUK-066','HGS ve geçiş hesaplarının izlenmesi',
'Araç ve Filo','Geçiş','kosullu',
65,'P2',
'BEL-066','HGS ve Geçiş Kayıtları',
'Şirket / Filo','Sürekli',
'kosullu','{"hgs_var":true}'::jsonb
),

(
'KYM-07','YUK-067','Araç bakım kayıtlarının izlenmesi',
'Araç ve Filo','Bakım','kosullu',
85,'P1',
'BEL-067','Araç Bakım Kayıtları',
'Şirket / Servis','Periyodik',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-068','Lastik değişim kayıtlarının tutulması',
'Araç ve Filo','Lastik','kosullu',
70,'P2',
'BEL-068','Lastik Değişim ve Kontrol Kayıtları',
'Şirket / Filo','Değişim dönemlerinde',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-07','YUK-069','Araç hasar ve kaza dosyalarının tutulması',
'Araç ve Filo','Hasar','kosullu',
90,'P1',
'BEL-069','Araç Hasar ve Kaza Dosyaları',
'Şirket / Sigorta','Olay bazlı',
'kosullu','{"arac_var":true}'::jsonb
),

-- =====================================================================
-- KYM-08 ZİMMET VE DEMİRBAŞ
-- =====================================================================

(
'KYM-08','YUK-070','Telefon teslimlerinin kayıt altına alınması',
'Zimmet','Telefon','kosullu',
80,'P1',
'BEL-070','Telefon Zimmet Tutanakları',
'Şirket','Teslim ve iadelerde',
'kosullu','{"kurumsal_telefon_var":true}'::jsonb
),

(
'KYM-08','YUK-071','Tablet teslimlerinin kayıt altına alınması',
'Zimmet','Tablet','kosullu',
75,'P2',
'BEL-071','Tablet Zimmet Tutanakları',
'Şirket','Teslim ve iadelerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-08','YUK-072','Bilgisayar teslimlerinin kayıt altına alınması',
'Zimmet','Bilgisayar','kosullu',
85,'P1',
'BEL-072','Bilgisayar Zimmet Tutanakları',
'Şirket','Teslim ve iadelerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-08','YUK-073','El aleti teslimlerinin kayıt altına alınması',
'Zimmet','El Aleti','kosullu',
80,'P1',
'BEL-073','El Aleti Zimmet Tutanakları',
'Şirket','Teslim ve iadelerde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-08','YUK-074','Ölçüm cihazlarının zimmetlenmesi',
'Zimmet','Ölçüm Cihazı','kosullu',
85,'P1',
'BEL-074','Ölçüm Cihazı Zimmet Tutanakları',
'Şirket','Teslim ve iadelerde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-08','YUK-075','Kurumsal hatların zimmetlenmesi',
'Zimmet','Kurumsal Hat','kosullu',
75,'P2',
'BEL-075','Kurumsal Hat Zimmet Kayıtları',
'Şirket','Teslim ve iadelerde',
'kosullu','{"kurumsal_telefon_var":true}'::jsonb
),

(
'KYM-08','YUK-076','Anahtar ve erişim kartlarının zimmetlenmesi',
'Zimmet','Erişim','kosullu',
80,'P1',
'BEL-076','Anahtar ve Erişim Kartı Zimmet Kayıtları',
'Şirket','Teslim ve iadelerde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-08','YUK-077','Sistem erişim yetkilerinin kayıt altına alınması',
'Zimmet','Sistem Erişimi','kosullu',
90,'P1',
'BEL-077','E-posta ve Sistem Erişim Yetki Kayıtları',
'Şirket / Bilgi Teknolojileri','Yetki değişikliklerinde',
'kosullu','{"personel_var":true}'::jsonb
),

-- =====================================================================
-- KYM-09 DEPO VE STOK
-- =====================================================================

(
'KYM-09','YUK-078','Depo sayımlarının kayıt altına alınması',
'Depo','Sayım','kosullu',
90,'P1',
'BEL-078','Depo Sayım Tutanakları',
'Şirket / Depo','Periyodik',
'kosullu','{"depo_var_mi":true}'::jsonb
),

(
'KYM-09','YUK-079','Stok sayım kayıtlarının tutulması',
'Depo','Stok','kosullu',
90,'P1',
'BEL-079','Stok Sayım Kayıtları',
'Şirket / Depo','Periyodik',
'kosullu','{"depo_var_mi":true}'::jsonb
),

(
'KYM-09','YUK-080','Yedek parça teslimlerinin kayıt altına alınması',
'Depo','Yedek Parça','kosullu',
90,'P1',
'BEL-080','Yedek Parça Teslim ve Zimmet Kayıtları',
'Şirket / Depo','Her teslimde',
'kosullu','{"depo_var_mi":true}'::jsonb
),

(
'KYM-09','YUK-081','Hurda teslimlerinin kayıt altına alınması',
'Depo','Hurda','kosullu',
90,'P1',
'BEL-081','Hurda Teslim Kayıtları',
'Şirket / Depo','Her teslimde',
'kosullu','{"depo_var_mi":true}'::jsonb
),

(
'KYM-09','YUK-082','Ürün ve parça iade kayıtlarının tutulması',
'Depo','İade','kosullu',
85,'P1',
'BEL-082','Ürün ve Yedek Parça İade Kayıtları',
'Şirket / Depo','Her iadede',
'kosullu','{"depo_var_mi":true}'::jsonb
),

(
'KYM-09','YUK-083','Depo erişim yetkilerinin yönetilmesi',
'Depo','Erişim','kosullu',
85,'P1',
'BEL-083','Depo Giriş Çıkış Yetki Kayıtları',
'Şirket / Depo','Yetki değişikliklerinde',
'kosullu','{"depo_var_mi":true}'::jsonb
),

-- =====================================================================
-- KYM-10 MALİ VE VERGİSEL UYUM
-- =====================================================================

(
'KYM-10','YUK-084','Vergi mükellefiyet durumunun izlenmesi',
'Mali Uyum','Vergi','genel',
95,'P1',
'BEL-084','Vergi Mükellefiyet Durum Yazısı veya Kaydı',
'Vergi İdaresi','İhtiyaç halinde',
'genel','{}'::jsonb
),

(
'KYM-10','YUK-085','Elektronik tebligat erişiminin izlenmesi',
'Mali Uyum','E-Tebligat','genel',
95,'P1',
'BEL-085','Elektronik Tebligat Aktivasyon ve Erişim Kaydı',
'İlgili Elektronik Tebligat Sistemi','Erişim değişikliklerinde',
'genel','{}'::jsonb
),

(
'KYM-10','YUK-086','E-Fatura durumunun izlenmesi',
'Mali Uyum','E-Belge','bilgi',
85,'P1',
'BEL-086','E-Fatura Kullanım ve Kapsam Kaydı',
'Vergi İdaresi / Muhasebe','Dönemsel kontrol',
'bilgi','{}'::jsonb
),

(
'KYM-10','YUK-087','E-Arşiv durumunun izlenmesi',
'Mali Uyum','E-Belge','bilgi',
85,'P1',
'BEL-087','E-Arşiv Fatura Kullanım ve Kapsam Kaydı',
'Vergi İdaresi / Muhasebe','Dönemsel kontrol',
'bilgi','{}'::jsonb
),

(
'KYM-10','YUK-088','Mali dönem kapanış kontrol kayıtlarının tutulması',
'Mali Uyum','Muhasebe','sirket_politikasi',
80,'P1',
'BEL-088','Aylık Mali Kapanış Kontrol Formu',
'Şirket / Muhasebe','Aylık',
'sirket_politikasi','{}'::jsonb
),

(
'KYM-10','YUK-089','Vergi beyan süreçlerinin kontrol edilmesi',
'Mali Uyum','Beyan','genel',
95,'P1',
'BEL-089','Vergi Beyan Kontrol Kayıtları',
'Muhasebe / Vergi Süreci','Beyan dönemlerinde',
'genel','{}'::jsonb
),

(
'KYM-10','YUK-090','Mali müşavir sözleşme ve yetki kayıtlarının tutulması',
'Mali Uyum','Mali Müşavir','genel',
80,'P1',
'BEL-090','Mali Müşavir Sözleşme ve Yetki Kaydı',
'Şirket / Mali Müşavir','Sözleşme değişikliklerinde',
'genel','{}'::jsonb
),

-- =====================================================================
-- KYM-11 TEKNİK SERVİS VE MARKA
-- =====================================================================

(
'KYM-11','YUK-091','Yetkili servis sözleşmesinin arşivlenmesi',
'Teknik Servis','Yetkilendirme','kosullu',
100,'P1',
'BEL-091','Yetkili Servis Sözleşmesi',
'Marka / Şirket','Sözleşme döneminde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-092','Marka yetkilendirme kaydının tutulması',
'Teknik Servis','Yetkilendirme','kosullu',
100,'P1',
'BEL-092','Marka Yetkilendirme Yazısı',
'Marka','Yetki değişikliklerinde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-093','Teknisyen yetkinlik kayıtlarının izlenmesi',
'Teknik Servis','Teknisyen','kosullu',
95,'P1',
'BEL-093','Teknisyen Yetkinlik Kayıtları',
'Şirket / Marka','Personel ve yetkinlik değişikliklerinde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-094','Marka eğitim kayıtlarının tutulması',
'Teknik Servis','Eğitim','kosullu',
90,'P1',
'BEL-094','Marka Eğitim Sertifikaları',
'Marka','Eğitim dönemlerinde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-095','Servis standart belgelerinin izlenmesi',
'Teknik Servis','Standart','kosullu',
90,'P1',
'BEL-095','Servis Standart ve Operasyon Talimatları',
'Marka / Şirket','Revizyonlarda',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-096','Servis fiş kayıtlarının tutulması',
'Teknik Servis','Hizmet','kosullu',
95,'P1',
'BEL-096','Servis Fişleri ve Hizmet Kayıtları',
'Şirket / Marka','Her hizmette',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-097','Ürün teslim kayıtlarının tutulması',
'Teknik Servis','Teslim','kosullu',
90,'P1',
'BEL-097','Ürün Teslim Tutanakları',
'Şirket','Her teslimde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-098','Montaj ve ilk çalıştırma kayıtlarının tutulması',
'Teknik Servis','Montaj','kosullu',
95,'P1',
'BEL-098','Montaj ve İlk Çalıştırma Kayıtları',
'Şirket / Marka','Her işlemde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-11','YUK-099','Ürün değişim ve hurda süreçlerinin kayıt altına alınması',
'Teknik Servis','Değişim','kosullu',
95,'P1',
'BEL-099','Ürün Değişim ve Hurda Dosyaları',
'Şirket / Marka','Olay bazlı',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

-- =====================================================================
-- KYM-12 MÜŞTERİ VE TÜKETİCİ
-- =====================================================================

(
'KYM-12','YUK-100','Müşteri şikayetlerinin kayıt altına alınması',
'Müşteri','Şikayet','kosullu',
90,'P1',
'BEL-100','Müşteri Şikayet Kayıtları',
'Şirket','Her başvuruda',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-12','YUK-101','Tüketici başvurularının izlenmesi',
'Müşteri','Tüketici','kosullu',
95,'P1',
'BEL-101','Tüketici Başvuru Dosyaları',
'Şirket','Başvuru bazlı',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-12','YUK-102','Tüketici hakem heyeti süreçlerinin arşivlenmesi',
'Müşteri','Hakem Heyeti','kurum_talebi',
100,'P1',
'BEL-102','Tüketici Hakem Heyeti Savunma Dosyaları',
'İlgili Kurum / Hukuk','Başvuru bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-12','YUK-103','Müşteri teslim kayıtlarının tutulması',
'Müşteri','Teslim','kosullu',
90,'P1',
'BEL-103','Müşteri Teslim Tutanakları',
'Şirket','Her teslimde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-12','YUK-104','Müşteri fotoğraf ve video süreçlerinin kayıt altına alınması',
'Müşteri','Görsel Veri','kosullu',
90,'P1',
'BEL-104','Fotoğraf ve Video Veri İşleme Süreç Kaydı',
'Şirket / KVKK','Süreç değişikliklerinde',
'kosullu','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-12','YUK-105','Elektronik veya uzaktan satış süreçlerinin kayıt altına alınması',
'Müşteri','E-Ticaret','kosullu',
95,'P1',
'BEL-105','Elektronik Satış ve Müşteri Bilgilendirme Süreç Dosyası',
'Şirket / Hukuk','Süreç değişikliklerinde',
'kosullu','{"e_ticaret_var":true}'::jsonb
),

-- =====================================================================
-- KYM-13 SÖZLEŞMELER
-- =====================================================================

(
'KYM-13','YUK-106','Kira sözleşmelerinin izlenmesi',
'Sözleşmeler','Kira','kosullu',
90,'P1',
'BEL-106','Kira Sözleşmeleri',
'Taraflar','Sözleşme döneminde',
'kosullu','{"kiralik_isyeri":true}'::jsonb
),

(
'KYM-13','YUK-107','Tedarikçi sözleşmelerinin arşivlenmesi',
'Sözleşmeler','Tedarikçi','genel',
80,'P1',
'BEL-107','Tedarikçi Sözleşmeleri',
'Şirket','Sözleşme döneminde',
'genel','{}'::jsonb
),

(
'KYM-13','YUK-108','Taşeron ilişkilerinin sözleşmeye bağlanması',
'Sözleşmeler','Taşeron','kosullu',
100,'P1',
'BEL-108','Taşeron Sözleşmeleri',
'Şirket / Hukuk','Sözleşme döneminde',
'kosullu','{"taseron_var":true}'::jsonb
),

(
'KYM-13','YUK-109','Araç kiralama sözleşmelerinin arşivlenmesi',
'Sözleşmeler','Araç','bilgi',
85,'P1',
'BEL-109','Araç Kiralama Sözleşmeleri',
'Şirket / Kiralama Firması','Sözleşme döneminde',
'bilgi','{"arac_var":true}'::jsonb
),

(
'KYM-13','YUK-110','Ticari gizlilik sözleşmelerinin izlenmesi',
'Sözleşmeler','Gizlilik','genel',
80,'P1',
'BEL-110','Ticari Gizlilik Sözleşmeleri',
'Şirket / Hukuk','Sözleşme döneminde',
'genel','{}'::jsonb
),

(
'KYM-13','YUK-111','Hizmet sözleşmelerinin arşivlenmesi',
'Sözleşmeler','Hizmet','genel',
85,'P1',
'BEL-111','Hizmet Sözleşmeleri',
'Şirket','Sözleşme döneminde',
'genel','{}'::jsonb
),

-- =====================================================================
-- KYM-14 YANGIN VE ACİL DURUM
-- =====================================================================

(
'KYM-14','YUK-112','Yangın söndürme cihazlarının izlenmesi',
'Yangın','Yangın Tüpü','genel',
100,'P1',
'BEL-112','Yangın Söndürme Cihazı Kontrol Kayıtları',
'Yetkili Kontrol Süreci','Periyodik',
'genel','{}'::jsonb
),

(
'KYM-14','YUK-113','Acil çıkış kontrollerinin kayıt altına alınması',
'Yangın','Acil Çıkış','genel',
95,'P1',
'BEL-113','Acil Çıkış Kontrol Formu',
'Şirket / İSG','Periyodik',
'genel','{}'::jsonb
),

(
'KYM-14','YUK-114','Tahliye planının hazırlanması',
'Yangın','Tahliye','genel',
100,'P1',
'BEL-114','Tahliye Planı',
'Şirket / İSG','Değişikliklerde',
'genel','{}'::jsonb
),

(
'KYM-14','YUK-115','Yangın tatbikat kayıtlarının tutulması',
'Yangın','Tatbikat','kosullu',
90,'P1',
'BEL-115','Yangın Tatbikat Tutanakları',
'Şirket / İSG','Tatbikat dönemlerinde',
'kosullu','{"personel_var":true}'::jsonb
),

(
'KYM-14','YUK-116','Yangın tesisatı kontrollerinin izlenmesi',
'Yangın','Tesisat','kosullu',
100,'P1',
'BEL-116','Yangın Tesisatı Kontrol Kayıtları',
'Yetkili Kontrol Süreci','Periyodik',
'kosullu','{"yangin_tesisati_var":true}'::jsonb
),

(
'KYM-14','YUK-117','İtfaiye veya kurum yazılarının arşivlenmesi',
'Yangın','Resmi Yazı','kurum_talebi',
90,'P1',
'BEL-117','İtfaiye ve Yangın Uygunluk Yazıları',
'İlgili Kurum','Kurum talebinde',
'kurum_talebi','{}'::jsonb
),

-- =====================================================================
-- KYM-15 ÇEVRE / ATIK / HURDA
-- =====================================================================

(
'KYM-15','YUK-118','Genel atık süreçlerinin kayıt altına alınması',
'Çevre','Atık','bilgi',
75,'P2',
'BEL-118','Atık Yönetim ve Teslim Kayıtları',
'Şirket / Yetkili Firma','Teslim dönemlerinde',
'bilgi','{}'::jsonb
),

(
'KYM-15','YUK-119','Elektronik atık teslimlerinin kayıt altına alınması',
'Çevre','Elektronik Atık','kosullu',
90,'P1',
'BEL-119','Elektronik Atık Teslim Belgeleri',
'Yetkili Teslim Süreci','Teslim bazlı',
'kosullu','{"elektronik_atik_var":true}'::jsonb
),

(
'KYM-15','YUK-120','Hurda kayıtlarının izlenmesi',
'Çevre','Hurda','kosullu',
85,'P1',
'BEL-120','Hurda Kayıt ve Teslim Belgeleri',
'Şirket / Yetkili Teslim Süreci','Teslim bazlı',
'kosullu','{"depo_var_mi":true}'::jsonb
),

(
'KYM-15','YUK-121','Atık pil süreçlerinin kayıt altına alınması',
'Çevre','Atık Pil','bilgi',
65,'P2',
'BEL-121','Atık Pil Teslim Kayıtları',
'Yetkili Teslim Süreci','Teslim bazlı',
'bilgi','{}'::jsonb
),

(
'KYM-15','YUK-122','Tehlikeli atık süreçlerinin izlenmesi',
'Çevre','Tehlikeli Atık','kosullu',
100,'P1',
'BEL-122','Tehlikeli Atık Kayıt ve Teslim Belgeleri',
'Yetkili Atık Süreci','Teslim ve dönem bazlı',
'kosullu','{"tehlikeli_atik_var":true}'::jsonb
),

-- =====================================================================
-- KYM-16 TESİS VE PERİYODİK KONTROLLER
-- =====================================================================

(
'KYM-16','YUK-123','Elektrik tesisatı kontrol kayıtlarının tutulması',
'Tesis','Elektrik','genel',
100,'P1',
'BEL-123','Elektrik Tesisatı Kontrol Raporu',
'Yetkili Kontrol Süreci','Periyodik',
'genel','{}'::jsonb
),

(
'KYM-16','YUK-124','Topraklama kontrollerinin izlenmesi',
'Tesis','Topraklama','genel',
100,'P1',
'BEL-124','Topraklama Kontrol Raporu',
'Yetkili Kontrol Süreci','Periyodik',
'genel','{}'::jsonb
),

(
'KYM-16','YUK-125','Basınçlı sistem kontrollerinin izlenmesi',
'Tesis','Basınçlı Sistem','kosullu',
100,'P1',
'BEL-125','Basınçlı Kap veya Kompresör Periyodik Kontrol Raporu',
'Yetkili Kontrol Süreci','Periyodik',
'kosullu','{"basinc_sistemi_var":true}'::jsonb
),

(
'KYM-16','YUK-126','Kaldırma ekipmanlarının kontrol edilmesi',
'Tesis','Kaldırma Ekipmanı','kosullu',
100,'P1',
'BEL-126','Kaldırma Ekipmanı Periyodik Kontrol Raporu',
'Yetkili Kontrol Süreci','Periyodik',
'kosullu','{"kaldirma_ekipmani_var":true}'::jsonb
),

(
'KYM-16','YUK-127','Depo raf güvenlik kontrollerinin kayıt altına alınması',
'Tesis','Raf','kosullu',
85,'P1',
'BEL-127','Depo Raf Güvenlik Kontrol Kaydı',
'Şirket / Yetkili Kontrol','Periyodik',
'kosullu','{"depo_var_mi":true}'::jsonb
),

-- =====================================================================
-- KYM-17 KAMERA / GPS / İLETİŞİM
-- =====================================================================

(
'KYM-17','YUK-128','Kamera veri işleme süreçlerinin belgelenmesi',
'Veri ve İletişim','Kamera','kosullu',
100,'P1',
'BEL-128','Kamera Sistemi Veri İşleme ve Aydınlatma Kaydı',
'Şirket / KVKK','Süreç değişikliklerinde',
'kosullu','{"kamera_var":true}'::jsonb
),

(
'KYM-17','YUK-129','Kamera bilgilendirme uygulamalarının kontrol edilmesi',
'Veri ve İletişim','Kamera','kosullu',
95,'P1',
'BEL-129','Kamera Aydınlatma Levhası Kontrol Kaydı',
'Şirket / KVKK','Yerleşim değişikliklerinde',
'kosullu','{"kamera_var":true}'::jsonb
),

(
'KYM-17','YUK-130','GPS ve araç takip süreçlerinin kayıt altına alınması',
'Veri ve İletişim','GPS','kosullu',
100,'P1',
'BEL-130','GPS ve Araç Takip Veri İşleme Kaydı',
'Şirket / KVKK','Süreç değişikliklerinde',
'kosullu','{"gps_konum_isleniyor":true}'::jsonb
),

(
'KYM-17','YUK-131','Personel konum işleme süreçlerinin belgelenmesi',
'Veri ve İletişim','Konum','kosullu',
100,'P1',
'BEL-131','Personel Konum Verisi İşleme ve Aydınlatma Kaydı',
'Şirket / KVKK','Süreç değişikliklerinde',
'kosullu','{"gps_konum_isleniyor":true}'::jsonb
),

(
'KYM-17','YUK-132','Kurumsal telefon süreçlerinin kayıt altına alınması',
'Veri ve İletişim','Telefon','kosullu',
80,'P1',
'BEL-132','Kurumsal Telefon Kullanım ve Kayıt Politikası',
'Şirket','Süreç değişikliklerinde',
'kosullu','{"kurumsal_telefon_var":true}'::jsonb
),

(
'KYM-17','YUK-133','WhatsApp ve SMS müşteri iletişim süreçlerinin belgelenmesi',
'Veri ve İletişim','Elektronik İletişim','kosullu',
100,'P1',
'BEL-133','WhatsApp ve SMS Müşteri İletişim Süreç Kaydı',
'Şirket / KVKK','Süreç değişikliklerinde',
'kosullu','{"whatsapp_sms_kullaniliyor":true}'::jsonb
),

-- =====================================================================
-- KYM-18 EĞİTİM VE YETKİNLİK
-- =====================================================================

(
'KYM-18','YUK-134','Mesleki yeterlilik belgelerinin izlenmesi',
'Eğitim','Mesleki Yeterlilik','bilgi',
90,'P1',
'BEL-134','Mesleki Yeterlilik Belgeleri',
'İlgili Yetkilendirme Süreci','Geçerlilik döneminde',
'bilgi','{"personel_var":true}'::jsonb
),

(
'KYM-18','YUK-135','Ustalık belgelerinin kapsam bazlı izlenmesi',
'Eğitim','Ustalık','bilgi',
85,'P1',
'BEL-135','Ustalık Belgeleri',
'İlgili Yetkilendirme Süreci','Kapsam değişikliklerinde',
'bilgi','{"personel_var":true}'::jsonb
),

(
'KYM-18','YUK-136','Sürücü belgelerinin izlenmesi',
'Eğitim','Sürücü','kosullu',
100,'P1',
'BEL-136','Sürücü Belgesi Kayıtları',
'Personel / Şirket','Geçerlilik ve değişikliklerde',
'kosullu','{"arac_var":true}'::jsonb
),

(
'KYM-18','YUK-137','SRC durumunun kapsam bazlı izlenmesi',
'Eğitim','SRC','bilgi',
90,'P1',
'BEL-137','SRC Belgesi Durum Kayıtları',
'İlgili Yetkilendirme Süreci','Geçerlilik döneminde',
'bilgi','{"arac_var":true}'::jsonb
),

(
'KYM-18','YUK-138','Psikoteknik durumunun kapsam bazlı izlenmesi',
'Eğitim','Psikoteknik','bilgi',
90,'P1',
'BEL-138','Psikoteknik Belge Durum Kayıtları',
'İlgili Sağlık / Yetkilendirme Süreci','Geçerlilik döneminde',
'bilgi','{"arac_var":true}'::jsonb
),

(
'KYM-18','YUK-139','Teknik eğitimlerin kayıt altına alınması',
'Eğitim','Teknik Eğitim','kosullu',
85,'P1',
'BEL-139','Teknik Eğitim Kayıtları',
'Şirket / Marka','Eğitim dönemlerinde',
'kosullu','{"yetkili_servis_mi":true}'::jsonb
),

(
'KYM-18','YUK-140','Personel eğitim matrisinin izlenmesi',
'Eğitim','Eğitim Matrisi','kosullu',
80,'P1',
'BEL-140','Personel Eğitim ve Yetkinlik Matrisi',
'Şirket / İK','Sürekli',
'kosullu','{"personel_var":true}'::jsonb
),

-- =====================================================================
-- KYM-19 DENETİM VE RESMİ YAZIŞMALAR
-- =====================================================================

(
'KYM-19','YUK-141','Resmi denetim kayıtlarının merkezi arşivlenmesi',
'Denetim','Genel','kurum_talebi',
100,'P1',
'BEL-141','Resmi Denetim Tutanakları',
'İlgili Kurum','Denetim bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-142','Zabıta yazılarının arşivlenmesi',
'Denetim','Belediye','kurum_talebi',
95,'P1',
'BEL-142','Zabıta Yazıları ve Tutanakları',
'Belediye / Zabıta','Olay bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-143','Belediye resmi yazışmalarının arşivlenmesi',
'Denetim','Belediye','kurum_talebi',
95,'P1',
'BEL-143','Belediye Resmi Yazışma Dosyaları',
'Belediye','Yazışma bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-144','SGK resmi yazışmalarının arşivlenmesi',
'Denetim','SGK','kurum_talebi',
100,'P1',
'BEL-144','SGK Resmi Yazışma Dosyaları',
'SGK','Yazışma bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-145','Vergi idaresi resmi yazışmalarının arşivlenmesi',
'Denetim','Vergi','kurum_talebi',
100,'P1',
'BEL-145','Vergi İdaresi Resmi Yazışma Dosyaları',
'Vergi İdaresi','Yazışma bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-146','İŞKUR yazışmalarının arşivlenmesi',
'Denetim','İŞKUR','kurum_talebi',
85,'P1',
'BEL-146','İŞKUR Resmi Yazışma Dosyaları',
'İŞKUR','Yazışma bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-147','Çalışma idaresi yazışmalarının arşivlenmesi',
'Denetim','Çalışma','kurum_talebi',
100,'P1',
'BEL-147','Çalışma İdaresi Resmi Yazışma Dosyaları',
'İlgili Bakanlık / Kurum','Yazışma bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-148','KVKK başvuru ve resmi süreç kayıtlarının tutulması',
'Denetim','KVKK','kurum_talebi',
100,'P1',
'BEL-148','KVKK Başvuru ve Resmi Süreç Dosyaları',
'Şirket / İlgili Kurum','Başvuru bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-149','Mahkeme ve hukuki bildirimlerin arşivlenmesi',
'Denetim','Hukuk','kurum_talebi',
100,'P1',
'BEL-149','Mahkeme ve Hukuki Bildirim Dosyaları',
'Mahkeme / Hukuk','Dosya bazlı',
'kurum_talebi','{}'::jsonb
),

(
'KYM-19','YUK-150','İcra bildirimlerinin merkezi arşivlenmesi',
'Denetim','İcra','kurum_talebi',
100,'P1',
'BEL-150','İcra Bildirim ve Takip Dosyaları',
'İcra / Hukuk','Dosya bazlı',
'kurum_talebi','{}'::jsonb
),

-- =====================================================================
-- KYM-20 ŞİRKET POLİTİKA VE PROSEDÜRLERİ
-- =====================================================================

(
'KYM-20','YUK-151','İnsan kaynakları işleyişinin prosedürleştirilmesi',
'Şirket Prosedürü','İK','sirket_politikasi',
70,'P2',
'BEL-151','İnsan Kaynakları Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{}'::jsonb
),

(
'KYM-20','YUK-152','İşe giriş sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','İşe Giriş','sirket_politikasi',
80,'P1',
'BEL-152','İşe Giriş Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"personel_var":true}'::jsonb
),

(
'KYM-20','YUK-153','İşten ayrılış sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','İşten Ayrılış','sirket_politikasi',
80,'P1',
'BEL-153','İşten Ayrılış Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"personel_var":true}'::jsonb
),

(
'KYM-20','YUK-154','Disiplin sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','Disiplin','sirket_politikasi',
80,'P1',
'BEL-154','Disiplin Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"personel_var":true}'::jsonb
),

(
'KYM-20','YUK-155','Zimmet sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','Zimmet','sirket_politikasi',
75,'P2',
'BEL-155','Zimmet Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"personel_var":true}'::jsonb
),

(
'KYM-20','YUK-156','Araç kullanım sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','Araç','sirket_politikasi',
85,'P1',
'BEL-156','Araç Kullanım Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"arac_var":true}'::jsonb
),

(
'KYM-20','YUK-157','Depo işleyişinin prosedürleştirilmesi',
'Şirket Prosedürü','Depo','sirket_politikasi',
85,'P1',
'BEL-157','Depo Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"depo_var_mi":true}'::jsonb
),

(
'KYM-20','YUK-158','KVKK sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','KVKK','sirket_politikasi',
90,'P1',
'BEL-158','KVKK Uyum Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-20','YUK-159','Bilgi güvenliği sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','Bilgi Güvenliği','sirket_politikasi',
90,'P1',
'BEL-159','Bilgi Güvenliği Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{}'::jsonb
),

(
'KYM-20','YUK-160','Acil durum süreçlerinin prosedürleştirilmesi',
'Şirket Prosedürü','Acil Durum','sirket_politikasi',
90,'P1',
'BEL-160','Acil Durum Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{}'::jsonb
),

(
'KYM-20','YUK-161','Müşteri şikayet sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','Şikayet','sirket_politikasi',
80,'P1',
'BEL-161','Şikayet Yönetimi Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"musteri_verisi_isleniyor":true}'::jsonb
),

(
'KYM-20','YUK-162','Belge saklama süreçlerinin prosedürleştirilmesi',
'Şirket Prosedürü','Arşiv','sirket_politikasi',
85,'P1',
'BEL-162','Belge Saklama ve Arşiv Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{}'::jsonb
),

(
'KYM-20','YUK-163','Yetki yönetimi sürecinin prosedürleştirilmesi',
'Şirket Prosedürü','Yetki','sirket_politikasi',
90,'P1',
'BEL-163','Sistem Yetki ve Erişim Yönetimi Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{"personel_var":true}'::jsonb
),

(
'KYM-20','YUK-164','Olay ve uygunsuzluk süreçlerinin kayıt altına alınması',
'Şirket Prosedürü','Uygunsuzluk','sirket_politikasi',
80,'P1',
'BEL-164','Uygunsuzluk ve Düzeltici Aksiyon Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{}'::jsonb
),

(
'KYM-20','YUK-165','Kurumsal belge değişikliklerinin izlenmesi',
'Şirket Prosedürü','Doküman Yönetimi','sirket_politikasi',
80,'P1',
'BEL-165','Doküman Revizyon ve Versiyon Takip Prosedürü',
'Şirket','Revizyonlarda',
'sirket_politikasi','{}'::jsonb
)

  ) as k (
    modul_kodu,
    yukumluluk_kodu,
    yukumluluk_basligi,
    kategori,
    alt_kategori,
    yukumluluk_tipi,
    risk_puani,
    oncelik,
    belge_kodu,
    belge_adi,
    basvuru_yeri,
    yenileme_periyodu,
    uygulanabilirlik_tipi,
    uygulanabilirlik_kosulu
  )

),

-- ---------------------------------------------------------------------
-- 5. Yükümlülükleri ekle / güncelle
-- ---------------------------------------------------------------------

yukumluluk_upsert as (

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

  select
    m.id,
    k.yukumluluk_kodu,
    k.yukumluluk_basligi,
    k.kategori,
    k.alt_kategori,
    k.yukumluluk_tipi,
    null,
    null,
    'KYM kapsamlı teknik uyum havuzu kaydı. Hukuki dayanak ve kurum bilgisi resmi kaynak doğrulama sürecinde kesinleştirilecektir.',
    k.risk_puani,
    k.oncelik,
    true

  from katalog k

  join public.kym_moduller m
    on m.kod = k.modul_kodu

  on conflict (kod)
  do update set
    modul_id = excluded.modul_id,
    baslik = excluded.baslik,
    kategori = excluded.kategori,
    alt_kategori = excluded.alt_kategori,
    yukumluluk_tipi = excluded.yukumluluk_tipi,
    risk_puani = excluded.risk_puani,
    oncelik = excluded.oncelik,
    aktif = true

  returning id, kod
)

-- ---------------------------------------------------------------------
-- 6. Belgeleri ekle / güncelle
-- ---------------------------------------------------------------------

insert into public.kym_belge_tanimlari (
  yukumluluk_id,
  kod,
  ad,
  kategori,
  alt_kategori,
  basvuru_yeri,
  yenileme_periyodu,
  aciklama,
  aktif,
  uygulanabilirlik_tipi,
  uygulanabilirlik_kosulu,
  hukuki_kontrol_gerekli
)

select
  y.id,
  k.belge_kodu,
  k.belge_adi,
  k.kategori,
  k.alt_kategori,
  k.basvuru_yeri,
  k.yenileme_periyodu,
  'KYM ana belge ve kayıt havuzu.',
  true,
  k.uygulanabilirlik_tipi,
  k.uygulanabilirlik_kosulu,
  true

from katalog k

join public.kym_yukumluluklar y
  on y.kod = k.yukumluluk_kodu

on conflict (kod)
do update set
  yukumluluk_id = excluded.yukumluluk_id,
  ad = excluded.ad,
  kategori = excluded.kategori,
  alt_kategori = excluded.alt_kategori,
  basvuru_yeri = excluded.basvuru_yeri,
  yenileme_periyodu = excluded.yenileme_periyodu,
  aciklama = excluded.aciklama,
  aktif = true,
  uygulanabilirlik_tipi = excluded.uygulanabilirlik_tipi,
  uygulanabilirlik_kosulu = excluded.uygulanabilirlik_kosulu,
  hukuki_kontrol_gerekli = excluded.hukuki_kontrol_gerekli;

-- ---------------------------------------------------------------------
-- 7. Profil kayıtlarını oluştur
-- Mevcut işletme verileri korunur.
-- ---------------------------------------------------------------------

insert into public.kym_isletme_uyum_profilleri (
  isletme_id
)

select
  i.id

from public.kym_isletmeler i

on conflict (isletme_id)
do nothing;

-- ---------------------------------------------------------------------
-- 8. Uygulanabilirlik durum motoru
--
-- Sonuçlar:
-- uygulanir
-- uygulanmiyor
-- bilgi_gerekli
-- ---------------------------------------------------------------------

create or replace function public.kym_belge_uygulanabilirlik_durumu(
  p_isletme_id uuid,
  p_belge_tanim_id uuid
)
returns text
language plpgsql
stable
as $$
declare
  v_isletme public.kym_isletmeler%rowtype;
  v_profil public.kym_isletme_uyum_profilleri%rowtype;
  v_belge public.kym_belge_tanimlari%rowtype;

  v_kosul jsonb;
begin

  select *
  into v_isletme
  from public.kym_isletmeler
  where id = p_isletme_id;

  if not found then
    return 'bilgi_gerekli';
  end if;

  select *
  into v_belge
  from public.kym_belge_tanimlari
  where id = p_belge_tanim_id
    and aktif = true;

  if not found then
    return 'uygulanmiyor';
  end if;

  select *
  into v_profil
  from public.kym_isletme_uyum_profilleri
  where isletme_id = p_isletme_id;

  v_kosul :=
    coalesce(
      v_belge.uygulanabilirlik_kosulu,
      '{}'::jsonb
    );

  if v_belge.uygulanabilirlik_tipi = 'genel' then
    return 'uygulanir';
  end if;

  if v_belge.uygulanabilirlik_tipi = 'kurum_talebi' then
    return 'bilgi_gerekli';
  end if;

  if v_belge.uygulanabilirlik_tipi = 'bilgi'
     and v_kosul = '{}'::jsonb then
    return 'bilgi_gerekli';
  end if;

  -- Personel var mı?
  if v_kosul ? 'personel_var' then

    if v_isletme.personel_sayisi is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'personel_var')::boolean
       <> (v_isletme.personel_sayisi > 0) then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Araç var mı?
  if v_kosul ? 'arac_var' then

    if v_isletme.arac_sayisi is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'arac_var')::boolean
       <> (v_isletme.arac_sayisi > 0) then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Depo
  if v_kosul ? 'depo_var_mi' then

    if v_isletme.depo_var_mi is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'depo_var_mi')::boolean
       <> v_isletme.depo_var_mi then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Yetkili servis
  if v_kosul ? 'yetkili_servis_mi' then

    if v_isletme.yetkili_servis_mi is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'yetkili_servis_mi')::boolean
       <> v_isletme.yetkili_servis_mi then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Kamera
  if v_kosul ? 'kamera_var' then

    if v_profil.kamera_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'kamera_var')::boolean
       <> v_profil.kamera_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- GPS / konum
  if v_kosul ? 'gps_konum_isleniyor' then

    if v_profil.gps_konum_isleniyor is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'gps_konum_isleniyor')::boolean
       <> v_profil.gps_konum_isleniyor then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Müşteri verisi
  if v_kosul ? 'musteri_verisi_isleniyor' then

    if v_profil.musteri_verisi_isleniyor is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'musteri_verisi_isleniyor')::boolean
       <> v_profil.musteri_verisi_isleniyor then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Kurumsal telefon
  if v_kosul ? 'kurumsal_telefon_var' then

    if v_profil.kurumsal_telefon_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'kurumsal_telefon_var')::boolean
       <> v_profil.kurumsal_telefon_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- WhatsApp / SMS
  if v_kosul ? 'whatsapp_sms_kullaniliyor' then

    if v_profil.whatsapp_sms_kullaniliyor is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'whatsapp_sms_kullaniliyor')::boolean
       <> v_profil.whatsapp_sms_kullaniliyor then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Taşeron
  if v_kosul ? 'taseron_var' then

    if v_profil.taseron_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'taseron_var')::boolean
       <> v_profil.taseron_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Kiralık işyeri
  if v_kosul ? 'kiralik_isyeri' then

    if v_profil.kiralik_isyeri is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'kiralik_isyeri')::boolean
       <> v_profil.kiralik_isyeri then
      return 'uygulanmiyor';
    end if;

  end if;

  -- E-ticaret
  if v_kosul ? 'e_ticaret_var' then

    if v_profil.e_ticaret_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'e_ticaret_var')::boolean
       <> v_profil.e_ticaret_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Yakıt kartı
  if v_kosul ? 'yakit_karti_var' then

    if v_profil.yakit_karti_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'yakit_karti_var')::boolean
       <> v_profil.yakit_karti_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- HGS
  if v_kosul ? 'hgs_var' then

    if v_profil.hgs_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'hgs_var')::boolean
       <> v_profil.hgs_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Elektronik atık
  if v_kosul ? 'elektronik_atik_var' then

    if v_profil.elektronik_atik_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'elektronik_atik_var')::boolean
       <> v_profil.elektronik_atik_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Tehlikeli atık
  if v_kosul ? 'tehlikeli_atik_var' then

    if v_profil.tehlikeli_atik_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'tehlikeli_atik_var')::boolean
       <> v_profil.tehlikeli_atik_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Basınç sistemi
  if v_kosul ? 'basinc_sistemi_var' then

    if v_profil.basinc_sistemi_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'basinc_sistemi_var')::boolean
       <> v_profil.basinc_sistemi_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Kaldırma ekipmanı
  if v_kosul ? 'kaldirma_ekipmani_var' then

    if v_profil.kaldirma_ekipmani_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'kaldirma_ekipmani_var')::boolean
       <> v_profil.kaldirma_ekipmani_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- Yangın tesisatı
  if v_kosul ? 'yangin_tesisati_var' then

    if v_profil.yangin_tesisati_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'yangin_tesisati_var')::boolean
       <> v_profil.yangin_tesisati_var then
      return 'uygulanmiyor';
    end if;

  end if;

  -- OSGB
  if v_kosul ? 'osgb_hizmeti_var' then

    if v_profil.osgb_hizmeti_var is null then
      return 'bilgi_gerekli';
    end if;

    if (v_kosul ->> 'osgb_hizmeti_var')::boolean
       <> v_profil.osgb_hizmeti_var then
      return 'uygulanmiyor';
    end if;

  end if;

  return 'uygulanir';

end;
$$;

-- ---------------------------------------------------------------------
-- 9. İşletme belge havuzunu senkronize eden fonksiyon
--
-- uygulanir      → belge kaydı açılır / mevcut kayıt korunur
-- uygulanmiyor   → durum uygulanmiyor yapılır
-- bilgi_gerekli  → belge kaydı açılır ve manuel inceleme durumuna alınır
--
-- Mevcut AI doğrulanmış belge geriye döndürülmez.
-- ---------------------------------------------------------------------

create or replace function public.kym_isletme_belge_havuzunu_senkronize_et(
  p_isletme_id uuid
)
returns integer
language plpgsql
as $$
declare
  v_belge record;
  v_durum text;
  v_islenen integer := 0;
begin

  for v_belge in

    select
      bt.id as belge_tanim_id

    from public.kym_belge_tanimlari bt

    join public.kym_yukumluluklar y
      on y.id = bt.yukumluluk_id

    where bt.aktif = true
      and y.aktif = true

  loop

    v_durum :=
      public.kym_belge_uygulanabilirlik_durumu(
        p_isletme_id,
        v_belge.belge_tanim_id
      );

    insert into public.kym_isletme_belgeleri (
      isletme_id,
      belge_tanim_id,
      durum,
      mevcut_mu,
      notlar
    )

    values (
      p_isletme_id,
      v_belge.belge_tanim_id,

      case
        when v_durum = 'uygulanmiyor'
          then 'uygulanmiyor'

        when v_durum = 'bilgi_gerekli'
          then 'manuel_inceleme_gerekli'

        else 'yok'
      end,

      false,

      case
        when v_durum = 'uygulanmiyor'
          then 'KYM uygulanabilirlik motoru: işletme profiline göre kapsam dışı.'

        when v_durum = 'bilgi_gerekli'
          then 'KYM uygulanabilirlik motoru: işletme profil bilgisi veya kurum kapsam değerlendirmesi gerekli.'

        else
          'KYM ana belge havuzundan oluşturuldu.'
      end
    )

    on conflict (
      isletme_id,
      belge_tanim_id
    )

    do update set

      durum =
        case

          when kym_isletme_belgeleri.durum in (
            'dogrulandi_guncel',
            'suresi_yaklasiyor',
            'suresi_doldu',
            'yanlis_belge',
            'eksik_bilgi_var',
            'yuklendi_incelemede'
          )
          then kym_isletme_belgeleri.durum

          when v_durum = 'uygulanmiyor'
          then 'uygulanmiyor'

          when v_durum = 'bilgi_gerekli'
          then 'manuel_inceleme_gerekli'

          else 'yok'

        end,

      notlar =
        case

          when kym_isletme_belgeleri.durum in (
            'dogrulandi_guncel',
            'suresi_yaklasiyor',
            'suresi_doldu',
            'yanlis_belge',
            'eksik_bilgi_var',
            'yuklendi_incelemede'
          )
          then kym_isletme_belgeleri.notlar

          when v_durum = 'uygulanmiyor'
          then 'KYM uygulanabilirlik motoru: işletme profiline göre kapsam dışı.'

          when v_durum = 'bilgi_gerekli'
          then 'KYM uygulanabilirlik motoru: işletme profil bilgisi veya kurum kapsam değerlendirmesi gerekli.'

          else
            'KYM ana belge havuzundan oluşturuldu.'

        end;

    v_islenen :=
      v_islenen + 1;

  end loop;

  return v_islenen;

end;
$$;

-- ---------------------------------------------------------------------
-- 10. Mevcut KYM işletmelerini senkronize et
-- ---------------------------------------------------------------------

do $$
declare
  v_isletme record;
begin

  for v_isletme in
    select id
    from public.kym_isletmeler
    where aktif = true
  loop

    perform
      public.kym_isletme_belge_havuzunu_senkronize_et(
        v_isletme.id
      );

  end loop;

end;
$$;

-- ---------------------------------------------------------------------
-- 11. Uygulanabilirlik görünümü
-- ---------------------------------------------------------------------

drop view if exists public.v_kym_belge_uygulanabilirlik;

create view public.v_kym_belge_uygulanabilirlik as

select
  ib.isletme_id,

  i.isletme_adi,

  ib.id as isletme_belge_id,

  bt.id as belge_tanim_id,

  bt.kod as belge_kodu,

  bt.ad as belge_adi,

  y.kod as yukumluluk_kodu,

  y.baslik as yukumluluk_basligi,

  m.kod as modul_kodu,

  m.ad as modul_adi,

  bt.uygulanabilirlik_tipi,

  bt.uygulanabilirlik_kosulu,

  public.kym_belge_uygulanabilirlik_durumu(
    ib.isletme_id,
    bt.id
  ) as uygulanabilirlik_durumu,

  ib.durum as belge_durumu,

  y.risk_puani,

  y.oncelik,

  bt.hukuki_kontrol_gerekli

from public.kym_isletme_belgeleri ib

join public.kym_isletmeler i
  on i.id = ib.isletme_id

join public.kym_belge_tanimlari bt
  on bt.id = ib.belge_tanim_id

join public.kym_yukumluluklar y
  on y.id = bt.yukumluluk_id

left join public.kym_moduller m
  on m.id = y.modul_id;

-- ---------------------------------------------------------------------
-- 12. RLS - KYM bağımsız test aşaması
-- ---------------------------------------------------------------------

alter table public.kym_isletme_uyum_profilleri
enable row level security;

drop policy if exists
"kym_isletme_uyum_profilleri_test_read"
on public.kym_isletme_uyum_profilleri;

create policy
"kym_isletme_uyum_profilleri_test_read"
on public.kym_isletme_uyum_profilleri
for select
to anon, authenticated
using (true);

drop policy if exists
"kym_isletme_uyum_profilleri_test_insert"
on public.kym_isletme_uyum_profilleri;

create policy
"kym_isletme_uyum_profilleri_test_insert"
on public.kym_isletme_uyum_profilleri
for insert
to anon, authenticated
with check (true);

drop policy if exists
"kym_isletme_uyum_profilleri_test_update"
on public.kym_isletme_uyum_profilleri;

create policy
"kym_isletme_uyum_profilleri_test_update"
on public.kym_isletme_uyum_profilleri
for update
to anon, authenticated
using (true)
with check (true);

-- ---------------------------------------------------------------------
-- 13. Kurulum kontrolü
-- ---------------------------------------------------------------------

select
  'modul' as tur,
  count(*)::integer as adet
from public.kym_moduller
where aktif = true

union all

select
  'yukumluluk',
  count(*)::integer
from public.kym_yukumluluklar
where aktif = true

union all

select
  'belge_tanimi',
  count(*)::integer
from public.kym_belge_tanimlari
where aktif = true

union all

select
  'isletme_belgesi',
  count(*)::integer
from public.kym_isletme_belgeleri

union all

select
  'uyum_profili',
  count(*)::integer
from public.kym_isletme_uyum_profilleri;

-- ---------------------------------------------------------------------
-- 14. Uygulanabilirlik durum kontrolü
-- ---------------------------------------------------------------------

select
  uygulanabilirlik_durumu,
  count(*)::integer as adet

from public.v_kym_belge_uygulanabilirlik

group by uygulanabilirlik_durumu

order by uygulanabilirlik_durumu;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------