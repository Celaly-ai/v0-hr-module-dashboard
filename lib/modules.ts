/**
 * FeyRoute canonical application module list.
 *
 * Modül adları:
 * - role_permissions.modules[] kayıtlarında kullanılabilir.
 * - Uygulama içi fallback rol yetkilerinde kullanılır.
 *
 * ÖNEMLİ:
 * Performansım kişisel performans merkezidir.
 * Menü erişimi bütün personel rollerine açık olabilir.
 * Gerçek performans verisi auth.uid() bağlantılı güvenli RPC katmanından
 * yalnız giriş yapan personel için okunur.
 *
 * Teknik test route'ları ve alt modül sayfaları burada ana portal
 * modülü olarak tanımlanmaz.
 */

export const ALL_MODULES = [
  "Panel",

  // İnsan Kaynakları
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
  "Fazla Mesai",
  "Departmanlar",

  // Performans
  "Performans Degerlendirme",
  "Hizli Performans",
  "Performans Eslestirme",
  "Performansim",

  // Operasyon
  "AI Canli Operasyon Merkezi",
  "AI Gorev Merkezi",
  "Operasyon Havuzu",
  "Operasyon Zimmet",
  "Adres Konum Teyit",
  "Adres Konum Rapor",
  "Yonetici Bildirimleri",

  // Ürün
  "Urun Merkezi",
  "Urun Operasyon Dashboard",

  // Bayi
  "Bayi Operasyon Merkezi",

  // Mali
  "Muhasebe",

  // Kurumsal yönetim
  "KYM",
  "Sirket Kunyesi",

  // Yönetim ve yetki
  "Rol Atama",
  "Yetki Yonetimi",
  "Rol Gecmisi",

  // Genel
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
  admin: "Yönetici",
  servis_yoneticisi: "Servis Yöneticisi",
  ik_yoneticisi: "İK Yöneticisi",
  urun_sorumlusu: "Ürün Sorumlusu",
  calisan: "Çalışan",
}

/**
 * Fallback permissions.
 *
 * Veritabanındaki role_permissions tablosuna ulaşılamadığında
 * kullanılacak varsayılan modül yetkileridir.
 *
 * Bu liste yalnız fallback davranışıdır.
 * Portal navigasyonundaki kritik yönetim modülleri ayrıca rol bazlı
 * görünürlük kontrolüne sahiptir.
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
    "Fazla Mesai",
    "Departmanlar",

    "Performans Degerlendirme",
    "Hizli Performans",
    "Performans Eslestirme",
    "Performansim",

    "AI Canli Operasyon Merkezi",
    "AI Gorev Merkezi",
    "Operasyon Havuzu",
    "Operasyon Zimmet",
    "Adres Konum Teyit",
    "Adres Konum Rapor",
    "Yonetici Bildirimleri",

    "Urun Merkezi",
    "Urun Operasyon Dashboard",

    "Bayi Operasyon Merkezi",

    "Muhasebe",

    "KYM",

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
    "Fazla Mesai",
    "Departmanlar",

    "Performans Degerlendirme",
    "Hizli Performans",
    "Performans Eslestirme",
    "Performansim",

    "Adres Konum Teyit",
    "Adres Konum Rapor",
    "Yonetici Bildirimleri",

    "KYM",

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

    "Performansim",

    "Operasyon Havuzu",
    "Operasyon Zimmet",

    "Urun Merkezi",
    "Urun Operasyon Dashboard",

    "Raporlar",
    "Bildirimler",
  ],

  calisan: [
    "Panel",

    "Izin Talepleri",
    "Puantaj",
    "Vardiya Plani",
    "Giris Cikis",

    "Performansim",

    "Adres Konum Teyit",

    "Bildirimler",
  ],
}