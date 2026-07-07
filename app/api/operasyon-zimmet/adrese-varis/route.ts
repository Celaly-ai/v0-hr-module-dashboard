import { createClient } from "@/lib/supabase/server"
import { kullaniciZimmeteYetkiliMi } from "@/lib/services/gorev-yetki-service"

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
  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  const mesafeMetre = Number(body?.mesafe_metre ?? 0)

  if (!zimmetId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json(
      { error: "Zimmet ID, lat ve lng zorunludur." },
      { status: 400 },
    )
  }

  const yetki = await kullaniciZimmeteYetkiliMi(supabase, zimmetId)

  if (!yetki.ok) {
    return Response.json({ error: yetki.error }, { status: yetki.status ?? 403 })
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from("operasyon_zimmetleri")
    .update({
      adrese_varildi: true,
      adrese_varis_zamani: now,
      adrese_varis_lat: lat,
      adrese_varis_lng: lng,
      adrese_mesafe_metre: Number.isFinite(mesafeMetre) ? mesafeMetre : null,
      operasyon_durumu: "ADRESE_VARILDI",
      updated_at: now,
    })
    .eq("id", zimmetId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    message: "Adrese varış kaydedildi. AT butonu aktif.",
  })
}
