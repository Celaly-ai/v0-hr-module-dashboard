import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { uretBayiZiyaretAiPlan } from "@/lib/bayi-ziyaret-ai"
import { getBayiKart, listBayiTalepleri } from "@/lib/services/bayi-operasyon-service"

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
    const bayiKartId = String(body?.bayi_kart_id || "").trim()

    if (!bayiKartId) {
      return NextResponse.json({ success: false, error: "bayi_kart_id zorunludur." }, { status: 400 })
    }

    const [bayiSonuc, talepSonuc] = await Promise.all([
      getBayiKart(bayiKartId, supabase),
      listBayiTalepleri({ bayi_kart_id: bayiKartId }, supabase),
    ])

    if (!bayiSonuc.ok) {
      return NextResponse.json({ success: false, error: bayiSonuc.error }, { status: 400 })
    }

    const plan = await uretBayiZiyaretAiPlan(
      bayiSonuc.data,
      talepSonuc.ok ? talepSonuc.data : []
    )

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    console.error("Ziyaret AI plan hatası:", error)
    return NextResponse.json({ success: false, error: "Ziyaret planı üretilemedi." }, { status: 500 })
  }
}
