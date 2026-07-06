#!/usr/bin/env node
/**
 * Performans Motoru V2 — Yeniden Hesaplama
 *
 * Varsayılan: dry-run (DB'ye yazmaz)
 *
 * Kullanım:
 *   node scripts/performans-v2-yeniden-hesapla.mjs --yil=2026
 *   node scripts/performans-v2-yeniden-hesapla.mjs --yil=2026 --write
 *
 * --write modu:
 *   1. Seçilen yılın mevcut performans_puan_sonuclari kayıtlarını yedekler
 *   2. Seçilen yıl kayıtlarını siler
 *   3. V2 aylık + yıllık sonuçları yazar
 *
 * Yedek tablo: performans_puan_sonuclari_backup_v2
 * (backup_id, backup_tarihi, backup_nedeni, yil, orijinal_kayit)
 */

import { randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

// ---------------------------------------------------------------------------
// Argümanlar
// ---------------------------------------------------------------------------

const yilArg = process.argv.find((a) => a.startsWith("--yil="))
const yil = yilArg ? Number(yilArg.split("=")[1]) : null
const writeMode = process.argv.includes("--write")

if (!Number.isFinite(yil) || yil <= 0) {
  console.error("Zorunlu parametre: --yil=YYYY (ör. --yil=2026)")
  process.exit(1)
}

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

const BACKUP_TABLO = "performans_puan_sonuclari_backup_v2"
const SONUC_TABLO = "performans_puan_sonuclari"
const MOTOR_VERSIYON = "2.0"

// ---------------------------------------------------------------------------
// V2 motor (performans-v2-shadow.mjs ile aynı mantık)
// ---------------------------------------------------------------------------

const VERI_TURLERI = ["nps", "randevu", "sikayet", "tamamlayici", "ek_garanti"]
const SUM_TURLERI = new Set(["sikayet", "tamamlayici", "ek_garanti"])
const AVG_TURLERI = new Set(["nps", "randevu"])

const AGIRLIKLAR = {
  nps: 0.2,
  randevu: 0.2,
  sikayet: 0.2,
  tamamlayici: 0.2,
  ek_garanti: 0.2,
}

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

function referansliPuan(deger, referans) {
  const d = Number(deger ?? 0)
  const ref = Number(referans ?? 0)
  if (ref <= 0) return d > 0 ? clamp(d, 0, 150) : null
  return clamp(100 + ((d - ref) / ref) * 100, 0, 150)
}

function sikayetPuanHesapla(teknisyenSikayet, servisToplam) {
  const toplam = Number(servisToplam || 0)
  const deger = Number(teknisyenSikayet || 0)
  if (toplam <= 0) return 100
  return clamp(100 - (deger / toplam) * 100, 0, 100)
}

function agirlikliToplam(puanlar) {
  let toplamAgirlik = 0
  let toplam = 0
  for (const [key, agirlik] of Object.entries(AGIRLIKLAR)) {
    const value = puanlar[key]
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      toplamAgirlik += agirlik
      toplam += value * agirlik
    }
  }
  if (toplamAgirlik <= 0) return null
  return toplam / toplamAgirlik
}

function ayAnahtari(yilVal, ay) {
  return `${yilVal}-${ay}`
}

function teknisyenAyAnahtari(yilVal, ay, teknisyenAnahtar) {
  return `${yilVal}-${ay}-${teknisyenAnahtar}`
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
    const [yilVal, ay] = ayKey.split("-").map(Number)

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
          yil: yilVal,
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
          yil: yilVal,
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
    const [yilVal, ay] = ayKey.split("-").map(Number)
    const randevuKayitlari = [...grup.randevu.values()]

    for (const nps of grup.nps) {
      const v2Key = teknisyenAyAnahtari(yilVal, ay, nps.normalize_anahtar)
      const v2Row = v2Aylik.get(v2Key)
      const randevudaVar = grup.randevu.has(nps.normalize_anahtar)
      const sonucaBaglandi =
        randevudaVar && v2Row && v2Row.nps_deger !== null && v2Row.nps_deger !== undefined

      if (sonucaBaglandi) continue

      const adaylar = enYakinRandevuAdaylari(nps, randevuKayitlari, 3)
      if (randevudaVar && adaylar.length === 0) continue

      const imza = `${yilVal}-${ay}-${nps.normalize_anahtar}`
      if (eklenen.has(imza)) continue
      eklenen.add(imza)

      sonuc.push({
        yil: yilVal,
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

function npsEslesmeUyarilariYaz(birlesikKayitlar, v2Aylik, fuzzySonuc = null) {
  if (fuzzySonuc?.otomatikBaglananlar?.length) {
    console.warn(
      `\n=== NPS otomatik fuzzy eşleşme (${fuzzySonuc.otomatikBaglananlar.length}) ===`,
    )
    for (const row of fuzzySonuc.otomatikBaglananlar) {
      console.warn(
        `  ${row.yil}/${String(row.ay).padStart(2, "0")} | ${row.nps_ad} (${row.nps_normalize}) -> ${row.eslesen_ad} (${row.eslesen_normalize}) benzerlik=${row.benzerlik.toFixed(2)}`,
      )
    }
  }

  if (fuzzySonuc?.cokluAdayUyarilari?.length) {
    console.warn(
      `\n=== UYARI: NPS çoklu aday (>=0.90), otomatik bağlanmadı (${fuzzySonuc.cokluAdayUyarilari.length}) ===`,
    )
    for (const row of fuzzySonuc.cokluAdayUyarilari) {
      console.warn(
        `  ${row.yil}/${String(row.ay).padStart(2, "0")} | ${row.nps_ad} | normalize=${row.nps_normalize}`,
      )
      for (const aday of row.adaylar) {
        console.warn(
          `    aday: ${aday.ad} (${aday.normalize}) benzerlik=${aday.benzerlik.toFixed(2)}`,
        )
      }
    }
  }

  const eslesmeyenler = npsEslesmeyenleriBul(birlesikKayitlar, v2Aylik)
  if (eslesmeyenler.length === 0) return eslesmeyenler

  console.warn(`\n=== UYARI: NPS eşleşmeyen / benzer aday kayıtlar (${eslesmeyenler.length}) ===`)
  for (const row of eslesmeyenler.slice(0, 30)) {
    console.warn(
      `  ${row.yil}/${String(row.ay).padStart(2, "0")} | ${row.nps_teknisyen_gorunen_ad} | normalize=${row.normalize_anahtar} | nps=${row.nps_deger ?? "-"}`,
    )
    for (const aday of row.adaylar) {
      console.warn(
        `    aday: ${aday.teknisyen_gorunen_ad} (${aday.normalize_anahtar}) benzerlik=${aday.benzerlik.toFixed(2)}`,
      )
    }
    if (row.adaylar.length === 0) {
      console.warn("    aday: (benzer randevu çalışanı bulunamadı)")
    }
  }
  if (eslesmeyenler.length > 30) {
    console.warn(`  ... ve ${eslesmeyenler.length - 30} kayıt daha`)
  }

  return eslesmeyenler
}

function kayitlariBirlestir(hamKayitlar) {
  const map = new Map()

  for (const row of hamKayitlar) {
    if (row.durum !== "aktif") continue
    if (!VERI_TURLERI.includes(row.veri_turu)) continue

    const rowYil = Number(row.yil)
    const rowAy = Number(row.ay)
    const kimlik = kayitKimligi(row)
    if (!rowYil || !rowAy || !kimlik) continue

    const anahtar = kimlik.normalize_anahtar
    const key = `${rowYil}-${rowAy}-${anahtar}-${row.veri_turu}`
    const deger = num(row.teknisyen_degeri) ?? 0
    const servisToplam = num(row.servis_toplam)
    const referansOrtalama = num(row.referans_ortalama)
    const turkiyeOrtalama = num(row.turkiye_ortalama)
    const bolgeOrtalama = num(row.bolge_ortalama)

    const mevcut = map.get(key)

    if (!mevcut) {
      map.set(key, {
        yil: rowYil,
        ay: rowAy,
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
  return clamp(100 + ((hesapDegeri - ref) / ref) * 100, 0, 150)
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
    puan = clamp(deger, 0, 150)
  }

  return { deger, referans, puan }
}

function hesaplaV2Aylik(birlesikKayitlar) {
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

  const aylikSonuclar = new Map()

  for (const [, teknisyenMap] of ayHaritasi) {
    const firstTeknisyen = teknisyenMap.values().next().value
    const yilVal = firstTeknisyen.yil
    const ayVal = firstTeknisyen.ay

    const calisanTeknisyenler = []
    for (const [anahtar, teknisyen] of teknisyenMap) {
      if (teknisyen.veriler.has("randevu")) {
        calisanTeknisyenler.push(anahtar)
      }
    }

    if (calisanTeknisyenler.length === 0) continue

    const aySikayetServisToplamlari = []
    for (const anahtar of calisanTeknisyenler) {
      const sikayetKayit = teknisyenMap.get(anahtar).veriler.get("sikayet")
      if (sikayetKayit?.servis_toplam != null && sikayetKayit.servis_toplam > 0) {
        aySikayetServisToplamlari.push(sikayetKayit.servis_toplam)
      }
    }
    const aySikayetServisToplam =
      aySikayetServisToplamlari.length > 0
        ? Math.max(...aySikayetServisToplamlari)
        : null

    for (const anahtar of calisanTeknisyenler) {
      const teknisyen = teknisyenMap.get(anahtar)
      const veriler = teknisyen.veriler

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
      const sikayetDeger = sikayetKayit ? num(sikayetKayit.teknisyen_deger) ?? 0 : 0
      const sikayetPuan = clamp(
        sikayetPuanHesapla(sikayetDeger, aySikayetServisToplam),
        0,
        100,
      )

      const tamamlayiciKayit = veriler.get("tamamlayici")
      const tamamlayiciGercek = tamamlayiciKayit
        ? num(tamamlayiciKayit.teknisyen_deger) ?? 0
        : 0
      const tamamlayiciPuan = satisPuanHesapla(tamamlayiciGercek, tamamlayiciReferans)

      const ekGarantiKayit = veriler.get("ek_garanti")
      const ekGarantiGercek = ekGarantiKayit
        ? num(ekGarantiKayit.teknisyen_deger) ?? 0
        : 0
      const ekGarantiPuan = satisPuanHesapla(ekGarantiGercek, ekGarantiReferans)

      const toplamPuan = agirlikliToplam({
        nps: nps.puan,
        randevu: randevu.puan,
        sikayet: sikayetPuan,
        tamamlayici: tamamlayiciPuan,
        ek_garanti: ekGarantiPuan,
      })

      const sonucKey = teknisyenAyAnahtari(yilVal, ayVal, anahtar)
      aylikSonuclar.set(sonucKey, {
        yil: yilVal,
        ay: ayVal,
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
        sikayet_servis_toplam: aySikayetServisToplam,
        sikayet_puan: sikayetPuan,
        tamamlayici_deger: tamamlayiciGercek,
        tamamlayici_referans: tamamlayiciReferans,
        tamamlayici_puan: tamamlayiciPuan,
        ek_garanti_deger: ekGarantiGercek,
        ek_garanti_referans: ekGarantiReferans,
        ek_garanti_puan: ekGarantiPuan,
        toplam_puan: toplamPuan,
      })
    }
  }

  return aylikSonuclar
}

function hesaplaV2Yillik(aylikSonuclar) {
  const teknisyenYilMap = new Map()

  for (const row of aylikSonuclar.values()) {
    const key = `${row.yil}-${row.teknisyen_anahtar}`
    if (!teknisyenYilMap.has(key)) teknisyenYilMap.set(key, [])
    teknisyenYilMap.get(key).push(row)
  }

  const yillikSonuclar = new Map()

  for (const [key, aylar] of teknisyenYilMap) {
    const dashIdx = key.indexOf("-")
    const yilVal = key.slice(0, dashIdx)
    const teknisyenAnahtar = key.slice(dashIdx + 1)
    const gorunenAd =
      aylar.find((a) => a.teknisyen_gorunen_ad)?.teknisyen_gorunen_ad || teknisyenAnahtar

    const aylikToplamPuanlar = aylar
      .map((r) => num(r.toplam_puan))
      .filter((v) => v !== null)

    const toplamPuan =
      aylikToplamPuanlar.length > 0
        ? aylikToplamPuanlar.reduce((s, v) => s + v, 0) / aylikToplamPuanlar.length
        : null

    yillikSonuclar.set(`${yilVal}-${teknisyenAnahtar}`, {
      yil: Number(yilVal),
      ay: null,
      donem_tipi: "yillik",
      teknisyen_anahtar: teknisyenAnahtar,
      teknisyen_gorunen_ad: gorunenAd,
      calisilan_ay_sayisi: aylar.length,
      toplam_puan: toplamPuan,
    })
  }

  return yillikSonuclar
}

// ---------------------------------------------------------------------------
// DB yardımcıları
// ---------------------------------------------------------------------------

async function tabloKayitlariCek(tablo, yilVal) {
  const pageSize = 1000
  let from = 0
  const sonuc = []

  while (true) {
    const { data, error } = await supabase
      .from(tablo)
      .select("*")
      .eq("yil", yilVal)
      .range(from, from + pageSize - 1)

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

async function normalizeKayitlariCek(yilVal) {
  const pageSize = 1000
  let from = 0
  const sonuc = []

  while (true) {
    const { data, error } = await supabase
      .from("performans_normalize_kayitlar")
      .select("*")
      .eq("yil", yilVal)
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`performans_normalize_kayitlar okunamadı: ${error.message}`)
    }

    const batch = data || []
    sonuc.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return sonuc
}

function sikayetOranHesapla(sikayetDeger, servisToplam) {
  const servis = num(servisToplam)
  const deger = num(sikayetDeger) ?? 0
  if (servis === null || servis <= 0) return null
  return (deger / servis) * 100
}

function doluString(value) {
  if (value === null || value === undefined) return ""
  const s = String(value).trim()
  return s.length > 0 ? s : ""
}

function teknisyenKimligiCoz(kaynak) {
  const anahtar = doluString(kaynak.teknisyen_anahtar)
  const gorunen = doluString(kaynak.teknisyen_gorunen_ad)
  const adSoyad = doluString(kaynak.teknisyen_ad_soyad)
  const ad = gorunen || adSoyad || anahtar

  return {
    teknisyen_anahtar: anahtar,
    teknisyen_gorunen_ad: ad,
    teknisyen_ad_soyad: ad,
  }
}

function yazimOncesiDogrula(kayitlar) {
  const hatalar = []

  for (let i = 0; i < kayitlar.length; i++) {
    const r = kayitlar[i]
    const etiket = `${r.donem_tipi || "?"} yil=${r.yil} ay=${r.ay ?? "-"} teknisyen=${r.teknisyen_anahtar || "?"}`

    if (!doluString(r.donem_tipi)) {
      hatalar.push(`[${i}] donem_tipi boş (${etiket})`)
    }
    if (r.toplam_puan === null || r.toplam_puan === undefined || !Number.isFinite(Number(r.toplam_puan))) {
      hatalar.push(`[${i}] toplam_puan null/geçersiz (${etiket})`)
    }
    if (!doluString(r.teknisyen_ad_soyad)) {
      hatalar.push(`[${i}] teknisyen_ad_soyad boş (${etiket})`)
    }
  }

  if (hatalar.length === 0) return

  const limit = 20
  const ozet = hatalar.slice(0, limit).join("\n")
  const ek = hatalar.length > limit ? `\n... ve ${hatalar.length - limit} hata daha` : ""
  throw new Error(`Yazım öncesi doğrulama başarısız (${hatalar.length} hata):\n${ozet}${ek}`)
}

function aylikSonucToDbRow(sonuc) {
  const kimlik = teknisyenKimligiCoz(sonuc)

  return {
    yil: sonuc.yil,
    ay: sonuc.ay,
    donem_tipi: "aylik",
    teknisyen_anahtar: kimlik.teknisyen_anahtar,
    teknisyen_gorunen_ad: kimlik.teknisyen_gorunen_ad,
    teknisyen_ad_soyad: kimlik.teknisyen_ad_soyad,
    nps_deger: sonuc.nps_deger,
    nps_referans: sonuc.nps_referans,
    nps_puan: sonuc.nps_puan,
    randevu_deger: sonuc.randevu_deger,
    randevu_referans: sonuc.randevu_referans,
    randevu_puan: sonuc.randevu_puan,
    sikayet_deger: sonuc.sikayet_deger,
    sikayet_servis_toplam: sonuc.sikayet_servis_toplam,
    sikayet_oran: sikayetOranHesapla(sonuc.sikayet_deger, sonuc.sikayet_servis_toplam),
    sikayet_puan: sonuc.sikayet_puan,
    tamamlayici_deger: sonuc.tamamlayici_deger,
    tamamlayici_referans: sonuc.tamamlayici_referans,
    tamamlayici_puan: sonuc.tamamlayici_puan,
    ek_garanti_deger: sonuc.ek_garanti_deger,
    ek_garanti_referans: sonuc.ek_garanti_referans,
    ek_garanti_puan: sonuc.ek_garanti_puan,
    toplam_puan: sonuc.toplam_puan,
    hesaplama_detayi: {
      motor: "v2",
      versiyon: MOTOR_VERSIYON,
      yillik_kural: null,
    },
  }
}

function yillikSonucToDbRow(sonuc) {
  const kimlik = teknisyenKimligiCoz(sonuc)

  return {
    yil: sonuc.yil,
    ay: null,
    donem_tipi: "yillik",
    teknisyen_anahtar: kimlik.teknisyen_anahtar,
    teknisyen_gorunen_ad: kimlik.teknisyen_gorunen_ad,
    teknisyen_ad_soyad: kimlik.teknisyen_ad_soyad,
    toplam_puan: sonuc.toplam_puan,
    hesaplama_detayi: {
      calisilan_ay_sayisi: sonuc.calisilan_ay_sayisi,
      yillik_hesap_kurali:
        "Yillik toplam puan, calisilan aylarin aylik toplam_puan saf aritmetik ortalamasidir.",
    },
  }
}

async function topluInsert(tablo, kayitlar, etiket) {
  const chunkSize = 200
  for (let i = 0; i < kayitlar.length; i += chunkSize) {
    const chunk = kayitlar.slice(i, i + chunkSize)
    const { error } = await supabase.from(tablo).insert(chunk)
    if (error) {
      throw new Error(`${etiket} insert hatası (${i}-${i + chunk.length}): ${error.message}`)
    }
  }
}

async function yedekAl(mevcutKayitlar, backupId, backupTarihi, backupNedeni, yilVal) {
  if (mevcutKayitlar.length === 0) return 0

  const yedekSatirlar = mevcutKayitlar.map((row) => ({
    backup_id: backupId,
    backup_tarihi: backupTarihi,
    backup_nedeni: backupNedeni,
    yil: yilVal,
    orijinal_kayit: row,
  }))

  await topluInsert(BACKUP_TABLO, yedekSatirlar, "Yedek")
  return yedekSatirlar.length
}

async function yilKayitlariniSil(yilVal) {
  const { error } = await supabase.from(SONUC_TABLO).delete().eq("yil", yilVal)
  if (error) {
    throw new Error(`${SONUC_TABLO} silme hatası: ${error.message}`)
  }
}

async function dogrulaYazim(yilVal) {
  const kayitlar = await tabloKayitlariCek(SONUC_TABLO, yilVal)
  const aylikSayisi = kayitlar.filter((r) => r.donem_tipi === "aylik").length
  const yillikSayisi = kayitlar.filter((r) => r.donem_tipi === "yillik").length
  const nullToplam = kayitlar.filter((r) => r.toplam_puan === null || r.toplam_puan === undefined)

  return {
    toplamKayit: kayitlar.length,
    aylikSayisi,
    yillikSayisi,
    nullToplamSayisi: nullToplam.length,
    nullToplamOrnekler: nullToplam.slice(0, 5).map((r) => ({
      donem: r.donem_tipi,
      ay: r.ay,
      teknisyen: r.teknisyen_gorunen_ad,
    })),
  }
}

function formatSayi(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "-"
  return Number(v).toFixed(2)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("Performans Motoru V2 — Yeniden Hesaplama")
console.log("========================================")
console.log(`Yıl: ${yil}`)
console.log(`Mod: ${writeMode ? "WRITE (DB yazılacak)" : "DRY-RUN (DB'ye yazılmaz)"}`)
console.log("")

const hamNormalize = await normalizeKayitlariCek(yil)
const aktifNormalize = hamNormalize.filter((r) => r.durum === "aktif")
const birlesikHam = kayitlariBirlestir(aktifNormalize)
const fuzzySonuc = npsFuzzyEslestir(birlesikHam)
const birlesik = fuzzySonuc.birlesik
const v2Aylik = hesaplaV2Aylik(birlesik)
const v2Yillik = hesaplaV2Yillik(v2Aylik)

const aylikDbRows = [...v2Aylik.values()].map(aylikSonucToDbRow)
const yillikDbRows = [...v2Yillik.values()].map(yillikSonucToDbRow)
const yazilacakKayitlar = [...aylikDbRows, ...yillikDbRows]

const mevcutKayitlar = await tabloKayitlariCek(SONUC_TABLO, yil)
const mevcutAylik = mevcutKayitlar.filter((r) => r.donem_tipi === "aylik").length
const mevcutYillik = mevcutKayitlar.filter((r) => r.donem_tipi === "yillik").length

const hesapNullToplam = yazilacakKayitlar.filter(
  (r) => r.toplam_puan === null || r.toplam_puan === undefined,
)

console.log("=== HESAPLAMA ÖZETİ ===")
console.log(`Normalize ham kayıt (${yil}): ${hamNormalize.length}`)
console.log(`Aktif normalize kayıt: ${aktifNormalize.length}`)
console.log(`Birleştirilmiş kayıt: ${birlesik.length}`)
console.log(`NPS otomatik fuzzy eşleşme: ${fuzzySonuc.otomatikBaglananlar.length}`)
console.log(`V2 aylık sonuç: ${v2Aylik.size}`)
console.log(`V2 yıllık sonuç: ${v2Yillik.size}`)
console.log(`Yazılacak toplam kayıt: ${yazilacakKayitlar.length}`)
console.log(`  - aylık: ${aylikDbRows.length}`)
console.log(`  - yıllık: ${yillikDbRows.length}`)
console.log(`Hesaplanan null toplam_puan: ${hesapNullToplam.length}`)

npsEslesmeUyarilariYaz(birlesik, v2Aylik, fuzzySonuc)

console.log(`\n=== MEVCUT DB (${yil}) ===`)
console.log(`Mevcut toplam kayıt: ${mevcutKayitlar.length}`)
console.log(`  - aylık: ${mevcutAylik}`)
console.log(`  - yıllık: ${mevcutYillik}`)

if (!writeMode) {
  console.log("\n=== DRY-RUN PLANI ===")
  console.log(`1. Yedeklenecek kayıt: ${mevcutKayitlar.length} → ${BACKUP_TABLO}`)
  console.log(`2. Silinecek kayıt: ${mevcutKayitlar.length} (${SONUC_TABLO}, yil=${yil})`)
  console.log(`3. Eklenecek kayıt: ${yazilacakKayitlar.length}`)
  console.log(`   - aylık: ${aylikDbRows.length}`)
  console.log(`   - yıllık: ${yillikDbRows.length}`)
  console.log("\nGerçek yazma için: --write bayrağını ekleyin.")
  console.log("Dry-run tamamlandı. Veritabanına yazılmadı.")
  process.exit(0)
}

try {
  yazimOncesiDogrula(yazilacakKayitlar)
} catch (err) {
  console.error("\nYazım iptal edildi (DELETE yapılmadı).")
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}

const backupId = randomUUID()
const backupTarihi = new Date().toISOString()
const backupNedeni = `performans-v2-yeniden-hesapla --yil=${yil}`

console.log("\n=== WRITE MODU ===")
console.log(`backup_id: ${backupId}`)

try {
  const yedeklenen = await yedekAl(mevcutKayitlar, backupId, backupTarihi, backupNedeni, yil)
  console.log(`Yedeklendi: ${yedeklenen} kayıt → ${BACKUP_TABLO}`)

  await yilKayitlariniSil(yil)
  console.log(`Silindi: yil=${yil} kayıtları (${SONUC_TABLO})`)

  await topluInsert(SONUC_TABLO, yazilacakKayitlar, "V2 sonuç")
  console.log(`Eklendi: ${yazilacakKayitlar.length} kayıt (${SONUC_TABLO})`)

  const dogrulama = await dogrulaYazim(yil)

  console.log("\n=== DOĞRULAMA ===")
  console.log(`DB kayıt sayısı (${yil}): ${dogrulama.toplamKayit}`)
  console.log(`  - aylık: ${dogrulama.aylikSayisi}`)
  console.log(`  - yıllık: ${dogrulama.yillikSayisi}`)
  console.log(`Null toplam_puan: ${dogrulama.nullToplamSayisi}`)

  if (dogrulama.nullToplamSayisi > 0) {
    console.log("Null toplam_puan örnekleri:")
    for (const ornek of dogrulama.nullToplamOrnekler) {
      console.log(
        `  - ${ornek.donem} ay=${ornek.ay ?? "-"} ${ornek.teknisyen}`,
      )
    }
  }

  if (dogrulama.aylikSayisi !== aylikDbRows.length) {
    console.warn(
      `UYARI: Beklenen aylık ${aylikDbRows.length}, DB'de ${dogrulama.aylikSayisi}`,
    )
  }
  if (dogrulama.yillikSayisi !== yillikDbRows.length) {
    console.warn(
      `UYARI: Beklenen yıllık ${yillikDbRows.length}, DB'de ${dogrulama.yillikSayisi}`,
    )
  }

  console.log("\n=== TAMAMLANDI ===")
  console.log(`backup_id: ${backupId}`)
  console.log(`Yıl ${yil} V2 sonuçları yazıldı.`)
} catch (err) {
  console.error("\nHATA:", err instanceof Error ? err.message : String(err))
  console.error(`backup_id (kısmi işlem olabilir): ${backupId}`)
  process.exit(1)
}

process.exit(0)
