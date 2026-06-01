import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, mediaType } = body

    if (!imageBase64 || !mediaType) {
      return NextResponse.json(
        { success: false, error: "Görsel verisi eksik" },
        { status: 400 }
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Bu bir yakıt istasyonu fişi. Fişten şu bilgileri çıkar ve SADECE JSON formatında döndür, başka hiçbir şey yazma:\n{"tarih": "YYYY-MM-DD formatında tarih, bulamazsan null", "tutar": "sayısal tutar (TL), bulamazsan null", "litre": "yakıt miktarı (litre), bulamazsan null", "istasyon_adi": "istasyon adı, bulamazsan null"}`,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data))
      return NextResponse.json(
        { success: false, error: "AI hatası: " + (data.error?.message || "bilinmeyen") },
        { status: 502 }
      )
    }

    const text = data.content?.[0]?.text || "{}"
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error("Receipt analysis error:", error)
    return NextResponse.json(
      { success: false, error: "Fiş okunamadı" },
      { status: 500 }
    )
  }
}
// deploy test  1 Haz 2026 Pzt +03 16:55:17
