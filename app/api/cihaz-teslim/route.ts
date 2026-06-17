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

function telefonNormalize(value: unknown) {
  const raw = String(value || "")
  const digits = raw.replace(/\D/g, "")

  if (digits.startsWith("90") && digits.length === 12) return digits.slice(2)
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1)
  if (digits.length === 10) return digits

  return digits || null
}

async function musteriBulVeyaOlustur(
  supabase: any,
  payload: {
    musteriAdi: string
    musteriTelefon: string
    musteriAdres: string
    sirketId?: string | null
  },
) {
  const telefonNormalized = telefonNormalize(payload.musteriTelefon)

  let mevcutMusteri: any = null

  if (telefonNormalized) {
    const { data } = await supabase
      .from("musteriler")
      .select("*")
      .eq("telefon_normalized", telefonNormalized)
      .maybeSingle()

    mevcutMusteri = data || null
  }

  if (!mevcutMusteri) {
    const { data } = await supabase
      .from("musteriler")
      .select("*")
      .eq("telefon", payload.musteriTelefon)
      .maybeSingle()

    mevcutMusteri = data || null
  }

  if (mevcutMusteri?.id) {
    const { data: guncel, error } = await supabase
      .from("musteriler")
      .update({
        musteri_adi: payload.musteriAdi,
        telefon: payload.musteriTelefon,
        telefon_normalized: telefonNormalized,
        adres: payload.musteriAdres,
        son_servis_tarihi: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", mevcutMusteri.id)
      .select("*")
      .single()

    if (error || !guncel) {
      throw new Error("Müşteri kaydı güncellenemedi: " + (error?.message || ""))
    }

    return guncel
  }

  const { data: yeni, error: yeniError } = await supabase
    .from("musteriler")
    .insert({
      sirket_id: payload.sirketId || null,
      musteri_adi: payload.musteriAdi,
      telefon: payload.musteriTelefon,
      telefon_normalized: telefonNormalized,
      adres: payload.musteriAdres,
      kaynak: "cihaz_teslim",
      musteri_tipi: "cihaz_musterisi",
      son_servis_tarihi: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (yeniError || !yeni) {
    throw new Error("Müşteri kaydı oluşturulamadı: " + (yeniError?.message || ""))
  }

  return yeni
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()
    const body = await request.json().catch(() => null)

    const barkod = temiz(body?.barkod)
    const cihazId = temiz(body?.cihaz_id)

    if (!barkod && !cihazId) {
      return NextResponse.json(
        { error: "Barkod veya cihaz id zorunludur." },
        { status: 400 },
      )
    }

    const musteriAdi = temiz(body?.musteri_adi)
    const musteriTelefon = temiz(body?.musteri_telefon)
    const musteriAdres = temiz(body?.musteri_adres)

    if (!musteriAdi || !musteriTelefon || !musteriAdres) {
      return NextResponse.json(
        { error: "Müşteri adı, telefon ve adres zorunludur." },
        { status: 400 },
      )
    }

    let cihazQuery = supabase.from("cihazlar").select("*")

    if (cihazId) {
      cihazQuery = cihazQuery.eq("id", cihazId)
    } else {
      cihazQuery = cihazQuery.eq("barkod", barkod)
    }

    const { data: cihaz, error: cihazError } = await cihazQuery.maybeSingle()

    if (cihazError || !cihaz) {
      return NextResponse.json(
        { error: "Cihaz bulunamadı." },
        { status: 404 },
      )
    }

    const musteri = await musteriBulVeyaOlustur(supabase, {
      musteriAdi,
      musteriTelefon,
      musteriAdres,
      sirketId: cihaz.sirket_id || null,
    })

    const oncekiDurum = cihaz.durum || null
    const oncekiZimmetTipi = cihaz.mevcut_zimmet_tipi || null
    const oncekiZimmetId = cihaz.mevcut_zimmet_personel_id || null
    const oncekiZimmetAdi = cihaz.mevcut_zimmet_adi || null

    const gpsLat = sayi(body?.gps_lat)
    const gpsLng = sayi(body?.gps_lng)
    const gpsDogruluk = sayi(body?.gps_dogruluk)

    const hasarVar = Boolean(body?.hasar_var)
    const hasarAciklama = temiz(body?.hasar_aciklama)

    if (hasarVar && !hasarAciklama) {
      return NextResponse.json(
        { error: "Hasar varsa açıklama zorunludur." },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()

    const { data: guncelCihaz, error: updateError } = await supabase
      .from("cihazlar")
      .update({
        musteri_id: musteri.id,
        musteri_adi: musteriAdi,
        musteri_telefon: musteriTelefon,
        musteri_adres: musteriAdres,

        mevcut_konum_tipi: "musteri",
        mevcut_konum_id: musteri.id,
        mevcut_konum_adi: musteriAdi,

        mevcut_zimmet_tipi: null,
        mevcut_zimmet_personel_id: null,
        mevcut_zimmet_adi: null,

        durum: "musteride",
        son_hareket_at: now,
        updated_at: now,
      })
      .eq("id", cihaz.id)
      .select("*")
      .single()

    if (updateError || !guncelCihaz) {
      return NextResponse.json(
        { error: "Cihaz teslim güncellemesi yapılamadı: " + (updateError?.message || "") },
        { status: 500 },
      )
    }

    const { data: hareket, error: hareketError } = await supabase
      .from("cihaz_hareketleri")
      .insert({
        cihaz_id: cihaz.id,
        hareket_tipi: "musteriye_teslim",
        onceki_durum: oncekiDurum,
        yeni_durum: "musteride",

        kaynak_tipi: oncekiZimmetTipi || "personel",
        kaynak_id: oncekiZimmetId,
        kaynak_adi: oncekiZimmetAdi,

        hedef_tipi: "musteri",
        hedef_id: musteri.id,
        hedef_adi: musteriAdi,

        teslim_eden_personel_id: oncekiZimmetId,
        teslim_eden_adi: oncekiZimmetAdi,

        teslim_alan_personel_id: null,
        teslim_alan_adi: musteriAdi,

        musteri_adi: musteriAdi,
        musteri_telefon: musteriTelefon,
        musteri_adres: musteriAdres,

        aciklama: "Cihaz müşteriye teslim edildi. Personel zimmeti kapatıldı.",

        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_dogruluk: gpsDogruluk,
        islem_kaynagi: temiz(body?.islem_kaynagi) || "mobil_portal",
        barkod_dogrulandi: true,
        hasar_var: hasarVar,
        hasar_aciklama: hasarAciklama,
        iade_belgesi_gerekli: false,
        iade_belgesi_yuklendi: false,
        belge_foto_url: null,
        risk_durumu: hasarVar ? "hasar_bildirildi" : null,
      })
      .select("*")
      .single()

    if (hareketError || !hareket) {
      return NextResponse.json(
        { error: "Teslim hareketi oluşturulamadı: " + (hareketError?.message || "") },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      musteri,
      cihaz: guncelCihaz,
      hareket,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Cihaz teslim işlemi başarısız." },
      { status: 500 },
    )
  }
}
