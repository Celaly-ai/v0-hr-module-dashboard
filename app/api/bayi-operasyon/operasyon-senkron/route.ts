import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { senkronizeBayiOperasyonDurumlari } from "@/lib/services/bayi-operasyon-service"

export async function POST() {
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

    const sonuc = await senkronizeBayiOperasyonDurumlari(supabase)

    if (!sonuc.ok) {
      return NextResponse.json({ success: false, error: sonuc.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: sonuc.data,
      mesaj: `${sonuc.data.guncellenen} talep operasyon durumuna göre güncellendi.`,
    })
  } catch (error) {
    console.error("Operasyon senkron hatası:", error)
    return NextResponse.json({ success: false, error: "Senkronizasyon başarısız." }, { status: 500 })
  }
}
