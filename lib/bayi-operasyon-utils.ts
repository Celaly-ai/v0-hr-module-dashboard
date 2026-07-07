import type {
  BayiSorumluDepartman,
  BayiTalepDurum,
  BayiTalepOncelik,
  BayiTalepTuru,
  BayiZiyaretTipi,
} from "@/lib/types/bayi-operasyon"

export const TALEP_TURU_ETIKETLERI: Record<BayiTalepTuru, string> = {
  montaj: "Yeni Montaj Talebi",
  ariza: "Yeni Arıza Talebi",
  acil: "Acil Servis Talebi",
  tekrar_servis: "Tekrar Servis Talebi",
  randevu_sorgu: "Randevu Durumu Sor",
  randevu_degisiklik: "Randevu Değişikliği İste",
  adres_guncelle: "Adres Güncelle",
  telefon_guncelle: "Telefon Güncelle",
  musteri_bilgi: "Müşteri Bilgisi Gönder",
  sikayet: "Şikayet / Memnuniyetsizlik Bildir",
}

export const DURUM_ETIKETLERI: Record<BayiTalepDurum, string> = {
  alindi: "Alındı",
  inceleniyor: "İnceleniyor",
  planlandi: "Planlandı",
  atandi: "Atandı",
  yolda: "Yolda",
  tamamlandi: "Tamamlandı",
  ulasilamadi: "Ulaşılamadı",
  kapandi: "Kapandı",
  iptal: "İptal",
}

export const TALEP_MERKEZI_BUTONLARI: {
  tur: BayiTalepTuru
  aciklama: string
  sinif: string
}[] = [
  { tur: "montaj", aciklama: "Yeni montaj iş emri aç", sinif: "bg-blue-700 hover:bg-blue-800" },
  { tur: "ariza", aciklama: "Arızalı ürün kaydı oluştur", sinif: "bg-orange-700 hover:bg-orange-800" },
  { tur: "acil", aciklama: "Acil servis talebi gönder", sinif: "bg-red-700 hover:bg-red-800" },
  {
    tur: "tekrar_servis",
    aciklama: "Tekrar servis talebi oluştur",
    sinif: "bg-purple-700 hover:bg-purple-800",
  },
  {
    tur: "randevu_sorgu",
    aciklama: "Randevu durumunu sor",
    sinif: "bg-indigo-700 hover:bg-indigo-800",
  },
  {
    tur: "randevu_degisiklik",
    aciklama: "Randevu değişikliği iste",
    sinif: "bg-teal-700 hover:bg-teal-800",
  },
  {
    tur: "adres_guncelle",
    aciklama: "Müşteri adresini güncelle",
    sinif: "bg-slate-700 hover:bg-slate-800",
  },
  {
    tur: "telefon_guncelle",
    aciklama: "Telefon bilgisini güncelle",
    sinif: "bg-slate-600 hover:bg-slate-700",
  },
  {
    tur: "musteri_bilgi",
    aciklama: "Müşteri bilgisi paylaş",
    sinif: "bg-emerald-700 hover:bg-emerald-800",
  },
  {
    tur: "sikayet",
    aciklama: "Şikayet veya memnuniyetsizlik bildir",
    sinif: "bg-amber-700 hover:bg-amber-800",
  },
]

export function gecerliTalepTuru(value: string): value is BayiTalepTuru {
  return Object.prototype.hasOwnProperty.call(TALEP_TURU_ETIKETLERI, value)
}

export function slaHedefDk(tur: BayiTalepTuru) {
  if (tur === "acil") return 5
  if (tur === "montaj" || tur === "ariza" || tur === "tekrar_servis") return 15
  if (tur === "randevu_sorgu" || tur === "randevu_degisiklik") return 10
  if (tur === "sikayet") return 30
  return 60
}

export function talepOnceligi(tur: BayiTalepTuru): BayiTalepOncelik {
  if (tur === "acil") return "kritik"
  if (tur === "tekrar_servis" || tur === "sikayet") return "acil"
  return "normal"
}

export function sorumluDepartman(tur: BayiTalepTuru): BayiSorumluDepartman {
  if (tur === "sikayet") return "bayi_iliskileri"
  if (tur === "musteri_bilgi") return "operasyon"
  return "operasyon"
}

export function talepNoUret() {
  const now = new Date()
  const parca = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)
  const rastgele = Math.floor(Math.random() * 900 + 100)
  return `BT-${parca}-${rastgele}`
}

export function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function urunGerektirenTur(tur: BayiTalepTuru) {
  return ["montaj", "ariza", "acil", "tekrar_servis"].includes(tur)
}

export function adresGerektirenTur(tur: BayiTalepTuru) {
  return ["montaj", "ariza", "acil", "tekrar_servis", "adres_guncelle"].includes(tur)
}

export type RiskSeviyesi = "dusuk" | "orta" | "yuksek" | "kritik"

export function riskSeviyesiEtiketi(seviye: string) {
  const etiketler: Record<string, string> = {
    dusuk: "Düşük Risk",
    orta: "Orta Risk",
    yuksek: "Yüksek Risk",
    kritik: "Kritik Bayi",
  }
  return etiketler[seviye] || seviye
}

export function riskSeviyesiSinifi(seviye: string) {
  const siniflar: Record<string, string> = {
    dusuk: "border-emerald-300 bg-emerald-50 text-emerald-900",
    orta: "border-yellow-300 bg-yellow-50 text-yellow-900",
    yuksek: "border-orange-300 bg-orange-50 text-orange-900",
    kritik: "border-red-300 bg-red-50 text-red-900",
  }
  return siniflar[seviye] || siniflar.dusuk
}

export function riskSeviyesiFromSkor(skor: number): RiskSeviyesi {
  if (skor >= 75) return "kritik"
  if (skor >= 50) return "yuksek"
  if (skor >= 25) return "orta"
  return "dusuk"
}

const ACik_DURUMLAR = new Set([
  "alindi",
  "inceleniyor",
  "planlandi",
  "atandi",
  "yolda",
  "ulasilamadi",
])

export function talepAcikMi(durum: string) {
  return ACik_DURUMLAR.has(durum)
}

export function slaAsildiMi(talep: {
  created_at?: string | null
  sla_hedef_dk?: number | null
  durum: string
}) {
  if (!talepAcikMi(talep.durum)) return false
  if (!talep.created_at || !talep.sla_hedef_dk) return false
  const hedefMs = talep.sla_hedef_dk * 60 * 1000
  return Date.now() - new Date(talep.created_at).getTime() > hedefMs
}

export const BAYI_OCR_FORM_ALANLARI = [
  "musteri_adi",
  "telefon",
  "alternatif_telefon",
  "adres",
  "il",
  "ilce",
  "mahalle",
  "urun_turu",
  "model",
  "seri_no",
  "satis_tarihi",
  "aciklama",
] as const

export type BayiOcrFormAlani = (typeof BAYI_OCR_FORM_ALANLARI)[number]

export function ocrAlanlariFormaUygula<T extends Record<BayiOcrFormAlani, string>>(
  form: T,
  alanlar: Partial<Record<BayiOcrFormAlani, string | null>>,
  sadeceBos = true
): T {
  const sonuc = { ...form }

  for (const alan of BAYI_OCR_FORM_ALANLARI) {
    const deger = alanlar[alan]
    if (!deger?.trim()) continue
    if (sadeceBos && sonuc[alan]?.trim()) continue
    sonuc[alan] = deger.trim()
  }

  return sonuc
}

export function ocrGuvenEtiketi(skor: number) {
  if (skor >= 80) return "Yüksek güven"
  if (skor >= 50) return "Orta güven"
  if (skor > 0) return "Düşük güven"
  return "Analiz yok"
}

export const HIZLI_YANIT_SABLONLARI = [
  "Talebiniz inceleniyor, en kısa sürede dönüş yapılacaktır.",
  "Randevu planlandı. Detaylar kısa süre içinde paylaşılacaktır.",
  "Teknisyen atandı. Yola çıkınca bilgilendirileceksiniz.",
  "Müşteriye ulaşılamadı. Alternatif telefon paylaşabilir misiniz?",
  "İş tamamlandı. Ek bir talebiniz varsa iletebilirsiniz.",
] as const

export function mesajGonderenEtiketi(tip: string) {
  const etiketler: Record<string, string> = {
    bayi: "Bayi",
    personel: "Personel",
    sistem: "Sistem",
    ai: "AI",
  }
  return etiketler[tip] || tip
}

export function mesajGonderenSinifi(tip: string) {
  const siniflar: Record<string, string> = {
    bayi: "border-amber-200 bg-amber-50",
    personel: "border-emerald-200 bg-emerald-50",
    sistem: "border-blue-200 bg-blue-50",
    ai: "border-purple-200 bg-purple-50",
  }
  return siniflar[tip] || "border-slate-200 bg-slate-50"
}

const OPERASYONA_AKTARILABILIR_TURLER = new Set<BayiTalepTuru>([
  "montaj",
  "ariza",
  "acil",
  "tekrar_servis",
])

export function operasyonaAktarilabilirTur(tur: BayiTalepTuru) {
  return OPERASYONA_AKTARILABILIR_TURLER.has(tur)
}

export function talepTurundenIsTipi(tur: BayiTalepTuru) {
  if (tur === "montaj") return "MONTAJ"
  if (tur === "ariza" || tur === "tekrar_servis") return "MONTAJ"
  if (tur === "acil") return "MONTAJ"
  return "MONTAJ"
}

export function bayiOperasyonFisNo(talepNo: string | null, talepId: string) {
  const temel = (talepNo || talepId.slice(0, 8)).replace(/[^A-Za-z0-9-]/g, "")
  return `BAYI-${temel}`
}

export function bayiTelefonNormalize(value: unknown): string | null {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits) return null
  if (digits.startsWith("90") && digits.length === 12) return digits.slice(2)
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1)
  if (digits.length === 10) return digits
  return digits.length >= 10 ? digits.slice(-10) : null
}

export function slaUyariEtiketi(tip: string) {
  const etiketler: Record<string, string> = {
    sla_asildi: "SLA Aşıldı",
    acil_bekleyen: "Acil Bekleyen",
    kritik_bayi: "Kritik Bayi",
  }
  return etiketler[tip] || tip
}

export function whatsappMesajindanTalepTuru(mesaj: string): BayiTalepTuru {
  const m = mesaj.toLocaleLowerCase("tr-TR")
  if (m.includes("acil")) return "acil"
  if (m.includes("tekrar servis") || m.includes("defalarca")) return "tekrar_servis"
  if (m.includes("arıza") || m.includes("ariza") || m.includes("bozuk")) return "ariza"
  if (m.includes("montaj")) return "montaj"
  if (m.includes("ulaşam") || m.includes("ulasam")) return "musteri_bilgi"
  if (m.includes("randevu") && (m.includes("değiş") || m.includes("degis"))) return "randevu_degisiklik"
  if (m.includes("randevu")) return "randevu_sorgu"
  if (m.includes("adres")) return "adres_guncelle"
  if (m.includes("telefon")) return "telefon_guncelle"
  if (m.includes("şikayet") || m.includes("sikayet") || m.includes("memnuniyetsiz")) return "sikayet"
  return "montaj"
}

export const ZIYARET_TIPI_ETIKETLERI: Record<BayiZiyaretTipi, string> = {
  saha: "Saha Ziyareti",
  telefon: "Telefon Görüşmesi",
  magaza: "Mağaza Ziyareti",
  online: "Online Görüşme",
}

export function ziyaretBekliyorMu(bayi: { son_ziyaret_tarihi?: string | null; son_gorusme_tarihi?: string | null }) {
  const altmisGunOnce = new Date()
  altmisGunOnce.setDate(altmisGunOnce.getDate() - 60)

  const sonZiyaret = bayi.son_ziyaret_tarihi
    ? new Date(`${bayi.son_ziyaret_tarihi}T00:00:00`)
    : null
  const sonGorusme = bayi.son_gorusme_tarihi ? new Date(bayi.son_gorusme_tarihi) : null
  const tarih = sonZiyaret || sonGorusme
  return !tarih || tarih < altmisGunOnce
}

export function bilgilendirmeSablonu(
  durum: BayiTalepDurum,
  veri: { musteri?: string | null; talep_no?: string | null; fis_no?: string | null }
) {
  const musteri = veri.musteri?.trim() || "müşteriniz"
  const talepNo = veri.talep_no || "-"
  const fisNo = veri.fis_no ? ` Fiş: ${veri.fis_no}.` : ""

  const sablonlar: Partial<Record<BayiTalepDurum, string>> = {
    inceleniyor: `Sayın bayimiz, ${talepNo} numaralı talebiniz inceleniyor.`,
    planlandi: `Sayın bayimiz, ${musteri} için randevu planlandı. Talep no: ${talepNo}.${fisNo}`,
    atandi: `Sayın bayimiz, ${musteri} işine teknisyen atandı. Talep no: ${talepNo}.${fisNo}`,
    yolda: `Sayın bayimiz, teknisyen ${musteri} adresine yola çıktı. Talep no: ${talepNo}.`,
    tamamlandi: `Sayın bayimiz, ${musteri} işi tamamlandı. Talep no: ${talepNo}.`,
    ulasilamadi: `Sayın bayimiz, ${musteri} için ulaşılamadı. Alternatif telefon paylaşabilir misiniz? Talep no: ${talepNo}.`,
    kapandi: `Sayın bayimiz, ${talepNo} numaralı talep kapatıldı.`,
  }

  return sablonlar[durum] || null
}
