import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase yapılandırması eksik." },
      { status: 500 },
    )
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const body = await request.json().catch(() => null)

  if (!body?.personel_id || !body?.yeni_rol) {
    return NextResponse.json(
      { error: "personel_id ve yeni_rol zorunludur." },
      { status: 400 },
    )
  }

  const { data: personel, error: personelError } = await supabase
    .from("personeller")
    .select("*")
    .eq("id", body.personel_id)
    .single()

  if (personelError || !personel) {
    return NextResponse.json(
      { error: "Personel bulunamadı." },
      { status: 404 },
    )
  }

  const eskiRol = personel.rol

  const { error: updateError } = await supabase
    .from("personeller")
    .update({
      rol: body.yeni_rol,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.personel_id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    )
  }

  await supabase
    .from("personel_rol_gecmisi")
    .insert({
      personel_id: body.personel_id,
      eski_rol: eskiRol,
      yeni_rol: body.yeni_rol,
      degistiren_personel_id:
        body.degistiren_personel_id || null,
      degistiren_ad:
        body.degistiren_ad || null,
      aciklama:
        body.aciklama || null,
    })

  return NextResponse.json({
    success: true,
    eski_rol: eskiRol,
    yeni_rol: body.yeni_rol,
  })
}
