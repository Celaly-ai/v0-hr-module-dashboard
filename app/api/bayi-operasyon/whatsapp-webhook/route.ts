import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { parseWhatsAppWebhookBody } from "@/lib/bayi-webhook-parser"
import { whatsappWebhookTalepOlustur } from "@/lib/services/bayi-operasyon-service"

const WEBHOOK_TOKEN = process.env.BAYI_WHATSAPP_WEBHOOK_TOKEN?.trim()
const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN?.trim() || process.env.BAYI_WHATSAPP_WEBHOOK_TOKEN?.trim()

function webhookTokenGecerli(request: NextRequest) {
  if (!WEBHOOK_TOKEN) return true

  const token =
    request.headers.get("x-bayi-webhook-token") ||
    request.nextUrl.searchParams.get("token") ||
    ""

  return token === WEBHOOK_TOKEN
}

/** Meta Cloud API webhook doğrulaması */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode")
  const token = request.nextUrl.searchParams.get("hub.verify_token")
  const challenge = request.nextUrl.searchParams.get("hub.challenge")

  if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ success: false, error: "Doğrulama başarısız." }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    if (!webhookTokenGecerli(request)) {
      return NextResponse.json({ success: false, error: "Geçersiz webhook token." }, { status: 401 })
    }

    const body = await request.json()
    const parsed = parseWhatsAppWebhookBody(body)

    if (!parsed?.mesaj) {
      return NextResponse.json({ success: true, mesaj: "İşlenecek mesaj yok." })
    }

    const serviceClient = createServiceRoleClient()
    const sessionClient = serviceClient ? null : await createClient()

    const client = serviceClient || sessionClient
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Supabase yapılandırması eksik." },
        { status: 500 }
      )
    }

    const sonuc = await whatsappWebhookTalepOlustur(
      {
        mesaj: parsed.mesaj,
        telefon: parsed.telefon,
        gonderen_ad: parsed.gonderen_ad,
        sirket_id: parsed.sirket_id,
        meta_message_id: parsed.meta_message_id,
      },
      client
    )

    if (!sonuc.ok) {
      if (serviceClient) {
        try {
          await serviceClient.from("bayi_whatsapp_webhook_loglari").insert({
            kaynak: parsed.meta_message_id ? "meta" : "stub",
            telefon: parsed.telefon || null,
            mesaj: parsed.mesaj,
            meta_message_id: parsed.meta_message_id || null,
            durum: "hata",
            hata_mesaji: sonuc.error,
          })
        } catch {
          // ignore
        }
      }

      return NextResponse.json({ success: false, error: sonuc.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        talep_id: sonuc.data.id,
        talep_no: sonuc.data.talep_no,
        talep_turu: sonuc.data.talep_turu,
        service_role: Boolean(serviceClient),
      },
      mesaj: "WhatsApp talebi oluşturuldu.",
    })
  } catch (error) {
    console.error("WhatsApp webhook hatası:", error)
    return NextResponse.json({ success: false, error: "Webhook işlenemedi." }, { status: 500 })
  }
}
