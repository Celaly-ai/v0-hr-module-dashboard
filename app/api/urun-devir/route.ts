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

function belgeNoUret() {
  const now = new Date()

  const yil = now.getFullYear()
  const ay = String(now.getMonth() + 1).padStart(2, "0")
  const gun = String(now.getDate()).padStart(2, "0")

  const saat = String(now.getHours()).padStart(2, "0")
  const dakika = String(now.getMinutes()).padStart(2, "0")
  const saniye = String(now.getSeconds()).padStart(2, "0")

  return `UDF-${yil}${ay}${gun}-${saat}${dakika}${saniye}`
}

function hedefDurumBelirle(rol?: string | null, unvan?: string | null) {
  const metin = `${rol || ""} ${unvan || ""}`.toLocaleLowerCase("tr-TR")

  if (metin.includes("ürün") || metin.includes("urun")) return "urun_sorumlusunda"

  return "personelde"
}

function hedefKonumTipiBelirle(rol?: string | null, unvan?: string | null) {
  const metin = `${rol || ""} ${unvan || ""}`.toLocaleLowerCase("tr-TR")

  if (metin.includes("ürün") || metin.includes("urun")) return "personel"

  return "personel"
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()
    const body = await request.json().catch(() => null)

    const cihazIds = Array.isArray(body?.cihaz_ids)
      ? body.cihaz_ids.map((id: unknown) => temiz(id)).filter(Boolean)
      : []

    if (cihazIds.length === 0) {
      return NextResponse.json(
        { error: "En az bir cihaz seçmelisiniz." },
        { status: 400 },
      )
    }

    const kaynakPersonelId = temiz(body?.kaynak_personel_id)
    const kaynakPersonelAdi = temiz(body?.kaynak_personel_adi) || "Depo / Servis"

    const hedefPersonelId = temiz(body?.hedef_personel_id)

    if (!hedefPersonelId) {
      return NextResponse.json(
        { error: "Hedef personel seçilmelidir." },
        { status: 400 },
      )
    }

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

    const { data: hedefPersonel, error: hedefError } = await supabase
      .from("personeller")
      .select("id, ad, soyad, rol, unvan, sirket_id")
      .eq("id", hedefPersonelId)
      .maybeSingle()

    if (hedefError || !hedefPersonel) {
      return NextResponse.json(
        { error: "Hedef personel bulunamadı." },
        { status: 404 },
      )
    }

    const hedefPersonelAdi =
      temiz(body?.hedef_personel_adi) ||
      `${hedefPersonel.ad || ""} ${hedefPersonel.soyad || ""}`.trim() ||
      hedefPersonel.unvan ||
      "Personel"

    const belgeNo = belgeNoUret()
    const yeniDurum = hedefDurumBelirle(hedefPersonel.rol, hedefPersonel.unvan)
    const hedefKonumTipi = hedefKonumTipiBelirle(hedefPersonel.rol, hedefPersonel.unvan)

    const { data: fis, error: fisError } = await supabase
      .from("urun_devir_fisleri")
      .insert({
        belge_no: belgeNo,
        kaynak_personel_id: kaynakPersonelId,
        kaynak_personel_adi: kaynakPersonelAdi,
        hedef_personel_id: hedefPersonel.id,
        hedef_personel_adi: hedefPersonelAdi,
        toplam_urun: cihazIds.length,
        durum: "tamamlandi",
      })
      .select("*")
      .single()

    if (fisError || !fis) {
      return NextResponse.json(
        { error: "Devir fişi oluşturulamadı: " + (fisError?.message || "") },
        { status: 500 },
      )
    }

    const sonucCihazlar: any[] = []
    const sonucKalemler: any[] = []
    const sonucHareketler: any[] = []

    for (const cihazId of cihazIds) {
      const { data: cihaz, error: cihazError } = await supabase
        .from("cihazlar")
        .select("*")
        .eq("id", cihazId)
        .maybeSingle()

      if (cihazError || !cihaz) {
        return NextResponse.json(
          { error: `Cihaz bulunamadı: ${cihazId}` },
          { status: 404 },
        )
      }

      const oncekiDurum = cihaz.durum || null
      const oncekiZimmetTipi = cihaz.mevcut_zimmet_tipi || null
      const oncekiZimmetAdi = cihaz.mevcut_zimmet_adi || null

      const { data: guncelCihaz, error: updateError } = await supabase
        .from("cihazlar")
        .update({
          mevcut_konum_tipi: hedefKonumTipi,
          mevcut_konum_id: hedefPersonel.id,
          mevcut_konum_adi: hedefPersonelAdi,

          mevcut_zimmet_tipi: "personel",
          mevcut_zimmet_personel_id: hedefPersonel.id,
          mevcut_zimmet_adi: hedefPersonelAdi,

          durum: yeniDurum,
          son_hareket_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cihaz.id)
        .select("*")
        .single()

      if (updateError || !guncelCihaz) {
        return NextResponse.json(
          { error: "Cihaz güncellenemedi: " + (updateError?.message || "") },
          { status: 500 },
        )
      }

      const { data: hareket, error: hareketError } = await supabase
        .from("cihaz_hareketleri")
        .insert({
          cihaz_id: cihaz.id,
          hareket_tipi: "devir",
          onceki_durum: oncekiDurum,
          yeni_durum: yeniDurum,

          kaynak_tipi: oncekiZimmetTipi || "depo",
          kaynak_id: kaynakPersonelId,
          kaynak_adi: oncekiZimmetAdi || kaynakPersonelAdi,

          hedef_tipi: hedefKonumTipi,
          hedef_id: hedefPersonel.id,
          hedef_adi: hedefPersonelAdi,

          teslim_eden_personel_id: kaynakPersonelId,
          teslim_eden_adi: kaynakPersonelAdi,

          teslim_alan_personel_id: hedefPersonel.id,
          teslim_alan_adi: hedefPersonelAdi,

          aciklama: `${belgeNo} numaralı devir kaydı ile zimmet aktarıldı.`,

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
          { error: "Hareket kaydı oluşturulamadı: " + (hareketError?.message || "") },
          { status: 500 },
        )
      }

      const { data: kalem, error: kalemError } = await supabase
        .from("urun_devir_fisi_kalemleri")
        .insert({
          fis_id: fis.id,
          cihaz_id: cihaz.id,
          barkod: cihaz.barkod,
          seri_no: cihaz.seri_no,
        })
        .select("*")
        .single()

      if (kalemError || !kalem) {
        return NextResponse.json(
          { error: "Devir fişi kalemi oluşturulamadı: " + (kalemError?.message || "") },
          { status: 500 },
        )
      }

      sonucCihazlar.push(guncelCihaz)
      sonucHareketler.push(hareket)
      sonucKalemler.push(kalem)
    }

    return NextResponse.json({
      success: true,
      fis,
      cihazlar: sonucCihazlar,
      hareketler: sonucHareketler,
      kalemler: sonucKalemler,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ürün devir işlemi başarısız." },
      { status: 500 },
    )
  }
}
