import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { requireAdminAuth } from "@/lib/server/admin-auth"
import { MAX_EXCEL_ROWS, validateExcelUpload } from "@/lib/server/file-guards"

function temiz(value: any) {
  return String(value ?? "").trim()
}

function kolonTemizle(value: any) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function aktifMi(value: any) {
  const v = temiz(value).toLocaleLowerCase("tr-TR")

  if (!v) return true

  return !["false", "0", "hayir", "hayır", "pasif", "pasıf", "hayır"].includes(v)
}

function rowDeger(row: any, adaylar: string[]) {
  const normalizedRow: any = {}

  Object.keys(row || {}).forEach((key) => {
    normalizedRow[kolonTemizle(key)] = row[key]
  })

  for (const aday of adaylar) {
    const key = kolonTemizle(aday)
    if (normalizedRow[key] !== undefined && normalizedRow[key] !== null) {
      return normalizedRow[key]
    }
  }

  return ""
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth()

    if (!auth.ok) {
      return auth.response
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const fileError = validateExcelUpload(file)

    if (fileError) {
      return fileError
    }

    const excelFile = file as File
    const buffer = Buffer.from(await excelFile.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })

    if (!workbook.SheetNames.length) {
      return NextResponse.json(
        { error: "Excel içinde sayfa bulunamadı." },
        { status: 400 },
      )
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    })

    if (!rows.length) {
      return NextResponse.json(
        { error: "Excel içinde okunabilir satır bulunamadı." },
        { status: 400 },
      )
    }

    if (rows.length > MAX_EXCEL_ROWS) {
      return NextResponse.json(
        { error: `Canlı pilotta tek yükleme en fazla ${MAX_EXCEL_ROWS} satır olabilir.` },
        { status: 400 },
      )
    }

    const { supabaseAdmin: supabase } = auth

    let eklenen = 0
    let guncellenen = 0
    let hatali = 0
    const hatalar: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const urun_grubu = temiz(
        rowDeger(row, [
          "urun_grubu",
          "ürün grubu",
          "urun grubu",
          "ürün_grubu",
          "urun",
          "ürün",
          "kategori",
          "product_group",
        ]),
      )

      const islem = temiz(
        rowDeger(row, [
          "islem",
          "işlem",
          "işlem / yetenek",
          "islem / yetenek",
          "yetenek",
          "yetenek_adi",
          "yetenek adı",
          "operation",
        ]),
      )

      const aciklama = temiz(
        rowDeger(row, [
          "aciklama",
          "açıklama",
          "not",
          "notlar",
          "description",
        ]),
      )

      const aktif = aktifMi(
        rowDeger(row, [
          "aktif",
          "durum",
          "active",
          "status",
        ]),
      )

      if (!urun_grubu || !islem) {
        hatali++
        hatalar.push(
          `${i + 2}. satır: ürün grubu veya işlem boş. Okunan ürün="${urun_grubu}", işlem="${islem}"`,
        )
        continue
      }

      const { data: mevcut, error: mevcutError } = await supabase
        .from("yetenekler")
        .select("id")
        .eq("urun_grubu", urun_grubu)
        .eq("islem", islem)
        .maybeSingle()

      if (mevcutError) {
        hatali++
        hatalar.push(`${i + 2}. satır kontrol edilemedi: ${mevcutError.message}`)
        continue
      }

      if (mevcut?.id) {
        const { error } = await supabase
          .from("yetenekler")
          .update({
            yetenek_adi: `${urun_grubu} / ${islem}`,
            kategori: urun_grubu,
            aciklama: aciklama || null,
            aktif,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mevcut.id)

        if (error) {
          hatali++
          hatalar.push(`${i + 2}. satır güncellenemedi: ${error.message}`)
        } else {
          guncellenen++
        }
      } else {
        const { error } = await supabase.from("yetenekler").insert({
          urun_grubu,
          islem,
          yetenek_adi: `${urun_grubu} / ${islem}`,
          kategori: urun_grubu,
          aciklama: aciklama || null,
          aktif,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          hatali++
          hatalar.push(`${i + 2}. satır eklenemedi: ${error.message}`)
        } else {
          eklenen++
        }
      }
    }

    return NextResponse.json({
      success: true,
      toplam: rows.length,
      eklenen,
      guncellenen,
      hatali,
      hatalar: hatalar.slice(0, 30),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Beklenmeyen hata oluştu." },
      { status: 500 },
    )
  }
}
