import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function temiz(v) {
  return v === null || v === undefined ? "" : String(v).trim()
}

function norm(v) {
  return temiz(v)
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
}

function ekipJokerMi(ekip) {
  const metin = norm(`${ekip.ekip_adi ?? ""} ${ekip.ekip_gorev ?? ""}`)
  return metin.includes("joker")
}

function jokerOnerisiGerekliMi(is) {
  if (is.kritik_cagri) return true
  if (Number(is.acik_gun || 0) >= 5) return true
  if (Number(is.toplam_is_zorluk_puani || 0) >= 80) return true
  const not = norm(is.basvuru_notu)
  return (
    not.includes("acil") ||
    not.includes("joker") ||
    not.includes("yonetici")
  )
}

function ekipGorevUygunMu(ekipGorev, gerekliYetenek) {
  const g = norm(ekipGorev)
  const y = norm(gerekliYetenek)

  if (y.includes("klima")) {
    return g.includes("klima") || g.includes("nakliye") || g.includes("montaj")
  }

  if (y.includes("beyaz") || y.includes("tv") || y.includes("nakliye")) {
    return g.includes("nakliye") || g.includes("montaj")
  }

  return true
}

function bolgeSkoru(isBolge, ekipBolge) {
  const i = norm(isBolge)
  const e = norm(ekipBolge)
  if (!i || !e) return 4
  if (e === "genel") return 8
  if (i === e) return 12
  if (i.includes(e) || e.includes(i)) return 8
  return 2
}

function mahallePuani(is, gunluk) {
  const isMahalle = norm(is.mahalle)
  const ekipMahalle = norm(gunluk?.sonMahalle)
  if (isMahalle && ekipMahalle && isMahalle === ekipMahalle) return 12
  const isIlce = norm(is.ilce)
  const ekipIlce = norm(gunluk?.sonIlce)
  if (isIlce && ekipIlce && isIlce === ekipIlce) return 6
  return 0
}

function mesafeMetre(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (v) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function mesafePuani(is, gunluk) {
  const enlem = Number(is.enlem)
  const boylam = Number(is.boylam)
  if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) return 0
  if (gunluk?.sonEnlem == null || gunluk?.sonBoylam == null) return 0
  const metre = mesafeMetre(enlem, boylam, gunluk.sonEnlem, gunluk.sonBoylam)
  if (metre <= 3000) return 18
  if (metre <= 8000) return 11
  if (metre <= 15000) return 5
  return 0
}

function skorHesapla(is, ekip, gunluk) {
  if (!ekipGorevUygunMu(ekip.ekip_gorev, is.gerekli_yetenek)) return 0
  if (!jokerOnerisiGerekliMi(is) && ekipJokerMi(ekip)) return 0

  let skor = 35
  skor += bolgeSkoru(is.ilce, ekip.bolge)
  skor += mahallePuani(is, gunluk)
  skor += mesafePuani(is, gunluk)

  const kapasite = Number(ekip.kapasite_orani || 0)
  skor += Math.max(0, 20 - Math.round(kapasite * 0.8))

  skor += Math.min(5, Number(ekip.ai_genel_durum_skoru || 0) / 20)

  if (norm(ekip.aktiflik_durumu) === "musait") skor += 3

  if (is.gerekli_arac_sinifi === "BUYUK" && !ekip.arac_varlik_id) skor -= 30

  if (is.kritik_cagri) skor += 5

  return Math.max(0, Math.round(skor))
}

function oneriPayload(oneriler) {
  const bir = oneriler[0]
  const iki = oneriler[1]
  const uc = oneriler[2]

  return {
    ai_oneri_1_ekip_id: bir?.ekip_id ?? null,
    ai_oneri_1_ekip_adi: bir?.ekip_adi ?? null,
    ai_oneri_1_skor: bir?.skor ?? null,
    ai_oneri_2_ekip_id: iki?.ekip_id ?? null,
    ai_oneri_2_ekip_adi: iki?.ekip_adi ?? null,
    ai_oneri_2_skor: iki?.skor ?? null,
    ai_oneri_3_ekip_id: uc?.ekip_id ?? null,
    ai_oneri_3_ekip_adi: uc?.ekip_adi ?? null,
    ai_oneri_3_skor: uc?.skor ?? null,
    ai_onerilen_ekip: bir?.ekip_id ?? null,
    ai_onerilen_ekip_adi: bir?.ekip_adi ?? null,
    ai_atama_skoru: bir?.skor ?? null,
    updated_at: new Date().toISOString(),
  }
}

const planTarihi = new Date().toLocaleDateString("en-CA", {
  timeZone: "Europe/Istanbul",
})

const { data: zimmetler } = await supabase
  .from("operasyon_zimmetleri")
  .select("ekip_id, operasyon_id, ilce, mahalle, rota_sirasi")
  .eq("gorev_tarihi", planTarihi)
  .order("rota_sirasi", { ascending: true })

const operasyonIdler = [
  ...new Set((zimmetler || []).map((z) => z.operasyon_id).filter(Boolean)),
]

const koordinatMap = new Map()
if (operasyonIdler.length > 0) {
  const { data: operasyonlar } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select("id, enlem, boylam")
    .in("id", operasyonIdler)

  for (const op of operasyonlar || []) {
    const enlem = Number(op.enlem)
    const boylam = Number(op.boylam)
    if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) continue
    koordinatMap.set(op.id, { enlem, boylam })
  }
}

const ekipGunluk = new Map()
for (const zimmet of zimmetler || []) {
  if (!zimmet.ekip_id) continue
  const mevcut = ekipGunluk.get(zimmet.ekip_id) ?? {
    sonIlce: null,
    sonMahalle: null,
    sonEnlem: null,
    sonBoylam: null,
  }
  const koord = zimmet.operasyon_id ? koordinatMap.get(zimmet.operasyon_id) : null
  if (koord) {
    mevcut.sonEnlem = koord.enlem
    mevcut.sonBoylam = koord.boylam
  }
  mevcut.sonIlce = zimmet.ilce ?? mevcut.sonIlce
  mevcut.sonMahalle = zimmet.mahalle ?? mevcut.sonMahalle
  ekipGunluk.set(zimmet.ekip_id, mevcut)
}

const { data: isler, error: isError } = await supabase
  .from("aktif_operasyon_havuzu_v2")
  .select("*")
  .eq("atama_gerekli", true)

if (isError) {
  console.error("İşler okunamadı:", isError.message)
  process.exit(1)
}

const { data: ekipler, error: ekipError } = await supabase
  .from("ai_ekip_kapasite")
  .select("*")
  .eq("aktiflik_durumu", "musait")

if (ekipError) {
  console.error("Ekipler okunamadı:", ekipError.message)
  process.exit(1)
}

let onerilen = 0

for (const is of isler || []) {
  const adaylar = (ekipler || [])
    .map((ekip) => ({
      ekip_id: ekip.ekip_id,
      ekip_adi: ekip.ekip_adi,
      skor: skorHesapla(is, ekip, ekipGunluk.get(ekip.ekip_id)),
    }))
    .filter((x) => x.skor > 0)
    .sort((a, b) => b.skor - a.skor)

  const benzersiz = []
  const gorulen = new Set()
  for (const aday of adaylar) {
    if (gorulen.has(aday.ekip_id)) continue
    gorulen.add(aday.ekip_id)
    benzersiz.push(aday)
    if (benzersiz.length >= 3) break
  }

  if (benzersiz.length === 0) continue

  const { error } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .update(oneriPayload(benzersiz))
    .eq("id", is.id)

  if (error) {
    console.error("Öneri yazılamadı:", is.fis_no, error.message)
    process.exit(1)
  }

  onerilen++
}

console.log("Atama bekleyen iş:", isler?.length || 0)
console.log("Öneri üretilen iş:", onerilen)
