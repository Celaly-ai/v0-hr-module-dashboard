import { createClient } from "@/lib/supabase/server"

function temiz(value: unknown) {
  return String(value ?? "").trim()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  if (!supabase) {
    return Response.json({ error: "Supabase bağlantısı yok." }, { status: 500 })
  }

  const body = await request.json().catch(() => null)

  const zimmetId = temiz(body?.zimmet_id)
  const iptalNedeni = temiz(body?.iptal_nedeni)

  if (!zimmetId) {
    return Response.json({ error: "Zimmet ID zorunludur." }, { status: 400 })
  }

  if (!iptalNedeni) {
    return Response.json({ error: "İptal nedeni zorunludur." }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { error } = await supabase
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

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    message: "İptal kaydedildi. Anket havuzuna aktarım için hazır.",
  })
}
