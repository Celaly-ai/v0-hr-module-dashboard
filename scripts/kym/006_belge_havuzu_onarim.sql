-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.4.1
-- Belge Havuzu Onarım ve Senkronizasyon
--
-- Kök neden:
-- 005 katalog kurulumunda yükümlülükler data-modifying CTE içinde
-- oluşturuldu. Aynı SQL statement içindeki belge SELECT'i yeni eklenen
-- yükümlülükleri ana tablodan aynı snapshot nedeniyle göremedi.
--
-- Sonuç:
-- 165 yükümlülük oluştu ancak yalnız önceden var olan 5 yükümlülüğe
-- bağlı belge tanımı oluştu.
--
-- Bu dosya:
-- 1. Mevcut 165 yükümlülüğü KORUR.
-- 2. Eksik belge tanımlarını üretir.
-- 3. Mevcut 5 belge tanımını KORUR.
-- 4. İşletme belge havuzunu yeniden senkronize eder.
-- 5. Hiçbir mevcut AI doğrulama sonucunu silmez.
--
-- Mevcut FeyRoute tablolarına dokunmaz.
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. Belge tanımı yardımcı fonksiyonu
--
-- Eksik katalog kayıtlarında belge adı, yükümlülük başlığından
-- operasyonel belge/kayıt adı olarak üretilir.
--
-- Mevcut BEL-001 ... BEL-005 kayıtları değiştirilmez.
-- ---------------------------------------------------------------------

create or replace function public.kym_belge_adi_uret(
  p_yukumluluk_basligi text,
  p_kategori text,
  p_alt_kategori text
)
returns text
language plpgsql
immutable
as $$
declare
  v_baslik text;
begin
  v_baslik := trim(coalesce(p_yukumluluk_basligi, ''));

  if v_baslik = '' then
    return 'KYM Belge veya Kayıt Dosyası';
  end if;

  -- ---------------------------------------------------------------
  -- Kurumsal kimlik
  -- ---------------------------------------------------------------

  if v_baslik ilike '%ticaret sicili kimlik%' then
    return 'Ticaret Sicil Gazetesi';
  end if;

  if v_baslik ilike '%güncel faaliyet durum%' then
    return 'Faaliyet Belgesi';
  end if;

  if v_baslik ilike '%oda sicil%' then
    return 'Oda Sicil Kayıt Sureti';
  end if;

  if v_baslik ilike '%temsil yetki%' then
    return 'İmza Sirküleri';
  end if;

  if v_baslik ilike '%ana sözleşme%' then
    return 'Şirket Ana Sözleşmesi';
  end if;

  if v_baslik ilike '%mersis%' then
    return 'MERSİS Kayıt Bilgileri';
  end if;

  if v_baslik ilike '%şirket adres%' then
    return 'Şirket Adres Teyit Belgesi';
  end if;

  -- ---------------------------------------------------------------
  -- Ruhsat
  -- ---------------------------------------------------------------

  if v_baslik ilike '%kullanım durumunun belgelenmesi%' then
    return 'Yapı Kullanma İzin Belgesi';
  end if;

  if v_baslik ilike '%kullanım hakkının belgelenmesi%' then
    return 'Tapu veya Kira Sözleşmesi';
  end if;

  if v_baslik ilike '%numarataj%' then
    return 'Numarataj veya Resmi Adres Belgesi';
  end if;

  if v_baslik ilike '%faaliyet uygunluk%' then
    return 'Faaliyet Uygunluk veya Kurum Görüş Yazısı';
  end if;

  if v_baslik ilike '%belediye başvuru%' then
    return 'Belediye Ruhsat Başvuru Dosyası';
  end if;

  -- ---------------------------------------------------------------
  -- SGK
  -- ---------------------------------------------------------------

  if v_baslik ilike '%sgk işyeri bildirim%' then
    return 'SGK İşyeri Bildirgesi Kaydı';
  end if;

  if v_baslik ilike '%işe giriş bildirim%' then
    return 'İşe Giriş Bildirgeleri';
  end if;

  if v_baslik ilike '%işten ayrılış bildirim%' then
    return 'İşten Ayrılış Bildirgeleri';
  end if;

  if v_baslik ilike '%prim ve hizmet%' then
    return 'Aylık Prim ve Hizmet Kontrol Kayıtları';
  end if;

  if v_baslik ilike '%sgk borç%' then
    return 'SGK Borcu Yoktur Yazısı veya Durum Kaydı';
  end if;

  if v_baslik ilike '%sgk teşvik%' then
    return 'SGK Teşvik Uygunluk ve Kontrol Kaydı';
  end if;

  -- ---------------------------------------------------------------
  -- İnsan Kaynakları
  -- ---------------------------------------------------------------

  if v_baslik ilike '%özlük dosya%' then
    return 'Personel Özlük Dosyası';
  end if;

  if v_baslik ilike '%kimlik kayıt%' then
    return 'Personel Kimlik ve İletişim Kayıt Formu';
  end if;

  if v_baslik ilike '%görev ve sorumluluk%' then
    return 'Görev Tanımı';
  end if;

  if v_baslik ilike '%ücret ve yan hak%' then
    return 'Ücret ve Yan Hak Kayıtları';
  end if;

  if v_baslik ilike '%yıllık izin%' then
    return 'Yıllık İzin Kayıtları';
  end if;

  if v_baslik ilike '%fazla çalışma%' then
    return 'Fazla Çalışma Onay ve Kayıtları';
  end if;

  if v_baslik ilike '%disiplin kayıt%' then
    return 'Disiplin Tutanakları';
  end if;

  if v_baslik ilike '%savunma süreç%' then
    return 'Savunma İstem ve Savunma Kayıtları';
  end if;

  if v_baslik ilike '%ihtar süreç%' then
    return 'İhtar ve Bildirim Kayıtları';
  end if;

  if v_baslik ilike '%fesih süreç%' then
    return 'Fesih ve İşten Ayrılış Evrakları';
  end if;

  if v_baslik ilike '%ayrılış teslim%' then
    return 'İşten Ayrılış Teslim ve Devir Tutanağı';
  end if;

  -- ---------------------------------------------------------------
  -- İSG
  -- ---------------------------------------------------------------

  if v_baslik ilike '%acil durum plan%' then
    return 'Acil Durum Planı';
  end if;

  if v_baslik ilike '%isg eğitim%' then
    return 'İSG Eğitim Kayıtları';
  end if;

  if v_baslik ilike '%çalışan temsil%' then
    return 'Çalışan Temsilcisi Görevlendirme Kaydı';
  end if;

  if v_baslik ilike '%destek elemanı%' then
    return 'Destek Elemanı Görevlendirme Kaydı';
  end if;

  if v_baslik ilike '%işyeri hekimi%' then
    return 'İşyeri Hekimi Görevlendirme veya Hizmet Kaydı';
  end if;

  if v_baslik ilike '%isg uzmanı%' then
    return 'İSG Uzmanı Görevlendirme veya Hizmet Kaydı';
  end if;

  if v_baslik ilike '%osgb%' then
    return 'OSGB Hizmet Sözleşmesi';
  end if;

  if v_baslik ilike '%sağlık gözetimi%' then
    return 'İşe Giriş Sağlık Raporları';
  end if;

  if v_baslik ilike '%periyodik sağlık%' then
    return 'Periyodik Sağlık Muayene Kayıtları';
  end if;

  if v_baslik ilike '%kkd teslim%' then
    return 'KKD Teslim Tutanakları';
  end if;

  if v_baslik ilike '%ramak kala%' then
    return 'Ramak Kala Kayıtları';
  end if;

  if v_baslik ilike '%iş kazası%' then
    return 'İş Kazası Dosyaları';
  end if;

  if v_baslik ilike '%acil durum tatbikat%' then
    return 'Acil Durum Tatbikat Tutanakları';
  end if;

  -- ---------------------------------------------------------------
  -- KVKK
  -- ---------------------------------------------------------------

  if v_baslik ilike '%veri işleme süreçlerinin envanter%' then
    return 'Kişisel Veri İşleme Envanteri';
  end if;

  if v_baslik ilike '%genel aydınlatma%' then
    return 'Genel KVKK Aydınlatma Metni';
  end if;

  if v_baslik ilike '%çalışan veri işleme%' then
    return 'Çalışan KVKK Aydınlatma Metni';
  end if;

  if v_baslik ilike '%müşteri veri işleme%' then
    return 'Müşteri KVKK Aydınlatma Metni';
  end if;

  if v_baslik ilike '%saklama ve imha%' then
    return 'Veri Saklama ve İmha Politikası';
  end if;

  if v_baslik ilike '%veri ihlali%' then
    return 'Kişisel Veri İhlali Müdahale Prosedürü';
  end if;

  if v_baslik ilike '%ilgili kişi başvuru%' then
    return 'KVKK İlgili Kişi Başvuru Prosedürü';
  end if;

  if v_baslik ilike '%veri işleyen ilişki%' then
    return 'Veri İşleyen veya Veri Güvenliği Sözleşmeleri';
  end if;

  if v_baslik ilike '%personel gizlilik%' then
    return 'Personel Gizlilik Taahhütnameleri';
  end if;

  if v_baslik ilike '%verbis%' then
    return 'VERBİS Durum ve Kapsam Değerlendirme Kaydı';
  end if;

  -- ---------------------------------------------------------------
  -- Araç
  -- ---------------------------------------------------------------

  if v_baslik ilike '%araç ruhsat%' then
    return 'Araç Ruhsatları';
  end if;

  if v_baslik ilike '%zorunlu trafik sigorta%' then
    return 'Zorunlu Trafik Sigortası Poliçeleri';
  end if;

  if v_baslik ilike '%kasko%' then
    return 'Kasko Poliçeleri';
  end if;

  if v_baslik ilike '%araç muayene%' then
    return 'Araç Muayene Kayıtları';
  end if;

  if v_baslik ilike '%egzoz emisyon%' then
    return 'Egzoz Emisyon Ölçüm Kayıtları';
  end if;

  if v_baslik ilike '%araç teslim ve zimmet%' then
    return 'Araç Teslim ve Zimmet Tutanakları';
  end if;

  if v_baslik ilike '%sürücü görevlendirme%' then
    return 'Sürücü Görevlendirme ve Araç Kullanım Kaydı';
  end if;

  if v_baslik ilike '%yakıt kart%' then
    return 'Yakıt Kartı Zimmet Kayıtları';
  end if;

  if v_baslik ilike '%hgs%' then
    return 'HGS ve Geçiş Kayıtları';
  end if;

  if v_baslik ilike '%araç bakım%' then
    return 'Araç Bakım Kayıtları';
  end if;

  if v_baslik ilike '%lastik değişim%' then
    return 'Lastik Değişim ve Kontrol Kayıtları';
  end if;

  if v_baslik ilike '%hasar ve kaza%' then
    return 'Araç Hasar ve Kaza Dosyaları';
  end if;

  -- ---------------------------------------------------------------
  -- Zimmet
  -- ---------------------------------------------------------------

  if v_baslik ilike '%telefon teslim%' then
    return 'Telefon Zimmet Tutanakları';
  end if;

  if v_baslik ilike '%tablet teslim%' then
    return 'Tablet Zimmet Tutanakları';
  end if;

  if v_baslik ilike '%bilgisayar teslim%' then
    return 'Bilgisayar Zimmet Tutanakları';
  end if;

  if v_baslik ilike '%el aleti teslim%' then
    return 'El Aleti Zimmet Tutanakları';
  end if;

  if v_baslik ilike '%ölçüm cihaz%' then
    return 'Ölçüm Cihazı Zimmet Tutanakları';
  end if;

  if v_baslik ilike '%kurumsal hat%' then
    return 'Kurumsal Hat Zimmet Kayıtları';
  end if;

  if v_baslik ilike '%anahtar ve erişim kart%' then
    return 'Anahtar ve Erişim Kartı Zimmet Kayıtları';
  end if;

  if v_baslik ilike '%sistem erişim yetki%' then
    return 'E-posta ve Sistem Erişim Yetki Kayıtları';
  end if;

  -- ---------------------------------------------------------------
  -- Depo
  -- ---------------------------------------------------------------

  if v_baslik ilike '%depo sayım%' then
    return 'Depo Sayım Tutanakları';
  end if;

  if v_baslik ilike '%stok sayım%' then
    return 'Stok Sayım Kayıtları';
  end if;

  if v_baslik ilike '%yedek parça teslim%' then
    return 'Yedek Parça Teslim ve Zimmet Kayıtları';
  end if;

  if v_baslik ilike '%hurda teslim%' then
    return 'Hurda Teslim Kayıtları';
  end if;

  if v_baslik ilike '%ürün ve parça iade%' then
    return 'Ürün ve Yedek Parça İade Kayıtları';
  end if;

  if v_baslik ilike '%depo erişim%' then
    return 'Depo Giriş Çıkış Yetki Kayıtları';
  end if;

  -- ---------------------------------------------------------------
  -- Mali
  -- ---------------------------------------------------------------

  if v_baslik ilike '%vergi mükellefiyet durum%' then
    return 'Vergi Mükellefiyet Durum Yazısı veya Kaydı';
  end if;

  if v_baslik ilike '%elektronik tebligat%' then
    return 'Elektronik Tebligat Aktivasyon ve Erişim Kaydı';
  end if;

  if v_baslik ilike '%e-fatura%' then
    return 'E-Fatura Kullanım ve Kapsam Kaydı';
  end if;

  if v_baslik ilike '%e-arşiv%' then
    return 'E-Arşiv Fatura Kullanım ve Kapsam Kaydı';
  end if;

  if v_baslik ilike '%mali dönem kapanış%' then
    return 'Aylık Mali Kapanış Kontrol Formu';
  end if;

  if v_baslik ilike '%vergi beyan%' then
    return 'Vergi Beyan Kontrol Kayıtları';
  end if;

  if v_baslik ilike '%mali müşavir%' then
    return 'Mali Müşavir Sözleşme ve Yetki Kaydı';
  end if;

  -- ---------------------------------------------------------------
  -- Teknik servis
  -- ---------------------------------------------------------------

  if v_baslik ilike '%yetkili servis sözleşme%' then
    return 'Yetkili Servis Sözleşmesi';
  end if;

  if v_baslik ilike '%marka yetkilendirme%' then
    return 'Marka Yetkilendirme Yazısı';
  end if;

  if v_baslik ilike '%teknisyen yetkinlik%' then
    return 'Teknisyen Yetkinlik Kayıtları';
  end if;

  if v_baslik ilike '%marka eğitim%' then
    return 'Marka Eğitim Sertifikaları';
  end if;

  if v_baslik ilike '%servis standart%' then
    return 'Servis Standart ve Operasyon Talimatları';
  end if;

  if v_baslik ilike '%servis fiş%' then
    return 'Servis Fişleri ve Hizmet Kayıtları';
  end if;

  if v_baslik ilike '%ürün teslim%' then
    return 'Ürün Teslim Tutanakları';
  end if;

  if v_baslik ilike '%montaj ve ilk çalıştırma%' then
    return 'Montaj ve İlk Çalıştırma Kayıtları';
  end if;

  if v_baslik ilike '%ürün değişim ve hurda%' then
    return 'Ürün Değişim ve Hurda Dosyaları';
  end if;

  -- ---------------------------------------------------------------
  -- Müşteri
  -- ---------------------------------------------------------------

  if v_baslik ilike '%müşteri şikayet%' then
    return 'Müşteri Şikayet Kayıtları';
  end if;

  if v_baslik ilike '%tüketici başvuru%' then
    return 'Tüketici Başvuru Dosyaları';
  end if;

  if v_baslik ilike '%hakem heyeti%' then
    return 'Tüketici Hakem Heyeti Savunma Dosyaları';
  end if;

  if v_baslik ilike '%müşteri teslim%' then
    return 'Müşteri Teslim Tutanakları';
  end if;

  if v_baslik ilike '%fotoğraf ve video%' then
    return 'Fotoğraf ve Video Veri İşleme Süreç Kaydı';
  end if;

  if v_baslik ilike '%elektronik veya uzaktan satış%' then
    return 'Elektronik Satış ve Müşteri Bilgilendirme Süreç Dosyası';
  end if;

  -- ---------------------------------------------------------------
  -- Sözleşmeler
  -- ---------------------------------------------------------------

  if v_baslik ilike '%kira sözleşme%' then
    return 'Kira Sözleşmeleri';
  end if;

  if v_baslik ilike '%tedarikçi sözleşme%' then
    return 'Tedarikçi Sözleşmeleri';
  end if;

  if v_baslik ilike '%taşeron ilişki%' then
    return 'Taşeron Sözleşmeleri';
  end if;

  if v_baslik ilike '%araç kiralama%' then
    return 'Araç Kiralama Sözleşmeleri';
  end if;

  if v_baslik ilike '%ticari gizlilik%' then
    return 'Ticari Gizlilik Sözleşmeleri';
  end if;

  if v_baslik ilike '%hizmet sözleşme%' then
    return 'Hizmet Sözleşmeleri';
  end if;

  -- ---------------------------------------------------------------
  -- Yangın
  -- ---------------------------------------------------------------

  if v_baslik ilike '%yangın söndürme cihaz%' then
    return 'Yangın Söndürme Cihazı Kontrol Kayıtları';
  end if;

  if v_baslik ilike '%acil çıkış kontrol%' then
    return 'Acil Çıkış Kontrol Formu';
  end if;

  if v_baslik ilike '%tahliye plan%' then
    return 'Tahliye Planı';
  end if;

  if v_baslik ilike '%yangın tatbikat%' then
    return 'Yangın Tatbikat Tutanakları';
  end if;

  if v_baslik ilike '%yangın tesisatı%' then
    return 'Yangın Tesisatı Kontrol Kayıtları';
  end if;

  if v_baslik ilike '%itfaiye%' then
    return 'İtfaiye ve Yangın Uygunluk Yazıları';
  end if;

  -- ---------------------------------------------------------------
  -- Çevre
  -- ---------------------------------------------------------------

  if v_baslik ilike '%genel atık%' then
    return 'Atık Yönetim ve Teslim Kayıtları';
  end if;

  if v_baslik ilike '%elektronik atık%' then
    return 'Elektronik Atık Teslim Belgeleri';
  end if;

  if v_baslik ilike '%hurda kayıt%' then
    return 'Hurda Kayıt ve Teslim Belgeleri';
  end if;

  if v_baslik ilike '%atık pil%' then
    return 'Atık Pil Teslim Kayıtları';
  end if;

  if v_baslik ilike '%tehlikeli atık%' then
    return 'Tehlikeli Atık Kayıt ve Teslim Belgeleri';
  end if;

  -- ---------------------------------------------------------------
  -- Tesis
  -- ---------------------------------------------------------------

  if v_baslik ilike '%elektrik tesisatı%' then
    return 'Elektrik Tesisatı Kontrol Raporu';
  end if;

  if v_baslik ilike '%topraklama%' then
    return 'Topraklama Kontrol Raporu';
  end if;

  if v_baslik ilike '%basınçlı sistem%' then
    return 'Basınçlı Kap veya Kompresör Periyodik Kontrol Raporu';
  end if;

  if v_baslik ilike '%kaldırma ekipman%' then
    return 'Kaldırma Ekipmanı Periyodik Kontrol Raporu';
  end if;

  if v_baslik ilike '%raf güvenlik%' then
    return 'Depo Raf Güvenlik Kontrol Kaydı';
  end if;

  -- ---------------------------------------------------------------
  -- Kamera / GPS / iletişim
  -- ---------------------------------------------------------------

  if v_baslik ilike '%kamera veri işleme%' then
    return 'Kamera Sistemi Veri İşleme ve Aydınlatma Kaydı';
  end if;

  if v_baslik ilike '%kamera bilgilendirme%' then
    return 'Kamera Aydınlatma Levhası Kontrol Kaydı';
  end if;

  if v_baslik ilike '%gps ve araç takip%' then
    return 'GPS ve Araç Takip Veri İşleme Kaydı';
  end if;

  if v_baslik ilike '%personel konum%' then
    return 'Personel Konum Verisi İşleme ve Aydınlatma Kaydı';
  end if;

  if v_baslik ilike '%kurumsal telefon süreç%' then
    return 'Kurumsal Telefon Kullanım ve Kayıt Politikası';
  end if;

  if v_baslik ilike '%whatsapp ve sms%' then
    return 'WhatsApp ve SMS Müşteri İletişim Süreç Kaydı';
  end if;

  -- ---------------------------------------------------------------
  -- Eğitim
  -- ---------------------------------------------------------------

  if v_baslik ilike '%mesleki yeterlilik%' then
    return 'Mesleki Yeterlilik Belgeleri';
  end if;

  if v_baslik ilike '%ustalık belge%' then
    return 'Ustalık Belgeleri';
  end if;

  if v_baslik ilike '%sürücü belg%' then
    return 'Sürücü Belgesi Kayıtları';
  end if;

  if v_baslik ilike '%src durum%' then
    return 'SRC Belgesi Durum Kayıtları';
  end if;

  if v_baslik ilike '%psikoteknik%' then
    return 'Psikoteknik Belge Durum Kayıtları';
  end if;

  if v_baslik ilike '%teknik eğitim%' then
    return 'Teknik Eğitim Kayıtları';
  end if;

  if v_baslik ilike '%eğitim matris%' then
    return 'Personel Eğitim ve Yetkinlik Matrisi';
  end if;

  -- ---------------------------------------------------------------
  -- Denetim
  -- ---------------------------------------------------------------

  if v_baslik ilike '%resmi denetim%' then
    return 'Resmi Denetim Tutanakları';
  end if;

  if v_baslik ilike '%zabıta%' then
    return 'Zabıta Yazıları ve Tutanakları';
  end if;

  if v_baslik ilike '%belediye resmi yazış%' then
    return 'Belediye Resmi Yazışma Dosyaları';
  end if;

  if v_baslik ilike '%sgk resmi yazış%' then
    return 'SGK Resmi Yazışma Dosyaları';
  end if;

  if v_baslik ilike '%vergi idaresi resmi yazış%' then
    return 'Vergi İdaresi Resmi Yazışma Dosyaları';
  end if;

  if v_baslik ilike '%işkur%' then
    return 'İŞKUR Resmi Yazışma Dosyaları';
  end if;

  if v_baslik ilike '%çalışma idaresi%' then
    return 'Çalışma İdaresi Resmi Yazışma Dosyaları';
  end if;

  if v_baslik ilike '%kvkk başvuru ve resmi%' then
    return 'KVKK Başvuru ve Resmi Süreç Dosyaları';
  end if;

  if v_baslik ilike '%mahkeme ve hukuki%' then
    return 'Mahkeme ve Hukuki Bildirim Dosyaları';
  end if;

  if v_baslik ilike '%icra bildirim%' then
    return 'İcra Bildirim ve Takip Dosyaları';
  end if;

  -- ---------------------------------------------------------------
  -- Şirket prosedürleri
  -- ---------------------------------------------------------------

  if v_baslik ilike '%insan kaynakları işleyiş%' then
    return 'İnsan Kaynakları Prosedürü';
  end if;

  if v_baslik ilike '%işe giriş sürecinin prosedür%' then
    return 'İşe Giriş Prosedürü';
  end if;

  if v_baslik ilike '%işten ayrılış sürecinin prosedür%' then
    return 'İşten Ayrılış Prosedürü';
  end if;

  if v_baslik ilike '%disiplin sürecinin prosedür%' then
    return 'Disiplin Prosedürü';
  end if;

  if v_baslik ilike '%zimmet sürecinin prosedür%' then
    return 'Zimmet Prosedürü';
  end if;

  if v_baslik ilike '%araç kullanım sürecinin prosedür%' then
    return 'Araç Kullanım Prosedürü';
  end if;

  if v_baslik ilike '%depo işleyişinin prosedür%' then
    return 'Depo Prosedürü';
  end if;

  if v_baslik ilike '%kvkk sürecinin prosedür%' then
    return 'KVKK Uyum Prosedürü';
  end if;

  if v_baslik ilike '%bilgi güvenliği sürecinin prosedür%' then
    return 'Bilgi Güvenliği Prosedürü';
  end if;

  if v_baslik ilike '%acil durum süreçlerinin prosedür%' then
    return 'Acil Durum Prosedürü';
  end if;

  if v_baslik ilike '%müşteri şikayet sürecinin prosedür%' then
    return 'Şikayet Yönetimi Prosedürü';
  end if;

  if v_baslik ilike '%belge saklama süreçlerinin prosedür%' then
    return 'Belge Saklama ve Arşiv Prosedürü';
  end if;

  if v_baslik ilike '%yetki yönetimi sürecinin prosedür%' then
    return 'Sistem Yetki ve Erişim Yönetimi Prosedürü';
  end if;

  if v_baslik ilike '%olay ve uygunsuzluk%' then
    return 'Uygunsuzluk ve Düzeltici Aksiyon Prosedürü';
  end if;

  if v_baslik ilike '%kurumsal belge değişiklik%' then
    return 'Doküman Revizyon ve Versiyon Takip Prosedürü';
  end if;

  -- ---------------------------------------------------------------
  -- Güvenli fallback
  --
  -- Belgenin gerçek adı ayrıca hukuki katalog doğrulama aşamasında
  -- revize edilebilir. Yükümlülük hiçbir şekilde kaybedilmez.
  -- ---------------------------------------------------------------

  return v_baslik || ' - Belge veya Kayıt Dosyası';

end;
$$;

-- ---------------------------------------------------------------------
-- 2. Mevcut 165 yükümlülükten eksik belge tanımlarını oluştur
--
-- YUK-006 → BEL-006
-- YUK-165 → BEL-165
--
-- BEL-001 ... BEL-005 mevcut ve korunur.
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

  'BEL-' ||
  lpad(
    substring(y.kod from '([0-9]+)$'),
    3,
    '0'
  ) as belge_kodu,

  public.kym_belge_adi_uret(
    y.baslik,
    y.kategori,
    y.alt_kategori
  ) as belge_adi,

  y.kategori,

  y.alt_kategori,

  case

    when y.kategori = 'SGK'
      then 'SGK / İlgili İşveren Sistemi'

    when y.kategori = 'Ruhsat'
      then 'İlgili Belediye veya Kurum'

    when y.kategori in (
      'KVKK',
      'Veri ve İletişim'
    )
      then 'Şirket / KVKK Süreci'

    when y.kategori in (
      'İSG',
      'Yangın',
      'Tesis'
    )
      then 'Şirket / İSG / Yetkili Kontrol Süreci'

    when y.kategori = 'Araç ve Filo'
      then 'Şirket / Filo / İlgili Yetkili Kurum'

    when y.kategori = 'Depo'
      then 'Şirket / Depo'

    when y.kategori = 'Teknik Servis'
      then 'Şirket / Marka'

    when y.kategori = 'Mali Uyum'
      then 'Şirket / Muhasebe / İlgili Kurum'

    when y.kategori = 'Denetim'
      then 'İlgili Resmi Kurum / Şirket'

    else
      'Şirket / İlgili Birim'

  end as basvuru_yeri,

  case

    when y.baslik ilike '%aylık%'
      then 'Aylık'

    when y.baslik ilike '%periyodik%'
      then 'Periyodik'

    when y.baslik ilike '%geçerlilik%'
      then 'Geçerlilik süresine göre'

    when y.baslik ilike '%değişiklik%'
      then 'Değişikliklerde'

    when y.baslik ilike '%olay%'
      then 'Olay bazlı'

    when y.baslik ilike '%her hizmet%'
      then 'Her hizmette'

    else
      'Dönemsel ve süreç değişikliklerinde'

  end as yenileme_periyodu,

  'KYM ana yükümlülük havuzundan onarım sürecinde oluşturulan belge veya kayıt tanımı.' as aciklama,

  true,

  case

    when y.yukumluluk_tipi = 'genel'
      then 'genel'

    when y.yukumluluk_tipi = 'kurum_talebi'
      then 'kurum_talebi'

    when y.yukumluluk_tipi = 'bilgi'
      then 'bilgi'

    when y.yukumluluk_tipi = 'sirket_politikasi'
      then 'sirket_politikasi'

    else
      'kosullu'

  end as uygulanabilirlik_tipi,

  case

    -- ---------------------------------------------------------------
    -- Personel koşulu
    -- ---------------------------------------------------------------

    when
      y.kategori in (
        'SGK',
        'İnsan Kaynakları'
      )
      or y.baslik ilike '%çalışan%'
      or y.baslik ilike '%personel%'
      or y.baslik ilike '%işe giriş%'
      or y.baslik ilike '%işten ayrılış%'
      or y.baslik ilike '%fazla çalışma%'
      or y.baslik ilike '%iş kazası%'
      or y.baslik ilike '%kkd%'
      or y.baslik ilike '%ramak kala%'
    then '{"personel_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Araç
    -- ---------------------------------------------------------------

    when
      y.kategori = 'Araç ve Filo'
      or y.baslik ilike '%sürücü belge%'
      or y.baslik ilike '%src%'
      or y.baslik ilike '%psikoteknik%'
      or y.baslik ilike '%araç kullanım sürecinin prosedür%'
    then '{"arac_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Depo
    -- ---------------------------------------------------------------

    when
      y.kategori = 'Depo'
      or y.baslik ilike '%depo işleyiş%'
      or y.baslik ilike '%raf güvenlik%'
    then '{"depo_var_mi":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Yetkili servis
    -- ---------------------------------------------------------------

    when
      y.kategori = 'Teknik Servis'
      or y.baslik ilike '%teknik eğitim%'
      or y.baslik ilike '%el aleti teslim%'
      or y.baslik ilike '%ölçüm cihaz%'
    then '{"yetkili_servis_mi":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Kamera
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%kamera%'
    then '{"kamera_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- GPS / konum
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%gps%'
      or y.baslik ilike '%konum%'
    then '{"gps_konum_isleniyor":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Müşteri verisi
    -- ---------------------------------------------------------------

    when
      y.kategori = 'Müşteri'
      or y.baslik ilike '%müşteri veri%'
      or y.baslik ilike '%kişisel veri%'
      or y.baslik ilike '%kvkk%'
      or y.baslik ilike '%veri işleme süreçlerinin envanter%'
      or y.baslik ilike '%saklama ve imha%'
      or y.baslik ilike '%veri ihlali%'
      or y.baslik ilike '%ilgili kişi başvuru%'
    then '{"musteri_verisi_isleniyor":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Kurumsal telefon
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%telefon%'
      or y.baslik ilike '%kurumsal hat%'
    then '{"kurumsal_telefon_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- WhatsApp / SMS
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%whatsapp%'
      or y.baslik ilike '%sms%'
    then '{"whatsapp_sms_kullaniliyor":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Taşeron
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%taşeron%'
    then '{"taseron_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Kira
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%kira sözleşme%'
    then '{"kiralik_isyeri":true}'::jsonb

    -- ---------------------------------------------------------------
    -- E-ticaret
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%elektronik veya uzaktan satış%'
    then '{"e_ticaret_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Yakıt kartı
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%yakıt kart%'
    then '{"yakit_karti_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- HGS
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%hgs%'
    then '{"hgs_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Elektronik atık
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%elektronik atık%'
    then '{"elektronik_atik_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Tehlikeli atık
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%tehlikeli atık%'
    then '{"tehlikeli_atik_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Basınç sistemi
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%basınçlı sistem%'
    then '{"basinc_sistemi_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Kaldırma ekipmanı
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%kaldırma ekipman%'
    then '{"kaldirma_ekipmani_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- Yangın tesisatı
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%yangın tesisatı%'
    then '{"yangin_tesisati_var":true}'::jsonb

    -- ---------------------------------------------------------------
    -- OSGB
    -- ---------------------------------------------------------------

    when
      y.baslik ilike '%osgb%'
    then '{"osgb_hizmeti_var":true}'::jsonb

    else
      '{}'::jsonb

  end as uygulanabilirlik_kosulu,

  true

from public.kym_yukumluluklar y

where y.aktif = true

  and y.kod ~ '^YUK-[0-9]+$'

  and not exists (
    select 1

    from public.kym_belge_tanimlari bt

    where bt.kod =
      'BEL-' ||
      lpad(
        substring(
          y.kod
          from '([0-9]+)$'
        ),
        3,
        '0'
      )
  );

-- ---------------------------------------------------------------------
-- 3. Mevcut belge tanımlarının yükümlülük bağlarını güvenceye al
-- ---------------------------------------------------------------------

update public.kym_belge_tanimlari bt

set yukumluluk_id = y.id

from public.kym_yukumluluklar y

where y.kod =
  'YUK-' ||
  lpad(
    substring(
      bt.kod
      from '([0-9]+)$'
    ),
    3,
    '0'
  )

and bt.kod ~ '^BEL-[0-9]+$'

and bt.yukumluluk_id is distinct from y.id;

-- ---------------------------------------------------------------------
-- 4. Mevcut işletmeler için profil kayıtlarını güvenceye al
-- ---------------------------------------------------------------------

insert into public.kym_isletme_uyum_profilleri (
  isletme_id
)

select
  i.id

from public.kym_isletmeler i

where i.aktif = true

on conflict (
  isletme_id
)
do nothing;

-- ---------------------------------------------------------------------
-- 5. Tüm mevcut KYM işletmelerinin belge havuzunu yeniden senkronize et
-- ---------------------------------------------------------------------

do $$
declare
  v_isletme record;
begin

  for v_isletme in

    select
      id

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
-- 6. Kontrol view'ını yeniden oluştur
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
-- 7. Ana sayı kontrolü
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

from public.kym_isletme_uyum_profilleri

union all

select
  'uygulanabilirlik_view',
  count(*)::integer

from public.v_kym_belge_uygulanabilirlik;

-- ---------------------------------------------------------------------
-- 8. Durum dağılımı
-- ---------------------------------------------------------------------

select
  uygulanabilirlik_durumu,
  count(*)::integer as adet

from public.v_kym_belge_uygulanabilirlik

group by uygulanabilirlik_durumu

order by uygulanabilirlik_durumu;

-- ---------------------------------------------------------------------
-- 9. Eksik kod kontrolü
-- Beklenen sonuç: 0 satır
-- ---------------------------------------------------------------------

select
  y.kod as yukumluluk_kodu,

  'BEL-' ||
  lpad(
    substring(
      y.kod
      from '([0-9]+)$'
    ),
    3,
    '0'
  ) as beklenen_belge_kodu

from public.kym_yukumluluklar y

where y.aktif = true

and y.kod ~ '^YUK-[0-9]+$'

and not exists (

  select 1

  from public.kym_belge_tanimlari bt

  where bt.kod =
    'BEL-' ||
    lpad(
      substring(
        y.kod
        from '([0-9]+)$'
      ),
      3,
      '0'
    )

)

order by y.kod;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------