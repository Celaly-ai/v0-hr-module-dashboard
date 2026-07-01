import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function POST(request: Request) {
  const supabase = await createClient()
  const formData = await request.formData()

  const zimmetId = String(formData.get("zimmet_id") ?? "")
  const iptalNedeni = String(formData.get("iptal_nedeni") ?? "").trim()

  if (!supabase || !zimmetId || !iptalNedeni) {
    redirect("/portal/operasyon-zimmet?iptal=eksik")
  }

  const now = new Date().toISOString()

  await supabase
    .from("operasyon_zimmetleri")
    .update({
      gerceklesen_is_tipi: "İ",
      sonuc_aciklama_zorunlu: true,
      sonuc_aciklama: iptalNedeni,
      sonuc_tamamlandi: true,
      sonuc_tamamlanma_zamani: now,
      operasyon_durumu: "TAMAMLANDI",
      durum: "iptal",
      anket_havuzuna_aktarildi: false,
      updated_at: now,
    })
    .eq("id", zimmetId)

  redirect("/portal/operasyon-zimmet?iptal=ok")
}
