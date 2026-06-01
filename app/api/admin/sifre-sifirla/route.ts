import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/server/admin-auth"

function sifreUret() {
  return "Fey" + Math.floor(100000 + Math.random() * 900000) + "!"
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminAuth()

    if (!auth.ok) {
      return auth.response
    }

    const body = await req.json()

    const authId = body.auth_id

    if (!authId) {
      return NextResponse.json(
        { error: "auth_id gerekli" },
        { status: 400 },
      )
    }

    const yeniSifre = sifreUret()

    const { error } = await auth.supabaseAdmin.auth.admin.updateUserById(authId, {
      password: yeniSifre,
      user_metadata: {
        ilk_giris: true,
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Bilinmeyen hata" },
      { status: 500 },
    )
  }
}
