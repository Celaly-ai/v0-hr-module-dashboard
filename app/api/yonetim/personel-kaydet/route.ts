import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function normalizePhone(value: string) {
  let digits = String(value || "").replace(/\D/g, "")
  if (digits.startsWith("90")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(-10)
}

export async function POST(request: Request) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase admin bağlantısı eksik." }, { status: 500 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.personel_kodu || !body?.ad || !body?.soyad || !body?.telefon) {
    return NextResponse.json({ error: "Personel kodu, ad, soyad ve telefon zorunludur." }, { status: 400 })
  }

  const cleanPhone = normalizePhone(body.telefon)

  if (cleanPhone.length !== 10) {
    return NextResponse.json({ error: "Geçerli telefon numarası giriniz." }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let sirketId = body.sirket_id || null

  if (!sirketId && body.id) {
    const { data: mevcut } = await supabase
      .from("personeller")
      .select("sirket_id")
      .eq("id", body.id)
      .maybeSingle()

    sirketId = mevcut?.sirket_id || null
  }

  if (!sirketId) {
    const { data: ilkSirketli } = await supabase
      .from("personeller")
      .select("sirket_id")
      .not("sirket_id", "is", null)
      .limit(1)
      .maybeSingle()

    sirketId = ilkSirketli?.sirket_id || null
  }

  if (!sirketId) {
    return NextResponse.json({ error: "Şirket ID bulunamadı." }, { status: 400 })
  }

  const payload = {
    sirket_id: sirketId,
    personel_kodu: String(body.personel_kodu).trim(),
    ad: String(body.ad).trim(),
    soyad: String(body.soyad).trim(),
    tel: `0${cleanPhone}`,
    telefon_normalized: cleanPhone,
    rol: body.rol || "calisan",
    durum: body.durum || "aktif",
    lokasyon: body.lokasyon || null,
    bolge: body.bolge || null,
    ise_giris_tarihi: body.ise_giris_tarihi || null,
    notlar: body.notlar || null,
    updated_at: new Date().toISOString(),
  }

  const query = body.id
    ? supabase.from("personeller").update(payload).eq("id", body.id).select("id").single()
    : supabase.from("personeller").insert(payload).select("id").single()

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 })
  }

  return NextResponse.json({ personel: data })
}
