import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function POST(request: Request) {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/portal/operasyon-havuzu?islem=hata")
  }

  const formData = await request.formData()
  const operasyonId = String(formData.get("operasyonId") ?? "")

  if (!operasyonId) {
    redirect("/portal/operasyon-havuzu?islem=eksik")
  }

  const { data: op } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select("id,fis_no,musteri_adi,telefon,urun_adi,is_tipi,randevu_tarihi")
    .eq("id", operasyonId)
    .single()

  if (!op) {
    redirect("/portal/operasyon-havuzu?islem=yok")
  }

  await supabase.from("operasyon_randevu_bekleyenler").insert({
    operasyon_id: op.id,
    fis_no: op.fis_no,
    musteri_adi: op.musteri_adi,
    telefon: op.telefon,
    urun_adi: op.urun_adi,
    is_tipi: op.is_tipi,
    eski_randevu_tarihi: op.randevu_tarihi,
    durum: "randevu_bekliyor",
  })

  await supabase
    .from("aktif_operasyon_havuzu_v2")
    .update({
      operasyon_disina_alindi: true,
      operasyon_disina_alinma_nedeni: "Atama sorumlusu tarafından randevu beklemeye alındı.",
      operasyon_disina_alinma_tarihi: new Date().toISOString(),
      randevu_bekliyor: true,
      atama_gerekli: false,
      operasyon_asamasi: "RANDEVU_BEKLIYOR",
      updated_at: new Date().toISOString(),
    })
    .eq("id", operasyonId)

  redirect("/portal/operasyon-havuzu?islem=randevu_bekliyor")
}
