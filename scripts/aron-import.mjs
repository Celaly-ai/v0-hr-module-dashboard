import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Supabase URL veya SERVICE_ROLE_KEY eksik.")
  process.exit(1)
}

const dosyaYolu = process.argv[2] || path.join(process.env.HOME || "", "Downloads", "aron-acik-fisler-formatli.json")

if (!fs.existsSync(dosyaYolu)) {
  console.error("JSON dosyası bulunamadı:", dosyaYolu)
  process.exit(1)
}

const raw = fs.readFileSync(dosyaYolu, "utf8")
const kayitlar = JSON.parse(raw)

if (!Array.isArray(kayitlar)) {
  console.error("JSON dosyası liste formatında değil.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

function temizMetin(value) {
  return value === null || value === undefined ? "" : String(value).trim()
}

function veriOzeti(kayit) {
  const fisNo = temizMetin(kayit.FisNo)
  const musteri = temizMetin(kayit.Musteri)
  const ilce = temizMetin(kayit.ILCE || kayit.Ilce)
  const mahalle = temizMetin(kayit.Mahalle || kayit.MAHALLE)
  const basvuru = temizMetin(kayit.BasvuruNedeni)
  return [fisNo, musteri, ilce, mahalle, basvuru].filter(Boolean).join(" | ")
}

const rows = kayitlar
  .filter((kayit) => kayit && kayit.FisNo)
  .map((kayit, index) => ({
    kaynak: "ARON",
    kaynak_tip: "web_json",
    veri_tipi: "acik_fis_listesi",
    referans_no: String(kayit.FisNo),
    ham_json: kayit,
    ham_veri: kayit,
    veri_ozeti: veriOzeti(kayit),
    islendimi: false,
    islem_durumu: "bekliyor",
    islenme_durumu: "bekliyor",
    veri_kaynagi: "aron_acik_fisler",
    kaynak_id: String(kayit.FisNo),
    kaynak_dosya: path.basename(dosyaYolu),
    kaynak_satir_no: index + 1,
    oncelik: "normal",
    cekilme_zamani: new Date().toISOString(),
    kayit_zamani: new Date().toISOString(),
    ai_islendi: false,
    ai_durum: "bekliyor",
  }))

console.log(`Okunan kayıt: ${kayitlar.length}`)
console.log(`Aktarılacak kayıt: ${rows.length}`)

const parcaBoyutu = 100
let toplam = 0

for (let i = 0; i < rows.length; i += parcaBoyutu) {
  const parca = rows.slice(i, i + parcaBoyutu)

  const { error } = await supabase
    .from("aron_ham_veriler")
    .upsert(parca, {
      onConflict: "referans_no,veri_tipi",
    })

  if (error) {
    console.error("Aktarım hatası:", error.message)
    process.exit(1)
  }

  toplam += parca.length
  console.log(`Aktarıldı: ${toplam}/${rows.length}`)
}

console.log("ARON açık fiş verileri başarıyla aktarıldı.")
