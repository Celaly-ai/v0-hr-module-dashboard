import { NextResponse } from "next/server"

const ALLOWED_EXCEL_EXTENSIONS = [".xlsx", ".xls", ".csv"]
const MAX_EXCEL_SIZE = 3 * 1024 * 1024
export const MAX_EXCEL_ROWS = 500

export function validateExcelUpload(file: File | null) {
  if (!file) {
    return NextResponse.json(
      { error: "Excel dosyası bulunamadı." },
      { status: 400 },
    )
  }

  const name = file.name.toLocaleLowerCase("tr-TR")
  const validExtension = ALLOWED_EXCEL_EXTENSIONS.some((ext) =>
    name.endsWith(ext),
  )

  if (!validExtension) {
    return NextResponse.json(
      { error: "Sadece .xlsx, .xls veya .csv dosyası yükleyebilirsiniz." },
      { status: 400 },
    )
  }

  if (file.size > MAX_EXCEL_SIZE) {
    return NextResponse.json(
      { error: "Excel dosyası en fazla 3 MB olabilir." },
      { status: 400 },
    )
  }

  return null
}
