-- =====================================================================
-- "Satislar" modulunu mevcut role_permissions satirlarina ekler.
-- Idempotent: birden fazla kez calistirilabilir, tekrar etmez.
-- =====================================================================

-- admin: tum modullere erisimi oldugu icin "Satislar" da eklensin.
update public.role_permissions
set modules = (
  select array_agg(distinct m)
  from unnest(modules || array['Satislar']::text[]) as m
)
where role = 'admin';

-- servis_yoneticisi: satislari gorebilir ve kaydedebilir.
update public.role_permissions
set modules = (
  select array_agg(distinct m)
  from unnest(modules || array['Satislar']::text[]) as m
)
where role = 'servis_yoneticisi';

-- urun_sorumlusu: urun sorumlulari da satis modulunu kullanir.
update public.role_permissions
set modules = (
  select array_agg(distinct m)
  from unnest(modules || array['Satislar']::text[]) as m
)
where role = 'urun_sorumlusu';

-- calisan: varsayilan olarak satis modulu acik degil; admin dilerse UI'dan ekler.
