-- =====================================================================
-- Seed the default module list for each role. Safe to re-run.
-- Module slugs match the sidebar `title` strings in components/hr-sidebar.tsx
-- and the `activeSection` keys in app/page.tsx.
-- =====================================================================

insert into public.role_permissions (role, modules)
values
  ('admin', array[
    'Panel',
    'Calisanlar',
    'Izin Talepleri',
    'Varliklar',
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
    'Ayarlar'
  ]),
  ('servis_yoneticisi', array[
    'Panel',
    'Calisanlar',
    'Izin Talepleri',
    'Varliklar',
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
    'Bildirimler'
  ]),
  ('urun_sorumlusu', array[
    'Panel',
    'Calisanlar',
    'Varliklar',
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
