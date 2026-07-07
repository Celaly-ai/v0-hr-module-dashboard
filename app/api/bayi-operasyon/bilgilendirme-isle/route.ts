import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { bilgilendirmeKanalDurumu } from "@/lib/bayi-sms-sender"
import { isleBayiBilgilendirmeKuyrugu } from "@/lib/services/bayi-operasyon-service"

const CRON_TOKEN =
  process.env.BAYI_CRON_TOKEN?.trim() || process.env.BAYI_WHATSAPP_WEBHOOK_TOKEN?.trim()

function cronYetkisi(request: NextRequest) {
  if (!CRON_TOKEN) return false
  const token =
    request.headers.get("x-bayi-cron-token") ||
    request.headers.get("x-bayi-webhook-token") ||
    request.nextUrl.searchParams.get("token") ||
    ""
  return token === CRON_TOKEN
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceRoleClient()
    let client = serviceClient
    let sirketId: string | undefined

    if (cronYetkisi(request) && serviceClient) {
      client = serviceClient
      sirketId = process.env.BAYI_WHATSAPP_DEFAULT_SIRKET_ID?.trim() || undefined
    } else {
      const sessionClient = await createClient()
      if (!sessionClient) {
        return NextResponse.json(
          { success: false, error: "Supabase yapılandırması eksik." },
          { status: 500 }
        )
      }

      const {
        data: { user },
      } = await sessionClient.auth.getUser()

      if (!user) {
        return NextResponse.json({ success: false, error: "Oturum bulunamadı." }, { status: 401 })
      }

      client = sessionClient
    }

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Supabase bağlantısı kurulamadı." },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const limit = typeof body?.limit === "number" ? body.limit : 20

    const sonuc = await isleBayiBilgilendirmeKuyrugu(
      { limit, sirket_id: body?.sirket_id || sirketId },
      client
    )

    if (!sonuc.ok) {
      return NextResponse.json({ success: false, error: sonuc.error }, { status: 400 })
    }

    const kanalDurumu = bilgilendirmeKanalDurumu()

    return NextResponse.json({
      success: true,
      ...kanalDurumu,
      data: sonuc.data,
      mesaj: `${sonuc.data.gonderildi} mesaj gönderildi, ${sonuc.data.hata} hata.`,
    })
  } catch (error) {
    console.error("Bilgilendirme işleme hatası:", error)
    return NextResponse.json({ success: false, error: "Kuyruk işlenemedi." }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    ...bilgilendirmeKanalDurumu(),
    mesaj: "POST ile kuyruğu işleyin.",
  })
}
