begin;

create extension if not exists pgcrypto;

-- =========================================================
-- KYM 011 — İşlem ve Aksiyon Merkezi
-- Temiz kurulum / yeniden çalıştırılabilir sürüm
-- Canlı V1 — Onaylı değişiklik talebi ve test olmadan değiştirilmemelidir.
-- =========================================================

create table if not exists public.kym_islemler (
  id uuid primary key default gen_random_uuid(),

  isletme_id uuid not null
    references public.kym_isletmeler(id)
    on delete cascade,

  isletme_belge_id uuid
    references public.kym_isletme_belgeleri(id)
    on delete set null,

  kaynak_tipi text not null default 'belge',
  kaynak_id uuid,

  islem_tipi text not null default 'belge_tamamlama',
  baslik text not null,
  aciklama text,

  durum text not null default 'bekliyor',
  oncelik text not null default 'P3',
  risk_puani integer not null default 50,

  sorumlu_personel_id uuid,
  sorumlu_adi text,
  sorumlu_birim text,

  hedef_tarih date,
  baslama_tarihi date,
  tamamlanma_tarihi date,

  son_islem_notu text,

  aktif boolean not null default true,

  created_by text,
  updated_by text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint kym_islemler_kaynak_tipi_check
    check (kaynak_tipi in ('belge', 'manuel', 'profil', 'basvuru', 'sistem')),

  constraint kym_islemler_islem_tipi_check
    check (
      islem_tipi in (
        'belge_tamamlama',
        'belge_yenileme',
        'basvuru',
        'evrak_hazirlama',
        'resmi_kurum_takibi',
        'eksik_bilgi_tamamlama',
        'manuel_inceleme',
        'uygunsuzluk_giderme',
        'denetim_hazirligi',
        'profil_tamamlama',
        'diger'
      )
    ),

  constraint kym_islemler_durum_check
    check (
      durum in (
        'bekliyor',
        'hazirlaniyor',
        'evrak_bekliyor',
        'basvuruya_hazir',
        'basvuru_yapildi',
        'sonuc_bekleniyor',
        'belge_alindi',
        'tamamlandi',
        'iptal'
      )
    ),

  constraint kym_islemler_oncelik_check
    check (oncelik in ('P1', 'P2', 'P3', 'P4', 'P5')),

  constraint kym_islemler_risk_puani_check
    check (risk_puani between 0 and 100)
);

create table if not exists public.kym_islem_hareketleri (
  id uuid primary key default gen_random_uuid(),

  islem_id uuid not null
    references public.kym_islemler(id)
    on delete cascade,

  hareket_tipi text not null,

  onceki_durum text,
  yeni_durum text,

  onceki_sorumlu_personel_id uuid,
  yeni_sorumlu_personel_id uuid,

  onceki_sorumlu_adi text,
  yeni_sorumlu_adi text,

  onceki_hedef_tarih date,
  yeni_hedef_tarih date,

  aciklama text,
  islemi_yapan text,

  created_at timestamptz not null default now(),

  constraint kym_islem_hareketleri_tip_check
    check (
      hareket_tipi in (
        'olusturma',
        'durum_degisikligi',
        'sorumlu_atama',
        'hedef_tarih',
        'tamamlama',
        'iptal',
        'belge_senkronizasyonu',
        'not'
      )
    )
);

create index if not exists idx_kym_islemler_isletme
  on public.kym_islemler (isletme_id);

create index if not exists idx_kym_islemler_belge
  on public.kym_islemler (isletme_belge_id);

create index if not exists idx_kym_islemler_durum
  on public.kym_islemler (durum);

create index if not exists idx_kym_islemler_sorumlu
  on public.kym_islemler (sorumlu_personel_id);

create index if not exists idx_kym_islemler_hedef
  on public.kym_islemler (hedef_tarih);

create index if not exists idx_kym_hareketler_islem
  on public.kym_islem_hareketleri (islem_id, created_at desc);

create unique index if not exists ux_kym_islemler_acik_belge
  on public.kym_islemler (isletme_belge_id)
  where
    isletme_belge_id is not null
    and aktif = true
    and durum not in ('tamamlandi', 'iptal');

create or replace function public.kym_islem_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_kym_islemler_updated_at
  on public.kym_islemler;

create trigger trg_kym_islemler_updated_at
before update on public.kym_islemler
for each row
execute function public.kym_islem_updated_at();

create or replace function public.kym_islem_olustur(
  p_isletme_id uuid,
  p_isletme_belge_id uuid default null,
  p_baslik text default null,
  p_aciklama text default null,
  p_islem_tipi text default 'belge_tamamlama',
  p_oncelik text default 'P3',
  p_risk_puani integer default 50,
  p_hedef_tarih date default null,
  p_sorumlu_personel_id uuid default null,
  p_sorumlu_adi text default null,
  p_sorumlu_birim text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_islem_id uuid := gen_random_uuid();
  v_mevcut_id uuid;
  v_baslik text;
  v_aciklama text;
  v_oncelik text;
  v_risk_puani integer;
  v_belge_isletme_id uuid;
begin
  if not exists (
    select 1
    from public.kym_isletmeler i
    where i.id = p_isletme_id
  ) then
    raise exception 'KYM işletmesi bulunamadı: %', p_isletme_id;
  end if;

  if p_islem_tipi not in (
    'belge_tamamlama',
    'belge_yenileme',
    'basvuru',
    'evrak_hazirlama',
    'resmi_kurum_takibi',
    'eksik_bilgi_tamamlama',
    'manuel_inceleme',
    'uygunsuzluk_giderme',
    'denetim_hazirligi',
    'profil_tamamlama',
    'diger'
  ) then
    raise exception 'Geçersiz KYM işlem tipi: %', p_islem_tipi;
  end if;

  if p_oncelik not in ('P1', 'P2', 'P3', 'P4', 'P5') then
    raise exception 'Geçersiz KYM işlem önceliği: %', p_oncelik;
  end if;

  if p_risk_puani is null or p_risk_puani not between 0 and 100 then
    raise exception 'Risk puanı 0 ile 100 arasında olmalıdır.';
  end if;

  if p_isletme_belge_id is not null then
    select ib.isletme_id
      into v_belge_isletme_id
    from public.kym_isletme_belgeleri ib
    where ib.id = p_isletme_belge_id;

    if not found then
      raise exception 'KYM işletme belge kaydı bulunamadı: %', p_isletme_belge_id;
    end if;

    if v_belge_isletme_id <> p_isletme_id then
      raise exception 'Belge kaydı belirtilen işletmeye ait değildir.';
    end if;

    select ki.id
      into v_mevcut_id
    from public.kym_islemler ki
    where ki.isletme_belge_id = p_isletme_belge_id
      and ki.aktif = true
      and ki.durum not in ('tamamlandi', 'iptal')
    order by ki.created_at desc
    limit 1;

    if v_mevcut_id is not null then
      return v_mevcut_id;
    end if;
  end if;

  v_baslik := coalesce(
    nullif(btrim(p_baslik), ''),
    case
      when p_isletme_belge_id is null then 'Yeni KYM işlemi'
      else 'Belge işlemini tamamla'
    end
  );

  v_aciklama := nullif(btrim(p_aciklama), '');
  v_oncelik := coalesce(nullif(btrim(p_oncelik), ''), 'P3');
  v_risk_puani := coalesce(p_risk_puani, 50);

  insert into public.kym_islemler (
    id,
    isletme_id,
    isletme_belge_id,
    kaynak_tipi,
    kaynak_id,
    islem_tipi,
    baslik,
    aciklama,
    durum,
    oncelik,
    risk_puani,
    sorumlu_personel_id,
    sorumlu_adi,
    sorumlu_birim,
    hedef_tarih,
    son_islem_notu,
    created_by,
    updated_by
  )
  values (
    v_islem_id,
    p_isletme_id,
    p_isletme_belge_id,
    case when p_isletme_belge_id is null then 'manuel' else 'belge' end,
    p_isletme_belge_id,
    p_islem_tipi,
    v_baslik,
    v_aciklama,
    'bekliyor',
    v_oncelik,
    v_risk_puani,
    p_sorumlu_personel_id,
    nullif(btrim(p_sorumlu_adi), ''),
    nullif(btrim(p_sorumlu_birim), ''),
    p_hedef_tarih,
    'KYM işlemi oluşturuldu.',
    auth.uid()::text,
    auth.uid()::text
  );

  insert into public.kym_islem_hareketleri (
    islem_id,
    hareket_tipi,
    yeni_durum,
    yeni_sorumlu_personel_id,
    yeni_sorumlu_adi,
    yeni_hedef_tarih,
    aciklama,
    islemi_yapan
  )
  values (
    v_islem_id,
    'olusturma',
    'bekliyor',
    p_sorumlu_personel_id,
    nullif(btrim(p_sorumlu_adi), ''),
    p_hedef_tarih,
    'KYM işlem ve aksiyon kaydı oluşturuldu.',
    auth.uid()::text
  );

  return v_islem_id;
end;
$$;

create or replace function public.kym_islem_durum_guncelle(
  p_islem_id uuid,
  p_yeni_durum text,
  p_aciklama text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_islem public.kym_islemler%rowtype;
  v_hareket_tipi text;
begin
  if p_yeni_durum not in (
    'bekliyor',
    'hazirlaniyor',
    'evrak_bekliyor',
    'basvuruya_hazir',
    'basvuru_yapildi',
    'sonuc_bekleniyor',
    'belge_alindi',
    'tamamlandi',
    'iptal'
  ) then
    raise exception 'Geçersiz KYM işlem durumu: %', p_yeni_durum;
  end if;

  select *
    into v_islem
  from public.kym_islemler
  where id = p_islem_id
  for update;

  if not found then
    raise exception 'KYM işlem kaydı bulunamadı: %', p_islem_id;
  end if;

  v_hareket_tipi := case
    when p_yeni_durum = 'tamamlandi' then 'tamamlama'
    when p_yeni_durum = 'iptal' then 'iptal'
    else 'durum_degisikligi'
  end;

  update public.kym_islemler
  set
    durum = p_yeni_durum,
    baslama_tarihi = case
      when p_yeni_durum <> 'bekliyor'
        then coalesce(baslama_tarihi, current_date)
      else baslama_tarihi
    end,
    tamamlanma_tarihi = case
      when p_yeni_durum = 'tamamlandi'
        then coalesce(tamamlanma_tarihi, current_date)
      when p_yeni_durum <> 'tamamlandi'
        then null
      else tamamlanma_tarihi
    end,
    aktif = p_yeni_durum not in ('tamamlandi', 'iptal'),
    son_islem_notu = coalesce(
      nullif(btrim(p_aciklama), ''),
      son_islem_notu
    ),
    updated_by = auth.uid()::text
  where id = p_islem_id;

  insert into public.kym_islem_hareketleri (
    islem_id,
    hareket_tipi,
    onceki_durum,
    yeni_durum,
    aciklama,
    islemi_yapan
  )
  values (
    p_islem_id,
    v_hareket_tipi,
    v_islem.durum,
    p_yeni_durum,
    coalesce(
      nullif(btrim(p_aciklama), ''),
      'KYM işlem durumu güncellendi.'
    ),
    auth.uid()::text
  );

  return true;
end;
$$;

create or replace function public.kym_islem_sorumlu_ata(
  p_islem_id uuid,
  p_sorumlu_personel_id uuid default null,
  p_sorumlu_adi text default null,
  p_sorumlu_birim text default null,
  p_aciklama text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_islem public.kym_islemler%rowtype;
begin
  select *
    into v_islem
  from public.kym_islemler
  where id = p_islem_id
  for update;

  if not found then
    raise exception 'KYM işlem kaydı bulunamadı: %', p_islem_id;
  end if;

  if v_islem.durum in ('tamamlandi', 'iptal') then
    raise exception 'Tamamlanmış veya iptal edilmiş işleme sorumlu atanamaz.';
  end if;

  update public.kym_islemler
  set
    sorumlu_personel_id = p_sorumlu_personel_id,
    sorumlu_adi = nullif(btrim(p_sorumlu_adi), ''),
    sorumlu_birim = nullif(btrim(p_sorumlu_birim), ''),
    son_islem_notu = coalesce(
      nullif(btrim(p_aciklama), ''),
      son_islem_notu
    ),
    updated_by = auth.uid()::text
  where id = p_islem_id;

  insert into public.kym_islem_hareketleri (
    islem_id,
    hareket_tipi,
    onceki_sorumlu_personel_id,
    yeni_sorumlu_personel_id,
    onceki_sorumlu_adi,
    yeni_sorumlu_adi,
    aciklama,
    islemi_yapan
  )
  values (
    p_islem_id,
    'sorumlu_atama',
    v_islem.sorumlu_personel_id,
    p_sorumlu_personel_id,
    v_islem.sorumlu_adi,
    nullif(btrim(p_sorumlu_adi), ''),
    coalesce(
      nullif(btrim(p_aciklama), ''),
      'KYM işlem sorumlusu güncellendi.'
    ),
    auth.uid()::text
  );

  return true;
end;
$$;

create or replace function public.kym_islem_hedef_tarih_guncelle(
  p_islem_id uuid,
  p_hedef_tarih date,
  p_aciklama text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_islem public.kym_islemler%rowtype;
begin
  select *
    into v_islem
  from public.kym_islemler
  where id = p_islem_id
  for update;

  if not found then
    raise exception 'KYM işlem kaydı bulunamadı: %', p_islem_id;
  end if;

  if v_islem.durum in ('tamamlandi', 'iptal') then
    raise exception 'Tamamlanmış veya iptal edilmiş işlemin hedef tarihi değiştirilemez.';
  end if;

  update public.kym_islemler
  set
    hedef_tarih = p_hedef_tarih,
    son_islem_notu = coalesce(
      nullif(btrim(p_aciklama), ''),
      son_islem_notu
    ),
    updated_by = auth.uid()::text
  where id = p_islem_id;

  insert into public.kym_islem_hareketleri (
    islem_id,
    hareket_tipi,
    onceki_hedef_tarih,
    yeni_hedef_tarih,
    aciklama,
    islemi_yapan
  )
  values (
    p_islem_id,
    'hedef_tarih',
    v_islem.hedef_tarih,
    p_hedef_tarih,
    coalesce(
      nullif(btrim(p_aciklama), ''),
      'KYM işlem hedef tarihi güncellendi.'
    ),
    auth.uid()::text
  );

  return true;
end;
$$;

create or replace function public.kym_acik_belgeler_icin_islem_olustur(
  p_isletme_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_belge record;
  v_olusturulan integer := 0;
begin
  for v_belge in
    select
      ib.id as isletme_belge_id,
      bt.ad as belge_adi
    from public.kym_isletme_belgeleri ib
    join public.kym_belge_tanimlari bt
      on bt.id = ib.belge_tanim_id
    where ib.isletme_id = p_isletme_id
      and coalesce(ib.durum, 'bekliyor') not in (
        'tamamlandi',
        'gecerli',
        'belge_alindi'
      )
      and not exists (
        select 1
        from public.kym_islemler ki
        where ki.isletme_belge_id = ib.id
          and ki.aktif = true
          and ki.durum not in ('tamamlandi', 'iptal')
      )
  loop
    perform public.kym_islem_olustur(
      p_isletme_id := p_isletme_id,
      p_isletme_belge_id := v_belge.isletme_belge_id,
      p_baslik := v_belge.belge_adi || ' işlemini tamamla',
      p_aciklama := 'Belge kaydı için otomatik KYM işlemi oluşturuldu.',
      p_islem_tipi := 'belge_tamamlama',
      p_oncelik := 'P3',
      p_risk_puani := 50
    );

    v_olusturulan := v_olusturulan + 1;
  end loop;

  return v_olusturulan;
end;
$$;

create or replace function public.kym_islem_belge_durumu_senkronize_et(
  p_isletme_belge_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_belge public.kym_isletme_belgeleri%rowtype;
  v_islem public.kym_islemler%rowtype;
  v_yeni_durum text;
begin
  select *
    into v_belge
  from public.kym_isletme_belgeleri
  where id = p_isletme_belge_id;

  if not found then
    raise exception 'KYM işletme belge kaydı bulunamadı: %', p_isletme_belge_id;
  end if;

  select *
    into v_islem
  from public.kym_islemler
  where isletme_belge_id = p_isletme_belge_id
    and aktif = true
    and durum not in ('tamamlandi', 'iptal')
  order by created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  v_yeni_durum := case
    when v_belge.durum in ('tamamlandi', 'gecerli', 'belge_alindi')
      then 'tamamlandi'
    when v_belge.durum in ('basvuru_yapildi', 'sonuc_bekleniyor')
      then v_belge.durum
    when v_belge.durum = 'basvuruya_hazir'
      then 'basvuruya_hazir'
    when v_belge.durum in ('evrak_bekliyor', 'eksik')
      then 'evrak_bekliyor'
    else 'hazirlaniyor'
  end;

  perform public.kym_islem_durum_guncelle(
    p_islem_id := v_islem.id,
    p_yeni_durum := v_yeni_durum,
    p_aciklama := 'Belge durumu KYM işlem kaydına senkronize edildi.'
  );

  insert into public.kym_islem_hareketleri (
    islem_id,
    hareket_tipi,
    onceki_durum,
    yeni_durum,
    aciklama,
    islemi_yapan
  )
  values (
    v_islem.id,
    'belge_senkronizasyonu',
    v_islem.durum,
    v_yeni_durum,
    'Belge durumu otomatik senkronize edildi.',
    auth.uid()::text
  );

  return true;
end;
$$;

drop view if exists public.v_kym_islem_hareketleri;
drop view if exists public.v_kym_islem_dashboard_ozet;
drop view if exists public.v_kym_islem_listesi;

create view public.v_kym_islem_listesi as
select
  ki.id,
  ki.isletme_id,
  i.isletme_adi,
  ki.isletme_belge_id,
  bt.id as belge_tanim_id,
  bt.kod as belge_kodu,
  bt.ad as belge_adi,
  ki.kaynak_tipi,
  ki.kaynak_id,
  ki.islem_tipi,
  ki.baslik,
  ki.aciklama,
  ki.durum,
  ki.oncelik,
  ki.risk_puani,
  ki.sorumlu_personel_id,
  ki.sorumlu_adi,
  ki.sorumlu_birim,
  ki.hedef_tarih,
  ki.baslama_tarihi,
  ki.tamamlanma_tarihi,
  ki.son_islem_notu,
  ki.aktif,
  ki.created_by,
  ki.updated_by,
  ki.created_at,
  ki.updated_at,
  case
    when ki.aktif
      and ki.hedef_tarih is not null
      and ki.hedef_tarih < current_date
      then true
    else false
  end as gecikmis,
  case
    when ki.hedef_tarih is null then null
    else ki.hedef_tarih - current_date
  end as kalan_gun
from public.kym_islemler ki
join public.kym_isletmeler i
  on i.id = ki.isletme_id
left join public.kym_isletme_belgeleri ib
  on ib.id = ki.isletme_belge_id
left join public.kym_belge_tanimlari bt
  on bt.id = ib.belge_tanim_id;

create view public.v_kym_islem_dashboard_ozet as
select
  i.id as isletme_id,
  i.isletme_adi,
  count(ki.id) as toplam_islem,
  count(ki.id) filter (
    where ki.aktif = true
      and ki.durum not in ('tamamlandi', 'iptal')
  ) as acik_islem,
  count(ki.id) filter (
    where ki.durum = 'tamamlandi'
  ) as tamamlanan_islem,
  count(ki.id) filter (
    where ki.durum = 'iptal'
  ) as iptal_islem,
  count(ki.id) filter (
    where ki.aktif = true
      and ki.hedef_tarih is not null
      and ki.hedef_tarih < current_date
  ) as geciken_islem,
  count(ki.id) filter (
    where ki.aktif = true
      and ki.oncelik in ('P1', 'P2')
  ) as yuksek_oncelikli_islem,
  count(ki.id) filter (
    where ki.aktif = true
      and ki.sorumlu_personel_id is null
      and nullif(btrim(ki.sorumlu_adi), '') is null
  ) as sorumlusuz_islem,
  coalesce(
    round(
      avg(ki.risk_puani) filter (
        where ki.aktif = true
          and ki.durum not in ('tamamlandi', 'iptal')
      ),
      2
    ),
    0
  ) as ortalama_acik_risk
from public.kym_isletmeler i
left join public.kym_islemler ki
  on ki.isletme_id = i.id
group by i.id, i.isletme_adi;

create view public.v_kym_islem_hareketleri as
select
  kh.id,
  kh.islem_id,
  ki.isletme_id,
  ki.baslik as islem_basligi,
  kh.hareket_tipi,
  kh.onceki_durum,
  kh.yeni_durum,
  kh.onceki_sorumlu_personel_id,
  kh.yeni_sorumlu_personel_id,
  kh.onceki_sorumlu_adi,
  kh.yeni_sorumlu_adi,
  kh.onceki_hedef_tarih,
  kh.yeni_hedef_tarih,
  kh.aciklama,
  kh.islemi_yapan,
  kh.created_at
from public.kym_islem_hareketleri kh
join public.kym_islemler ki
  on ki.id = kh.islem_id;

alter table public.kym_islemler enable row level security;
alter table public.kym_islem_hareketleri enable row level security;

drop policy if exists kym_islemler_select_authenticated
  on public.kym_islemler;
drop policy if exists kym_islemler_insert_authenticated
  on public.kym_islemler;
drop policy if exists kym_islemler_update_authenticated
  on public.kym_islemler;
drop policy if exists kym_islemler_delete_authenticated
  on public.kym_islemler;

create policy kym_islemler_select_authenticated
on public.kym_islemler
for select
to authenticated
using (true);

create policy kym_islemler_insert_authenticated
on public.kym_islemler
for insert
to authenticated
with check (true);

create policy kym_islemler_update_authenticated
on public.kym_islemler
for update
to authenticated
using (true)
with check (true);

create policy kym_islemler_delete_authenticated
on public.kym_islemler
for delete
to authenticated
using (true);

drop policy if exists kym_hareketler_select_authenticated
  on public.kym_islem_hareketleri;
drop policy if exists kym_hareketler_insert_authenticated
  on public.kym_islem_hareketleri;

create policy kym_hareketler_select_authenticated
on public.kym_islem_hareketleri
for select
to authenticated
using (true);

create policy kym_hareketler_insert_authenticated
on public.kym_islem_hareketleri
for insert
to authenticated
with check (true);

grant select, insert, update, delete
  on public.kym_islemler
  to authenticated;

grant select, insert
  on public.kym_islem_hareketleri
  to authenticated;

grant select
  on public.v_kym_islem_listesi,
     public.v_kym_islem_dashboard_ozet,
     public.v_kym_islem_hareketleri
  to authenticated;

grant execute
  on function public.kym_islem_olustur(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    integer,
    date,
    uuid,
    text,
    text
  )
  to authenticated;

grant execute
  on function public.kym_islem_durum_guncelle(uuid, text, text)
  to authenticated;

grant execute
  on function public.kym_islem_sorumlu_ata(uuid, uuid, text, text, text)
  to authenticated;

grant execute
  on function public.kym_islem_hedef_tarih_guncelle(uuid, date, text)
  to authenticated;

grant execute
  on function public.kym_acik_belgeler_icin_islem_olustur(uuid)
  to authenticated;

grant execute
  on function public.kym_islem_belge_durumu_senkronize_et(uuid)
  to authenticated;

commit;
