import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error: "Supabase admin bağlantısı eksik.",
        details: {
          hasUrl: Boolean(supabaseUrl),
          hasServiceKey: Boolean(serviceKey),
        },
      },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase
    .from("personeller")
    .select("id, ad, soyad, rol, durum, personel_kodu, sirket_id")
    .order("ad", { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 },
    )
  }

  return NextResponse.json({ personeller: data || [] })
}
