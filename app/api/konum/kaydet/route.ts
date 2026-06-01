import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/server/admin-auth"

const KONUM_YONETICI_ROLLERI = ["admin", "ik_yoneticisi", "servis_yoneticisi"]

export async function POST(req: Request) {
  try {
    const auth = await requireAdminAuth([
      ...KONUM_YONETICI_ROLLERI,
      "urun_sorumlusu",
      "calisan",
    ])

    if (!auth.ok) {
      return auth.response
    }

    const body = await req.json()

    const personel_id = body.personel_id
    const enlem = Number(body.enlem)
    const boylam = Number(body.boylam)
    const hiz = body.hiz ?? null
    const dogruluk = body.dogruluk ?? null
    const kaynak = body.kaynak || "web_test"

    if (!personel_id) {
      return NextResponse.json(
        { error: "personel_id zorunludur." },
        { status: 400 },
      )
    }

    if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) {
      return NextResponse.json(
        { error: "Geçerli enlem ve boylam zorunludur." },
        { status: 400 },
      )
    }

    if (enlem < -90 || enlem > 90 || boylam < -180 || boylam > 180) {
      return NextResponse.json(
        { error: "Konum değerleri geçersiz aralıkta." },
        { status: 400 },
      )
    }

    if (!KONUM_YONETICI_ROLLERI.includes(auth.role)) {
      const { data: personel } = await auth.supabaseAdmin
        .from("personeller")
        .select("id")
        .or(`auth_id.eq.${auth.user.id},kullanici_id.eq.${auth.user.id}`)
        .limit(1)
        .maybeSingle()

      if (personel?.id !== personel_id) {
        return NextResponse.json(
          { error: "Bu personel için konum kaydı gönderemezsiniz." },
          { status: 403 },
        )
      }
    }

    const { error } = await auth.supabaseAdmin.from("personel_konum_loglari").insert({
      personel_id,
      enlem,
      boylam,
      hiz,
      dogruluk,
      kaynak,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Konum kaydedildi.",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Bilinmeyen hata" },
      { status: 500 },
    )
  }
}
