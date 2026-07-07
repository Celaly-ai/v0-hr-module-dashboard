-- Görevlerim V1 — opsiyonel saha operasyon modül kaydı
-- Idempotent: mevcut kayıt varsa tekrar eklenmez; standart=false güncellenir.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'moduller'
  ) then
    insert into public.moduller (kod, ad, aciklama, kategori, standart, aktif, sira)
    select
      'gorevlerim',
      'Görevlerim',
      'Atanmış saha görevlerinizi görüntüleyin ve operasyon işlemlerini yürütün.',
      'operasyon',
      false,
      true,
      115
    where not exists (
      select 1 from public.moduller where kod = 'gorevlerim'
    );

    update public.moduller
    set
      ad = 'Görevlerim',
      aciklama = 'Atanmış saha görevlerinizi görüntüleyin ve operasyon işlemlerini yürütün.',
      kategori = 'operasyon',
      standart = false,
      aktif = true
    where kod = 'gorevlerim';
  end if;
end$$;
