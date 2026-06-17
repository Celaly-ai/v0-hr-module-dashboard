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
    auth: { persistSession: false, autoRefreshToken: false },
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

function belgeNoUret() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const h = String(now.getHours()).padStart(2, "0")
  const dk = String(now.getMinutes()).padStart(2, "0")
  const sn = String(now.getSeconds()).padStart(2, "0")
  return `IADE-${y}${m}${d}-${h}${dk}${sn}`
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()
    const body = await request.json().catch(() => null)

    const barkod = temiz(body?.barkod)
    const cihazId = temiz(body?.cihaz_id)

    if (!barkod && !cihazId) {
      return NextResponse.json({ error: "Barkod veya cihaz id zorunludur." }, { status: 400 })
    }

    const iadeTipi = temiz(body?.iade_tipi) || "iade"
    const iadeNedeni = temiz(body?.iade_nedeni)
    const teslimEdenAdi = temiz(body?.teslim_eden_adi)
    const teslimEdenTelefon = temiz(body?.teslim_eden_telefon)
    const teslimAlanAdi = temiz(body?.teslim_alan_adi) || "Depo / Servis"
    const teslimAlanTelefon = temiz(body?.teslim_alan_telefon)
    const teslimAlanKurum = temiz(body?.teslim_alan_kurum) || "Servis"
    const aciklama = temiz(body?.aciklama)
    const imzaliBelgeFotoUrl = temiz(body?.imzali_belge_foto_url)

    if (!iadeNedeni || !teslimEdenAdi || !imzaliBelgeFotoUrl) {
      return NextResponse.json(
        { error: "İade nedeni, teslim eden ve imzalı belge fotoğrafı zorunludur." },
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
      return NextResponse.json({ error: "Cihaz bulunamadı." }, { status: 404 })
    }

    const gpsLat = sayi(body?.gps_lat)
    const gpsLng = sayi(body?.gps_lng)
    const gpsDogruluk = sayi(body?.gps_dogruluk)

    const oncekiDurum = cihaz.durum || null
    const oncekiZimmetTipi = cihaz.mevcut_zimmet_tipi || null
    const oncekiZimmetId = cihaz.mevcut_zimmet_personel_id || null
    const oncekiZimmetAdi = cihaz.mevcut_zimmet_adi || null

    const belgeNo = belgeNoUret()
    const now = new Date().toISOString()

    const { data: guncelCihaz, error: updateError } = await supabase
      .from("cihazlar")
      .update({
        mevcut_konum_tipi: "depo",
        mevcut_konum_id: null,
        mevcut_konum_adi: "Depo / Servis",
        mevcut_zimmet_tipi: "depo",
        mevcut_zimmet_personel_id: null,
        mevcut_zimmet_adi: "Depo / Servis",
        durum: "depoda",
        son_hareket_at: now,
        updated_at: now,
      })
      .eq("id", cihaz.id)
      .select("*")
      .single()

    if (updateError || !guncelCihaz) {
      return NextResponse.json(
        { error: "Cihaz iade güncellemesi yapılamadı: " + (updateError?.message || "") },
        { status: 500 },
      )
    }

    const { data: hareket, error: hareketError } = await supabase
      .from("cihaz_hareketleri")
      .insert({
        cihaz_id: cihaz.id,
        hareket_tipi: "iade",
        onceki_durum: oncekiDurum,
        yeni_durum: "depoda",

        kaynak_tipi: oncekiZimmetTipi || cihaz.mevcut_konum_tipi || "musteri",
        kaynak_id: oncekiZimmetId,
        kaynak_adi: oncekiZimmetAdi || cihaz.mevcut_konum_adi || teslimEdenAdi,

        hedef_tipi: "depo",
        hedef_id: null,
        hedef_adi: "Depo / Servis",

        teslim_eden_personel_id: oncekiZimmetId,
        teslim_eden_adi: teslimEdenAdi,

        teslim_alan_personel_id: null,
        teslim_alan_adi: teslimAlanAdi,

        musteri_adi: cihaz.musteri_adi || null,
        musteri_telefon: cihaz.musteri_telefon || null,
        musteri_adres: cihaz.musteri_adres || null,

        aciklama: aciklama || `${belgeNo} numaralı iade belgesi ile cihaz depoya alındı.`,

        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_dogruluk: gpsDogruluk,
        islem_kaynagi: temiz(body?.islem_kaynagi) || "mobil_portal",
        barkod_dogrulandi: true,
        hasar_var: Boolean(body?.hasar_var),
        hasar_aciklama: temiz(body?.hasar_aciklama),
        iade_belgesi_gerekli: true,
        iade_belgesi_yuklendi: true,
        belge_foto_url: imzaliBelgeFotoUrl,
        risk_durumu: null,
      })
      .select("*")
      .single()

    if (hareketError || !hareket) {
      return NextResponse.json(
        { error: "İade hareketi oluşturulamadı: " + (hareketError?.message || "") },
        { status: 500 },
      )
    }

    const belgeHtml = `
      <h1>Cihaz İade Belgesi</h1>
      <p><strong>Belge No:</strong> ${belgeNo}</p>
      <p><strong>Barkod:</strong> ${cihaz.barkod || "-"}</p>
      <p><strong>Seri No:</strong> ${cihaz.seri_no || "-"}</p>
      <p><strong>Marka/Model:</strong> ${cihaz.marka || "-"} ${cihaz.model || ""}</p>
      <p><strong>İade Nedeni:</strong> ${iadeNedeni}</p>
      <p><strong>Teslim Eden:</strong> ${teslimEdenAdi}</p>
      <p><strong>Teslim Alan:</strong> ${teslimAlanAdi}</p>
      <p><strong>Kurum:</strong> ${teslimAlanKurum}</p>
      <p><strong>Tarih:</strong> ${new Date().toLocaleString("tr-TR")}</p>
    `

    const { data: iadeBelgesi, error: belgeError } = await supabase
      .from("cihaz_iade_belgeleri")
      .insert({
        cihaz_id: cihaz.id,
        hareket_id: hareket.id,
        belge_no: belgeNo,
        iade_tipi: iadeTipi,
        iade_nedeni: iadeNedeni,
        teslim_eden_adi: teslimEdenAdi,
        teslim_eden_telefon: teslimEdenTelefon,
        teslim_alan_adi: teslimAlanAdi,
        teslim_alan_telefon: teslimAlanTelefon,
        teslim_alan_kurum: teslimAlanKurum,
        aciklama,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_dogruluk: gpsDogruluk,
        belge_html: belgeHtml,
        belge_foto_url: imzaliBelgeFotoUrl,
        imzali_belge_foto_url: imzaliBelgeFotoUrl,
        durum: "tamamlandi",
      })
      .select("*")
      .single()

    if (belgeError || !iadeBelgesi) {
      return NextResponse.json(
        { error: "İade belgesi oluşturulamadı: " + (belgeError?.message || "") },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      cihaz: guncelCihaz,
      hareket,
      iade_belgesi: iadeBelgesi,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Cihaz iade işlemi başarısız." },
      { status: 500 },
    )
  }
}
