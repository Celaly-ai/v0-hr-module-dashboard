export type HavuzIs = {
  id: string
  fis_no: string | null
  basvuru_nedeni: string | null
  operasyon_durumu: string | null
  operasyon_asamasi: string | null
  musteri_adi: string | null
  telefon: string | null
  il: string | null
  ilce: string | null
  mahalle: string | null
  adres: string | null
  urun_adi: string | null
  urun_model_kodu: string | null
  seri_no: string | null
  marka: string | null
  is_tipi: string | null
  randevu_tarihi: string | null
  zaman_slotu: string | null
  randevu_blok: string | null
  basvuru_notu: string | null
  atama_gerekli: boolean | null
  kritik_cagri: boolean | null
  enlem: number | string | null
  boylam: number | string | null
  koordinat_durumu: string | null
  kat_bilgisi: string | null
  referans_sure_dk: number | null
  kaynak: string | null
  toplam_is_zorluk_puani: number | null
  acik_gun: number | null
  gerekli_yetenek: string | null
  gerekli_arac_sinifi: string | null
  ai_oneri_1_ekip_id: string | null
  ai_oneri_1_ekip_adi: string | null
  ai_oneri_1_skor: number | null
  ai_oneri_2_ekip_id: string | null
  ai_oneri_2_ekip_adi: string | null
  ai_oneri_2_skor: number | null
  ai_oneri_3_ekip_id: string | null
  ai_oneri_3_ekip_adi: string | null
  ai_oneri_3_skor: number | null
  ai_onerilen_ekip: string | null
  ai_onerilen_ekip_adi: string | null
  ai_atama_skoru: number | null
}

export type EkipOneri = {
  ekip_id: string
  ekip_adi: string
  skor: number
  sira: number
}

export type VeriKaliteSorunu = {
  kod: string
  mesaj: string
}

export type AdresHafizaOzet = {
  asansor_durumu: string | null
  park_durumu: string | null
  tasima_zorlugu: string | null
  personel_notu: string | null
}

export type AtamaMerkeziKpi = {
  toplamAktif: number
  atamaBekleyen: number
  basvuru: number
  teknisyende: number
  randevulu: number
  malzemeTemin: number
  serviseGelmesiBekleniyor: number
  hataliKayit: number
  eksikVeri: number
  hataliFisNolari: string[]
}

export const HAVUZ_IS_SELECT = `
  id,
  fis_no,
  basvuru_nedeni,
  operasyon_durumu,
  operasyon_asamasi,
  musteri_adi,
  telefon,
  il,
  ilce,
  mahalle,
  adres,
  urun_adi,
  urun_model_kodu,
  seri_no,
  marka,
  is_tipi,
  randevu_tarihi,
  zaman_slotu,
  randevu_blok,
  basvuru_notu,
  atama_gerekli,
  kritik_cagri,
  enlem,
  boylam,
  koordinat_durumu,
  kat_bilgisi,
  referans_sure_dk,
  kaynak,
  toplam_is_zorluk_puani,
  acik_gun,
  gerekli_yetenek,
  gerekli_arac_sinifi,
  ai_oneri_1_ekip_id,
  ai_oneri_1_ekip_adi,
  ai_oneri_1_skor,
  ai_oneri_2_ekip_id,
  ai_oneri_2_ekip_adi,
  ai_oneri_2_skor,
  ai_oneri_3_ekip_id,
  ai_oneri_3_ekip_adi,
  ai_oneri_3_skor,
  ai_onerilen_ekip,
  ai_onerilen_ekip_adi,
  ai_atama_skoru
`

function normMetin(v: string | null | undefined) {
  return String(v ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
}

export function aronKaynakMi(kaynak: string | null | undefined) {
  const k = normMetin(kaynak)
  return !k || k === "aron"
}

export function isTipiKisa(v: string | null) {
  const t = (v ?? "").toUpperCase()
  const nakliye = t.includes("NAKLIYE") || t.includes("NAKLİYE")
  const montaj = t.includes("MONTAJ")
  if (nakliye && montaj) return "NM"
  if (nakliye) return "N"
  if (montaj) return "M"
  return v ?? "-"
}

export function randevuMetni(is: HavuzIs) {
  if (is.randevu_blok) return is.randevu_blok
  if (is.zaman_slotu) return is.zaman_slotu
  if (!is.randevu_tarihi) return "-"
  return new Date(is.randevu_tarihi).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function durumEtiketi(is: HavuzIs) {
  const neden = normMetin(is.basvuru_nedeni)
  if (neden.includes("servise gelmesi bekleniyor")) return "Servise Gelmesi Bekleniyor"
  if (neden.includes("malzeme temin")) return "Malzeme Temin Edildi"
  if (neden.includes("randevu")) return "Randevu Verildi"
  if (is.atama_gerekli) return "Atama Bekliyor"
  if (normMetin(is.operasyon_durumu).includes("atanmis")) return "Teknisyende"
  return is.basvuru_nedeni || is.operasyon_durumu || is.operasyon_asamasi || "-"
}

export function ekipOnerileri(is: HavuzIs): EkipOneri[] {
  const adaylar: EkipOneri[] = []

  const slotlar = [
    {
      ekip_id: is.ai_oneri_1_ekip_id,
      ekip_adi: is.ai_oneri_1_ekip_adi,
      skor: is.ai_oneri_1_skor,
      sira: 1,
    },
    {
      ekip_id: is.ai_oneri_2_ekip_id,
      ekip_adi: is.ai_oneri_2_ekip_adi,
      skor: is.ai_oneri_2_skor,
      sira: 2,
    },
    {
      ekip_id: is.ai_oneri_3_ekip_id,
      ekip_adi: is.ai_oneri_3_ekip_adi,
      skor: is.ai_oneri_3_skor,
      sira: 3,
    },
  ]

  for (const slot of slotlar) {
    if (slot.ekip_id && slot.ekip_adi) {
      adaylar.push({
        ekip_id: slot.ekip_id,
        ekip_adi: slot.ekip_adi,
        skor: Number(slot.skor ?? 0),
        sira: slot.sira,
      })
    }
  }

  if (adaylar.length === 0 && is.ai_onerilen_ekip && is.ai_onerilen_ekip_adi) {
    adaylar.push({
      ekip_id: is.ai_onerilen_ekip,
      ekip_adi: is.ai_onerilen_ekip_adi,
      skor: Number(is.ai_atama_skoru ?? 0),
      sira: 1,
    })
  }

  const benzersiz = new Map<string, EkipOneri>()
  for (const aday of adaylar) {
    if (!benzersiz.has(aday.ekip_id)) {
      benzersiz.set(aday.ekip_id, aday)
    }
  }

  return Array.from(benzersiz.values()).sort((a, b) => a.sira - b.sira)
}

export function oneriGerekce(is: HavuzIs, oneri: EkipOneri | undefined) {
  if (!oneri) return "Henüz ekip önerisi üretilmedi."
  const parcalar = [
    `Skor: ${oneri.skor}`,
    is.ilce ? `Bölge: ${is.ilce}` : null,
    is.kritik_cagri ? "Kritik çağrı" : null,
    is.referans_sure_dk ? `Ref. süre: ${is.referans_sure_dk} dk` : null,
  ].filter(Boolean)
  return parcalar.join(" · ") || "Kapasite ve görev uyumuna göre önerildi."
}

export function veriKaliteKontrol(is: HavuzIs): VeriKaliteSorunu[] {
  const sorunlar: VeriKaliteSorunu[] = []

  if (!String(is.adres ?? "").trim() && !String(is.mahalle ?? "").trim()) {
    sorunlar.push({ kod: "adres", mesaj: "Adres eksik" })
  }
  if (!String(is.telefon ?? "").trim()) {
    sorunlar.push({ kod: "telefon", mesaj: "Telefon eksik" })
  }
  if (!String(is.urun_adi ?? "").trim()) {
    sorunlar.push({ kod: "urun", mesaj: "Ürün bilgisi eksik" })
  }
  if (!String(is.seri_no ?? "").trim()) {
    sorunlar.push({ kod: "seri", mesaj: "Seri no eksik" })
  }
  const enlem = Number(is.enlem)
  const boylam = Number(is.boylam)
  if (!Number.isFinite(enlem) || !Number.isFinite(boylam) || (enlem === 0 && boylam === 0)) {
    sorunlar.push({ kod: "koordinat", mesaj: "Koordinat eksik" })
  }
  if (!is.atama_gerekli && !normMetin(is.operasyon_durumu)) {
    sorunlar.push({ kod: "durum", mesaj: "Operasyon durumu belirsiz" })
  }

  return sorunlar
}

export function kpiHesapla(isler: HavuzIs[]): AtamaMerkeziKpi {
  const hataliFisNolari: string[] = []

  let atamaBekleyen = 0
  let basvuru = 0
  let teknisyende = 0
  let randevulu = 0
  let malzemeTemin = 0
  let serviseGelmesiBekleniyor = 0
  let hataliKayit = 0
  let eksikVeri = 0

  for (const is of isler) {
    const neden = normMetin(is.basvuru_nedeni)
    const sorunlar = veriKaliteKontrol(is)

    if (sorunlar.length > 0) {
      eksikVeri += 1
      if (is.fis_no) hataliFisNolari.push(is.fis_no)
    }

    if (is.atama_gerekli) atamaBekleyen += 1

    if (neden.includes("başvuru") || neden === "basvuru") basvuru += 1
    if (normMetin(is.operasyon_durumu).includes("atanmis") && !is.atama_gerekli) {
      teknisyende += 1
    }
    if (neden.includes("randevu")) randevulu += 1
    if (neden.includes("malzeme temin")) malzemeTemin += 1
    if (neden.includes("servise gelmesi bekleniyor")) serviseGelmesiBekleniyor += 1

    if (!is.fis_no || !is.musteri_adi) {
      hataliKayit += 1
      if (is.fis_no) hataliFisNolari.push(is.fis_no)
    }
  }

  return {
    toplamAktif: isler.length,
    atamaBekleyen,
    basvuru,
    teknisyende,
    randevulu,
    malzemeTemin,
    serviseGelmesiBekleniyor,
    hataliKayit,
    eksikVeri,
    hataliFisNolari: Array.from(new Set(hataliFisNolari)).slice(0, 20),
  }
}

export function ekipSecimDegeri(ekipId: string, ekipAdi: string, skor: number) {
  return `${ekipId}|${ekipAdi}|${skor}`
}

export function adresHafizaAnahtar(ilce: string | null, mahalle: string | null) {
  return `${normMetin(ilce)}|${normMetin(mahalle)}`
}
