import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { bilgilendirmeKanalDurumu, bayiSmsGonder } from "@/lib/bayi-sms-sender"

export async function GET() {
  const durum = bilgilendirmeKanalDurumu()
  return NextResponse.json({
    success: true,
    ...durum,
    mesaj: "POST ile test SMS gönderin: { telefon, mesaj }",
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase yapılandırması eksik." }, { status: 500 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı." }, { status: 401 })
    }

    const body = await request.json()
    const telefon = String(body?.telefon || body?.phone || "").trim()
    const mesaj =
      String(body?.mesaj || body?.message || "").trim() ||
      "FeyRoute Bayii Operasyon Merkezi SMS test mesajı."

    if (!telefon) {
      return NextResponse.json({ success: false, error: "telefon zorunludur." }, { status: 400 })
    }

    const sonuc = await bayiSmsGonder(telefon, mesaj)

    if (!sonuc.ok) {
      return NextResponse.json(
        { success: false, error: sonuc.error, saglayici: sonuc.saglayici },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      saglayici: sonuc.saglayici,
      messageId: sonuc.messageId,
      mesaj: "SMS test gönderimi tamamlandı.",
    })
  } catch (error) {
    console.error("SMS test hatası:", error)
    return NextResponse.json({ success: false, error: "SMS testi başarısız." }, { status: 500 })
  }
}
