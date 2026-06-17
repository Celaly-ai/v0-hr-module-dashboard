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

function belgeNoUret() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const saat = String(now.getHours()).padStart(2, "0")
  const dk = String(now.getMinutes()).padStart(2, "0")
  const sn = String(now.getSeconds()).padStart(2, "0")
  return `UHF-${y}${m}${d}-${saat}${dk}${sn}`
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()
    const body = await request.json().catch(() => null)

    const urunler = Array.isArray(body?.urunler) ? body.urunler : []

    if (urunler.length === 0) {
      return NextResponse.json(
        { error: "En az bir ürün eklenmelidir." },
        { status: 400 },
      )
    }

    const gecerliUrunler = urunler
      .map((u: any) => ({
        barkod: temiz(u.barkod),
        seri_no: temiz(u.seri_no),
        marka: temiz(u.marka),
        model: temiz(u.model),
      }))
      .filter((u: any) => u.barkod || u.seri_no)

    if (gecerliUrunler.length === 0) {
      return NextResponse.json(
        { error: "En az bir üründe barkod veya seri no zorunludur." },
        { status: 400 },
      )
    }

    const belgeNo = belgeNoUret()

    const { data: fis, error: fisError } = await supabase
      .from("urun_hareket_fisleri")
      .insert({
        belge_no: belgeNo,
        kaynak_tipi: temiz(body?.kaynak_tipi),
        kaynak_adi: temiz(body?.kaynak_adi),
        teslim_eden_adi: temiz(body?.teslim_eden_adi),
        teslim_eden_telefon: temiz(body?.teslim_eden_telefon),
        teslim_alan_personel_id: temiz(body?.teslim_alan_personel_id),
        teslim_alan_adi: temiz(body?.teslim_alan_adi) || "Servis",
        toplam_urun: gecerliUrunler.length,
        durum: "aktif",
      })
      .select("*")
      .single()

    if (fisError) {
      return NextResponse.json(
        { error: "Ürün hareket fişi oluşturulamadı: " + fisError.message },
        { status: 500 },
      )
    }

    const cihazKayitlari: any[] = []
    const hareketKayitlari: any[] = []
    const kalemKayitlari: any[] = []

    for (const urun of gecerliUrunler) {
      const { data: cihaz, error: cihazError } = await supabase
        .from("cihazlar")
        .insert({
          barkod: urun.barkod,
          seri_no: urun.seri_no,
          marka: urun.marka,
          model: urun.model,
          kaynak_tipi: temiz(body?.kaynak_tipi),
          kaynak_aciklama: temiz(body?.kaynak_adi),
          mevcut_konum_tipi: "depo",
          mevcut_konum_adi: "Depo / Servis",
          mevcut_zimmet_tipi: "depo",
          mevcut_zimmet_adi: "Depo / Servis",
          durum: "depoda",
          son_hareket_at: new Date().toISOString(),
          kabul_at: new Date().toISOString(),
        })
        .select("*")
        .single()

      if (cihazError) {
        return NextResponse.json(
          { error: "Cihaz kaydedilemedi: " + cihazError.message },
          { status: 500 },
        )
      }

      cihazKayitlari.push(cihaz)

      const { data: hareket, error: hareketError } = await supabase
        .from("cihaz_hareketleri")
        .insert({
          cihaz_id: cihaz.id,
          hareket_tipi: "cihaz_kayit",
          onceki_durum: null,
          yeni_durum: "depoda",
          kaynak_tipi: temiz(body?.kaynak_tipi),
          kaynak_adi: temiz(body?.kaynak_adi),
          hedef_tipi: "depo",
          hedef_adi: "Depo / Servis",
          teslim_eden_adi: temiz(body?.teslim_eden_adi),
          teslim_alan_personel_id: temiz(body?.teslim_alan_personel_id),
          teslim_alan_adi: temiz(body?.teslim_alan_adi) || "Servis",
          aciklama: `${belgeNo} numaralı kayıt ile cihaz sisteme alındı.`,
        })
        .select("*")
        .single()

      if (hareketError) {
        return NextResponse.json(
          { error: "Cihaz hareketi oluşturulamadı: " + hareketError.message },
          { status: 500 },
        )
      }

      hareketKayitlari.push(hareket)

      const { data: kalem, error: kalemError } = await supabase
        .from("urun_hareket_fisi_kalemleri")
        .insert({
          fis_id: fis.id,
          cihaz_id: cihaz.id,
          barkod: urun.barkod,
          seri_no: urun.seri_no,
          marka: urun.marka,
          model: urun.model,
        })
        .select("*")
        .single()

      if (kalemError) {
        return NextResponse.json(
          { error: "Fiş kalemi oluşturulamadı: " + kalemError.message },
          { status: 500 },
        )
      }

      kalemKayitlari.push(kalem)
    }

    return NextResponse.json({
      success: true,
      fis,
      cihazlar: cihazKayitlari,
      hareketler: hareketKayitlari,
      kalemler: kalemKayitlari,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ürün kabul işlemi başarısız." },
      { status: 500 },
    )
  }
}
