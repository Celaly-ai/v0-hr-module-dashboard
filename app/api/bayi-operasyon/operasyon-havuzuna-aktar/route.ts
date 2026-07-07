import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { bayiTalepOperasyonaAktar } from "@/lib/services/bayi-operasyon-service"

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
    const talepId = String(body?.talep_id || body?.talepId || "").trim()

    if (!talepId) {
      return NextResponse.json({ success: false, error: "talep_id zorunludur." }, { status: 400 })
    }

    const sonuc = await bayiTalepOperasyonaAktar(talepId, supabase)

    if (!sonuc.ok) {
      return NextResponse.json({ success: false, error: sonuc.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: sonuc.data,
      mesaj: `Talep operasyon havuzuna aktarıldı. Fiş no: ${sonuc.data.bekleyen.fis_no}`,
    })
  } catch (error) {
    console.error("Operasyon aktarım hatası:", error)
    return NextResponse.json({ success: false, error: "Operasyon aktarımı başarısız." }, { status: 500 })
  }
}
