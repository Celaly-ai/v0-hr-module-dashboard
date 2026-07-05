-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.5
-- İşletme Tanıma ve Uyum Profili Soru Motoru
--
-- Amaç:
-- KYM işletmeye gereksiz soru sormaz.
-- Mevcut işletme bilgilerinden cevaplanabilen alanları otomatik çözer.
-- Yalnız bilinmeyen ve belge uygulanabilirliğini etkileyen soruları sorar.
--
-- Mevcut FeyRoute tablolarına dokunmaz.
-- Yalnız bağımsız KYM çekirdeğini genişletir.
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. KYM profil soru kataloğu
-- ---------------------------------------------------------------------

create table if not exists public.kym_profil_sorulari (
  id uuid primary key default uuid_generate_v4(),

  kod text not null unique,

  profil_alani text not null unique,

  soru text not null,

  aciklama text,

  cevap_tipi text not null default 'boolean',

  sira integer not null default 0,

  aktif boolean not null default true,

  created_at timestamptz not null default now(),

  constraint kym_profil_sorulari_cevap_tipi_check
    check (
      cevap_tipi in (
        'boolean'
      )
    )
);

-- ---------------------------------------------------------------------
-- 2. İşletme profil cevap geçmişi
--
-- Profil tablosu güncel durumu tutar.
-- Bu tablo kim/ne zaman/ne cevap verdi geçmişini korur.
-- ---------------------------------------------------------------------

create table if not exists public.kym_profil_cevaplari (
  id uuid primary key default uuid_generate_v4(),

  isletme_id uuid not null
    references public.kym_isletmeler(id)
    on delete cascade,

  soru_id uuid not null
    references public.kym_profil_sorulari(id)
    on delete cascade,

  cevap_boolean boolean,

  cevap_kaynagi text not null default 'kullanici',

  cevaplayan_kullanici text,

  created_at timestamptz not null default now(),

  constraint kym_profil_cevaplari_kaynak_check
    check (
      cevap_kaynagi in (
        'kullanici',
        'sistem',
        'ai',
        'yonetici'
      )
    )
);

create index if not exists
ix_kym_profil_cevaplari_isletme
on public.kym_profil_cevaplari (
  isletme_id,
  created_at desc
);

create index if not exists
ix_kym_profil_cevaplari_soru
on public.kym_profil_cevaplari (
  soru_id,
  created_at desc
);

-- ---------------------------------------------------------------------
-- 3. Profil soru kataloğu
-- ---------------------------------------------------------------------

insert into public.kym_profil_sorulari (
  kod,
  profil_alani,
  soru,
  aciklama,
  cevap_tipi,
  sira,
  aktif
)
values

(
  'PROFIL-001',
  'kamera_var',
  'İşyerinde güvenlik veya izleme amaçlı kamera sistemi kullanılıyor mu?',
  'Kamera görüntüsü işleniyorsa kamera ve kişisel veri süreçleri değerlendirilir.',
  'boolean',
  10,
  true
),

(
  'PROFIL-002',
  'gps_konum_isleniyor',
  'Personel veya araçların GPS ya da konum bilgisi sistem üzerinden takip ediliyor mu?',
  'Araç takip, canlı konum veya çalışan konum verisi işleniyorsa ilgili süreçler değerlendirilir.',
  'boolean',
  20,
  true
),

(
  'PROFIL-003',
  'musteri_verisi_isleniyor',
  'Müşterilere ait ad, telefon, adres, servis kaydı veya benzeri kişisel veriler tutuluyor mu?',
  'Müşteri kişisel verisi işleniyorsa KVKK ve veri güvenliği kayıtları değerlendirilir.',
  'boolean',
  30,
  true
),

(
  'PROFIL-004',
  'kurumsal_telefon_var',
  'Çalışanlara şirket telefonu veya kurumsal telefon hattı veriliyor mu?',
  'Telefon ve hat teslimlerinde zimmet ve kullanım süreçleri değerlendirilir.',
  'boolean',
  40,
  true
),

(
  'PROFIL-005',
  'whatsapp_sms_kullaniliyor',
  'Müşterilerle WhatsApp veya SMS üzerinden kurumsal iletişim kuruluyor mu?',
  'Elektronik müşteri iletişimi ve veri işleme süreçleri değerlendirilir.',
  'boolean',
  50,
  true
),

(
  'PROFIL-006',
  'taseron_var',
  'Şirket dışından taşeron veya alt yüklenici ekiplerle hizmet alınıyor mu?',
  'Taşeron ilişkileri, sözleşme ve operasyon sorumlulukları değerlendirilir.',
  'boolean',
  60,
  true
),

(
  'PROFIL-007',
  'kiralik_isyeri',
  'Faaliyet gösterilen işyeri kiralık mı?',
  'Kira, kullanım hakkı ve işyeri belge süreçleri değerlendirilir.',
  'boolean',
  70,
  true
),

(
  'PROFIL-008',
  'e_ticaret_var',
  'İnternet, uzaktan satış veya elektronik sipariş üzerinden ürün ya da hizmet satışı yapılıyor mu?',
  'Elektronik satış ve müşteri bilgilendirme süreçleri değerlendirilir.',
  'boolean',
  80,
  true
),

(
  'PROFIL-009',
  'yakit_karti_var',
  'Şirkete veya araçlara ait yakıt kartı kullanılıyor mu?',
  'Yakıt kartı zimmet ve kontrol kayıtları değerlendirilir.',
  'boolean',
  90,
  true
),

(
  'PROFIL-010',
  'hgs_var',
  'Şirket araçlarında HGS veya kurumsal geçiş hesabı kullanılıyor mu?',
  'Geçiş hesabı ve filo kontrol kayıtları değerlendirilir.',
  'boolean',
  100,
  true
),

(
  'PROFIL-011',
  'elektronik_atik_var',
  'Faaliyet sonucunda elektronik cihaz, elektronik parça veya elektronik atık oluşuyor mu?',
  'Elektronik atık teslim ve izleme süreçleri değerlendirilir.',
  'boolean',
  110,
  true
),

(
  'PROFIL-012',
  'tehlikeli_atik_var',
  'Faaliyet sonucunda tehlikeli nitelikte atık oluşuyor mu?',
  'Tehlikeli atık süreçleri için ayrıca kapsam ve mevzuat kontrolü gerekir.',
  'boolean',
  120,
  true
),

(
  'PROFIL-013',
  'basinc_sistemi_var',
  'İşyerinde kompresör, hava tankı veya başka bir basınçlı sistem bulunuyor mu?',
  'Basınçlı ekipman varsa periyodik kontrol kapsamı değerlendirilir.',
  'boolean',
  130,
  true
),

(
  'PROFIL-014',
  'kaldirma_ekipmani_var',
  'İşyerinde lift, vinç, transpalet, forklift veya kaldırma ekipmanı bulunuyor mu?',
  'Kaldırma ekipmanlarının kontrol ve kayıt süreçleri değerlendirilir.',
  'boolean',
  140,
  true
),

(
  'PROFIL-015',
  'yangin_tesisati_var',
  'İşyerinde sabit yangın tesisatı, yangın dolabı veya benzeri yangın sistemi bulunuyor mu?',
  'Sabit yangın sistemi varsa kontrol kayıtları değerlendirilir.',
  'boolean',
  150,
  true
),

(
  'PROFIL-016',
  'osgb_hizmeti_var',
  'Şirket bir OSGB kuruluşundan iş sağlığı ve güvenliği hizmeti alıyor mu?',
  'OSGB sözleşme ve hizmet kayıtları değerlendirilir.',
  'boolean',
  160,
  true
),

(
  'PROFIL-017',
  'isg_uzmani_var',
  'Şirket için görevlendirilmiş bir iş güvenliği uzmanı bulunuyor mu?',
  'İSG uzmanı görevlendirme ve hizmet kayıtları değerlendirilir.',
  'boolean',
  170,
  true
),

(
  'PROFIL-018',
  'isyeri_hekimi_var',
  'Şirket için görevlendirilmiş bir işyeri hekimi bulunuyor mu?',
  'İşyeri hekimi görevlendirme ve sağlık gözetimi kayıtları değerlendirilir.',
  'boolean',
  180,
  true
),

(
  'PROFIL-019',
  'marka_yetkilendirmesi_var',
  'Şirket bir marka tarafından yetkili servis veya yetkili hizmet noktası olarak görevlendirilmiş mi?',
  'Marka yetkilendirme, servis sözleşmesi ve teknik standart kayıtları değerlendirilir.',
  'boolean',
  190,
  true
)

on conflict (kod)
do update set
  profil_alani = excluded.profil_alani,
  soru = excluded.soru,
  aciklama = excluded.aciklama,
  cevap_tipi = excluded.cevap_tipi,
  sira = excluded.sira,
  aktif = excluded.aktif;

-- ---------------------------------------------------------------------
-- 4. Sistem tarafından bilinen profil alanlarını otomatik doldur
--
-- Burada yalnız açıkça mevcut KYM işletme verisinden çıkarılabilen
-- bilgiler kullanılır.
--
-- Tahmin yapılmaz.
-- ---------------------------------------------------------------------

create or replace function public.kym_profil_bilinenleri_doldur(
  p_isletme_id uuid
)
returns void
language plpgsql
as $$
declare
  v_isletme public.kym_isletmeler%rowtype;
begin

  select *
  into v_isletme
  from public.kym_isletmeler
  where id = p_isletme_id;

  if not found then
    raise exception
      'KYM işletmesi bulunamadı: %',
      p_isletme_id;
  end if;

  insert into public.kym_isletme_uyum_profilleri (
    isletme_id
  )
  values (
    p_isletme_id
  )
  on conflict (isletme_id)
  do nothing;

  -- Yetkili servis bilgisi doğrudan işletme tablosunda mevcut.
  -- Sadece true ise marka yetkilendirmesi de açık kabul edilir.
  -- false olması marka ilişkisi kesinlikle yok anlamına gelmediğinden
  -- profil alanına false yazılmaz.

  if v_isletme.yetkili_servis_mi = true then

    update public.kym_isletme_uyum_profilleri
    set
      marka_yetkilendirmesi_var = true

    where isletme_id = p_isletme_id

      and marka_yetkilendirmesi_var is null;

  end if;

end;
$$;

-- ---------------------------------------------------------------------
-- 5. Profil cevabını kaydet ve belge havuzunu yeniden hesapla
-- ---------------------------------------------------------------------

create or replace function public.kym_profil_sorusunu_cevapla(
  p_isletme_id uuid,
  p_soru_id uuid,
  p_cevap boolean,
  p_cevap_kaynagi text default 'kullanici',
  p_cevaplayan_kullanici text default null
)
returns integer
language plpgsql
as $$
declare
  v_soru public.kym_profil_sorulari%rowtype;
  v_islenen integer;
begin

  select *
  into v_soru
  from public.kym_profil_sorulari
  where id = p_soru_id
    and aktif = true;

  if not found then
    raise exception
      'KYM profil sorusu bulunamadı: %',
      p_soru_id;
  end if;

  if p_cevap_kaynagi not in (
    'kullanici',
    'sistem',
    'ai',
    'yonetici'
  ) then
    raise exception
      'Geçersiz KYM cevap kaynağı: %',
      p_cevap_kaynagi;
  end if;

  perform
    public.kym_profil_bilinenleri_doldur(
      p_isletme_id
    );

  insert into public.kym_profil_cevaplari (
    isletme_id,
    soru_id,
    cevap_boolean,
    cevap_kaynagi,
    cevaplayan_kullanici
  )
  values (
    p_isletme_id,
    p_soru_id,
    p_cevap,
    p_cevap_kaynagi,
    p_cevaplayan_kullanici
  );

  if v_soru.profil_alani = 'kamera_var' then

    update public.kym_isletme_uyum_profilleri
    set kamera_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'gps_konum_isleniyor' then

    update public.kym_isletme_uyum_profilleri
    set gps_konum_isleniyor = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'musteri_verisi_isleniyor' then

    update public.kym_isletme_uyum_profilleri
    set musteri_verisi_isleniyor = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'kurumsal_telefon_var' then

    update public.kym_isletme_uyum_profilleri
    set kurumsal_telefon_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'whatsapp_sms_kullaniliyor' then

    update public.kym_isletme_uyum_profilleri
    set whatsapp_sms_kullaniliyor = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'taseron_var' then

    update public.kym_isletme_uyum_profilleri
    set taseron_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'kiralik_isyeri' then

    update public.kym_isletme_uyum_profilleri
    set kiralik_isyeri = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'e_ticaret_var' then

    update public.kym_isletme_uyum_profilleri
    set e_ticaret_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'yakit_karti_var' then

    update public.kym_isletme_uyum_profilleri
    set yakit_karti_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'hgs_var' then

    update public.kym_isletme_uyum_profilleri
    set hgs_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'elektronik_atik_var' then

    update public.kym_isletme_uyum_profilleri
    set elektronik_atik_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'tehlikeli_atik_var' then

    update public.kym_isletme_uyum_profilleri
    set tehlikeli_atik_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'basinc_sistemi_var' then

    update public.kym_isletme_uyum_profilleri
    set basinc_sistemi_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'kaldirma_ekipmani_var' then

    update public.kym_isletme_uyum_profilleri
    set kaldirma_ekipmani_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'yangin_tesisati_var' then

    update public.kym_isletme_uyum_profilleri
    set yangin_tesisati_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'osgb_hizmeti_var' then

    update public.kym_isletme_uyum_profilleri
    set osgb_hizmeti_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'isg_uzmani_var' then

    update public.kym_isletme_uyum_profilleri
    set isg_uzmani_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'isyeri_hekimi_var' then

    update public.kym_isletme_uyum_profilleri
    set isyeri_hekimi_var = p_cevap
    where isletme_id = p_isletme_id;

  elsif v_soru.profil_alani = 'marka_yetkilendirmesi_var' then

    update public.kym_isletme_uyum_profilleri
    set marka_yetkilendirmesi_var = p_cevap
    where isletme_id = p_isletme_id;

  else

    raise exception
      'Desteklenmeyen KYM profil alanı: %',
      v_soru.profil_alani;

  end if;

  v_islenen :=
    public.kym_isletme_belge_havuzunu_senkronize_et(
      p_isletme_id
    );

  return v_islenen;

end;
$$;

-- ---------------------------------------------------------------------
-- 6. Yalnız cevaplanması gereken soruları döndüren fonksiyon
--
-- Önemli:
-- Soru yalnız profil alanı NULL ise yetmez.
-- Aynı zamanda o alan nedeniyle en az bir belge bilgi_gerekli olmalıdır.
--
-- Böylece gereksiz sorular gizlenir.
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

    count(distinct vu.isletme_belge_id)::integer
      as etkilenen_belge_sayisi,

    max(vu.risk_puani)::integer
      as en_yuksek_risk

  from public.kym_profil_sorulari ps

  join public.v_kym_belge_uygulanabilirlik vu
    on vu.isletme_id = p_isletme_id

  where ps.aktif = true

    and vu.uygulanabilirlik_durumu = 'bilgi_gerekli'

    and (
      vu.uygulanabilirlik_kosulu
      ? ps.profil_alani
    )

  group by
    ps.id,
    ps.kod,
    ps.profil_alani,
    ps.soru,
    ps.aciklama,
    ps.sira

  order by
    max(vu.risk_puani) desc,
    count(distinct vu.isletme_belge_id) desc,
    ps.sira asc;

end;
$$;

-- ---------------------------------------------------------------------
-- 7. Profil tamamlama özeti
-- ---------------------------------------------------------------------

create or replace view public.v_kym_profil_tamamlama_ozeti as

select
  i.id as isletme_id,

  i.isletme_adi,

  (
    select count(*)::integer

    from public.kym_bekleyen_profil_sorulari(
      i.id
    )
  ) as bekleyen_soru,

  (
    select count(*)::integer

    from public.v_kym_belge_uygulanabilirlik vu

    where vu.isletme_id = i.id

      and vu.uygulanabilirlik_durumu =
        'bilgi_gerekli'
  ) as bilgi_gerekli_belge,

  (
    select count(*)::integer

    from public.v_kym_belge_uygulanabilirlik vu

    where vu.isletme_id = i.id

      and vu.uygulanabilirlik_durumu =
        'uygulanir'
  ) as uygulanir_belge,

  (
    select count(*)::integer

    from public.v_kym_belge_uygulanabilirlik vu

    where vu.isletme_id = i.id

      and vu.uygulanabilirlik_durumu =
        'uygulanmiyor'
  ) as uygulanmayan_belge

from public.kym_isletmeler i

where i.aktif = true;

-- ---------------------------------------------------------------------
-- 8. Mevcut işletmeler için bilinen profil alanlarını doldur
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
      public.kym_profil_bilinenleri_doldur(
        v_isletme.id
      );

    perform
      public.kym_isletme_belge_havuzunu_senkronize_et(
        v_isletme.id
      );

  end loop;

end;
$$;

-- ---------------------------------------------------------------------
-- 9. RLS
-- KYM bağımsız test aşaması
-- ---------------------------------------------------------------------

alter table public.kym_profil_sorulari
enable row level security;

alter table public.kym_profil_cevaplari
enable row level security;

drop policy if exists
"kym_profil_sorulari_test_read"
on public.kym_profil_sorulari;

create policy
"kym_profil_sorulari_test_read"
on public.kym_profil_sorulari
for select
to anon, authenticated
using (true);

drop policy if exists
"kym_profil_cevaplari_test_read"
on public.kym_profil_cevaplari;

create policy
"kym_profil_cevaplari_test_read"
on public.kym_profil_cevaplari
for select
to anon, authenticated
using (true);

drop policy if exists
"kym_profil_cevaplari_test_insert"
on public.kym_profil_cevaplari;

create policy
"kym_profil_cevaplari_test_insert"
on public.kym_profil_cevaplari
for insert
to anon, authenticated
with check (true);

-- ---------------------------------------------------------------------
-- 10. Kurulum kontrolü
-- ---------------------------------------------------------------------

select
  'profil_soru_sayisi' as kontrol,
  count(*)::integer as adet

from public.kym_profil_sorulari

where aktif = true

union all

select
  'profil_cevap_sayisi',
  count(*)::integer

from public.kym_profil_cevaplari

union all

select
  'profil_ozet_isletme',
  count(*)::integer

from public.v_kym_profil_tamamlama_ozeti;

-- ---------------------------------------------------------------------
-- 11. İşletme profil özeti
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
-- 12. Bekleyen sorular
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
-- Bitti
-- ---------------------------------------------------------------------