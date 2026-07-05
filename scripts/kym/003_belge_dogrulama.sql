-- ---------------------------------------------------------------------
-- FeyRoute KYM V1.2
-- Belge Yükleme / AI Doğrulama / Sistem Durum Motoru
--
-- Mevcut FeyRoute tablolarına dokunmaz.
-- Yalnız KYM çekirdeğini genişletir.
-- Tekrar çalıştırılabilir kurulum dosyasıdır.
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. İşletme belge tablosuna AI kontrol alanları
-- ---------------------------------------------------------------------

alter table public.kym_isletme_belgeleri
  add column if not exists son_dosya_id uuid,
  add column if not exists ai_son_kontrol_tarihi timestamptz,
  add column if not exists ai_guven_skoru numeric(5,2),
  add column if not exists ai_ozet text,
  add column if not exists ai_eksikler jsonb not null default '[]'::jsonb,
  add column if not exists ai_cikarilan_veriler jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- 2. Eski durum constraint'ini kaldır
-- ---------------------------------------------------------------------

alter table public.kym_isletme_belgeleri
  drop constraint if exists kym_isletme_belgeleri_durum_check;

-- ---------------------------------------------------------------------
-- 3. Eski durumları yeni sistem durumlarına çevir
-- ---------------------------------------------------------------------

update public.kym_isletme_belgeleri
set durum = case
  when durum = 'var_guncel' then 'dogrulandi_guncel'
  when durum = 'var_eksik' then 'eksik_bilgi_var'
  else durum
end
where durum in (
  'var_guncel',
  'var_eksik'
);

-- ---------------------------------------------------------------------
-- 4. Yeni durum constraint'i
-- ---------------------------------------------------------------------

alter table public.kym_isletme_belgeleri
  add constraint kym_isletme_belgeleri_durum_check
  check (
    durum in (
      'yok',
      'yuklendi_incelemede',
      'dogrulandi_guncel',
      'suresi_yaklasiyor',
      'yanlis_belge',
      'eksik_bilgi_var',
      'suresi_doldu',
      'manuel_inceleme_gerekli',
      'basvuru_yapildi',
      'uygulanmiyor'
    )
  );

-- ---------------------------------------------------------------------
-- 5. Son dosya foreign key
-- ---------------------------------------------------------------------

alter table public.kym_isletme_belgeleri
  drop constraint if exists kym_isletme_belgeleri_son_dosya_id_fkey;

alter table public.kym_isletme_belgeleri
  add constraint kym_isletme_belgeleri_son_dosya_id_fkey
  foreign key (son_dosya_id)
  references public.kym_belge_dosyalari(id)
  on delete set null;

-- ---------------------------------------------------------------------
-- 6. Belge doğrulama geçmişi
-- ---------------------------------------------------------------------

create table if not exists public.kym_belge_dogrulamalari (
  id uuid primary key default uuid_generate_v4(),

  isletme_belge_id uuid not null
    references public.kym_isletme_belgeleri(id)
    on delete cascade,

  belge_dosya_id uuid
    references public.kym_belge_dosyalari(id)
    on delete set null,

  kaynak text not null default 'ai',

  sonuc text not null,

  onceki_durum text,

  yeni_durum text not null,

  guven_skoru numeric(5,2),

  belge_turu_tahmini text,

  belge_sahibi text,

  belge_numarasi text,

  belge_tarihi date,

  gecerlilik_baslangic date,

  gecerlilik_bitis date,

  ozet text,

  eksikler jsonb not null default '[]'::jsonb,

  uyumsuzluklar jsonb not null default '[]'::jsonb,

  cikarilan_veriler jsonb not null default '{}'::jsonb,

  ham_ai_cevabi jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint kym_belge_dogrulamalari_kaynak_check
    check (
      kaynak in (
        'ai',
        'manuel',
        'sistem'
      )
    ),

  constraint kym_belge_dogrulamalari_sonuc_check
    check (
      sonuc in (
        'dogrulandi',
        'eksik',
        'gecersiz',
        'inceleme_gerekli'
      )
    ),

  constraint kym_belge_dogrulamalari_yeni_durum_check
    check (
      yeni_durum in (
        'yok',
        'yuklendi_incelemede',
        'dogrulandi_guncel',
        'suresi_yaklasiyor',
        'yanlis_belge',
        'eksik_bilgi_var',
        'suresi_doldu',
        'manuel_inceleme_gerekli',
        'basvuru_yapildi',
        'uygulanmiyor'
      )
    )
);

create index if not exists ix_kym_belge_dogrulamalari_isletme_belge
on public.kym_belge_dogrulamalari (
  isletme_belge_id
);

create index if not exists ix_kym_belge_dogrulamalari_dosya
on public.kym_belge_dogrulamalari (
  belge_dosya_id
);

create index if not exists ix_kym_belge_dogrulamalari_created_at
on public.kym_belge_dogrulamalari (
  created_at desc
);

-- ---------------------------------------------------------------------
-- 7. AI sonucunu kaydeden ve sistem durumunu güncelleyen fonksiyon
-- ---------------------------------------------------------------------

create or replace function public.kym_belge_dogrulama_kaydet(
  p_isletme_belge_id uuid,
  p_belge_dosya_id uuid default null,
  p_kaynak text default 'ai',
  p_sonuc text default 'inceleme_gerekli',
  p_yeni_durum text default 'manuel_inceleme_gerekli',
  p_guven_skoru numeric default null,
  p_belge_turu_tahmini text default null,
  p_belge_sahibi text default null,
  p_belge_numarasi text default null,
  p_belge_tarihi date default null,
  p_gecerlilik_baslangic date default null,
  p_gecerlilik_bitis date default null,
  p_ozet text default null,
  p_eksikler jsonb default '[]'::jsonb,
  p_uyumsuzluklar jsonb default '[]'::jsonb,
  p_cikarilan_veriler jsonb default '{}'::jsonb,
  p_ham_ai_cevabi jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_onceki_durum text;
  v_yeni_durum text;
  v_dogrulama_id uuid;
  v_mevcut_mu boolean;
begin
  select durum
  into v_onceki_durum
  from public.kym_isletme_belgeleri
  where id = p_isletme_belge_id
  for update;

  if not found then
    raise exception
      'KYM işletme belgesi bulunamadı: %',
      p_isletme_belge_id;
  end if;

  v_yeni_durum := p_yeni_durum;

  if p_sonuc = 'dogrulandi' then

    if p_gecerlilik_bitis is not null
       and p_gecerlilik_bitis < current_date then

      v_yeni_durum := 'suresi_doldu';

    elsif p_gecerlilik_bitis is not null
       and p_gecerlilik_bitis <= current_date + interval '30 day' then

      v_yeni_durum := 'suresi_yaklasiyor';

    else

      v_yeni_durum := 'dogrulandi_guncel';

    end if;

  elsif p_sonuc = 'eksik' then

    v_yeni_durum := 'eksik_bilgi_var';

  elsif p_sonuc = 'gecersiz' then

    v_yeni_durum := 'yanlis_belge';

  elsif p_sonuc = 'inceleme_gerekli' then

    v_yeni_durum := 'manuel_inceleme_gerekli';

  end if;

  v_mevcut_mu :=
    v_yeni_durum in (
      'dogrulandi_guncel',
      'suresi_yaklasiyor'
    );

  insert into public.kym_belge_dogrulamalari (
    isletme_belge_id,
    belge_dosya_id,
    kaynak,
    sonuc,
    onceki_durum,
    yeni_durum,
    guven_skoru,
    belge_turu_tahmini,
    belge_sahibi,
    belge_numarasi,
    belge_tarihi,
    gecerlilik_baslangic,
    gecerlilik_bitis,
    ozet,
    eksikler,
    uyumsuzluklar,
    cikarilan_veriler,
    ham_ai_cevabi
  )
  values (
    p_isletme_belge_id,
    p_belge_dosya_id,
    p_kaynak,
    p_sonuc,
    v_onceki_durum,
    v_yeni_durum,
    p_guven_skoru,
    p_belge_turu_tahmini,
    p_belge_sahibi,
    p_belge_numarasi,
    p_belge_tarihi,
    p_gecerlilik_baslangic,
    p_gecerlilik_bitis,
    p_ozet,
    coalesce(
      p_eksikler,
      '[]'::jsonb
    ),
    coalesce(
      p_uyumsuzluklar,
      '[]'::jsonb
    ),
    coalesce(
      p_cikarilan_veriler,
      '{}'::jsonb
    ),
    coalesce(
      p_ham_ai_cevabi,
      '{}'::jsonb
    )
  )
  returning id
  into v_dogrulama_id;

  update public.kym_isletme_belgeleri
  set
    durum = v_yeni_durum,

    mevcut_mu = v_mevcut_mu,

    son_dosya_id = coalesce(
      p_belge_dosya_id,
      son_dosya_id
    ),

    gecerlilik_baslangic = coalesce(
      p_gecerlilik_baslangic,
      gecerlilik_baslangic
    ),

    gecerlilik_bitis = coalesce(
      p_gecerlilik_bitis,
      gecerlilik_bitis
    ),

    son_kontrol_tarihi = current_date,

    ai_son_kontrol_tarihi = now(),

    ai_guven_skoru = p_guven_skoru,

    ai_ozet = p_ozet,

    ai_eksikler = coalesce(
      p_eksikler,
      '[]'::jsonb
    ),

    ai_cikarilan_veriler = coalesce(
      p_cikarilan_veriler,
      '{}'::jsonb
    )

  where id = p_isletme_belge_id;

  return v_dogrulama_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Eski KYM view'larını kaldır
--
-- View kolon yapısı değiştiği için CREATE OR REPLACE VIEW yeterli değildir.
-- Veriler silinmez. Yalnız view tanımları yeniden oluşturulur.
-- ---------------------------------------------------------------------

drop view if exists public.v_kym_kritik_eksikler;

drop view if exists public.v_kym_belge_listesi;

drop view if exists public.v_kym_dashboard_ozet;

-- ---------------------------------------------------------------------
-- 9. Dashboard view
-- ---------------------------------------------------------------------

create view public.v_kym_dashboard_ozet as
select
  ib.isletme_id,

  count(*)::integer as toplam_belge,

  count(*) filter (
    where ib.durum in (
      'dogrulandi_guncel',
      'suresi_yaklasiyor'
    )
  )::integer as guncel_belge,

  count(*) filter (
    where ib.durum = 'yok'
  )::integer as eksik_belge,

  count(*) filter (
    where ib.durum in (
      'yanlis_belge',
      'eksik_bilgi_var'
    )
  )::integer as eksik_veya_hatali_belge,

  count(*) filter (
    where ib.durum = 'suresi_doldu'
  )::integer as suresi_dolan_belge,

  count(*) filter (
    where ib.durum = 'suresi_yaklasiyor'
       or (
         ib.gecerlilik_bitis is not null
         and ib.gecerlilik_bitis >= current_date
         and ib.gecerlilik_bitis <= current_date + interval '30 day'
       )
  )::integer as otuz_gun_icinde_dolacak,

  count(*) filter (
    where ib.durum in (
      'yuklendi_incelemede',
      'manuel_inceleme_gerekli'
    )
  )::integer as inceleme_bekleyen_belge,

  coalesce(
    round(
      100 - (
        sum(
          case

            when ib.durum in (
              'yok',
              'yanlis_belge',
              'suresi_doldu'
            )
            then y.risk_puani

            when ib.durum in (
              'eksik_bilgi_var',
              'manuel_inceleme_gerekli'
            )
            then y.risk_puani * 0.5

            when ib.durum = 'yuklendi_incelemede'
            then y.risk_puani * 0.25

            else 0

          end
        )
        / nullif(
          count(*) * 100,
          0
        )
        * 100
      )
    ),
    100
  )::integer as uyum_puani

from public.kym_isletme_belgeleri ib

join public.kym_belge_tanimlari bt
  on bt.id = ib.belge_tanim_id

join public.kym_yukumluluklar y
  on y.id = bt.yukumluluk_id

group by ib.isletme_id;

-- ---------------------------------------------------------------------
-- 10. Belge listesi view
-- ---------------------------------------------------------------------

create view public.v_kym_belge_listesi as
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

  ib.notlar,

  ib.ai_guven_skoru,

  ib.ai_ozet,

  ib.ai_eksikler

from public.kym_isletme_belgeleri ib

join public.kym_belge_tanimlari bt
  on bt.id = ib.belge_tanim_id

join public.kym_yukumluluklar y
  on y.id = bt.yukumluluk_id;

-- ---------------------------------------------------------------------
-- 11. Kritik eksikler view
-- ---------------------------------------------------------------------

create view public.v_kym_kritik_eksikler as
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

  ib.notlar,

  ib.ai_guven_skoru,

  ib.ai_ozet,

  ib.ai_eksikler

from public.kym_isletme_belgeleri ib

join public.kym_belge_tanimlari bt
  on bt.id = ib.belge_tanim_id

join public.kym_yukumluluklar y
  on y.id = bt.yukumluluk_id

where ib.durum in (
  'yok',
  'yanlis_belge',
  'eksik_bilgi_var',
  'suresi_doldu',
  'manuel_inceleme_gerekli'
)

order by
  y.risk_puani desc,
  y.oncelik asc,
  bt.ad asc;

-- ---------------------------------------------------------------------
-- 12. KYM test aşaması RLS
--
-- KYM bağımsız test modülüdür.
-- Canlı entegrasyondan önce şirket bazlı sıkı RLS kurulacaktır.
-- ---------------------------------------------------------------------

alter table public.kym_belge_dogrulamalari
enable row level security;

drop policy if exists
"kym_belge_dogrulamalari_public_read"
on public.kym_belge_dogrulamalari;

create policy
"kym_belge_dogrulamalari_public_read"
on public.kym_belge_dogrulamalari
for select
to anon, authenticated
using (true);

drop policy if exists
"kym_belge_dogrulamalari_public_insert"
on public.kym_belge_dogrulamalari;

create policy
"kym_belge_dogrulamalari_public_insert"
on public.kym_belge_dogrulamalari
for insert
to anon, authenticated
with check (true);

-- ---------------------------------------------------------------------
-- 13. Kurulum doğrulaması
-- ---------------------------------------------------------------------

select
  'kym_belge_dogrulamalari' as nesne,
  case
    when to_regclass('public.kym_belge_dogrulamalari') is not null
    then 'hazir'
    else 'eksik'
  end as durum

union all

select
  'v_kym_dashboard_ozet',
  case
    when to_regclass('public.v_kym_dashboard_ozet') is not null
    then 'hazir'
    else 'eksik'
  end

union all

select
  'v_kym_belge_listesi',
  case
    when to_regclass('public.v_kym_belge_listesi') is not null
    then 'hazir'
    else 'eksik'
  end

union all

select
  'v_kym_kritik_eksikler',
  case
    when to_regclass('public.v_kym_kritik_eksikler') is not null
    then 'hazir'
    else 'eksik'
  end

union all

select
  'kym_belge_dogrulama_kaydet',
  case
    when to_regprocedure(
      'public.kym_belge_dogrulama_kaydet(uuid,uuid,text,text,text,numeric,text,text,text,date,date,date,text,jsonb,jsonb,jsonb,jsonb)'
    ) is not null
    then 'hazir'
    else 'eksik'
  end;