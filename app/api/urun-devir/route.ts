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
    throw new Error("Supabase bağlantısı eksik.")
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

  const yil = now.getFullYear()
  const ay = String(now.getMonth() + 1).padStart(2, "0")
  const gun = String(now.getDate()).padStart(2, "0")

  const saat = String(now.getHours()).padStart(2, "0")
  const dakika = String(now.getMinutes()).padStart(2, "0")
  const saniye = String(now.getSeconds()).padStart(2, "0")

  return `UDF-${yil}${ay}${gun}-${saat}${dakika}${saniye}`
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()

    const body = await request.json().catch(() => null)

    const cihazIds = Array.isArray(body?.cihaz_ids)
      ? body.cihaz_ids
      : []

    if (cihazIds.length === 0) {
      return NextResponse.json(
        { error: "En az bir cihaz seçmelisiniz." },
        { status: 400 },
      )
    }

    const kaynakPersonelId = temiz(body?.kaynak_personel_id)
    const kaynakPersonelAdi = temiz(body?.kaynak_personel_adi)

    const hedefPersonelId = temiz(body?.hedef_personel_id)
    const hedefPersonelAdi = temiz(body?.hedef_personel_adi)

    if (!hedefPersonelAdi) {
      return NextResponse.json(
        { error: "Hedef personel zorunludur." },
        { status: 400 },
      )
    }

    const belgeNo = belgeNoUret()

    const { data: fis, error: fisError } = await supabase
      .from("urun_devir_fisleri")
      .insert({
        belge_no: belgeNo,

        kaynak_personel_id: kaynakPersonelId,
        kaynak_personel_adi: kaynakPersonelAdi,

        hedef_personel_id: hedefPersonelId,
        hedef_personel_adi: hedefPersonelAdi,

        toplam_urun: cihazIds.length,
        durum: "tamamlandi",
      })
      .select("*")
      .single()

    if (fisError) {
      return NextResponse.json(
        {
          error:
            "Ürün devir fişi oluşturulamadı: " +
            fisError.message,
        },
        { status: 500 },
      )
    }

    const sonucCihazlar: any[] = []
    const sonucKalemler: any[] = []
    const sonucHareketler: any[] = []

    for (const cihazId of cihazIds) {
      const { data: cihaz, error: cihazError } =
        await supabase
          .from("cihazlar")
          .select("*")
          .eq("id", cihazId)
          .single()

      if (cihazError || !cihaz) {
        return NextResponse.json(
          {
            error:
              "Cihaz bulunamadı: " + cihazId,
          },
          { status: 404 },
        )
      }

      const eskiZimmetAdi =
        cihaz.mevcut_zimmet_adi || null

      const eskiZimmetTipi =
        cihaz.mevcut_zimmet_tipi || null

      const yeniDurum =
        hedefPersonelAdi
          .toLocaleLowerCase("tr-TR")
          .includes("teknisyen")
          ? "teknisyende"
          : "urun_sorumlusunda"

      const { data: guncelCihaz, error: updateError } =
        await supabase
          .from("cihazlar")
          .update({
            mevcut_zimmet_adi: hedefPersonelAdi,
            mevcut_zimmet_tipi: "personel",

            durum: yeniDurum,

            son_hareket_at:
              new Date().toISOString(),
          })
          .eq("id", cihaz.id)
          .select("*")
          .single()

      if (updateError) {
        return NextResponse.json(
          {
            error:
              "Cihaz güncellenemedi: " +
              updateError.message,
          },
          { status: 500 },
        )
      }

      sonucCihazlar.push(guncelCihaz)

      const { data: hareket, error: hareketError } =
        await supabase
          .from("cihaz_hareketleri")
          .insert({
            cihaz_id: cihaz.id,

            hareket_tipi: "urun_devir",

            onceki_durum: cihaz.durum,
            yeni_durum: yeniDurum,

            kaynak_tipi: eskiZimmetTipi,
            kaynak_adi: eskiZimmetAdi,

            hedef_tipi: "personel",
            hedef_adi: hedefPersonelAdi,

            teslim_eden_adi:
              kaynakPersonelAdi,

            teslim_alan_adi:
              hedefPersonelAdi,

            aciklama:
              belgeNo +
              " numaralı ürün devir fişi ile aktarılmıştır.",
          })
          .select("*")
          .single()

      if (hareketError) {
        return NextResponse.json(
          {
            error:
              "Hareket kaydı oluşturulamadı: " +
              hareketError.message,
          },
          { status: 500 },
        )
      }

      sonucHareketler.push(hareket)

      const { data: kalem, error: kalemError } =
        await supabase
          .from("urun_devir_fisi_kalemleri")
          .insert({
            fis_id: fis.id,
            cihaz_id: cihaz.id,

            barkod: cihaz.barkod,
            seri_no: cihaz.seri_no,
          })
          .select("*")
          .single()

      if (kalemError) {
        return NextResponse.json(
          {
            error:
              "Devir kalemi oluşturulamadı: " +
              kalemError.message,
          },
          { status: 500 },
        )
      }

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
      {
        error:
          error?.message ||
          "Ürün devir işlemi başarısız.",
      },
      { status: 500 },
    )
  }
}
