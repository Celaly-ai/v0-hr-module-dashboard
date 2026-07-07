import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { uretBayiAiYanitOneri } from "@/lib/bayi-ai-yanit"
import { getBayiTalep, listBayiTalepMesajlari } from "@/lib/services/bayi-operasyon-service"

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
    const talepId = String(body?.talep_id || "").trim()

    if (!talepId) {
      return NextResponse.json({ success: false, error: "talep_id zorunludur." }, { status: 400 })
    }

    const [talepSonuc, mesajSonuc] = await Promise.all([
      getBayiTalep(talepId, supabase),
      listBayiTalepMesajlari(talepId, supabase),
    ])

    if (!talepSonuc.ok) {
      return NextResponse.json({ success: false, error: talepSonuc.error }, { status: 400 })
    }

    const mesajlar = mesajSonuc.ok ? mesajSonuc.data : []
    const oneri = await uretBayiAiYanitOneri(talepSonuc.data, mesajlar)

    return NextResponse.json({ success: true, data: oneri })
  } catch (error) {
    console.error("AI yanıt öneri hatası:", error)
    return NextResponse.json({ success: false, error: "AI yanıt önerisi üretilemedi." }, { status: 500 })
  }
}
