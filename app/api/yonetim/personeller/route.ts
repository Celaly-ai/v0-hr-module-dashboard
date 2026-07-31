import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const durumFiltre = new URL(request.url).searchParams.get("durum")?.trim() || null

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

  let query = supabase
    .from("personeller")
    .select("id, sirket_id, personel_kodu, ad, soyad, tel, telefon_normalized, auth_id, kullanici_id, rol, durum, lokasyon, bolge, ise_giris_tarihi, notlar")
    .order("ad", { ascending: true })

  if (durumFiltre) {
    query = query.eq("durum", durumFiltre)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 },
    )
  }

  return NextResponse.json({ personeller: data || [] })
}
