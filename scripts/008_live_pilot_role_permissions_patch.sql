-- 008_live_pilot_role_permissions_patch.sql
-- Live pilot role/module patch. Safe to re-run.
-- Run after 007_live_pilot_add_ik_role.sql.

insert into public.role_permissions (role, modules)
values
  ('admin', array[
    'Panel',
    'Calisanlar',
    'Izin Talepleri',
    'Varliklar',
    'Satislar',
    'Disiplin Kayitlari',
    'Belge Takibi',
    'Ise Giris',
    'Puantaj',
    'Vardiya Plani',
    'Giris Cikis',
    'Performans Degerlendirme',
    'Fazla Mesai',
    'Departmanlar',
    'Raporlar',
    'Bildirimler',
    'Ayarlar',
    'Araclar',
    'Belge Arsivi',
    'Teknik Destek'
  ]),
  ('servis_yoneticisi', array[
    'Panel',
    'Calisanlar',
    'Izin Talepleri',
    'Varliklar',
    'Satislar',
    'Disiplin Kayitlari',
    'Belge Takibi',
    'Ise Giris',
    'Puantaj',
    'Vardiya Plani',
    'Giris Cikis',
    'Performans Degerlendirme',
    'Fazla Mesai',
    'Departmanlar',
    'Raporlar',
    'Bildirimler',
    'Araclar',
    'Belge Arsivi',
    'Teknik Destek'
  ]),
  ('ik_yoneticisi', array[
    'Panel',
    'Calisanlar',
    'Izin Talepleri',
    'Varliklar',
    'Belge Takibi',
    'Ise Giris',
    'Puantaj',
    'Vardiya Plani',
    'Giris Cikis',
    'Performans Degerlendirme',
    'Fazla Mesai',
    'Departmanlar',
    'Raporlar',
    'Bildirimler',
    'Ayarlar'
  ]),
  ('urun_sorumlusu', array[
    'Panel',
    'Calisanlar',
    'Varliklar',
    'Satislar',
    'Belge Takibi',
    'Raporlar',
    'Bildirimler'
  ]),
  ('calisan', array[
    'Panel',
    'Izin Talepleri',
    'Puantaj',
    'Vardiya Plani',
    'Giris Cikis',
    'Bildirimler'
  ])
on conflict (role) do update
  set modules = excluded.modules,
      updated_at = now();
