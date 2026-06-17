import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase admin bağlantısı eksik.")
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function temiz(value: unknown) {
  const text = String(value || "").trim()
  return text.length > 0 ? text : null
}

function sayi(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function kunyeTamamMi(payload: any) {
  return Boolean(
    temiz(payload.ad) &&
      temiz(payload.unvan) &&
      temiz(payload.vergi_no) &&
      temiz(payload.tel) &&
      temiz(payload.email) &&
      temiz(payload.il) &&
      temiz(payload.ilce) &&
      temiz(payload.mahalle) &&
      temiz(payload.acik_adres) &&
      sayi(payload.giris_cikis_lat) !== null &&
      sayi(payload.giris_cikis_lng) !== null,
  )
}

export async function GET() {
  try {
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("sirketler")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sirket: data || null })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Şirket künyesi alınamadı." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()
    const body = await request.json().catch(() => null)

    const payload = {
      ad: temiz(body?.ad),
      unvan: temiz(body?.unvan),
      kod: temiz(body?.kod),
      sektor: temiz(body?.sektor),
      tel: temiz(body?.tel),
      email: temiz(body?.email),
      logo_url: temiz(body?.logo_url),

      vergi_no: temiz(body?.vergi_no),
      vergi_dairesi: temiz(body?.vergi_dairesi),
      mersis_no: temiz(body?.mersis_no),
      ticaret_sicil_no: temiz(body?.ticaret_sicil_no),
      web_sitesi: temiz(body?.web_sitesi),

      il: temiz(body?.il),
      ilce: temiz(body?.ilce),
      mahalle: temiz(body?.mahalle),
      acik_adres: temiz(body?.acik_adres),
      adres: temiz(body?.adres) || temiz(body?.acik_adres),

      giris_cikis_lat: sayi(body?.giris_cikis_lat),
      giris_cikis_lng: sayi(body?.giris_cikis_lng),
      giris_cikis_mesafe_limiti: sayi(body?.giris_cikis_mesafe_limiti) || 50,

      yetkili_ad_soyad: temiz(body?.yetkili_ad_soyad),
      yetkili_telefon: temiz(body?.yetkili_telefon),
      yetkili_email: temiz(body?.yetkili_email),

      updated_at: new Date().toISOString(),
    }

    const finalPayload = {
      ...payload,
      kunye_tamamlandi: kunyeTamamMi(payload),
    }

    const id = temiz(body?.id)

    const query = id
      ? supabase.from("sirketler").update(finalPayload).eq("id", id).select("*").single()
      : supabase.from("sirketler").insert({
          ...finalPayload,
          aktif: true,
        }).select("*").single()

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      sirket: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Şirket künyesi kaydedilemedi." },
      { status: 500 },
    )
  }
}
