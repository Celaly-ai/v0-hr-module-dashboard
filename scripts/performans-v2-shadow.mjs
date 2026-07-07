#!/usr/bin/env node
/**
 * Performans Motoru V2 — Shadow Mode
 *
 * DB'ye yazmaz. normalize kayıtlardan V2 hesaplar, mevcut puan_sonuclari ile karşılaştırır.
 *
 * Kullanım:
 *   node scripts/performans-v2-shadow.mjs
 *   node scripts/performans-v2-shadow.mjs --yil=2026
 */

import { existsSync, readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

function envValue(name) {
  if (process.env[name]?.trim()) return process.env[name].trim()
  if (!existsSync(".env.local")) return ""
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/)
  const prefix = `${name}=`
  const line = lines.find((item) => item.startsWith(prefix))
  if (!line) return ""
  return line.slice(prefix.length).replace(/^["']|["']$/g, "").trim()
}

const supabaseUrl = envValue("NEXT_PUBLIC_SUPABASE_URL")
const serviceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY")

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Eksik ortam değişkeni: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.",
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const yilFiltre = (() => {
  const arg = process.argv.find((a) => a.startsWith("--yil="))
  if (!arg) return null
  const y = Number(arg.split("=")[1])
  return Number.isFinite(y) ? y : null
})()

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const VERI_TURLERI = ["nps", "randevu", "sikayet", "tamamlayici", "ek_garanti"]
const SUM_TURLERI = new Set(["sikayet", "tamamlayici", "ek_garanti"])
const AVG_TURLERI = new Set(["nps", "randevu"])

const AGIRLIKLAR_ARIZA = {
  sikayet: 0.2,
  nps: 0.1,
  randevu: 0.3,
  tamamlayici: 0.3,
  ek_garanti: 0.1,
}

const AGIRLIKLAR_NAKLIYE_MONTAJ = {
  sikayet: 0.4,
  nps: 0.2,
  randevu: 0.15,
  tamamlayici: 0.15,
  ek_garanti: 0.1,
}

const AGIRLIKLAR_GENEL = {
  sikayet: 0.3,
  nps: 0.15,
  randevu: 0.15,
  tamamlayici: 0.2,
  ek_garanti: 0.2,
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function clamp(value, min, max) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return Math.max(min, Math.min(max, value))
}

function referansOrtalamaSec(turkiye, bolge) {
  const tr = Number(turkiye || 0)
  const bg = Number(bolge || 0)
  if (tr > 0 && bg > 0) return Math.max(tr, bg)
  if (tr > 0) return tr
  if (bg > 0) return bg
  return null
}

function puan100(value) {
  return clamp(value, 0, 100)
}

function normalizeRol(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
}

function rolAgirliklariSec(rol) {
  const r = normalizeRol(rol)
  if (r === "ariza_teknisyeni" || r === "teknisyen") {
    return AGIRLIKLAR_ARIZA
  }
  if (r === "montaj_teknisyeni" || r === "nakliye" || r === "montaj") {
    return AGIRLIKLAR_NAKLIYE_MONTAJ
  }
  return AGIRLIKLAR_GENEL
}

function harfNotuHesapla(toplamPuan) {
  const puan = num(toplamPuan)
  if (puan === null) return "E"
  if (puan >= 90) return "A"
  if (puan >= 80) return "B"
  if (puan >= 70) return "C"
  if (puan >= 60) return "D"
  return "E"
}

function primHakkiHesapla(harfNotu) {
  return harfNotu === "A" || harfNotu === "B" || harfNotu === "C"
}

function primDurumuMetni(harfNotu) {
  return primHakkiHesapla(harfNotu) ? "Prim Hakki Var" : "Prim Hakki Yok"
}

function referansliPuan(deger, referans) {
  const d = Number(deger ?? 0)
  const ref = Number(referans ?? 0)
  if (ref <= 0) return d > 0 ? puan100(d) : null
  return puan100(100 + ((d - ref) / ref) * 100)
}

function sikayetPuanHesapla(teknisyenSikayet, toplamSikayet) {
  const toplam = Number(toplamSikayet || 0)
  const deger = Number(teknisyenSikayet || 0)
  if (toplam <= 0) return 100
  return puan100(100 - (deger / toplam) * 100)
}

function agirlikliToplam(puanlar, agirliklar) {
  let toplamAgirlik = 0
  let toplam = 0
  for (const [key, agirlik] of Object.entries(agirliklar)) {
    const value = puanlar[key]
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      toplamAgirlik += agirlik
      toplam += value * agirlik
    }
  }
  if (toplamAgirlik <= 0) return null
  return puan100(toplam / toplamAgirlik)
}

function ayAnahtari(yil, ay) {
  return `${yil}-${ay}`
}

function teknisyenAyAnahtari(yil, ay, teknisyenAnahtar) {
  return `${yil}-${ay}-${teknisyenAnahtar}`
}

function teknisyenKimlikKaynagi(row) {
  return (
    String(row.teknisyen_anahtar ?? "").trim() ||
    String(row.teknisyen_gorunen_ad ?? "").trim() ||
    String(row.teknisyen_ad_soyad ?? "").trim()
  )
}

function normalizeKimlikMetni(value) {
  let s = String(value ?? "").trim()
  if (!s) return ""

  s = s.toLocaleUpperCase("tr-TR")

  const turkceMap = {
    Ç: "C",
    Ğ: "G",
    İ: "I",
    I: "I",
    Ö: "O",
    Ş: "S",
    Ü: "U",
  }
  s = s.replace(/[ÇĞİIÖŞÜ]/g, (ch) => turkceMap[ch] || ch)
  s = s
    .replace(/ç/g, "C")
    .replace(/ğ/g, "G")
    .replace(/ı/g, "I")
    .replace(/i/g, "I")
    .replace(/ö/g, "O")
    .replace(/ş/g, "S")
    .replace(/ü/g, "U")

  s = s.normalize("NFD").replace(/\p{M}/gu, "")
  s = s.replace(/[^A-Z0-9\s]/g, " ")
  s = s.replace(/\s+/g, " ").trim()

  return s
}

function teknisyenAnahtarNormalize(row) {
  return normalizeKimlikMetni(teknisyenKimlikKaynagi(row))
}

function kayitKimligi(row) {
  const hamAnahtar = String(row.teknisyen_anahtar ?? "").trim()
  const gorunen = String(row.teknisyen_gorunen_ad ?? "").trim()
  const adSoyad = String(row.teknisyen_ad_soyad ?? "").trim()
  const normalizeAnahtar = teknisyenAnahtarNormalize(row)

  if (!normalizeAnahtar) return null

  return {
    normalize_anahtar: normalizeAnahtar,
    teknisyen_gorunen_ad: gorunen || adSoyad || hamAnahtar || normalizeAnahtar,
    ham_teknisyen_anahtar: hamAnahtar,
  }
}

function enIyiGorunenAd(mevcut, aday) {
  const a = String(mevcut ?? "").trim()
  const b = String(aday ?? "").trim()
  if (!a) return b
  if (!b) return a
  return b.length > a.length ? b : a
}

function levenshteinMesafe(a, b) {
  const rows = b.length + 1
  const cols = a.length + 1
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let i = 0; i < rows; i++) matrix[i][0] = i
  for (let j = 0; j < cols; j++) matrix[0][j] = j

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const maliyet = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + maliyet,
      )
    }
  }

  return matrix[rows - 1][cols - 1]
}

function adBenzerlikSkoru(a, b) {
  const na = normalizeKimlikMetni(a)
  const nb = normalizeKimlikMetni(b)
  if (!na || !nb) return 0
  if (na === nb) return 1

  const tokenA = na.split(" ").filter(Boolean)
  const tokenB = nb.split(" ").filter(Boolean)
  const setB = new Set(tokenB)
  let ortak = 0
  for (const token of tokenA) {
    if (setB.has(token)) ortak++
  }
  const tokenSkor = ortak / Math.max(tokenA.length, tokenB.length, 1)

  const dist = levenshteinMesafe(na, nb)
  const levSkor = 1 - dist / Math.max(na.length, nb.length, 1)

  return Math.max(tokenSkor, levSkor)
}

function enYakinRandevuAdaylari(npsKayit, randevuKayitlari, limit = 3) {
  return randevuKayitlari
    .map((randevu) => {
      const skor = adBenzerlikSkoru(
        npsKayit.teknisyen_gorunen_ad || npsKayit.normalize_anahtar,
        randevu.teknisyen_gorunen_ad || randevu.normalize_anahtar,
      )
      return {
        normalize_anahtar: randevu.normalize_anahtar,
        teknisyen_gorunen_ad: randevu.teknisyen_gorunen_ad,
        ham_anahtar: randevu.ham_teknisyen_anahtar,
        benzerlik: skor,
      }
    })
    .filter((item) => item.benzerlik >= 0.5)
    .sort((a, b) => b.benzerlik - a.benzerlik)
    .slice(0, limit)
}

function yuksekBenzerlikliAdaylar(npsKayit, randevuKayitlari) {
  return randevuKayitlari
    .map((randevu) => ({
      normalize_anahtar: randevu.normalize_anahtar,
      teknisyen_gorunen_ad: randevu.teknisyen_gorunen_ad,
      ham_teknisyen_anahtar: randevu.ham_teknisyen_anahtar,
      benzerlik: adBenzerlikSkoru(
        npsKayit.teknisyen_gorunen_ad || npsKayit.normalize_anahtar,
        randevu.teknisyen_gorunen_ad || randevu.normalize_anahtar,
      ),
    }))
    .filter((aday) => aday.benzerlik >= 0.9)
    .sort((a, b) => b.benzerlik - a.benzerlik)
}

function npsFuzzyEslestir(birlesikKayitlar) {
  const ayGruplari = new Map()

  for (const kayit of birlesikKayitlar) {
    const ayKey = ayAnahtari(kayit.yil, kayit.ay)
    if (!ayGruplari.has(ayKey)) ayGruplari.set(ayKey, [])
    ayGruplari.get(ayKey).push(kayit)
  }

  const otomatikBaglananlar = []
  const cokluAdayUyarilari = []

  for (const [ayKey, kayitlar] of ayGruplari) {
    const [yil, ay] = ayKey.split("-").map(Number)

    const randevuAnahtarlari = new Set(
      kayitlar
        .filter((k) => k.veri_turu === "randevu")
        .map((k) => k.normalize_anahtar || k.teknisyen_anahtar),
    )

    const randevuKayitlari = kayitlar
      .filter((k) => k.veri_turu === "randevu")
      .map((k) => ({
        normalize_anahtar: k.normalize_anahtar || k.teknisyen_anahtar,
        teknisyen_gorunen_ad: k.teknisyen_gorunen_ad,
        ham_teknisyen_anahtar: k.ham_teknisyen_anahtar ?? "",
      }))

    for (const kayit of kayitlar) {
      if (kayit.veri_turu !== "nps") continue

      const norm = kayit.normalize_anahtar || kayit.teknisyen_anahtar
      if (randevuAnahtarlari.has(norm)) continue

      const npsInfo = {
        normalize_anahtar: norm,
        teknisyen_gorunen_ad: kayit.teknisyen_gorunen_ad,
        ham_teknisyen_anahtar: kayit.ham_teknisyen_anahtar ?? "",
      }

      const adaylar = yuksekBenzerlikliAdaylar(npsInfo, randevuKayitlari)

      if (adaylar.length === 1) {
        const hedef = adaylar[0]
        otomatikBaglananlar.push({
          yil,
          ay,
          nps_ad: kayit.teknisyen_gorunen_ad,
          nps_normalize: norm,
          eslesen_ad: hedef.teknisyen_gorunen_ad,
          eslesen_normalize: hedef.normalize_anahtar,
          benzerlik: hedef.benzerlik,
        })
        kayit.teknisyen_anahtar = hedef.normalize_anahtar
        kayit.normalize_anahtar = hedef.normalize_anahtar
        kayit.teknisyen_gorunen_ad = enIyiGorunenAd(
          kayit.teknisyen_gorunen_ad,
          hedef.teknisyen_gorunen_ad,
        )
      } else if (adaylar.length > 1) {
        cokluAdayUyarilari.push({
          yil,
          ay,
          nps_ad: kayit.teknisyen_gorunen_ad,
          nps_normalize: norm,
          adaylar: adaylar.map((aday) => ({
            ad: aday.teknisyen_gorunen_ad,
            normalize: aday.normalize_anahtar,
            benzerlik: aday.benzerlik,
          })),
        })
      }
    }
  }

  otomatikBaglananlar.sort(
    (a, b) => a.yil - b.yil || a.ay - b.ay || a.nps_normalize.localeCompare(b.nps_normalize),
  )

  return { birlesik: birlesikKayitlar, otomatikBaglananlar, cokluAdayUyarilari }
}

function npsEslesmeyenleriBul(birlesikKayitlar, v2Aylik) {
  const ayGruplari = new Map()

  for (const kayit of birlesikKayitlar) {
    const ayKey = ayAnahtari(kayit.yil, kayit.ay)
    if (!ayGruplari.has(ayKey)) {
      ayGruplari.set(ayKey, { randevu: new Map(), nps: [] })
    }
    const grup = ayGruplari.get(ayKey)
    const norm = kayit.normalize_anahtar || kayit.teknisyen_anahtar

    if (kayit.veri_turu === "randevu") {
      grup.randevu.set(norm, {
        normalize_anahtar: norm,
        teknisyen_gorunen_ad: kayit.teknisyen_gorunen_ad,
        ham_teknisyen_anahtar: kayit.ham_teknisyen_anahtar ?? "",
      })
    }

    if (kayit.veri_turu === "nps") {
      grup.nps.push({
        normalize_anahtar: norm,
        teknisyen_gorunen_ad: kayit.teknisyen_gorunen_ad,
        ham_teknisyen_anahtar: kayit.ham_teknisyen_anahtar ?? "",
        nps_deger: kayit.teknisyen_deger,
      })
    }
  }

  const sonuc = []
  const eklenen = new Set()

  for (const [ayKey, grup] of ayGruplari) {
    const [yil, ay] = ayKey.split("-").map(Number)
    const randevuKayitlari = [...grup.randevu.values()]

    for (const nps of grup.nps) {
      const v2Key = teknisyenAyAnahtari(yil, ay, nps.normalize_anahtar)
      const v2Row = v2Aylik.get(v2Key)
      const randevudaVar = grup.randevu.has(nps.normalize_anahtar)
      const sonucaBaglandi =
        randevudaVar && v2Row && v2Row.nps_deger !== null && v2Row.nps_deger !== undefined

      if (sonucaBaglandi) continue

      const adaylar = enYakinRandevuAdaylari(nps, randevuKayitlari, 3)
      if (randevudaVar && adaylar.length === 0) continue

      const imza = `${yil}-${ay}-${nps.normalize_anahtar}`
      if (eklenen.has(imza)) continue
      eklenen.add(imza)

      sonuc.push({
        yil,
        ay,
        nps_teknisyen_gorunen_ad: nps.teknisyen_gorunen_ad,
        nps_teknisyen_anahtar: nps.ham_teknisyen_anahtar || nps.teknisyen_gorunen_ad,
        normalize_anahtar: nps.normalize_anahtar,
        nps_deger: nps.nps_deger,
        adaylar,
      })
    }
  }

  return sonuc.sort((a, b) => a.yil - b.yil || a.ay - b.ay || a.normalize_anahtar.localeCompare(b.normalize_anahtar))
}

function karsilastirmaAnahtari(row) {
  const norm = teknisyenAnahtarNormalize({
    teknisyen_anahtar: row.teknisyen_anahtar,
    teknisyen_gorunen_ad: row.teknisyen_gorunen_ad,
    teknisyen_ad_soyad: row.teknisyen_ad_soyad,
  })
  return teknisyenAyAnahtari(Number(row.yil), Number(row.ay), norm)
}

async function tumKayitlariCek(tablo, select = "*") {
  const pageSize = 1000
  let from = 0
  const sonuc = []

  while (true) {
    let query = supabase.from(tablo).select(select).range(from, from + pageSize - 1)

    if (yilFiltre !== null && tablo === "performans_normalize_kayitlar") {
      query = query.eq("yil", yilFiltre)
    }
    if (yilFiltre !== null && tablo === "performans_puan_sonuclari") {
      query = query.eq("yil", yilFiltre)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`${tablo} okunamadı: ${error.message}`)
    }

    const batch = data || []
    sonuc.push(...batch)

    if (batch.length < pageSize) break
    from += pageSize
  }

  return sonuc
}

async function teknisyenRolHaritasiOlustur() {
  const [personeller, eslestirmeler] = await Promise.all([
    tumKayitlariCek("personeller", "id, rol"),
    tumKayitlariCek(
      "performans_personel_eslestirmeleri",
      "teknisyen_anahtar, teknisyen_gorunen_ad, personel_id, durum",
    ),
  ])

  const personelRolMap = new Map()
  for (const personel of personeller) {
    if (personel?.id) {
      personelRolMap.set(personel.id, normalizeRol(personel.rol))
    }
  }

  const rolHaritasi = new Map()
  for (const eslestirme of eslestirmeler) {
    if (eslestirme?.durum !== "aktif") continue
    const anahtar = teknisyenAnahtarNormalize({
      teknisyen_anahtar: eslestirme.teknisyen_anahtar,
      teknisyen_gorunen_ad: eslestirme.teknisyen_gorunen_ad,
    })
    if (!anahtar) continue
    const rol = personelRolMap.get(eslestirme.personel_id)
    if (!rol) continue
    rolHaritasi.set(anahtar, rol)
  }

  return rolHaritasi
}

// ---------------------------------------------------------------------------
// Birleştirme (Kural 2)
// ---------------------------------------------------------------------------

function kayitlariBirlestir(hamKayitlar) {
  /** @type {Map<string, object>} */
  const map = new Map()

  for (const row of hamKayitlar) {
    if (row.durum !== "aktif") continue
    if (!VERI_TURLERI.includes(row.veri_turu)) continue

    const yil = Number(row.yil)
    const ay = Number(row.ay)
    const kimlik = kayitKimligi(row)
    if (!yil || !ay || !kimlik) continue

    const anahtar = kimlik.normalize_anahtar
    const key = `${yil}-${ay}-${anahtar}-${row.veri_turu}`
    const deger = num(row.teknisyen_degeri) ?? 0
    const servisToplam = num(row.servis_toplam)
    const referansOrtalama = num(row.referans_ortalama)
    const turkiyeOrtalama = num(row.turkiye_ortalama)
    const bolgeOrtalama = num(row.bolge_ortalama)

    const mevcut = map.get(key)

    if (!mevcut) {
      map.set(key, {
        yil,
        ay,
        teknisyen_anahtar: anahtar,
        normalize_anahtar: anahtar,
        ham_teknisyen_anahtar: kimlik.ham_teknisyen_anahtar,
        teknisyen_gorunen_ad: kimlik.teknisyen_gorunen_ad,
        veri_turu: row.veri_turu,
        teknisyen_deger: deger,
        _degerler: [deger],
        _servisToplamlari: servisToplam !== null ? [servisToplam] : [],
        referans_ortalama: referansOrtalama,
        turkiye_ortalama: turkiyeOrtalama,
        bolge_ortalama: bolgeOrtalama,
        kayit_sayisi: 1,
      })
      continue
    }

    mevcut._degerler.push(deger)
    if (servisToplam !== null) mevcut._servisToplamlari.push(servisToplam)
    mevcut.kayit_sayisi += 1

    if (referansOrtalama !== null) mevcut.referans_ortalama = referansOrtalama
    if (turkiyeOrtalama !== null) mevcut.turkiye_ortalama = turkiyeOrtalama
    if (bolgeOrtalama !== null) mevcut.bolge_ortalama = bolgeOrtalama
    mevcut.teknisyen_gorunen_ad = enIyiGorunenAd(
      mevcut.teknisyen_gorunen_ad,
      kimlik.teknisyen_gorunen_ad,
    )
  }

  for (const kayit of map.values()) {
    if (SUM_TURLERI.has(kayit.veri_turu)) {
      kayit.teknisyen_deger = kayit._degerler.reduce((s, v) => s + v, 0)
    } else if (AVG_TURLERI.has(kayit.veri_turu)) {
      const vals = kayit._degerler
      kayit.teknisyen_deger = vals.reduce((s, v) => s + v, 0) / vals.length
    }
    kayit.servis_toplam =
      kayit._servisToplamlari.length > 0
        ? Math.max(...kayit._servisToplamlari)
        : null
    delete kayit._degerler
    delete kayit._servisToplamlari
  }

  return Array.from(map.values())
}

// ---------------------------------------------------------------------------
// V2 hesaplama
// ---------------------------------------------------------------------------

function satisReferansHesapla(calismaSeti, birlesikMap, veriTuru) {
  if (calismaSeti.length === 0) return null
  let toplam = 0
  for (const teknisyenAnahtar of calismaSeti) {
    const key = `${teknisyenAnahtar}-${veriTuru}`
    const kayit = birlesikMap.get(key)
    const gercek = kayit ? num(kayit.teknisyen_deger) ?? 0 : 0
    toplam += Math.max(gercek, 1)
  }
  return toplam / calismaSeti.length
}

function satisPuanHesapla(gercekDeger, referans) {
  const gercek = num(gercekDeger) ?? 0
  const hesapDegeri = Math.max(gercek, 1)
  const ref = num(referans)
  if (ref === null || ref <= 0) return null
  return puan100(100 + ((hesapDegeri - ref) / ref) * 100)
}

function npsRandevuPuanHesapla(birlesikKayit) {
  if (!birlesikKayit) return { deger: null, referans: null, puan: null }

  const deger = num(birlesikKayit.teknisyen_deger)
  const referans =
    num(birlesikKayit.referans_ortalama) ??
    referansOrtalamaSec(birlesikKayit.turkiye_ortalama, birlesikKayit.bolge_ortalama)

  let puan = null
  if (referans !== null && referans > 0 && deger !== null) {
    puan = referansliPuan(deger, referans)
  } else if (deger !== null) {
    puan = puan100(deger)
  }

  return { deger, referans, puan }
}

function hesaplaV2Aylik(birlesikKayitlar, teknisyenRolMap = new Map()) {
  /** @type {Map<string, Map<string, object>>} yil-ay -> teknisyen -> veri_turu kayit */
  const ayHaritasi = new Map()

  for (const kayit of birlesikKayitlar) {
    const ayKey = ayAnahtari(kayit.yil, kayit.ay)
    if (!ayHaritasi.has(ayKey)) {
      ayHaritasi.set(ayKey, new Map())
    }
    const teknisyenMap = ayHaritasi.get(ayKey)
    if (!teknisyenMap.has(kayit.teknisyen_anahtar)) {
      teknisyenMap.set(kayit.teknisyen_anahtar, {
        yil: kayit.yil,
        ay: kayit.ay,
        teknisyen_anahtar: kayit.teknisyen_anahtar,
        teknisyen_gorunen_ad: kayit.teknisyen_gorunen_ad,
        veriler: new Map(),
      })
    }
    const teknisyen = teknisyenMap.get(kayit.teknisyen_anahtar)
    if (
      kayit.teknisyen_gorunen_ad &&
      kayit.teknisyen_gorunen_ad.length > (teknisyen.teknisyen_gorunen_ad?.length || 0)
    ) {
      teknisyen.teknisyen_gorunen_ad = kayit.teknisyen_gorunen_ad
    } else {
      teknisyen.teknisyen_gorunen_ad = enIyiGorunenAd(
        teknisyen.teknisyen_gorunen_ad,
        kayit.teknisyen_gorunen_ad,
      )
    }
    teknisyen.veriler.set(kayit.veri_turu, kayit)
  }

  /** @type {Map<string, object>} */
  const aylikSonuclar = new Map()

  for (const [ayKey, teknisyenMap] of ayHaritasi) {
    const [yil, ay] = ayKey.split("-").map(Number)

    const calisanTeknisyenler = []
    for (const [anahtar, teknisyen] of teknisyenMap) {
      if (teknisyen.veriler.has("randevu")) {
        calisanTeknisyenler.push(anahtar)
      }
    }

    if (calisanTeknisyenler.length === 0) continue

    let toplamSikayet = 0
    for (const anahtar of calisanTeknisyenler) {
      const sikayetKayit = teknisyenMap.get(anahtar).veriler.get("sikayet")
      if (sikayetKayit) {
        toplamSikayet += num(sikayetKayit.teknisyen_deger) ?? 0
      }
    }

    for (const anahtar of calisanTeknisyenler) {
      const teknisyen = teknisyenMap.get(anahtar)
      const veriler = teknisyen.veriler
      const agirliklar = rolAgirliklariSec(teknisyenRolMap.get(anahtar))

      const tamamlayiciReferans = satisReferansHesapla(
        calisanTeknisyenler,
        new Map(
          calisanTeknisyenler.map((k) => {
            const v = teknisyenMap.get(k).veriler.get("tamamlayici")
            return [`${k}-tamamlayici`, v]
          }),
        ),
        "tamamlayici",
      )

      const ekGarantiReferans = satisReferansHesapla(
        calisanTeknisyenler,
        new Map(
          calisanTeknisyenler.map((k) => {
            const v = teknisyenMap.get(k).veriler.get("ek_garanti")
            return [`${k}-ek_garanti`, v]
          }),
        ),
        "ek_garanti",
      )

      const nps = npsRandevuPuanHesapla(veriler.get("nps"))
      const randevu = npsRandevuPuanHesapla(veriler.get("randevu"))

      const sikayetKayit = veriler.get("sikayet")
      let sikayetDeger = null
      let sikayetPuan = null
      if (sikayetKayit) {
        sikayetDeger = num(sikayetKayit.teknisyen_deger) ?? 0
        sikayetPuan = sikayetPuanHesapla(sikayetDeger, toplamSikayet)
      }

      const tamamlayiciKayit = veriler.get("tamamlayici")
      let tamamlayiciGercek = null
      let tamamlayiciPuan = null
      if (tamamlayiciKayit) {
        tamamlayiciGercek = num(tamamlayiciKayit.teknisyen_deger)
        tamamlayiciPuan = satisPuanHesapla(tamamlayiciGercek ?? 0, tamamlayiciReferans)
      }

      const ekGarantiKayit = veriler.get("ek_garanti")
      let ekGarantiGercek = null
      let ekGarantiPuan = null
      if (ekGarantiKayit) {
        ekGarantiGercek = num(ekGarantiKayit.teknisyen_deger)
        ekGarantiPuan = satisPuanHesapla(ekGarantiGercek ?? 0, ekGarantiReferans)
      }

      const toplamPuan = agirlikliToplam(
        {
          nps: nps.puan,
          randevu: randevu.puan,
          sikayet: sikayetPuan,
          tamamlayici: tamamlayiciPuan,
          ek_garanti: ekGarantiPuan,
        },
        agirliklar,
      )

      const harfNotu = harfNotuHesapla(toplamPuan)
      const primHakki = primHakkiHesapla(harfNotu)

      const sonucKey = teknisyenAyAnahtari(yil, ay, anahtar)
      aylikSonuclar.set(sonucKey, {
        yil,
        ay,
        donem_tipi: "aylik",
        teknisyen_anahtar: anahtar,
        teknisyen_gorunen_ad: teknisyen.teknisyen_gorunen_ad,
        nps_deger: nps.deger,
        nps_referans: nps.referans,
        nps_puan: nps.puan,
        randevu_deger: randevu.deger,
        randevu_referans: randevu.referans,
        randevu_puan: randevu.puan,
        sikayet_deger: sikayetDeger,
        sikayet_servis_toplam: toplamSikayet,
        sikayet_puan: sikayetPuan,
        tamamlayici_deger: tamamlayiciGercek,
        tamamlayici_referans: tamamlayiciReferans,
        tamamlayici_puan: tamamlayiciPuan,
        ek_garanti_deger: ekGarantiGercek,
        ek_garanti_referans: ekGarantiReferans,
        ek_garanti_puan: ekGarantiPuan,
        toplam_puan: toplamPuan,
        harf_notu: harfNotu,
        prim_hakki: primHakki,
        prim_durumu: primDurumuMetni(harfNotu),
        agirliklar,
        motor: "v2-shadow",
      })
    }
  }

  return aylikSonuclar
}

/**
 * V2 yıllık kuralı:
 * - Yalnızca çalışılan ayların aylık toplam_puan değerlerinin aritmetik ortalaması
 * - Çalışılmayan ay yıllığa dahil edilmez (aylikSonuclar zaten randevu kapısından geçer)
 * - Hizmet/iş adedi ağırlıklı hesap V2.1'e bırakıldı
 */
function hesaplaV2Yillik(aylikSonuclar) {
  /** @type {Map<string, object[]>} */
  const teknisyenYilMap = new Map()

  for (const row of aylikSonuclar.values()) {
    const key = `${row.yil}-${row.teknisyen_anahtar}`
    if (!teknisyenYilMap.has(key)) teknisyenYilMap.set(key, [])
    teknisyenYilMap.get(key).push(row)
  }

  /** @type {Map<string, object>} */
  const yillikSonuclar = new Map()

  for (const [key, aylar] of teknisyenYilMap) {
    const dashIdx = key.indexOf("-")
    const yil = key.slice(0, dashIdx)
    const teknisyenAnahtar = key.slice(dashIdx + 1)
    const gorunenAd =
      aylar.find((a) => a.teknisyen_gorunen_ad)?.teknisyen_gorunen_ad || teknisyenAnahtar

    const aylikToplamPuanlar = aylar
      .map((r) => num(r.toplam_puan))
      .filter((v) => v !== null)

    const toplamPuan =
      aylikToplamPuanlar.length > 0
        ? puan100(
            aylikToplamPuanlar.reduce((s, v) => s + v, 0) / aylikToplamPuanlar.length,
          )
        : null

    const harfNotu = harfNotuHesapla(toplamPuan)
    const primHakki = primHakkiHesapla(harfNotu)

    yillikSonuclar.set(`${yil}-${teknisyenAnahtar}`, {
      yil: Number(yil),
      ay: null,
      donem_tipi: "yillik",
      teknisyen_anahtar: teknisyenAnahtar,
      teknisyen_gorunen_ad: gorunenAd,
      calisilan_ay_sayisi: aylar.length,
      toplam_puan: toplamPuan,
      harf_notu: harfNotu,
      prim_hakki: primHakki,
      prim_durumu: primDurumuMetni(harfNotu),
      motor: "v2-shadow",
    })
  }

  return yillikSonuclar
}

// ---------------------------------------------------------------------------
// Karşılaştırma
// ---------------------------------------------------------------------------

function puanFark(a, b) {
  const va = num(a)
  const vb = num(b)
  if (va === null && vb === null) return 0
  if (va === null || vb === null) return Infinity
  return Math.abs(va - vb)
}

function formatPuan(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "-"
  return Number(v).toFixed(2)
}

function formatDeger(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "-"
  return Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 2 })
}

function ortalama(values) {
  const vals = values.map((v) => num(v)).filter((v) => v !== null)
  if (vals.length === 0) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

function parametreFarklari(v1, v2) {
  return {
    nps_fark: puanFark(v2.nps_puan, v1.nps_puan),
    randevu_fark: puanFark(v2.randevu_puan, v1.randevu_puan),
    sikayet_fark: puanFark(v2.sikayet_puan, v1.sikayet_puan),
    tamamlayici_fark: puanFark(v2.tamamlayici_puan, v1.tamamlayici_puan),
    ek_garanti_fark: puanFark(v2.ek_garanti_puan, v1.ek_garanti_puan),
  }
}

function enBuyukParametreKaynagi(farklar) {
  const entries = Object.entries(farklar)
    .filter(([, v]) => Number.isFinite(v) && v > 0.01)
    .sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return "-"
  return entries.map(([k, v]) => `${k.replace("_fark", "")}=${formatPuan(v)}`).join(", ")
}

function karsilastir(v2Aylik, mevcutAylik) {
  const v2Keys = new Set(v2Aylik.keys())
  const v1Keys = new Set(mevcutAylik.keys())

  const ortakKeys = [...v2Keys].filter((k) => v1Keys.has(k))
  const sadeceV1 = [...v1Keys].filter((k) => !v2Keys.has(k))
  const sadeceV2 = [...v2Keys].filter((k) => !v1Keys.has(k))

  const toplamPuanFarkBuyuk = []
  const tamamlayiciFark = []
  const ekGarantiFark = []

  for (const key of ortakKeys) {
    const v2 = v2Aylik.get(key)
    const v1 = mevcutAylik.get(key)

    const tpFark = puanFark(v2.toplam_puan, v1.toplam_puan)
    if (tpFark > 5) {
      const pf = parametreFarklari(v1, v2)
      toplamPuanFarkBuyuk.push({
        key,
        teknisyen: v2.teknisyen_gorunen_ad,
        yil: v2.yil,
        ay: v2.ay,
        v1_toplam: v1.toplam_puan,
        v2_toplam: v2.toplam_puan,
        fark: tpFark,
        ...pf,
        ana_kaynak: enBuyukParametreKaynagi(pf),
      })
    }

    const tFark = puanFark(v2.tamamlayici_puan, v1.tamamlayici_puan)
    if (tFark > 0.01) {
      tamamlayiciFark.push({
        key,
        teknisyen: v2.teknisyen_gorunen_ad,
        yil: v2.yil,
        ay: v2.ay,
        v1: v1.tamamlayici_puan,
        v2: v2.tamamlayici_puan,
        v1_ref: v1.tamamlayici_referans,
        v2_ref: v2.tamamlayici_referans,
        fark: tFark,
      })
    }

    const eFark = puanFark(v2.ek_garanti_puan, v1.ek_garanti_puan)
    if (eFark > 0.01) {
      ekGarantiFark.push({
        key,
        teknisyen: v2.teknisyen_gorunen_ad,
        yil: v2.yil,
        ay: v2.ay,
        v1: v1.ek_garanti_puan,
        v2: v2.ek_garanti_puan,
        v1_ref: v1.ek_garanti_referans,
        v2_ref: v2.ek_garanti_referans,
        fark: eFark,
      })
    }
  }

  toplamPuanFarkBuyuk.sort((a, b) => b.fark - a.fark)
  tamamlayiciFark.sort((a, b) => b.fark - a.fark)
  ekGarantiFark.sort((a, b) => b.fark - a.fark)

  return {
    ortakSayisi: ortakKeys.length,
    toplamTeknisyenAy: ortakKeys.length,
    sadeceV1,
    sadeceV2,
    toplamPuanFarkBuyuk,
    tamamlayiciFark,
    ekGarantiFark,
  }
}

function satirYaz(label, rows, limit = 20) {
  console.log(`\n--- ${label} (${rows.length} adet) ---`)
  if (rows.length === 0) {
    console.log("  (yok)")
    return
  }
  for (const row of rows.slice(0, limit)) {
    if (row.key && row.nps_fark !== undefined) {
      console.log(
        `  ${row.yil}/${String(row.ay).padStart(2, "0")} | ${row.teknisyen} | toplam_fark=${formatPuan(row.fark)} (V1=${formatPuan(row.v1_toplam)} V2=${formatPuan(row.v2_toplam)})`,
      )
      console.log(
        `    nps=${formatPuan(row.nps_fark)} randevu=${formatPuan(row.randevu_fark)} sikayet=${formatPuan(row.sikayet_fark)} tamamlayici=${formatPuan(row.tamamlayici_fark)} ek_garanti=${formatPuan(row.ek_garanti_fark)} | ana: ${row.ana_kaynak}`,
      )
    } else if (row.key) {
      console.log(
        `  ${row.yil}/${String(row.ay).padStart(2, "0")} | ${row.teknisyen} | V1=${formatPuan(row.v1 ?? row.v1_toplam)} V2=${formatPuan(row.v2 ?? row.v2_toplam)} fark=${formatPuan(row.fark)}`,
      )
      if (row.v1_ref !== undefined) {
        console.log(
          `    ref: V1=${formatPuan(row.v1_ref)} V2=${formatPuan(row.v2_ref)}`,
        )
      }
    } else {
      console.log(`  ${row}`)
    }
  }
  if (rows.length > limit) {
    console.log(`  ... ve ${rows.length - limit} kayıt daha`)
  }
}

function yazV2OnlyDetay(sadeceV2Keys, v2Aylik) {
  console.log(`\n--- Yalnızca V2'de olan teknisyen-ay (detay) (${sadeceV2Keys.length} adet) ---`)
  if (sadeceV2Keys.length === 0) {
    console.log("  (yok)")
    return
  }

  const rows = sadeceV2Keys
    .map((k) => v2Aylik.get(k))
    .filter(Boolean)
    .sort((a, b) => a.yil - b.yil || a.ay - b.ay || a.teknisyen_gorunen_ad.localeCompare(b.teknisyen_gorunen_ad, "tr"))

  console.log(
    "  yil | ay | teknisyen | randevu | nps | sikayet | tamamlayici | ek_garanti | toplam_puan",
  )
  console.log("  " + "-".repeat(100))

  for (const r of rows) {
    console.log(
      `  ${r.yil} | ${String(r.ay).padStart(2, "0")} | ${r.teknisyen_gorunen_ad} | ${formatDeger(r.randevu_deger)} | ${formatDeger(r.nps_deger)} | ${formatDeger(r.sikayet_deger)} | ${formatDeger(r.tamamlayici_deger)} | ${formatDeger(r.ek_garanti_deger)} | ${formatPuan(r.toplam_puan)}`,
    )
  }
}

function aylikReferansKarsilastir(v2Aylik, mevcutAylik) {
  /** @type {Map<string, { yil: number, ay: number, v1_tam: number[], v1_ek: number[], v2_tam: number | null, v2_ek: number | null }>} */
  const ayMap = new Map()

  for (const row of mevcutAylik.values()) {
    const key = ayAnahtari(row.yil, row.ay)
    if (!ayMap.has(key)) {
      ayMap.set(key, {
        yil: Number(row.yil),
        ay: Number(row.ay),
        v1_tam: [],
        v1_ek: [],
        v2_tam: null,
        v2_ek: null,
      })
    }
    const bucket = ayMap.get(key)
    const tamRef = num(row.tamamlayici_referans)
    const ekRef = num(row.ek_garanti_referans)
    if (tamRef !== null) bucket.v1_tam.push(tamRef)
    if (ekRef !== null) bucket.v1_ek.push(ekRef)
  }

  for (const row of v2Aylik.values()) {
    const key = ayAnahtari(row.yil, row.ay)
    if (!ayMap.has(key)) {
      ayMap.set(key, {
        yil: Number(row.yil),
        ay: Number(row.ay),
        v1_tam: [],
        v1_ek: [],
        v2_tam: null,
        v2_ek: null,
      })
    }
    const bucket = ayMap.get(key)
    if (bucket.v2_tam === null) bucket.v2_tam = num(row.tamamlayici_referans)
    if (bucket.v2_ek === null) bucket.v2_ek = num(row.ek_garanti_referans)
  }

  return [...ayMap.values()]
    .map((b) => ({
      yil: b.yil,
      ay: b.ay,
      v1_tamamlayici_referans_ort: ortalama(b.v1_tam),
      v2_tamamlayici_referans: b.v2_tam,
      v1_ek_garanti_referans_ort: ortalama(b.v1_ek),
      v2_ek_garanti_referans: b.v2_ek,
    }))
    .sort((a, b) => a.yil - b.yil || a.ay - b.ay)
}

function yazAylikReferansKarsilastirma(rows) {
  console.log(`\n--- Aylık referans karşılaştırması (${rows.length} ay) ---`)
  if (rows.length === 0) {
    console.log("  (yok)")
    return
  }

  console.log(
    "  yil | ay | V1 tamamlayici_ref_ort | V2 tamamlayici_ref | V1 ek_garanti_ref_ort | V2 ek_garanti_ref",
  )
  console.log("  " + "-".repeat(95))

  for (const r of rows) {
    console.log(
      `  ${r.yil} | ${String(r.ay).padStart(2, "0")} | ${formatDeger(r.v1_tamamlayici_referans_ort)} | ${formatDeger(r.v2_tamamlayici_referans)} | ${formatDeger(r.v1_ek_garanti_referans_ort)} | ${formatDeger(r.v2_ek_garanti_referans)}`,
    )
  }
}

function yazNpsOtomatikBaglananlar(rows) {
  console.log(`\n--- NPS otomatik bağlananlar (${rows.length} adet) ---`)
  if (rows.length === 0) {
    console.log("  (yok)")
    return
  }

  console.log("  ay | nps_ad | nps_normalize | eslesen_ad | eslesen_normalize | benzerlik")
  console.log("  " + "-".repeat(95))

  for (const row of rows) {
    console.log(
      `  ${String(row.ay).padStart(2, "0")} | ${row.nps_ad} | ${row.nps_normalize} | ${row.eslesen_ad} | ${row.eslesen_normalize} | ${formatPuan(row.benzerlik)}`,
    )
  }
}

function yazNpsCokluAdayUyarilari(rows) {
  console.log(`\n--- NPS çoklu aday uyarısı (>=0.90, otomatik bağlanmadı) (${rows.length} adet) ---`)
  if (rows.length === 0) {
    console.log("  (yok)")
    return
  }

  for (const row of rows) {
    console.log(
      `  ${row.yil}/${String(row.ay).padStart(2, "0")} | ${row.nps_ad} | normalize=${row.nps_normalize}`,
    )
    for (const aday of row.adaylar) {
      console.log(
        `    aday: ${aday.ad} | ${aday.normalize} | benzerlik=${formatPuan(aday.benzerlik)}`,
      )
    }
  }
}

function yazNpsEslesmeyenler(rows) {
  console.log(`\n--- NPS eşleşmeyenler (${rows.length} adet) ---`)
  if (rows.length === 0) {
    console.log("  (yok)")
    return
  }

  for (const row of rows) {
    console.log(
      `  ${row.yil}/${String(row.ay).padStart(2, "0")} | ${row.nps_teknisyen_gorunen_ad} | ham=${row.nps_teknisyen_anahtar} | normalize=${row.normalize_anahtar} | nps=${formatDeger(row.nps_deger)}`,
    )
    if (row.adaylar.length === 0) {
      console.log("    aday: (randevu çalışan eşleşmesi yok)")
    } else {
      for (const aday of row.adaylar) {
        console.log(
          `    aday: ${aday.teknisyen_gorunen_ad} | normalize=${aday.normalize_anahtar} | benzerlik=${formatPuan(aday.benzerlik)}`,
        )
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("Performans Motoru V2 — Shadow Mode")
console.log("===================================")
console.log("Mod: READ-ONLY (INSERT/UPDATE/DELETE yok)")
if (yilFiltre) console.log(`Yıl filtresi: ${yilFiltre}`)
console.log("")

const hamNormalize = await tumKayitlariCek("performans_normalize_kayitlar")
console.log(`Normalize ham kayıt: ${hamNormalize.length}`)

const aktifNormalize = hamNormalize.filter((r) => r.durum === "aktif")
console.log(`Aktif normalize kayıt: ${aktifNormalize.length}`)

const birlesikHam = kayitlariBirlestir(aktifNormalize)
const {
  birlesik,
  otomatikBaglananlar,
  cokluAdayUyarilari,
} = npsFuzzyEslestir(birlesikHam)
console.log(`Birleştirilmiş kayıt: ${birlesik.length}`)
console.log(`NPS otomatik fuzzy eşleşme: ${otomatikBaglananlar.length}`)

const teknisyenRolMap = await teknisyenRolHaritasiOlustur()
console.log(`Teknisyen rol eşleşmesi: ${teknisyenRolMap.size}`)

const v2Aylik = hesaplaV2Aylik(birlesik, teknisyenRolMap)
console.log(`V2 aylık sonuç: ${v2Aylik.size}`)

const v2Yillik = hesaplaV2Yillik(v2Aylik)
console.log(`V2 yıllık sonuç: ${v2Yillik.size}`)

const mevcutHam = await tumKayitlariCek("performans_puan_sonuclari")
const mevcutAylik = new Map()

for (const row of mevcutHam) {
  if (row.donem_tipi !== "aylik") continue
  const norm = teknisyenAnahtarNormalize(row)
  if (!norm) continue
  mevcutAylik.set(karsilastirmaAnahtari(row), row)
}

console.log(`Mevcut aylık sonuç (DB): ${mevcutAylik.size}`)

const rapor = karsilastir(v2Aylik, mevcutAylik)

console.log("\n========== KARŞILAŞTIRMA ÖZETİ ==========")
console.log(`Ortak teknisyen-ay sayısı: ${rapor.ortakSayisi}`)
console.log(`Toplam puan farkı > 5: ${rapor.toplamPuanFarkBuyuk.length}`)
console.log(`Tamamlayıcı puan farkı olan: ${rapor.tamamlayiciFark.length}`)
console.log(`Ek garanti puan farkı olan: ${rapor.ekGarantiFark.length}`)
console.log(`Yalnızca V1/mevcut (V2'de yok): ${rapor.sadeceV1.length}`)
console.log(`Yalnızca V2 (mevcut'ta yok): ${rapor.sadeceV2.length}`)

satirYaz("Toplam puan farkı > 5", rapor.toplamPuanFarkBuyuk)
satirYaz("Tamamlayıcı puan farkları", rapor.tamamlayiciFark)
satirYaz("Ek garanti puan farkları", rapor.ekGarantiFark)

yazV2OnlyDetay(rapor.sadeceV2, v2Aylik)

const referansKarsilastirma = aylikReferansKarsilastir(v2Aylik, mevcutAylik)
yazAylikReferansKarsilastirma(referansKarsilastirma)

const npsEslesmeyenler = npsEslesmeyenleriBul(birlesik, v2Aylik)
yazNpsOtomatikBaglananlar(otomatikBaglananlar)
yazNpsCokluAdayUyarilari(cokluAdayUyarilari)
yazNpsEslesmeyenler(npsEslesmeyenler)

satirYaz(
  "V1'de olup V2'de olmayan teknisyen-ay",
  rapor.sadeceV1.map((k) => {
    const v1 = mevcutAylik.get(k)
    return `${k} | ${v1?.teknisyen_gorunen_ad || "-"} | toplam=${formatPuan(v1?.toplam_puan)}`
  }),
)

satirYaz(
  "V2'de olup V1'de olmayan teknisyen-ay (özet)",
  rapor.sadeceV2.map((k) => {
    const v2 = v2Aylik.get(k)
    return `${k} | ${v2?.teknisyen_gorunen_ad || "-"} | toplam=${formatPuan(v2?.toplam_puan)}`
  }),
)

console.log("\nShadow mode tamamlandı. Veritabanına yazılmadı.")
process.exit(0)
