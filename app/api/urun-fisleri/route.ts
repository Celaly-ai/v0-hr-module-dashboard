import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase admin bağlantısı eksik.")
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function GET() {
  try {
    const supabase = getAdminClient()

    const [
      kabulFisleriRes,
      kabulKalemleriRes,
      devirFisleriRes,
      devirKalemleriRes,
    ] = await Promise.all([
      supabase
        .from("urun_hareket_fisleri")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("urun_hareket_fisi_kalemleri")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),

      supabase
        .from("urun_devir_fisleri")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("urun_devir_fisi_kalemleri")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
    ])

    if (kabulFisleriRes.error) {
      return NextResponse.json({ error: kabulFisleriRes.error.message }, { status: 500 })
    }

    if (kabulKalemleriRes.error) {
      return NextResponse.json({ error: kabulKalemleriRes.error.message }, { status: 500 })
    }

    if (devirFisleriRes.error) {
      return NextResponse.json({ error: devirFisleriRes.error.message }, { status: 500 })
    }

    if (devirKalemleriRes.error) {
      return NextResponse.json({ error: devirKalemleriRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
      kabulFisleri: kabulFisleriRes.data || [],
      kabulKalemleri: kabulKalemleriRes.data || [],
      devirFisleri: devirFisleriRes.data || [],
      devirKalemleri: devirKalemleriRes.data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ürün fişleri alınamadı." },
      { status: 500 },
    )
  }
}
