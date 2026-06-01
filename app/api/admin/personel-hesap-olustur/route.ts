import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/server/admin-auth"

function normalizePhone(value: string) {
  let digits = String(value || "").replace(/\D/g, "")

  if (digits.startsWith("90")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)

  return digits.slice(-10)
}

function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@feyroute.com`
}

function sifreUret() {
  return `Fey${Math.floor(100000 + Math.random() * 900000)}!`
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth()

    if (!auth.ok) {
      return auth.response
    }

    const { personelId } = await request.json()

    if (!personelId) {
      return NextResponse.json(
        { error: "Personel id zorunludur." },
        { status: 400 },
      )
    }

    const { supabaseAdmin } = auth

    const { data: personel, error: personelError } = await supabaseAdmin
      .from("personeller")
      .select("id, ad, soyad, tel, email, telefon_normalized, auth_id, durum")
      .eq("id", personelId)
      .maybeSingle()

    if (personelError) {
      return NextResponse.json(
        { error: "Personel sorgu hatası: " + personelError.message },
        { status: 500 },
      )
    }

    if (!personel) {
      return NextResponse.json(
        { error: "Personel bulunamadı." },
        { status: 404 },
      )
    }

    if (personel.auth_id) {
      return NextResponse.json(
        { error: "Bu personel için zaten giriş hesabı oluşturulmuş." },
        { status: 400 },
      )
    }

    const telefonKaynak = personel.telefon_normalized || personel.tel || ""
    const cleanPhone = normalizePhone(telefonKaynak)

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        {
          error: `Personelin geçerli telefon numarası yok. Okunan değer: ${
            telefonKaynak || "boş"
          }`,
        },
        { status: 400 },
      )
    }

    const email = phoneToEmail(cleanPhone)
    const geciciSifre = sifreUret()

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: geciciSifre,
        email_confirm: true,
        user_metadata: {
          personel_id: personel.id,
          ad: personel.ad || "",
          soyad: personel.soyad || "",
          ilk_giris: true,
        },
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            "Auth hesabı oluşturulamadı: " +
            (authError?.message || "Bilinmeyen hata"),
        },
        { status: 500 },
      )
    }

    const { data: updatedPersonel, error: updateError } = await supabaseAdmin
      .from("personeller")
      .update({
        auth_id: authData.user.id,
        email,
        telefon_normalized: cleanPhone,
      })
      .eq("id", personel.id)
      .select("id, auth_id, email, telefon_normalized")
      .maybeSingle()

    if (updateError) {
      return NextResponse.json(
        { error: "Personel hesabı bağlanamadı: " + updateError.message },
        { status: 500 },
      )
    }

    if (!updatedPersonel?.auth_id) {
      return NextResponse.json(
        {
          error:
            "Auth kullanıcısı oluştu fakat personeller.auth_id alanı güncellenemedi.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      email,
      sifre: geciciSifre,
      auth_id: authData.user.id,
      mesaj: "Giriş hesabı oluşturuldu.",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Beklenmeyen hata oluştu." },
      { status: 500 },
    )
  }
}
