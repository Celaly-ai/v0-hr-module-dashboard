/**
 * Canonical list of application modules. Slugs match:
 *  - sidebar `title` strings in components/hr-sidebar.tsx
 *  - `activeSection` keys in app/page.tsx
 *  - `role_permissions.modules[]` entries in Supabase
 *
 * If you add a new module, add it here AND update the seed in
 * scripts/002_seed_role_permissions.sql (or via the admin UI).
 */
export const ALL_MODULES = [
  "Panel",
  "Calisanlar",
  "Izin Talepleri",
  "Varliklar",
  "Satislar",
  "Disiplin Kayitlari",
  "Belge Takibi",
  "Ise Giris",
  "Puantaj",
  "Vardiya Plani",
  "Giris Cikis",
  "Performans Degerlendirme",
  "Fazla Mesai",
  "Departmanlar",
  "Raporlar",
  "Bildirimler",
  "Ayarlar",
   "Araclar",
    "Belge Arsivi",
  "Teknik Destek",
] as const


export type ModuleSlug = (typeof ALL_MODULES)[number]

export const APP_ROLES = [
  "admin",
  "servis_yoneticisi",
  "ik_yoneticisi",
  "urun_sorumlusu",
  "calisan",
] as const

export type AppRole = (typeof APP_ROLES)[number]

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Yonetici",
  servis_yoneticisi: "Servis Yoneticisi",
  ik_yoneticisi: "IK Yoneticisi",
  urun_sorumlusu: "Urun Sorumlusu",
  calisan: "Calisan",
}

/**
 * Fallback permissions used when the `role_permissions` table cannot be
 * reached (first load, offline, etc.). The real source of truth is the DB.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, ModuleSlug[]> = {
  admin: [...ALL_MODULES],
  servis_yoneticisi: [
    "Panel",
    "Calisanlar",
    "Izin Talepleri",
    "Varliklar",
    "Satislar",
    "Disiplin Kayitlari",
    "Belge Takibi",
    "Ise Giris",
    "Puantaj",
    "Vardiya Plani",
    "Giris Cikis",
    "Performans Degerlendirme",
    "Fazla Mesai",
    "Departmanlar",
    "Raporlar",
    "Bildirimler",
        "Araclar",
    "Belge Arsivi",
    "Teknik Destek",
  ],
  ik_yoneticisi: [
    "Panel",
    "Calisanlar",
    "Izin Talepleri",
    "Varliklar",
    "Belge Takibi",
    "Ise Giris",
    "Puantaj",
    "Vardiya Plani",
    "Giris Cikis",
    "Performans Degerlendirme",
    "Fazla Mesai",
    "Departmanlar",
    "Raporlar",
    "Bildirimler",
    "Ayarlar",
  ],
    urun_sorumlusu: [
    "Panel",

    "Calisanlar",
    "Varliklar",
    "Satislar",
    "Belge Takibi",
    "Raporlar",
    "Bildirimler",
  ],
  calisan: [
    "Panel",
    "Izin Talepleri",
    "Puantaj",
    "Vardiya Plani",
    "Giris Cikis",
    "Bildirimler",
  ],
}
