import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const planTarihi = new Date().toISOString().slice(0, 10)

const { data: duraklar, error } = await supabase
  .from("ai_rota_duraklari")
  .select("*")
  .eq("plan_tarihi", planTarihi)

if (error) {
  console.error(error.message)
  process.exit(1)
}

const gruplar = {}

for (const d of duraklar || []) {
  const key = `${d.ilce || "BILINMEYEN"}|${d.mahalle || "BILINMEYEN"}`

  if (!gruplar[key]) {
    gruplar[key] = {
      ilce: d.ilce,
      mahalle: d.mahalle,
      durak: 0,
      is: 0,
      sure: 0,
      latToplam: 0,
      lngToplam: 0,
      koordinatSayisi: 0,
    }
  }

  gruplar[key].durak += 1
  gruplar[key].is += Number(d.toplam_is_sayisi || 0)
  gruplar[key].sure += Number(d.toplam_tahmini_sure_dk || 0)

  if (d.enlem && d.boylam) {
    gruplar[key].latToplam += Number(d.enlem)
    gruplar[key].lngToplam += Number(d.boylam)
    gruplar[key].koordinatSayisi += 1
  }
}

let sayac = 0

for (const g of Object.values(gruplar)) {
  sayac++

  const rotaKodu = `${planTarihi}-${(g.mahalle || "ROTA").replaceAll(" ", "_")}-${String(sayac).padStart(2, "0")}`

  const merkezLat = g.koordinatSayisi ? g.latToplam / g.koordinatSayisi : null
  const merkezLng = g.koordinatSayisi ? g.lngToplam / g.koordinatSayisi : null

  const { error: upsertError } = await supabase
    .from("ai_rota_kumeleri")
    .upsert(
      {
        plan_tarihi: planTarihi,
        rota_kodu: rotaKodu,
        ilce: g.ilce,
        mahalle: g.mahalle,
        toplam_durak: g.durak,
        toplam_is: g.is,
        toplam_tahmini_sure_dk: g.sure,
        rota_merkez_lat: merkezLat,
        rota_merkez_lng: merkezLng,
        durum: "bekliyor",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "plan_tarihi,rota_kodu" }
    )

  if (upsertError) {
    console.error("Rota kümesi yazılamadı:", upsertError.message)
    process.exit(1)
  }
}

console.log("Rota kümesi oluşturuldu:", Object.keys(gruplar).length)
