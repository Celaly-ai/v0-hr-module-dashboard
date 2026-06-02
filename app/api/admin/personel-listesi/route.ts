import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/server/admin-auth"

export async function GET() {
  try {
    const auth = await requireAdminAuth()

    if (!auth.ok) {
      return auth.response
    }

    const { supabaseAdmin } = auth

    const { data, error } = await supabaseAdmin
      .from("personeller")
      .select("id, personel_kodu, ad, soyad, tel, email, telefon_normalized, auth_id, rol, durum, sirket_id, sube_id")
      .order("ad", { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: "Personel listesi alınamadı: " + error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      personeller: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Beklenmeyen hata oluştu." },
      { status: 500 },
    )
  }
}
