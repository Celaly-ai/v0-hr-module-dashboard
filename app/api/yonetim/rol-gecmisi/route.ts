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

  const { data: gecmisData, error: gecmisError } = await supabase
    .from("personel_rol_gecmisi")
    .select(
      "id, personel_id, eski_rol, yeni_rol, degistiren_personel_id, degistiren_ad, aciklama, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500)

  if (gecmisError) {
    return NextResponse.json(
      {
        error: gecmisError.message,
        code: gecmisError.code,
        details: gecmisError.details,
      },
      { status: 500 },
    )
  }

  const personelIds = Array.from(
    new Set((gecmisData || []).map((k) => k.personel_id).filter(Boolean)),
  )

  let personeller: any[] = []

  if (personelIds.length > 0) {
    const { data: personelData, error: personelError } = await supabase
      .from("personeller")
      .select("id, personel_kodu, ad, soyad")
      .in("id", personelIds)

    if (personelError) {
      return NextResponse.json(
        {
          error: personelError.message,
          code: personelError.code,
          details: personelError.details,
        },
        { status: 500 },
      )
    }

    personeller = personelData || []
  }

  return NextResponse.json({
    kayitlar: gecmisData || [],
    personeller,
  })
}
