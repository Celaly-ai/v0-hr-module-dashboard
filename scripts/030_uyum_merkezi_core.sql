-- FeyRoute Kurumsal Yönetim ve Uyum Merkezi V1
-- Dosya: scripts/030_uyum_merkezi_core.sql

create extension if not exists "uuid-ossp";

create table if not exists public.uyum_yukumluluklari (
  id uuid primary key default uuid_generate_v4(),
  kod text not null unique,
  baslik text not null,
  kategori text not null,
  alt_kategori text,
  yukumluluk_tipi text not null default 'zorunlu',
  hukuki_dayanak text,
  aciklama text,
  risk_puani integer not null default 50,
  oncelik text not null default 'P3',
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.uyum_belge_tanimlari (
  id uuid primary key default uuid_generate_v4(),
  yukumluluk_id uuid references public.uyum_yukumluluklari(id) on delete cascade,
  belge_kodu text not null unique,
  belge_adi text not null,
  kategori text not null,
  basvuru_yeri text,
  yenileme_periyodu text,
  aciklama text,
  atif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.uyum_isletme_belgeleri (
  id uuid primary key default uuid_generate_v4(),
  sirket_id uuid,
  belge_tanim_id uuid not null references public.uyum_belge_tanimlari(id) on delete cascade,
  durum text not null default 'yok',
  mevcut_mu boolean not null default false,
  gecerlilik_baslangic date,
  gecerlilik_bitis date,
  fiziksel_arsiv_yeri text,
  notlar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uyum_belge_durum_check
    check (durum in ('yok','var_guncel','var_eksik','suresi_doldu','basvuru_yapildi','uygulanmiyor'))
);

create table if not exists public.uyum_belge_dosyalari (
  id uuid primary key default uuid_generate_v4(),
  isletme_belge_id uuid references public.uyum_isletme_belgeleri(id) on delete cascade,
  dosya_url text not null,
  dosya_adi text,
  dosya_tipi text,
  yukleyen_personel_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.uyum_basvuru_rehberi (
  id uuid primary key default uuid_generate_v4(),
  belge_tanim_id uuid not null references public.uyum_belge_tanimlari(id) on delete cascade,
  basvuru_yeri text,
  gerekli_evraklar text,
  basvuru_adimlari text,
  dilekce_ornegi text,
  dikkat_edilecekler text,
  created_at timestamptz not null default now()
);

create table if not exists public.uyum_gorevleri (
  id uuid primary key default uuid_generate_v4(),
  sirket_id uuid,
  yukumluluk_id uuid references public.uyum_yukumluluklari(id) on delete set null,
  belge_tanim_id uuid references public.uyum_belge_tanimlari(id) on delete set null,
  gorev_basligi text not null,
  gorev_aciklama text,
  durum text not null default 'bekliyor',
  oncelik text not null default 'P3',
  son_tarih date,
  created_at timestamptz not null default now(),
  constraint uyum_gorev_durum_check
    check (durum in ('bekliyor','devam_ediyor','tamamlandi','iptal'))
);

create or replace function public.set_uyum_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_uyum_isletme_belgeleri_updated_at on public.uyum_isletme_belgeleri;

create trigger trg_uyum_isletme_belgeleri_updated_at
before update on public.uyum_isletme_belgeleri
for each row execute function public.set_uyum_updated_at();

create or replace view public.v_uyum_dashboard_ozet as
select
  ib.sirket_id,
  count(*)::integer as toplam_belge,
  count(*) filter (where ib.durum = 'var_guncel')::integer as guncel_belge,
  count(*) filter (where ib.durum in ('yok','var_eksik','suresi_doldu'))::integer as problemli_belge,
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
from public.uyum_isletme_belgeleri ib
join public.uyum_belge_tanimlari bt on bt.id = ib.belge_tanim_id
join public.uyum_yukumluluklari y on y.id = bt.yukumluluk_id
group by ib.sirket_id;

insert into public.uyum_yukumluluklari
(kod, baslik, kategori, alt_kategori, yukumluluk_tipi, hukuki_dayanak, aciklama, risk_puani, oncelik)
values
('YUK-001','Vergi mükellefiyetinin belgelenmesi','Vergi','Şirket Kimliği','zorunlu','213 sayılı Vergi Usul Kanunu','İşletmenin vergi mükellefiyetinin belgeyle ispatlanması gerekir.',100,'P1'),
('YUK-002','İşyerinin ruhsatlı faaliyet göstermesi','Ruhsat','Belediye','zorunlu','3572 sayılı Kanun ve ilgili yönetmelik','İşyerinin faaliyet gösterebilmesi için belediye ruhsatı bulunmalıdır.',100,'P1'),
('YUK-003','SGK işyeri dosyasının bulunması','SGK','İşveren Kaydı','personel_varsa_zorunlu','5510 sayılı Kanun','Personel çalıştıran işverenin SGK işyeri sicili bulunmalıdır.',100,'P1'),
('YUK-004','Risk,'personel_varsa_zorunlu','6331 sayılı İş Sağlığı ve Güvenliği Kanunu','İşyerinde risk değerlendirmesi yapılmalı ve kayıt altına alınmalıdır.',100,'P1'),
('YUK-005','Çalışanla yazılı iş sözleşmesi yapılması','İnsan Kaynakları','İşe Giriş','personel_varsa_zorunlu','4857 sayılı İş Kanunu','Çalışma şartları yazılı sözleşmeyle kayıt altına alınmalıdır.',95,'P1')
on conflict (kod) do update set
  baslik = excluded.baslik,
  kategori = excluded.kategori,
  alt_kategori = excluded.alt_kategori,
  yukumluluk_tipi = excluded.yukumluluk_tipi,
  hukuki_dayanak = excluded.hukuki_dayanak,
  aciklama = excluded.aciklama,
  risk_puani = excluded.risk_puani,
  oncelik = excluded.oncelik,
  aktif = true;

insert into public.uyum_belge_tanimlari
(yukumluluk_id, belge_kodu, belge_adi, kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-001', 'Vergi Levhası', 'Vergi', 'Vergi Dairesi / İnteraktif Vergi Dairesi', 'Yıllık kontrol', 'Vergi mükellefiyetini ghere kod = 'YUK-001'
on conflict (belge_kodu) do nothing;

insert into public.uyum_belge_tanimlari
(yukumluluk_id, belge_kodu, belge_adi, kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-002', 'İşyeri Açma ve Çalışma Ruhsatı', 'Ruhsat', 'İlgili Belediye Ruhsat Müdürlüğü', 'Adres veya faaliyet değişikliğinde', 'İşletmenin yasal faaliyet belgesidir.'
from public.uyum_yukumluluklari where kod = 'YUK-002'
on conflict (belge_kodu) do nothing;

insert into public.uyum_belge_tanimlari
(yukumluluk_id, belge_kodu, belge_adi, kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-003', 'SGK İşyeri Sicil Belgesi', 'SGK', 'Sosyal Güvenlik Kurumu', 'İşyeri değişikliğinde', 'İşveren SGK kaydını gösterir.'
from public.uyum_yukumluluklari where kod = 'YUK-003'
on conflict (belge_kodu) do nothing;

insert into public.uyum_belge_tanimlari
(yukumluluk_id, belge_kodu, belge_adi, kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-004', 'Risk Değı / OSGB', 'Tehlike sınıfına göre', 'İşyerindeki İSG risklerinin analizidir.'
from public.uyum_yukumluluklari where kod = 'YUK-004'
on conflict (belge_kodu) do nothing;

insert into public.uyum_belge_tanimlari
(yukumluluk_id, belge_kodu, belge_adi, kategori, basvuru_yeri, yenileme_periyodu, aciklama)
select id, 'BEL-005', 'İş Sözleşmesi', 'İnsan Kaynakları', 'İşveren / İK / Avukat', 'Görev veya şart değişikliğinde', 'Çalışan ile işveren arasındaki temel sözleşmedir.'
from public.uyum_yukumluluklari where kod = 'YUK-005'
on conflict (belge_kodu) do nothing;

