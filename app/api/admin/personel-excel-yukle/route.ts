import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { requireAdminAuth } from "@/lib/server/admin-auth"
import { MAX_EXCEL_ROWS, validateExcelUpload } from "@/lib/server/file-guards"

function temiz(value: any) {
  return String(value ?? "").trim()
}

function normalizePhone(value: any) {
  let digits = String(value || "").replace(/\D/g, "")
  if (digits.startsWith("90")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(-10)
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

function rowDeger(row: any, adaylar: string[]) {
  const normalizedRow: Record<string, any> = {}

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

function tarihCevir(value: any) {
  const text = temiz(value)
  if (!text) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (match) {
    const gun = match[1].padStart(2, "0")
    const ay = match[2].padStart(2, "0")
    const yil = match[3]
    return `${yil}-${ay}-${gun}`
  }

  return null
}

function rolCevir(value: any) {
  const rol = kolonTemizle(value)

  if (
    rol === "admin" ||
    rol === "yonetici" ||
    rol === "servis_yonetici" ||
    rol === "servis_yoneticisi"
  ) {
    return "admin"
  }

  return "calisan"
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

    const { supabaseAdmin: supabase } = auth
    const sirket_id = auth.sirketId

    if (!sirket_id) {
      return NextResponse.json(
        { error: "Şirket ID bulunamadı. Giriş yapan yönetici personel kaydında sirket_id dolu olmalı." },
        { status: 500 },
      )
    }

    const buffer = Buffer.from(await excelFile.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })

    if (!workbook.SheetNames.length) {
      return NextResponse.json({ error: "Excel içinde sayfa bulunamadı." }, { status: 400 })
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    })

    if (!rows.length) {
      return NextResponse.json({ error: "Excel içinde okunabilir satır yok." }, { status: 400 })
    }

    if (rows.length > MAX_EXCEL_ROWS) {
      return NextResponse.json(
        { error: `Canlı pilotta tek yükleme en fazla ${MAX_EXCEL_ROWS} satır olabilir.` },
        { status: 400 },
      )
    }

    let eklenen = 0
    let guncellenen = 0
    let hatali = 0
    const hatalar: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const personel_kodu = temiz(rowDeger(row, ["personel_kodu", "personel kodu", "kod"]))
      const ad = temiz(rowDeger(row, ["ad", "adi", "adı", "isim"]))
      const soyad = temiz(rowDeger(row, ["soyad", "soyadi", "soyadı"]))
      const telefonKaynak = temiz(rowDeger(row, ["telefon", "tel", "gsm", "cep telefonu"]))
      const telefon_normalized = normalizePhone(telefonKaynak)

      const rol = rolCevir(rowDeger(row, ["rol", "gorev", "görev"]))
      const durum = temiz(rowDeger(row, ["durum", "status"])) || "active"
      const lokasyon = temiz(rowDeger(row, ["lokasyon", "konum"])) || null
      const bolge = temiz(rowDeger(row, ["bolge", "bölge"])) || null
      const ise_giris_tarihi = tarihCevir(
        rowDeger(row, [
          "ise_giris_tarihi",
          "işe giriş tarihi",
          "ise giris tarihi",
          "giris_tarihi",
        ]),
      )

      const notlar = temiz(rowDeger(row, ["notlar", "not", "aciklama", "açıklama"])) || null

      if (!personel_kodu || !ad || !soyad) {
        hatali++
        hatalar.push(`${i + 2}. satır: personel_kodu, ad ve soyad zorunludur.`)
        continue
      }

      if (telefon_normalized.length !== 10) {
        hatali++
        hatalar.push(`${i + 2}. satır: telefon geçersiz. Okunan değer: ${telefonKaynak || "boş"}`)
        continue
      }

      const payload = {
        sirket_id,
        personel_kodu,
        ad,
        soyad,
        tel: `0${telefon_normalized}`,
        telefon_normalized,
        rol,
        durum,
        lokasyon,
        bolge,
        ise_giris_tarihi,
        notlar,
        updated_at: new Date().toISOString(),
      }

      const { data: mevcut, error: mevcutError } = await supabase
        .from("personeller")
        .select("id")
        .or(`personel_kodu.eq.${personel_kodu},telefon_normalized.eq.${telefon_normalized}`)
        .limit(1)
        .maybeSingle()

      if (mevcutError) {
        hatali++
        hatalar.push(`${i + 2}. satır kontrol edilemedi: ${mevcutError.message}`)
        continue
      }

      if (mevcut?.id) {
        const { error } = await supabase
          .from("personeller")
          .update(payload)
          .eq("id", mevcut.id)

        if (error) {
          hatali++
          hatalar.push(`${i + 2}. satır güncellenemedi: ${error.message}`)
        } else {
          guncellenen++
        }
      } else {
        const { error } = await supabase.from("personeller").insert(payload)

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
      hatalar: hatalar.slice(0, 50),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Beklenmeyen hata oluştu." },
      { status: 500 },
    )
  }
}
