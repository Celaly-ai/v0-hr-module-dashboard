import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const planTarihi = new Date().toISOString().slice(0, 10)

const { data, error } = await supabase
  .from("ai_gunluk_planlama_onerileri")
  .select("*")
  .eq("plan_tarihi", planTarihi)

if (error) {
  console.error(error.message)
  process.exit(1)
}

const gruplar = {}

for (const kayit of data || []) {
  const key = [
    kayit.ilce || "",
    kayit.mahalle || "",
    kayit.musteri_adi || ""
  ].join("|")

  if (!gruplar[key]) {
    gruplar[key] = {
      ilce: kayit.ilce,
      mahalle: kayit.mahalle,
      musteri_adi: kayit.musteri_adi,
      enlem: kayit.enlem,
      boylam: kayit.boylam,
      fisler: [],
      toplamSure: 0
    }
  }

  gruplar[key].fisler.push(kayit.fis_no)
  gruplar[key].toplamSure += Number(kayit.riskli_sure_dk || 0)
}

let sayac = 0

for (const g of Object.values(gruplar)) {
  sayac++

  await supabase
    .from("ai_rota_duraklari")
    .upsert(
      {
        plan_tarihi: planTarihi,
        ilce: g.ilce,
        mahalle: g.mahalle,

        durak_kodu:
          `${planTarihi}-${String(sayac).padStart(4, "0")}`,

        musteri_adi: g.musteri_adi,

        enlem: g.enlem,
        boylam: g.boylam,

        toplam_is_sayisi: g.fisler.length,
        toplam_tahmini_sure_dk: g.toplamSure,

        fis_nolari: g.fisler,

        durum: "bekliyor"
      },
      { onConflict: "plan_tarihi,durak_kodu" }
    )
}

console.log("Durak oluşturuldu:", Object.keys(gruplar).length)
