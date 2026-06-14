import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null)

  const personelId = body?.personel_id
  const modulKod = body?.modul_kod
  const aktif = Boolean(body?.aktif)

  if (!personelId || !modulKod) {
    return NextResponse.json(
      { error: "personel_id ve modul_kod zorunludur." },
      { status: 400 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase
    .from("personel_modul_yetkileri")
    .upsert(
      {
        personel_id: personelId,
        modul_kod: modulKod,
        aktif,
      },
      {
        onConflict: "personel_id,modul_kod",
      },
    )
    .select("personel_id, modul_kod, aktif")
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 },
    )
  }

  return NextResponse.json({ yetki: data })
}
