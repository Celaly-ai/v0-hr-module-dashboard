import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function sifreUret() {
  return "Fey" + Math.floor(100000 + Math.random() * 900000) + "!"
}

export async function POST(req: Request) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase admin bağlantısı eksik." },
      { status: 500 },
    )
  }

  const body = await req.json().catch(() => null)
  const authId = body?.auth_id

  if (!authId) {
    return NextResponse.json(
      { error: "auth_id gerekli." },
      { status: 400 },
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const yeniSifre = sifreUret()

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    password: yeniSifre,
    user_metadata: {
      ilk_giris: true,
      sifre_degistirme_gerekli: true,
    },
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    yeni_sifre: yeniSifre,
  })
}
