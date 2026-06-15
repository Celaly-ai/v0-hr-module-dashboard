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

  if (!body?.personel_id || !body?.yeni_rol) {
    return NextResponse.json(
      { error: "personel_id ve yeni_rol zorunludur." },
      { status: 400 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: personel, error: personelError } = await supabase
    .from("personeller")
    .select("id, ad, soyad, rol")
    .eq("id", body.personel_id)
    .maybeSingle()

  if (personelError || !personel) {
    return NextResponse.json(
      { error: personelError?.message || "Personel bulunamadı." },
      { status: 404 },
    )
  }

  const eskiRol = personel.rol || null
  const yeniRol = String(body.yeni_rol).trim()

  if (!yeniRol) {
    return NextResponse.json(
      { error: "Yeni rol boş olamaz." },
      { status: 400 },
    )
  }

  if (eskiRol === yeniRol) {
    return NextResponse.json({
      success: true,
      degisti: false,
      eski_rol: eskiRol,
      yeni_rol: yeniRol,
    })
  }

  const { error: updateError } = await supabase
    .from("personeller")
    .update({
      rol: yeniRol,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.personel_id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    )
  }

  const { error: logError } = await supabase
    .from("personel_rol_gecmisi")
    .insert({
      personel_id: body.personel_id,
      eski_rol: eskiRol,
      yeni_rol: yeniRol,
      degistiren_personel_id: body.degistiren_personel_id || null,
      degistiren_ad: body.degistiren_ad || null,
      aciklama: body.aciklama || null,
    })

  if (logError) {
    return NextResponse.json(
      {
        error: "Rol güncellendi ancak geçmiş kaydı yazılamadı: " + logError.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    degisti: true,
    personel_id: body.personel_id,
    eski_rol: eskiRol,
    yeni_rol: yeniRol,
  })
}
