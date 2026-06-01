import { NextRequest, NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/server/admin-auth"

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_BASE64_LENGTH = 7_000_000

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(["admin", "servis_yoneticisi"])

    if (!auth.ok) {
      return auth.response
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "AI fiş okuma şu an yapılandırılmamış." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { imageBase64, mediaType } = body

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ success: false, error: "Görsel verisi eksik" }, { status: 400 })
    }

    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length > MAX_BASE64_LENGTH ||
      !ALLOWED_MEDIA_TYPES.includes(mediaType)
    ) {
      return NextResponse.json(
        { success: false, error: "Görsel tipi veya boyutu geçersiz" },
        { status: 400 },
      )
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: `Bu bir yakıt istasyonu fişi. Fişten şu bilgileri çıkar ve SADECE JSON formatında döndür, başka hiçbir şey yazma:\n{"tarih": "YYYY-MM-DD formatında tarih, bulamazsan null", "tutar": "sayısal tutar (TL), bulamazsan null", "litre": "yakıt miktarı (litre), bulamazsan null", "istasyon_adi": "istasyon adı, bulamazsan null", "plaka": "araç plakası (örn: 34 ABC 123), bulamazsan null"}`,
            },
          ],
        }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data))
      return NextResponse.json({ success: false, error: "AI hatası" }, { status: 502 })
    }

    const text = data.content?.[0]?.text || "{}"
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error("Receipt analysis error:", error)
    return NextResponse.json({ success: false, error: "Fiş okunamadı" }, { status: 500 })
  }
}
