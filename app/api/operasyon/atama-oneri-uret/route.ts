import { createClient } from "@/lib/supabase/server"
import { havuzAtamaOnerileriniUret } from "@/lib/services/atama-motoru-service"
import { getGorevPersonelContext } from "@/lib/services/gorev-yetki-service"

export async function POST(request: Request) {
  const supabase = await createClient()

  if (!supabase) {
    return Response.json({ error: "Supabase bağlantısı yok." }, { status: 500 })
  }

  const ctx = await getGorevPersonelContext(supabase)

  if (!ctx.ok) {
    return Response.json({ error: ctx.error }, { status: ctx.status ?? 401 })
  }

  if (!ctx.data.operasyonYoneticisiMi) {
    return Response.json(
      { error: "Atama önerisi üretmek için operasyon yetkisi gerekir." },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const operasyonId =
    typeof body?.operasyon_id === "string" ? body.operasyon_id.trim() : undefined

  const sonuc = await havuzAtamaOnerileriniUret(supabase, {
    yalnizAron: body?.yalniz_aron !== false,
    operasyonId: operasyonId || undefined,
  })

  if (sonuc.hatalar.length > 0 && sonuc.onerilen === 0) {
    return Response.json(
      {
        ok: false,
        error: sonuc.hatalar[0],
        ...sonuc,
      },
      { status: 500 },
    )
  }

  return Response.json({
    ok: true,
    message: `${sonuc.onerilen} iş için ekip önerisi güncellendi.`,
    ...sonuc,
  })
}
