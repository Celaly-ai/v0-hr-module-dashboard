-- ---------------------------------------------------------------------
-- FeyRoute KYM Core V1
-- Kurumsal Yönetim Merkezi
-- Tam bağımsız çekirdek yapı
-- Mevcut FeyRoute tablolarına dokunmaz.
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- 1. KYM şirket/işletme profili
create table if not exists public.kym_isletmeler (
  id uuid primary key default uuid_generate_v4(),
  isletme_adi text not null,
  vergi_no text,
  sehir text,
  ilce text,
  sirket_turu text,
  faaliyet_alani text,
  personel_sayisi integer default 0,
  arac_sayisi integer default 0,
  depo_var_mi boolean default false,
  yetkili_servis_mi boolean default false,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Ana modüller
create table if not exists public.kym_moduller (
  id uuid primary key default uuid_generate_v4(),
  kod text not null unique,
  ad text not null,
  aciklama text,
  sira integer default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Hukuki/idari yükümlülükler
create table if not exists public.kym_yukumluluklar (
  id uuid primary key default uuid_generate_v4(),
  modul_id uuid references public.kym_moduller(id) on delete set null,
  kod text not null unique,
  baslik text not null,
  kategori text not null,
  alt_kategori text,
  yukumluluk_tipi text not null default 'zorunlu',
  hukuki_dayanak text,
  denetleyen_kurum text,
  aciklama text,
  risk_puani integer not null default 50 check (risk_puani between 0 and 100),
  oncelik text not null default 'P3',
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Belge tanımları
create table if not exists public.kym_belge_tanimlari (
  id uuid primary key default uuid_generate_v4(),
  yukumluluk_id uuid references public.kym_yukumluluklar(id) on delete cascade,
  kod text not null unique,
  ad text not null,
  kategori text not null,
  alt_kategori text,
  basvuru_yeri text,
  yenileme_periyodu text,
  aciklama text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. İşletme belge durumları
create table if not exists public.kym_isletme_belgeleri (
  id uuid primary key default uuid_generate_v4(),
  isletme_id uuid not null references public.kym_isletmeler(id) on delete cascade,
  belge_tanim_id uuid not null references public.kym_belge_tanimlari(id) on delete cascade,
  durum text not null default 'yok',
  mevcut_mu boolean not null default false,
  gecerlilik_baslangic date,
  gecerlilik_bitis date,
  fiziksel_arsiv_yeri text,
  notlar text,
  son_kontrol_tarihi date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kym_isletme_belgeleri_durum_check
    check (durum in ('yok','var_guncel','var_eksik','suresi_doldu','basvuru_yapildi','uygulanmiyor'))
);

create unique index if not exists ux_kym_isletme_belge
on public.kym_isletme_belgeleri (isletme_id, belge_tanim_id);

-- 6. E-arşiv dosyaları
create table if not exists public.kym_belge_dosyalari (
  id uuid primary key default uuid_generate_v4(),
  isletme_belge_id uuid not null references public.kym_isletme_belgeleri(id) on delete cascade,
  dosya_url text not null,
  dosya_adi text,
  dosya_tipi text,
  yukleyen_kullanici text,
  created_at timestamptz not null default now()
);

-- 7. Başvuru rehberi
create table if not exists public.kym_basvuru_rehberi (
  id uuid primary key default uuid_generate_v4(),
  belge_tanim_id uuid not null references public.kym_belge_tanimlari(id) on delete cascade,
  basvuru_yeri text,
  gerekli_evraklar text,
  basvuru_adimlari text,
  dilekce_ornegi text,
  dikkat_edilecekler text,
  created_at timestamptz not null default now()
);

-- 8. Görevler
create table if not exists public.kym_gorevler (
  id uuid primary key default uuid_generate_v4(),
  isletme_id uuid not null references public.kym_isletmeler(id) on delete cascade,
  yukumluluk_id uuid references public.kym_yukumluluklar(id) on delete set null,
  belge_tanim_id uuid references public.kym_belge_tanimlari(id) on delete set null,
  baslik text not null,
  aciklama text,
  durum text not null default 'bekliyor',
  oncelik text not null default 'P3',
  son_tarih date,
  tamamlanma_tarihi date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kym_gorevler_durum_check
    check (durum in ('bekliyor','devam_ediyor','tamamlandi','iptal'))
);

-- 9. Denetim kayıtları
create table if not exists public.kym_denetim_kayitlari (
  id uuid primary key default uuid_generate_v4(),
  isletme_id uuid not null references public.kym_isletmeler(id) on delete cascade,
  denetim_turu text not null,
  denetleyen_kurum text,
  denetim_tarihi date not null default current_date,
  sonuc text,
  eksikler text,
  aksiyon_plani text,
  created_at timestamptz not null default now()
);

-- 10. Risk logları
create table if not exists public.kym_risk_loglari (
  id uuid primary key default uuid_generate_v4(),
  isletme_id uuid not null references public.kym_isletmeler(id) on delete cascade,
  risk_kategorisi text not null,
  risk_puani integer not null default 0,
  risk_aciklama text,
  kaynak_yukumluluk_id uuid references public.kym_yukumluluklar(id) on delete set null,
  created_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.kym_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_kym_isletmeler_updated_at on public.kym_isletmeler;
create trigger trg_kym_isletmeler_updated_at
before update on public.kym_isletmeler
for each row execute function public.kym_set_updated_at();

drop trigger if exists trg_kym_isletme_belgeleri_updated_at on public.kym_isletme_belgeleri;
create trigger trg_kym_isletme_belgeleri_updated_at
before update on public.kym_isletme_belgeleri
for each row execute function public.kym_set_updated_at();

drop trigger if exists trg_kym_gorevler_updated_at on public.kym_gorevler;
create trigger trg_kym_gorevler_updated_at
before update on public.kym_gorevler
for each row execute function public.kym_set_updated_at();

-- Dashboard view
create or replace view public.v_kym_dashboard_ozet as
select
  ib.isletme_id,
  count(*)::integer as toplam_belge,
  count(*) filter (where ib.durum = 'var_guncel')::integer as guncel_belge,
  count(*) filter (where ib.durum = 'yok')::integer as eksik_belge,
  count(*) filter (where ib.durum = 'var_eksik')::integer as eksik_veya_hatali_belge,
  count(*) filter (where ib.durum = 'suresi_doldu')::integer as suresi_dolan_belge,
  count(*) filter (
    where ib.gecerlilik_bitis is not null
    and ib.gecerlilik_bitis <= current_date + interval '30 day'
  )::integer as otuz_gun_icinde_dolacak,
  coalesce(
    round(
      100 - (
        sum(
          case
            when ib.durum in ('yok','suresi_doldu') then y.risk_puani
            when ib.durum = 'var_eksik' then y.risk_puani * 0.5
            else 0
          end
        ) / nullif(count(*) * 100, 0) * 100
      )
    ),
    100
  )::integer as uyum_puani
from public.kym_isletme_belgeleri ib
join public.kym_belge_tanimlari bt on bt.id = ib.belge_tanim_id
join public.kym_yukumluluklar y on y.id = bt.yukumluluk_id
group by ib.isletme_id;

-- Kritik eksikler view
create or replace view public.v_kym_kritik_eksikler as
select
  ib.id as isletme_belge_id,
  ib.isletme_id,
  bt.kod as belge_kodu,
  bt.ad as belge_adi,
  y.kod as yukumluluk_kodu,
  y.baslik as yukumluluk_basligi,
  y.kategori,
  y.alt_kategori,
  y.risk_puani,
  y.oncelik,
  bt.basvuru_yeri,
  ib.durum,
  ib.gecerlilik_bitis,
  ib.notlar
from public.kym_isletme_belgeleri ib
join public.kym_belge_tanimlari bt on bt.id = ib.belge_tanim_id
join public.kym_yukumluluklar y on y.id = bt.yukumluluk_id
where ib.durum in ('yok','var_eksik','suresi_doldu')
order by y.risk_puani desc, y.oncelik asc, bt.ad asc;

-- Ana modül seed
insert into public.kym_moduller (kod, ad, aciklama, sira)
values
('KYM-01','Kurumsal Kimlik','Şirket kimliği, vergi, ticaret sicili ve temel işletme belgeleri',1),
('KYM-02','Ruhsat ve İzinler','Belediye ruhsatı, işyeri kullanım ve faaliyet izinleri',2),
('KYM-03','SGK','İşveren SGK dosyası, işe giriş ve işten çıkış yükümlülükleri',3),
('KYM-04','İnsan Kaynakları','Personel özlük, sözleşme, görev tanımı ve disiplin süreçleri',4),
('KYM-05','İş Sağlığı ve Güvenliği','Risk analizi, acil durum, eğitim, KKD ve İSG kayıtları',5),
('KYM-06','KVKK','Personel, müşteri, kamera, GPS ve veri güvenliği süreçleri',6),
('KYM-07','Araç ve Filo','Araç ruhsat, sigorta, muayene, teslim ve takip süreçleri',7),
('KYM-08','Zimmet ve Demirbaş','Telefon, tablet, el aleti, ölçüm cihazı ve KKD zimmetleri',8),
('KYM-09','Depo ve Stok','Depo sayım, yedek parça, hurda ve iade süreçleri',9),
('KYM-10','Mali ve Vergisel Uyum','Muhasebe, e-belge, cari, beyan ve mali kontrol süreçleri',10)
on conflict (kod) do update set
  ad = excluded.ad,
  aciklama = excluded.aciklama,
  sira = excluded.sira,
  aktif = true;

-- İlk kritik yükümlülükler
insert into public.kym_yukumluluklar
(modul_id, kod, baslik, kategori, alt_kategori, yukumluluk_tipi, hukuki_dayanak, denetleyen_kurum, aciklama, risk_puani, oncelik)
select id, 'YUK-001', 'Vergi mükellefiyetinin belgelenmesi', 'Vergi', 'Şirket Kimliği', 'zorunlu',
'213 sayılı Vergi Usul Kanunu', 'Gelir İdaresi Başkanlığı',
'İşletmenin vergi mükellefiyetinin belgeyle ispatlanması gerekir.', 100, 'P1'
from public.kym_moduller where kod = 'KYM-01'
on conflict (kod) do nothing;

insert into public.kym_yukumluluklar
(modul_id, kod, baslik, kategori, alt_kategori, yukumluluk_tipi, hukuki_dayanak, denetleyen_kurum, aciklama, risk_puani, oncelik)
select id, 'YUK-002', 'İşyerinin ruhsatlı faaliyet göstermesi', 'Ruhsat', 'Belediye', 'zorunlu',
'3572 sayılı Kanun ve ilgili yönetmelik', 'İlgili Belediye',
'İşyerinin faaliyet gösterebilmesi için belediye ruhsatı bulunmalıdır.', 100, 'P1'
from public.kym_moduller where kod = 'KYM-02'
on conflict (kod) do nothing;

insert into public.kym_yukumluluklar
(modul_id, kod, baslik, kategori, alt_kategori, yukumluluk_tipi, hukuki_dayanak, denetleyen_kurum, aciklama, risk_puani, oncelik)
select id, 'YUK-003', 'SGK işyeri dosyasının bulunması', 'SGK', 'İşveren Kaydı', 'personel_varsa_zorunlu',
'5510 sayılı Kanun', 'Sosyal Güvenlik Kurumu',
'Personel çalıştıran işverenin SGK işyeri sicili bulunmalıdır.', 100, 'P1'
from public.kym_moduller where kod = 'KYM-03'
on conflict (kod) do nothing;

insert into public.kym_yukumluluklar
(modul_id, kod, baslik, kategori, alt_kategori, yukumluluk_tipi, hukuki_dayanak, denetleyen_kurum, aciklama, risk_puani, oncelik)
select id, 'YUK-004', 'Risk değerlendirmesi yapılması', 'İSG', 'Risk', 'personel_varsa_zorunlu',
'6331 sayılı İş Sağlığı ve Güvenliği Kanunu', 'Çalışma ve Sosyal Güvenlik Bakanlığı',
'İşyerinde risk değerlendirmesi yapılmalı ve kayıt altına alınmalıdır.', 100, 'P1'
from public.kym_moduller where kod = 'KYM-05'
on conflict (kod) do nothing;

insert into public.kym_yukumluluklar
(modul_id, kod, baslik, kategori, alt_kategori, yukumluluk_tipi, hukuki_dayanak, denetleyen_kurum, aciklama, risk_puani, oncelik)
select id, 'YUK-005', 'Çalışanla yazılı iş sözleşmesi yapılması', 'İnsan Kaynakları', 'İşe Giriş', 'personel_varsa_zorunlu',
'4857 sayılı İş Kanunu', 'Çalışma ve Sosyal Güvenlik Bakanlığı',
'Çalışma şartları yazılı sözleşmeyle kayıt altına alınmalıdır.', 95, 'P1'
from public.kym_moduller where kod = 'KYM-04'
on conflict (kod) do nothing;

-- İlk belge tanımları
insert into public.kym_belge_tanimlari
(yukumluluk_id, kod, ad, kategori, alt_kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-001', 'Vergi Levhası', 'Vergi', 'Şirket Kimliği',
'Vergi Dairesi / İnteraktif Vergi Dairesi', 'Yıllık kontrol',
'Vergi mükellefiyetini gösteren temel belgedir.'
from public.kym_yukumluluklar where kod = 'YUK-001'
on conflict (kod) do nothing;

insert into public.kym_belge_tanimlari
(yukumluluk_id, kod, ad, kategori, alt_kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-002', 'İşyeri Açma ve Çalışma Ruhsatı', 'Ruhsat', 'Belediye',
'İlgili Belediye Ruhsat Müdürlüğü', 'Adres veya faaliyet değişikliğinde',
'İşletmenin yasal faaliyet belgesidir.'
from public.kym_yukumluluklar where kod = 'YUK-002'
on conflict (kod) do nothing;

insert into public.kym_belge_tanimlari
(yukumluluk_id, kod, ad, kategori, alt_kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-003', 'SGK İşyeri Sicil Belgesi', 'SGK', 'İşveren Kaydı',
'Sosyal Güvenlik Kurumu', 'İşyeri değişikliğinde',
'İşveren SGK kaydını gösterir.'
from public.kym_yukumluluklar where kod = 'YUK-003'
on conflict (kod) do nothing;

insert into public.kym_belge_tanimlari
(yukumluluk_id, kod, ad, kategori, alt_kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-004', 'Risk Değerlendirmesi', 'İSG', 'Risk',
'İSG Uzmanı / OSGB', 'Tehlike sınıfına göre',
'İşyerindeki İSG risklerinin analizidir.'
from public.kym_yukumluluklar where kod = 'YUK-004'
on conflict (kod) do nothing;

insert into public.kym_belge_tanimlari
(yukumluluk_id, kod, ad, kategori, alt_kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-005', 'İş Sözleşmesi', 'İnsan Kaynakları', 'İşe Giriş',
'İşveren / İK / Avukat', 'Görev veya şart değişikliğinde',
'Çalışan ile işveren arasındaki temel sözleşmedir.'
from public.kym_yukumluluklar where kod = 'YUK-005'
on conflict (kod) do nothing;

-- Başvuru rehberi temel kayıtları
insert into public.kym_basvuru_rehberi
(belge_tanim_id, basvuru_yeri, gerekli_evraklar, basvuru_adimlari, dilekce_ornegi, dikkat_edilecekler)
select
  id,
  basvuru_yeri,
  'İlgili kurumun güncel evrak listesi kontrol edilmelidir. Şirket evrakları, yetki belgeleri ve işyeri adres belgeleri hazır bulundurulmalıdır.',
  '1. Mevcut belge durumu kontrol edilir.
2. Eksik belge için başvuru dosyası hazırlanır.
3. İlgili kuruma başvuru yapılır.
4. Sonuç belgesi dijital arşive yüklenir.
5. Geçerlilik tarihi sisteme işlenir.',
  'İLGİLİ MAKAMA

Şirketimize ait belge/izin işlemlerinin yapılabilmesi için başvurumuzun değerlendirilmesini arz ederiz.

Şirket Unvanı:
Vergi No:
Adres:
Yetkili Ad Soyad:
Tarih:
İmza:',
  'Geriye dönük gerçek dışı belge düzenlenmemelidir. Sonradan tamamlanan belgeler gerçek düzenleme tarihiyle sisteme alınmalıdır.'
from public.kym_belge_tanimlari
where kod in ('BEL-001','BEL-002','BEL-003','BEL-004','BEL-005')
on conflict do nothing;

-- Örnek işletme
insert into public.kym_isletmeler
(isletme_adi, sehir, ilce, sirket_turu, faaliyet_alani, personel_sayisi, arac_sayisi, depo_var_mi, yetkili_servis_mi)
values
('FeyRoute KYM Test İşletmesi', 'Diyarbakır', 'Kayapınar', 'Limited', 'Teknik Servis', 0, 0, false, false)
on conflict do nothing;

-- Test işletmesine ilk belgeleri aç
insert into public.kym_isletme_belgeleri
(isletme_id, belge_tanim_id, durum, mevcut_mu)
select i.id, b.id, 'yok', false
from public.kym_isletmeler i
cross join public.kym_belge_tanimlari b
where i.isletme_adi = 'FeyRoute KYM Test İşletmesi'
on conflict (isletme_id, belge_tanim_id) do nothing;

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('kym-belgeleri', 'kym-belgeleri', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Bitti
-- ---------------------------------------------------------------------
