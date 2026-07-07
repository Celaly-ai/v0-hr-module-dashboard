import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { gonderOnayliBayiYanit } from "@/lib/services/bayi-operasyon-service"

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
    const mesaj = String(body?.mesaj || "").trim()
    const bilgilendir = Boolean(body?.bilgilendir)

    if (!talepId || !mesaj) {
      return NextResponse.json(
        { success: false, error: "talep_id ve mesaj zorunludur." },
        { status: 400 }
      )
    }

    const sonuc = await gonderOnayliBayiYanit(talepId, mesaj, { bilgilendir }, supabase)

    if (!sonuc.ok) {
      return NextResponse.json({ success: false, error: sonuc.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: sonuc.data,
      mesaj: bilgilendir
        ? "Mesaj gönderildi ve bilgilendirme kuyruğuna eklendi."
        : "Mesaj gönderildi.",
    })
  } catch (error) {
    console.error("AI yanıt gönder hatası:", error)
    return NextResponse.json({ success: false, error: "Yanıt gönderilemedi." }, { status: 500 })
  }
}
