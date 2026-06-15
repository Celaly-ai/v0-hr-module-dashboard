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

function temiz(value: FormDataEntryValue | null) {
  const text = String(value || "").trim()
  return text.length > 0 ? text : null
}

async function dosyaYukle(
  supabase: ReturnType<typeof getAdminClient>,
  cihazId: string,
  hareketId: string,
  file: File | null,
  fotografTipi: string,
) {
  if (!file || file.size <= 0) return null

  const uzanti = file.name.split(".").pop() || "jpg"
  const dosyaAdi = `${Date.now()}_${fotografTipi}.${uzanti}`
  const storagePath = `${cihazId}/${dosyaAdi}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from("cihazlar")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    throw new Error("Fotoğraf yüklenemedi: " + uploadError.message)
  }

  const { data: urlData } = supabase.storage
    .from("cihazlar")
    .getPublicUrl(storagePath)

  const { error: fotoError } = await supabase
    .from("cihaz_fotograflari")
    .insert({
      cihaz_id: cihazId,
      hareket_id: hareketId,
      fotograf_tipi: fotografTipi,
      dosya_adi: file.name,
      dosya_tipi: file.type,
      dosya_boyutu: file.size,
      storage_bucket: "cihazlar",
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      aciklama: `${fotografTipi} fotoğrafı`,
    })

  if (fotoError) {
    throw new Error("Fotoğraf kaydı oluşturulamadı: " + fotoError.message)
  }

  return urlData.publicUrl
}

export async function GET() {
  try {
    const supabase = getAdminClient()

    const { data: cihazlar, error: cihazError } = await supabase
      .from("cihazlar")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (cihazError) {
      return NextResponse.json({ error: cihazError.message }, { status: 500 })
    }

    const cihazIds = (cihazlar || []).map((c) => c.id)

    let hareketler: any[] = []
    let fotograflar: any[] = []

    if (cihazIds.length > 0) {
      const { data: hareketData } = await supabase
        .from("cihaz_hareketleri")
        .select("*")
        .in("cihaz_id", cihazIds)
        .order("created_at", { ascending: false })

      const { data: fotoData } = await supabase
        .from("cihaz_fotograflari")
        .select("*")
        .in("cihaz_id", cihazIds)
        .order("created_at", { ascending: false })

      hareketler = hareketData || []
      fotograflar = fotoData || []
    }

    return NextResponse.json({
      cihazlar: cihazlar || [],
      hareketler,
      fotograflar,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Cihaz listesi alınamadı." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()
    const form = await request.formData()

    const barkod = temiz(form.get("barkod"))
    const seriNo = temiz(form.get("seri_no"))

    if (!barkod && !seriNo) {
      return NextResponse.json(
        { error: "Barkod veya seri numarası zorunludur." },
        { status: 400 },
      )
    }

    const payload = {
      cihaz_kodu: temiz(form.get("cihaz_kodu")),
      barkod,
      seri_no: seriNo,
      marka: temiz(form.get("marka")),
      model: temiz(form.get("model")),
      urun_grubu: temiz(form.get("urun_grubu")),
      satici_tipi: temiz(form.get("satici_tipi")),
      satici_adi: temiz(form.get("satici_adi")),
      musteri_adi: temiz(form.get("musteri_adi")),
      musteri_telefon: temiz(form.get("musteri_telefon")),
      musteri_adres: temiz(form.get("musteri_adres")),
      kaynak_tipi: temiz(form.get("kaynak_tipi")) || "servise_getirildi",
      kaynak_aciklama: temiz(form.get("kaynak_aciklama")),
      mevcut_konum_tipi: "servis",
      mevcut_konum_adi: "Servis",
      mevcut_zimmet_tipi: "servis",
      mevcut_zimmet_adi: "Servis",
      durum: "kabul_edildi",
      son_hareket_at: new Date().toISOString(),
      notlar: temiz(form.get("notlar")),
    }

    const { data: cihaz, error: cihazError } = await supabase
      .from("cihazlar")
      .insert(payload)
      .select("*")
      .single()

    if (cihazError) {
      return NextResponse.json(
        { error: "Cihaz kaydedilemedi: " + cihazError.message },
        { status: 500 },
      )
    }

    const { data: hareket, error: hareketError } = await supabase
      .from("cihaz_hareketleri")
      .insert({
        cihaz_id: cihaz.id,
        hareket_tipi: "cihaz_kabul",
        onceki_durum: null,
        yeni_durum: "kabul_edildi",
        kaynak_tipi: payload.kaynak_tipi,
        kaynak_adi: payload.kaynak_aciklama,
        hedef_tipi: "servis",
        hedef_adi: "Servis",
        aciklama: "Cihaz kabul kaydı oluşturuldu.",
      })
      .select("*")
      .single()

    if (hareketError) {
      return NextResponse.json(
        { error: "Hareket kaydı oluşturulamadı: " + hareketError.message },
        { status: 500 },
      )
    }

    await dosyaYukle(supabase, cihaz.id, hareket.id, form.get("barkod_foto") as File | null, "barkod")
    await dosyaYukle(supabase, cihaz.id, hareket.id, form.get("cihaz_foto") as File | null, "cihaz")
    await dosyaYukle(supabase, cihaz.id, hareket.id, form.get("koli_foto") as File | null, "koli")

    return NextResponse.json({
      success: true,
      cihaz,
      hareket,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Cihaz kabul işlemi başarısız." },
      { status: 500 },
    )
  }
}
