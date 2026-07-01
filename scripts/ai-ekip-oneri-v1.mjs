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
  if (!i || !e) return 10
  if (e === "genel") return 15
  if (i === e) return 20
  if (i.includes(e) || e.includes(i)) return 15
  return 5
}

function skorHesapla(is, ekip) {
  if (!ekipGorevUygunMu(ekip.ekip_gorev, is.gerekli_yetenek)) return 0

  let skor = 0

  skor += 40

  const kapasite = Number(ekip.kapasite_orani || 0)
  skor += Math.max(0, 25 - kapasite)

  skor += bolgeSkoru(is.ilce, ekip.bolge)

  skor += Math.min(10, Number(ekip.ai_genel_durum_skoru || 0) / 10)

  if (norm(ekip.aktiflik_durumu) === "musait") skor += 5

  if (is.gerekli_arac_sinifi === "BUYUK" && !ekip.arac_varlik_id) skor -= 30

  return Math.round(skor)
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
      ekip,
      skor: skorHesapla(is, ekip)
    }))
    .filter((x) => x.skor > 0)
    .sort((a, b) => b.skor - a.skor)

  const secim = adaylar[0]

  if (!secim) continue

  const { error } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .update({
      ai_onerilen_ekip: secim.ekip.ekip_id,
      ai_onerilen_ekip_adi: secim.ekip.ekip_adi,
      ai_atama_skoru: secim.skor,
      updated_at: new Date().toISOString()
    })
    .eq("id", is.id)

  if (error) {
    console.error("Öneri yazılamadı:", is.fis_no, error.message)
    process.exit(1)
  }

  onerilen++
}

console.log("Atama bekleyen iş:", isler?.length || 0)
console.log("Öneri üretilen iş:", onerilen)
