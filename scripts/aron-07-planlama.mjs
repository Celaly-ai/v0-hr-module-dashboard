import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function bugunISO() {
  return new Date().toISOString().slice(0, 10)
}

const planTarihi = bugunISO()

const { data: isler, error } = await supabase
  .from("aktif_operasyon_havuzu_v2")
  .select("*")
  .eq("atama_gerekli", true)
  .eq("hizmet_alani_ici", true)
  .not("enlem", "is", null)
  .not("boylam", "is", null)

if (error) {
  console.error("Planlanacak işler okunamadı:", error.message)
  process.exit(1)
}

let yazilan = 0

for (const is of isler || []) {
  const { error: upsertError } = await supabase
    .from("ai_gunluk_planlama_onerileri")
    .upsert(
      {
        plan_tarihi: planTarihi,
        operasyon_id: is.id,
        fis_no: is.fis_no,

        musteri_adi: is.musteri_adi,
        ilce: is.ilce,
        mahalle: is.mahalle,
        adres: is.adres,

        urun_kategori: is.urun_kategori,
        is_tipi: is.is_tipi,
        riskli_sure_dk: is.riskli_sure_dk,

        onerilen_ekip_id: is.ai_onerilen_ekip,
        onerilen_ekip_adi: is.ai_onerilen_ekip_adi,

        ai_guven_skoru: is.ai_atama_skoru,
        ai_gerekce:
          "İlk sürüm: hizmet alanı içinde, koordinatı mevcut, atama bekleyen iş planlama havuzuna alındı.",

        onay_durumu: "bekliyor",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "plan_tarihi,fis_no" }
    )

  if (upsertError) {
    console.error("Plan önerisi yazılamadı:", is.fis_no, upsertError.message)
    process.exit(1)
  }

  yazilan++
}

console.log("07:00 planlama havuzu oluşturuldu.")
console.log("Plan tarihi:", planTarihi)
console.log("Planlanan iş:", yazilan)
