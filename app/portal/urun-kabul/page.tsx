create table if not exists urun_hareket_fisleri (
  id uuid primary key default gen_random_uuid(),

  sirket_id uuid,
  belge_no text unique,

  kaynak_tipi text,
  kaynak_adi text,

  teslim_eden_adi text,
  teslim_eden_telefon text,

  teslim_alan_personel_id uuid,
  teslim_alan_adi text,

  toplam_urun integer default 0,
  durum text default 'aktif',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists urun_hareket_fisi_kalemleri (
  id uuid primary key default gen_random_uuid(),

  fis_id uuid not null references urun_hareket_fisleri(id) on delete cascade,
  cihaz_id uuid not null references cihazlar(id) on delete cascade,

  barkod text,
  seri_no text,
  marka text,
  model text,

  created_at timestamptz default now()
);

create index if not exists idx_urun_hareket_fisleri_belge_no
on urun_hareket_fisleri(belge_no);

create index if not exists idx_urun_hareket_fisleri_created
on urun_hareket_fisleri(created_at desc);

create index if not exists idx_urun_hareket_kalemleri_fis
on urun_hareket_fisi_kalemleri(fis_id);

create index if not exists idx_urun_hareket_kalemleri_cihaz
on urun_hareket_fisi_kalemleri(cihaz_id);
