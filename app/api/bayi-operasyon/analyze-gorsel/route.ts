import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { BayiGorselAnalizSonuc, BayiGorselOcrAlanlari } from "@/lib/types/bayi-operasyon"

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_BASE64_LENGTH = 7_000_000

const BOS_ALANLAR: BayiGorselOcrAlanlari = {
  musteri_adi: null,
  telefon: null,
  alternatif_telefon: null,
  adres: null,
  il: null,
  ilce: null,
  mahalle: null,
  urun_turu: null,
  model: null,
  seri_no: null,
  satis_tarihi: null,
  aciklama: null,
}

function stubSonuc(mesaj: string): BayiGorselAnalizSonuc {
  return {
    mode: "stub",
    alanlar: { ...BOS_ALANLAR },
    guven_skoru: 0,
    mesaj,
  }
}

function alanlariTemizle(raw: Record<string, unknown>): BayiGorselOcrAlanlari {
  const metin = (key: keyof BayiGorselOcrAlanlari) => {
    const deger = raw[key]
    if (typeof deger !== "string") return null
    const temiz = deger.trim()
    return temiz || null
  }

  return {
    musteri_adi: metin("musteri_adi"),
    telefon: metin("telefon"),
    alternatif_telefon: metin("alternatif_telefon"),
    adres: metin("adres"),
    il: metin("il"),
    ilce: metin("ilce"),
    mahalle: metin("mahalle"),
    urun_turu: metin("urun_turu"),
    model: metin("model"),
    seri_no: metin("seri_no"),
    satis_tarihi: metin("satis_tarihi"),
    aciklama: metin("aciklama"),
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase yapılandırması eksik." },
        { status: 500 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı." }, { status: 401 })
    }

    const body = await request.json()
    const { imageBase64, mediaType, talep_turu } = body

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ success: false, error: "Görsel verisi eksik." }, { status: 400 })
    }

    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length > MAX_BASE64_LENGTH ||
      !ALLOWED_MEDIA_TYPES.includes(mediaType)
    ) {
      return NextResponse.json(
        { success: false, error: "Görsel tipi veya boyutu geçersiz." },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: stubSonuc(
          "AI OCR yapılandırılmamış. Görsel kaydedilecek; alanları manuel doldurabilirsiniz."
        ),
      })
    }

    const turNotu =
      typeof talep_turu === "string" && talep_turu.trim()
        ? `Talep türü: ${talep_turu}.`
        : ""

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 768,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text: `Bu bir servis/ERP ekran görüntüsü (bayi talep formu, müşteri kaydı veya iş emri ekranı olabilir). ${turNotu}
Görseldeki müşteri ve ürün bilgilerini çıkar. SADECE JSON formatında döndür, başka hiçbir şey yazma:
{"musteri_adi":"müşteri adı veya null","telefon":"telefon veya null","alternatif_telefon":"alternatif telefon veya null","adres":"tam adres veya null","il":"il veya null","ilce":"ilçe veya null","mahalle":"mahalle veya null","urun_turu":"ürün türü veya null","model":"model/ürün kodu veya null","seri_no":"seri numarası veya null","satis_tarihi":"YYYY-MM-DD formatında satış tarihi veya null","aciklama":"ek not/açıklama veya null","guven_skoru":0-100 arası okuma güveni}`,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Bayi OCR Anthropic error:", JSON.stringify(data))
      return NextResponse.json({
        success: true,
        data: stubSonuc("AI analizi şu an yapılamadı. Görsel kaydedilecek."),
      })
    }

    const text = data.content?.[0]?.text || "{}"
    const clean = text.replace(/```json|```/g, "").trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({
        success: true,
        data: stubSonuc("Görsel okunamadı. Alanları manuel doldurun."),
      })
    }

    const guvenHam = Number(parsed.guven_skoru)
    const guven_skoru =
      Number.isFinite(guvenHam) && guvenHam >= 0 && guvenHam <= 100 ? Math.round(guvenHam) : 40

    const sonuc: BayiGorselAnalizSonuc = {
      mode: "ai",
      alanlar: alanlariTemizle(parsed),
      guven_skoru,
      ham_metin: clean,
      mesaj: "ERP ekranı analiz edildi. Önerilen alanları forma uygulayabilirsiniz.",
    }

    return NextResponse.json({ success: true, data: sonuc })
  } catch (error) {
    console.error("Bayi görsel analiz hatası:", error)
    return NextResponse.json({ success: false, error: "Görsel analiz edilemedi." }, { status: 500 })
  }
}
