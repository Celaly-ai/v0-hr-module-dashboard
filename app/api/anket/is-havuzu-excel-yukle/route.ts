import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"

type ExcelSatiri = Record<string, any>

function metin(value: any) {
  return String(value || "").trim()
}

function alanBul(row: ExcelSatiri, alanlar: string[]) {
  for (const alan of alanlar) {
    if (row[alan] !== undefined && row[alan] !== null) return metin(row[alan])
  }
  return ""
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Excel dosyası bulunamadı." },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]

    if (!sheetName) {
      return NextResponse.json(
        { success: false, error: "Excel içinde sayfa bulunamadı." },
        { status: 400 },
      )
    }

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<ExcelSatiri>(sheet, {
      defval: "",
    })

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Excel dosyasında kayıt bulunamadı." },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase bağlantısı kurulamadı." },
        { status: 500 },
      )
    }

    const kayitlar = rows
      .map((row, index) => {
        const fisNumarasi = alanBul(row, [
          "fis_numarasi",
          "fiş_numarası",
          "fis no",
          "fiş no",
          "Fis Numarasi",
          "Fiş Numarası",
        ])

        return {
          is_kodu: `ANK-EXCEL-${Date.now()}-${index + 1}`,
          musteri_adi: alanBul(row, ["musteri_adi", "müşteri adı", "Müşteri Adı"]),
          fis_numarasi: fisNumarasi,
          telefon: alanBul(row, ["telefon", "Telefon", "musteri_telefon", "Müşteri Telefon"]),
          basvuru_nedeni: alanBul(row, ["basvuru_nedeni", "başvuru nedeni", "Başvuru Nedeni"]),
          ilce: alanBul(row, ["ilce", "ilçe", "İlçe"]),
          mahalle: alanBul(row, ["mahalle", "Mahalle"]),
          teknisyen_kodu: alanBul(row, ["teknisyen_kodu", "Teknisyen Kodu"]),
          teknisyen_adi: alanBul(row, ["teknisyen_adi", "teknisyen", "Teknisyen", "Teknisyen Adı"]),
          marka: alanBul(row, ["marka", "Marka"]),
          urun_grubu: alanBul(row, ["urun_grubu", "ürün grubu", "Ürün Grubu"]),
          model: alanBul(row, ["model", "Model"]),
          yapilan_hizmet_kodu: alanBul(row, [
            "yapilan_hizmet_kodu",
            "yapılan hizmet kodu",
            "Hizmet Kodu",
          ]),
          kullanilan_malzeme_aciklama: alanBul(row, [
            "kullanilan_malzeme_aciklama",
            "kullanılan malzeme açıklama",
            "Kullanılan Malzeme Açıklama",
          ]),
          teknisyen_notu: alanBul(row, ["teknisyen_notu", "teknisyen notu", "Teknisyen Notu"]),
          kaynak_tipi: "excel",
          anket_durumu: "bekliyor",
        }
      })
      .filter((row) => row.musteri_adi || row.fis_numarasi || row.telefon)

    if (kayitlar.length === 0) {
      return NextResponse.json(
        { success: false, error: "Excelde işlenecek geçerli kayıt bulunamadı." },
        { status: 400 },
      )
    }

    const { error } = await supabase.from("ai_anket_is_havuzu").insert(kayitlar)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      eklenen: kayitlar.length,
      toplam_satir: rows.length,
      error: null,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Excel yükleme sırasında hata oluştu.",
      },
      { status: 500 },
    )
  }
}
