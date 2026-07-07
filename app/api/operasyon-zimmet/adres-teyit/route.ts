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

  const { data: zimmet, error: zimmetError } = await supabase
    .from("operasyon_zimmetleri")
    .select("id, adrese_varildi, adres_tanimlandi, sonuc_tamamlandi")
    .eq("id", zimmetId)
    .maybeSingle()

  if (zimmetError) {
    return Response.json({ error: zimmetError.message }, { status: 500 })
  }

  if (!zimmet) {
    return Response.json({ error: "Operasyon zimmeti bulunamadı." }, { status: 404 })
  }

  if (zimmet.sonuc_tamamlandi) {
    return Response.json(
      { error: "Tamamlanmış görevde adres teyidi yapılamaz." },
      { status: 400 },
    )
  }

  if (zimmet.adres_tanimlandi) {
    return Response.json({
      ok: true,
      message: "Adres teyidi zaten tamamlanmış.",
      already_done: true,
    })
  }

  if (!zimmet.adrese_varildi) {
    return Response.json(
      { error: "Adrese varış kaydedilmeden adres teyidi yapılamaz." },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("operasyon_zimmetleri")
    .update({
      adres_tanimlandi: true,
      updated_at: now,
    })
    .eq("id", zimmetId)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    message: "Adres teyidi tamamlandı. Sonuç butonları aktif.",
  })
}
