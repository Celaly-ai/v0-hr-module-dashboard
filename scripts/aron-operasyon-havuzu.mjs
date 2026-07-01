import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function temiz(v) {
  return v === null || v === undefined ? "" : String(v).trim()
}

function urlDegilseAdres(v) {
  const s = temiz(v)
  if (!s) return ""
  if (s.toLowerCase().startsWith("http://") || s.toLowerCase().startsWith("https://")) return ""
  return s
}

function koordinat(v) {
  const n = Number(v || 0)
  return n === 0 || Number.isNaN(n) ? null : n
}

function katBilgisiCikar(adres) {
  const a = temiz(adres).toLowerCase()

  const desenler = [
    /kat\s*[:\-]?\s*(\d{1,2})/i,
    /kat\s*\.?\s*(\d{1,2})/i,
    /(\d{1,2})\s*\.\s*kat/i,
    /k\s*[:\-]?\s*(\d{1,2})/i
  ]

  for (const desen of desenler) {
    const eslesme = a.match(desen)
    if (eslesme && eslesme[1]) return Number(eslesme[1])
  }

  return null
}

function katZamOrani(kat, kategori) {
  if (kategori === "KUCUK_EV_ALETLERI") return 0
  if (kat === null || kat === undefined) return 0
  if (kat <= 2) return 0
  if (kat <= 5) return 0.10
  if (kat <= 8) return 0.20
  return 0.30
}

function isTipiBelirle(basvuru) {
  const b = temiz(basvuru).toLowerCase()
  if (b.includes("nakliye montaj")) return "NAKLIYE_MONTAJ"
  if (b.includes("montaj")) return "MONTAJ"
  if (b.includes("nakliye")) return "NAKLIYE"
  return null
}

function urunKategorisi(basvuru) {
  const b = temiz(basvuru).toLowerCase()
  if (b.includes("klima")) return "KLIMA"
  if (b.includes("buzdolabı")) return "BUZDOLABI"
  if (b.includes("çm") || b.includes("çamaşır")) return "CAMASIR_MAKINESI"
  if (b.includes("bul.mak") || b.includes("bulaşık")) return "BULASIK_MAKINESI"
  if (b.includes("tv")) return "TV"
  if (b.includes("fırın")) return "FIRIN"
  if (b.includes("ocak")) return "OCAK"
  if (b.includes("derin dondurucu")) return "DERIN_DONDURUCU"
  if (b.includes("su sebili")) return "SU_SEBILI"
  if (b.includes("termosifon")) return "TERMOSIFON"
  if (b.includes("küçük ev")) return "KUCUK_EV_ALETLERI"
  return "GENEL"
}

function gerekliAracSinifi(kategori, basvuru) {
  const b = temiz(basvuru).toLowerCase()
  if (kategori === "BUZDOLABI") return "BUYUK"
  if (kategori === "KLIMA" && b.includes("salon tipi")) return "BUYUK"
  if (kategori === "KLIMA") return "ORTA"
  if (kategori === "DERIN_DONDURUCU") return "ORTA"
  if (kategori === "TV") return "ORTA"
  if (kategori === "KUCUK_EV_ALETLERI") return "KUCUK"
  return "ORTA"
}

function gerekliYetenek(kategori, isTipi) {
  if (kategori === "KLIMA") return isTipi === "NAKLIYE" ? "KLIMA_NAKLIYE" : "KLIMA_NAKLIYE"
  if (kategori === "TV") return "TV"
  if (kategori === "BUZDOLABI") return "BEYAZ_ESYA"
  if (kategori === "CAMASIR_MAKINESI") return "BEYAZ_ESYA"
  if (kategori === "BULASIK_MAKINESI") return "BEYAZ_ESYA"
  if (kategori === "FIRIN") return "BEYAZ_ESYA"
  if (kategori === "OCAK") return "BEYAZ_ESYA"
  return "NAKLIYE"
}

function referansSure(basvuru) {
  const b = temiz(basvuru).toLowerCase()
  const nm = b.includes("nakliye montaj")

  if (b.includes("çm") || b.includes("çamaşır")) return nm ? 35 : 15
  if (b.includes("bul.mak") || b.includes("bulaşık")) return nm ? 35 : 15
  if (b.includes("tv")) return nm ? 35 : 15
  if (b.includes("fırın")) return nm ? 35 : 15

  // Klima nakliye-montaj çağrılarında ilk fazda sadece nakliye süresi planlanır.
  if (b.includes("salon tipi klima")) return 45
  if (b.includes("klima")) return 20

  if (b.includes("su sebili")) return nm ? 35 : 15
  if (b.includes("buzdolabı")) return nm ? 60 : 30
  if (b.includes("derin dondurucu")) return nm ? 40 : 20
  if (b.includes("küçük ev")) return 15
  if (b.includes("termosifon")) return nm ? 50 : 15

  return 45
}

function tarihDonustur(v) {
  const s = temiz(v)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const { data, error } = await supabase
  .from("aron_ham_veriler")
  .select("*")
  .eq("veri_tipi", "acik_fis_listesi")
  .eq("kaynak", "ARON")

if (error) {
  console.error("Ham veri okunamadı:", error.message)
  process.exit(1)
}

let toplam = 0
let kapsamaGiren = 0
let atamaBekleyen = 0
let atanmisIzleme = 0

for (const kayit of data || []) {
  toplam++

  const j = kayit.ham_json || {}
  const isTipi = isTipiBelirle(j.BasvuruNedeni)

  if (!isTipi) continue
  kapsamaGiren++

  const fisNo = temiz(j.FisNo)

  const teknisyenRaw = temiz(j.Teknisyen)
  const teknisyen =
    teknisyenRaw.toLowerCase().includes("atanmamış") ||
    teknisyenRaw.toLowerCase().includes("atanmamis")
      ? ""
      : teknisyenRaw

  const randevuRaw = temiz(j.RANDEVU_TARIHI || j.Randevu || j.TOA_RANDEVU_TARIHI)
  const randevuTarihi = tarihDonustur(randevuRaw)

  const atamaGerekli = !teknisyen
  if (atamaGerekli) atamaBekleyen++
  else atanmisIzleme++

  const kategori = urunKategorisi(j.BasvuruNedeni)
  const adres = temiz(j.ADRES) || urlDegilseAdres(j.SchedulingAddress)
  const kat = katBilgisiCikar(adres)
  const katZam = katZamOrani(kat, kategori)

  const referans = referansSure(j.BasvuruNedeni)
  const katZamliSure = Math.ceil(referans * (1 + katZam))
  const riskliSure = Math.ceil(katZamliSure * 1.2)
  const acikGun = Number(j.AcikGun || 0) || 0
  const klimaCiftUnite = kategori === "KLIMA"

  const row = {
    fis_no: fisNo,
    basvuru_no: temiz(j.BasvuruNo),

    musteri_adi: temiz(j.Musteri),
    telefon: temiz(j.Telefon || j.IrtibatTelefon || j.Telefon2 || j.Telefon3),

    il: temiz(j.IL),
    ilce: temiz(j.ILCE),
    mahalle: temiz(j.Mahalle),
    adres,
    enlem: koordinat(j.ENLEM),
    boylam: koordinat(j.BOYLAM),

    bayi: temiz(j.Bayi),
    basvuru_nedeni: temiz(j.BasvuruNedeni),
    basvuru_notu: temiz(j.BASVURU_NOTU || j.YORUM),

    urun_adi: temiz(j.AnaGrup || j.BasvuruNedeni),
    urun_grubu: temiz(j.AnaGrup),
    urun_model_kodu: temiz(j.MODEL_KODU || j.KUL_MODEL_KODU),
    seri_no: temiz(j.SERINO),
    marka: temiz(j.Marka),

    is_tipi: isTipi,
    urun_kategori: kategori,
    gerekli_arac_sinifi: gerekliAracSinifi(kategori, j.BasvuruNedeni),
    gerekli_yetenek: gerekliYetenek(kategori, isTipi),
    klima_cift_unite: klimaCiftUnite,
    zimmet_islem_tipi: isTipi,
    operasyon_durumu: atamaGerekli ? "atama_bekliyor" : "atanmis_izlemede",
    operasyon_asamasi: "havuz",

    teknisyen,
    randevu_tarihi: randevuTarihi,
    zaman_slotu: temiz(j.ZAMAN_SLOT),

    atama_gerekli: atamaGerekli,
    randevu_gerekli: !randevuRaw,
    teknisyen_ekranina_aktar: Boolean(teknisyen && randevuRaw),

    acik_gun: acikGun,
    kritik_cagri: acikGun >= 4,

    referans_sure_dk: referans,
    kat_bilgisi: kat,
    kat_zam_orani: katZam,
    kat_zamli_sure_dk: katZamliSure,
    riskli_sure_dk: riskliSure,

    kaynak_ham_veri_id: kayit.id,
    updated_at: new Date().toISOString()
  }

  const { error: upsertError } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .upsert(row, { onConflict: "fis_no" })

  if (upsertError) {
    console.error("Havuz aktarım hatası:", fisNo, upsertError.message)
    process.exit(1)
  }
}

console.log("Toplam ham kayıt:", toplam)
console.log("Operasyon kapsamına giren:", kapsamaGiren)
console.log("Atama bekleyen:", atamaBekleyen)
console.log("Atanmış izleme:", atanmisIzleme)
console.log("aktif_operasyon_havuzu_v2 aktarımı tamamlandı.")
