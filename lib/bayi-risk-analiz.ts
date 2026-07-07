import type { BayiMuhasebeOzet } from "@/lib/bayi-muhasebe-karlilik"
import {
  operasyonaAktarilabilirTur,
  riskSeviyesiFromSkor,
  slaAsildiMi,
  talepAcikMi,
  ziyaretBekliyorMu,
} from "@/lib/bayi-operasyon-utils"
import type { BayiKart, BayiTalep } from "@/lib/types/bayi-operasyon"

export type BayiRiskFaktor = {
  kod: string
  etiket: string
  puan: number
  aciklama: string
}

export type BayiMetricsAnaliz = {
  risk_skoru: number
  risk_seviyesi: string
  performans_puani: number
  sadakat_skoru: number
  karlilik_skoru: number
  aylik_is_hacmi: number
  risk_faktorleri: BayiRiskFaktor[]
  karlilik_notu: string
  onerilen_aksiyonlar: string[]
  muhasebe: BayiMuhasebeOzet | null
}

function sonOtuzGun() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d
}

/** V2 risk + karlılık proxy motoru */
export function analyzeBayiMetrics(
  bayi: Pick<BayiKart, "son_ziyaret_tarihi" | "son_gorusme_tarihi">,
  talepler: BayiTalep[],
  muhasebe: BayiMuhasebeOzet | null = null
): BayiMetricsAnaliz {
  const otuzGunOnce = sonOtuzGun()
  const son30 = talepler.filter((t) => t.created_at && new Date(t.created_at) >= otuzGunOnce)
  const toplam30 = son30.length || 1

  const gecikenSayi = son30.filter((t) => slaAsildiMi(t) || t.sla_asildi_mi).length
  const gecikenOran = gecikenSayi / toplam30
  const tekrarSayi = son30.filter((t) => t.talep_turu === "tekrar_servis").length
  const tekrarOran = tekrarSayi / toplam30
  const acikAcil = talepler.filter(
    (t) =>
      talepAcikMi(t.durum) &&
      (t.oncelik === "acil" || t.oncelik === "kritik" || t.talep_turu === "acil")
  ).length
  const sikayet30 = son30.filter((t) => t.talep_turu === "sikayet").length
  const acikSikayet = talepler.filter(
    (t) => t.talep_turu === "sikayet" && talepAcikMi(t.durum)
  ).length
  const operasyonBekleyen = talepler.filter(
    (t) =>
      operasyonaAktarilabilirTur(t.talep_turu) &&
      talepAcikMi(t.durum) &&
      !t.operasyon_aktarildi_mi
  ).length

  const faktorler: BayiRiskFaktor[] = []

  if (gecikenOran > 0.2) {
    faktorler.push({
      kod: "sla_gecikme",
      etiket: "SLA Gecikmesi",
      puan: 25,
      aciklama: `Son 30 günde işlerin %${Math.round(gecikenOran * 100)}'i SLA aştı.`,
    })
  }

  if (tekrarOran > 0.15) {
    faktorler.push({
      kod: "tekrar_servis",
      etiket: "Tekrar Servis",
      puan: 25,
      aciklama: `Tekrar servis oranı %${Math.round(tekrarOran * 100)}.`,
    })
  }

  if (acikAcil > 3) {
    faktorler.push({
      kod: "acil_yogunluk",
      etiket: "Acil Yoğunluk",
      puan: 20,
      aciklama: `${acikAcil} açık acil/kritik talep var.`,
    })
  }

  if (ziyaretBekliyorMu(bayi)) {
    faktorler.push({
      kod: "ziyaret_eksik",
      etiket: "Ziyaret Eksik",
      puan: 15,
      aciklama: "60 günden uzun süredir saha ziyareti/görüşme yok.",
    })
  }

  if (sikayet30 > 2) {
    faktorler.push({
      kod: "sikayet_artisi",
      etiket: "Şikayet Artışı",
      puan: 15,
      aciklama: `Son 30 günde ${sikayet30} şikayet kaydı.`,
    })
  }

  if (acikSikayet > 0) {
    faktorler.push({
      kod: "acik_sikayet",
      etiket: "Açık Şikayet",
      puan: Math.min(20, acikSikayet * 10),
      aciklama: `${acikSikayet} açık şikayet bekliyor.`,
    })
  }

  if (operasyonBekleyen > 2) {
    faktorler.push({
      kod: "operasyon_bekleyen",
      etiket: "Operasyon Bekleyen",
      puan: 10,
      aciklama: `${operasyonBekleyen} talep operasyona aktarılmamış.`,
    })
  }

  const risk = Math.min(100, faktorler.reduce((toplam, f) => toplam + f.puan, 0))

  const tamamlanan = talepler.filter(
    (t) => t.durum === "tamamlandi" || t.durum === "kapandi"
  ).length
  const performansHam =
    talepler.length > 0 ? Math.round((tamamlanan / talepler.length) * 100) : 70
  const performans = Math.max(0, Math.min(100, performansHam - sikayet30 * 5))
  const sadakat = Math.max(0, Math.min(100, 100 - risk))

  const tamamlanmaOrani = talepler.length > 0 ? tamamlanan / talepler.length : 0.7
  let karlilik = 50
  karlilik += Math.min(20, son30.length * 2)
  karlilik += Math.round(tamamlanmaOrani * 30)
  karlilik -= sikayet30 * 5
  karlilik -= tekrarSayi * 8
  karlilik -= gecikenSayi * 3
  karlilik = Math.max(0, Math.min(100, karlilik))

  if (muhasebe?.cari_bagli) {
    karlilik = Math.round(karlilik * 0.4 + muhasebe.karlilik_skoru * 0.6)
  }

  let karlilik_notu = muhasebe?.not || "Orta karlılık profili."
  if (!muhasebe?.cari_bagli) {
    if (karlilik >= 75) karlilik_notu = "Yüksek hacim ve düşük şikayet — stratejik bayi."
    else if (karlilik >= 55) karlilik_notu = "Dengeli bayi — hacim korunmalı, şikayetler izlenmeli."
    else if (karlilik < 40) karlilik_notu = "Düşük karlılık riski — tekrar servis ve gecikmeler yüksek."
  }

  const onerilen_aksiyonlar: string[] = []
  if (ziyaretBekliyorMu(bayi)) {
    onerilen_aksiyonlar.push("Ziyaret Merkezi'nden saha ziyareti planlayın.")
  }
  if (acikSikayet > 0) {
    onerilen_aksiyonlar.push("Açık şikayet taleplerini önceliklendirip kapatın.")
  }
  if (operasyonBekleyen > 0) {
    onerilen_aksiyonlar.push(`${operasyonBekleyen} talebi operasyon havuzuna aktarın.`)
  }
  if (gecikenSayi > 0) {
    onerilen_aksiyonlar.push("SLA aşan talepler için yönetim panelinden durum güncelleyin.")
  }
  if (muhasebe?.acik_fatura_tutar && muhasebe.acik_fatura_tutar > 0) {
    onerilen_aksiyonlar.push("Açık fatura bakiyesi için muhasebe ile tahsilat planı oluştur.")
  }
  if (onerilen_aksiyonlar.length === 0) {
    onerilen_aksiyonlar.push("Mevcut performans iyi — düzenli ziyaret ve iletişim sürdürün.")
  }

  return {
    risk_skoru: risk,
    risk_seviyesi: riskSeviyesiFromSkor(risk),
    performans_puani: performans,
    sadakat_skoru: sadakat,
    karlilik_skoru: karlilik,
    aylik_is_hacmi: son30.length,
    risk_faktorleri: faktorler,
    karlilik_notu,
    onerilen_aksiyonlar,
    muhasebe,
  }
}
