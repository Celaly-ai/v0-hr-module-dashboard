"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  HIZMET_SURE_SELECT,
  type HizmetSureKaydi,
  isTipindenKod,
} from "@/lib/services/hizmet-sure-katalogu-service"

const EXCEL_KOLONLARI = [
  "hizmet_kodu",
  "hizmet_adi",
  "is_tipi",
  "gerekli_yetenek",
  "referans_sure_dk",
  "zorluk_katsayisi",
  "aktif",
  "aciklama",
  "ogrenmeye_acik",
  "ai_guncelleyebilir",
] as const

const KATALOG_SELECT = `${HIZMET_SURE_SELECT}, ogrenmeye_acik, ai_guncelleyebilir`

type KatalogKaydi = HizmetSureKaydi & {
  ogrenmeye_acik?: boolean | null
  ai_guncelleyebilir?: boolean | null
}

type YuklemeOzeti = {
  toplamSatir: number
  yeniEklenen: number
  guncellenen: number
  hatali: number
  hataDetayi: Array<{ satir: number; hizmet_kodu?: string; hata: string }>
}

type FormState = {
  hizmet_kodu: string
  hizmet_adi: string
  is_tipi: string
  gerekli_yetenek: string
  referans_sure_dk: string
  zorluk_katsayisi: string
  aciklama: string
  aktif: boolean
}

const bosForm: FormState = {
  hizmet_kodu: "",
  hizmet_adi: "",
  is_tipi: "",
  gerekli_yetenek: "",
  referans_sure_dk: "60",
  zorluk_katsayisi: "1",
  aciklama: "",
  aktif: true,
}

const inputSinifi =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900"

function kolonTemizle(value: unknown) {
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

function satirDeger(row: Record<string, unknown>, kolon: string) {
  const hedef = kolonTemizle(kolon)
  for (const [key, value] of Object.entries(row)) {
    if (kolonTemizle(key) === hedef) return value
  }
  return ""
}

function booleanDeger(value: unknown, varsayilan: boolean) {
  const metin = String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")

  if (!metin) return varsayilan
  if (["true", "1", "evet", "aktif", "yes"].includes(metin)) return true
  if (["false", "0", "hayir", "pasif", "no"].includes(metin)) return false
  return varsayilan
}

function excelSatiriniAyikla(
  row: Record<string, unknown>,
  satirNo: number,
): { payload: Record<string, unknown> } | { hata: string; hizmet_kodu?: string } {
  const hizmetKodu = String(satirDeger(row, "hizmet_kodu") ?? "")
    .trim()
    .toUpperCase()
  const hizmetAdi = String(satirDeger(row, "hizmet_adi") ?? "").trim()
  const referansSure = Number(satirDeger(row, "referans_sure_dk"))
  const zorlukKatsayisi = Number(satirDeger(row, "zorluk_katsayisi"))

  if (!hizmetKodu || !hizmetAdi) {
    return {
      hata: "hizmet_kodu ve hizmet_adi zorunludur",
      hizmet_kodu: hizmetKodu || undefined,
    }
  }

  if (!Number.isFinite(referansSure) || referansSure <= 0) {
    return {
      hata: "referans_sure_dk pozitif sayı olmalıdır",
      hizmet_kodu: hizmetKodu,
    }
  }

  const isTipi = String(satirDeger(row, "is_tipi") ?? "").trim()
  const gerekliYetenek = String(satirDeger(row, "gerekli_yetenek") ?? "").trim()
  const aciklama = String(satirDeger(row, "aciklama") ?? "").trim()

  return {
    payload: {
      hizmet_kodu: hizmetKodu,
      hizmet_adi: hizmetAdi,
      is_tipi: isTipi || null,
      gerekli_yetenek: gerekliYetenek || null,
      referans_sure_dk: Math.round(referansSure),
      zorluk_katsayisi:
        Number.isFinite(zorlukKatsayisi) && zorlukKatsayisi > 0 ? zorlukKatsayisi : 1,
      aktif: booleanDeger(satirDeger(row, "aktif"), true),
      aciklama: aciklama || null,
      ogrenmeye_acik: booleanDeger(satirDeger(row, "ogrenmeye_acik"), true),
      ai_guncelleyebilir: booleanDeger(satirDeger(row, "ai_guncelleyebilir"), false),
      kaynak: "manuel",
      updated_at: new Date().toISOString(),
      _satirNo: satirNo,
    },
  }
}

function katalogExcelSatirinaDonustur(kayit: KatalogKaydi) {
  return {
    hizmet_kodu: kayit.hizmet_kodu,
    hizmet_adi: kayit.hizmet_adi,
    is_tipi: kayit.is_tipi ?? "",
    gerekli_yetenek: kayit.gerekli_yetenek ?? "",
    referans_sure_dk: kayit.referans_sure_dk,
    zorluk_katsayisi: Number(kayit.zorluk_katsayisi ?? 1),
    aktif: kayit.aktif !== false,
    aciklama: kayit.aciklama ?? "",
    ogrenmeye_acik: kayit.ogrenmeye_acik !== false,
    ai_guncelleyebilir: kayit.ai_guncelleyebilir === true,
  }
}

export default function HizmetSureKataloguPage() {
  const supabase = useMemo(() => createClient(), [])
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [kayitlar, setKayitlar] = useState<KatalogKaydi[]>([])
  const [form, setForm] = useState<FormState>(bosForm)
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [excelDosya, setExcelDosya] = useState<File | null>(null)
  const [yuklemeOzeti, setYuklemeOzeti] = useState<YuklemeOzeti | null>(null)
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")

  const yukle = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("hizmet_sure_katalogu")
      .select(KATALOG_SELECT)
      .order("hizmet_kodu", { ascending: true })

    if (error) {
      setHata(error.message)
      setKayitlar([])
    } else {
      setKayitlar((data ?? []) as KatalogKaydi[])
      setHata("")
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void yukle()
  }, [yukle])

  function formuDoldur(kayit: KatalogKaydi) {
    setDuzenleId(kayit.id)
    setForm({
      hizmet_kodu: kayit.hizmet_kodu,
      hizmet_adi: kayit.hizmet_adi,
      is_tipi: kayit.is_tipi ?? "",
      gerekli_yetenek: kayit.gerekli_yetenek ?? "",
      referans_sure_dk: String(kayit.referans_sure_dk),
      zorluk_katsayisi: String(kayit.zorluk_katsayisi ?? 1),
      aciklama: kayit.aciklama ?? "",
      aktif: kayit.aktif !== false,
    })
    setMesaj("")
    setHata("")
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setMesaj("")
    setHata("")

    const sure = Number(form.referans_sure_dk)
    const katsayi = Number(form.zorluk_katsayisi)

    if (!form.hizmet_kodu.trim() || !form.hizmet_adi.trim()) {
      setHata("Hizmet kodu ve adı zorunludur.")
      setKaydediliyor(false)
      return
    }

    if (!Number.isFinite(sure) || sure <= 0) {
      setHata("Referans süre pozitif bir dakika değeri olmalıdır.")
      setKaydediliyor(false)
      return
    }

    const payload = {
      hizmet_kodu: form.hizmet_kodu.trim().toUpperCase(),
      hizmet_adi: form.hizmet_adi.trim(),
      is_tipi: form.is_tipi.trim() || null,
      gerekli_yetenek: form.gerekli_yetenek.trim() || null,
      referans_sure_dk: sure,
      zorluk_katsayisi: Number.isFinite(katsayi) && katsayi > 0 ? katsayi : 1,
      aciklama: form.aciklama.trim() || null,
      aktif: form.aktif,
      kaynak: "manuel" as const,
      updated_at: new Date().toISOString(),
    }

    const sonuc = duzenleId
      ? await supabase
          .from("hizmet_sure_katalogu")
          .update(payload)
          .eq("id", duzenleId)
      : await supabase.from("hizmet_sure_katalogu").insert(payload)

    setKaydediliyor(false)

    if (sonuc.error) {
      setHata(sonuc.error.message)
      return
    }

    setForm(bosForm)
    setDuzenleId(null)
    setMesaj(duzenleId ? "Kayıt güncellendi." : "Yeni hizmet süresi eklendi.")
    void yukle()
  }

  async function sablonIndir() {
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.aoa_to_sheet([
      [...EXCEL_KOLONLARI],
      ["N_KLIMA", "Klima Nakliye", "N", "klima", 55, 1, true, "Ornek aciklama", true, false],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Katalog")
    XLSX.writeFile(wb, "hizmet_sure_katalogu_sablonu.xlsx")
  }

  async function katalogDisaAktar() {
    const XLSX = await import("xlsx")
    const satirlar = kayitlar.map(katalogExcelSatirinaDonustur)
    const ws = XLSX.utils.json_to_sheet(satirlar, { header: [...EXCEL_KOLONLARI] })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Katalog")
    XLSX.writeFile(wb, `hizmet_sure_katalogu_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function excelTopluYukle() {
    if (!excelDosya) {
      setHata("Lütfen bir Excel dosyası seçin.")
      return
    }

    setExcelYukleniyor(true)
    setMesaj("")
    setHata("")
    setYuklemeOzeti(null)

    try {
      const XLSX = await import("xlsx")
      const buffer = await excelDosya.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })

      if (!workbook.SheetNames.length) {
        setHata("Excel dosyasında sayfa bulunamadı.")
        return
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const hamSatirlar = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      })

      const { data: mevcutKayitlar, error: mevcutError } = await supabase
        .from("hizmet_sure_katalogu")
        .select("id, hizmet_kodu")

      if (mevcutError) {
        setHata(mevcutError.message)
        return
      }

      const kodHaritasi = new Map(
        (mevcutKayitlar ?? []).map((k) => [String(k.hizmet_kodu).trim().toUpperCase(), k.id]),
      )

      let yeniEklenen = 0
      let guncellenen = 0
      const hataDetayi: YuklemeOzeti["hataDetayi"] = []

      for (let index = 0; index < hamSatirlar.length; index++) {
        const satirNo = index + 2
        const row = hamSatirlar[index]
        const bosSatir = EXCEL_KOLONLARI.every((kolon) => !String(satirDeger(row, kolon) ?? "").trim())
        if (bosSatir) continue

        const sonuc = excelSatiriniAyikla(row, satirNo)
        if ("hata" in sonuc) {
          hataDetayi.push({
            satir: satirNo,
            hizmet_kodu: sonuc.hizmet_kodu,
            hata: sonuc.hata,
          })
          continue
        }

        const { _satirNo, ...payload } = sonuc.payload as Record<string, unknown> & {
          _satirNo: number
        }
        const kod = String(payload.hizmet_kodu)
        const mevcutId = kodHaritasi.get(kod)

        if (mevcutId) {
          const { error } = await supabase
            .from("hizmet_sure_katalogu")
            .update(payload)
            .eq("id", mevcutId)

          if (error) {
            hataDetayi.push({ satir: satirNo, hizmet_kodu: kod, hata: error.message })
            continue
          }
          guncellenen += 1
        } else {
          const { data: inserted, error } = await supabase
            .from("hizmet_sure_katalogu")
            .insert(payload)
            .select("id, hizmet_kodu")
            .maybeSingle()

          if (error) {
            hataDetayi.push({ satir: satirNo, hizmet_kodu: kod, hata: error.message })
            continue
          }

          if (inserted?.id) {
            kodHaritasi.set(kod, inserted.id)
          }
          yeniEklenen += 1
        }
      }

      const islenenSatir = hamSatirlar.filter((row) => {
        return !EXCEL_KOLONLARI.every((kolon) => !String(satirDeger(row, kolon) ?? "").trim())
      }).length

      const ozet: YuklemeOzeti = {
        toplamSatir: islenenSatir,
        yeniEklenen,
        guncellenen,
        hatali: hataDetayi.length,
        hataDetayi,
      }
      setYuklemeOzeti(ozet)

      await supabase.from("hizmet_sure_katalogu_yukleme_loglari").insert({
        dosya_adi: excelDosya.name,
        toplam_satir: ozet.toplamSatir,
        yeni_eklenen: ozet.yeniEklenen,
        guncellenen: ozet.guncellenen,
        hatali: ozet.hatali,
        hata_detayi: hataDetayi,
      })

      setMesaj(
        `Excel yükleme tamamlandı. Toplam: ${ozet.toplamSatir}, yeni: ${ozet.yeniEklenen}, güncellenen: ${ozet.guncellenen}, hatalı: ${ozet.hatali}.`,
      )
      setExcelDosya(null)
      if (excelInputRef.current) excelInputRef.current.value = ""
      void yukle()
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Excel yüklenemedi.")
    } finally {
      setExcelYukleniyor(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-10 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-700">FeyRoute Operasyon</p>
              <h1 className="text-2xl font-black">Hizmet Süre Kataloğu</h1>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Manuel referans süreler · İleride atama motoru kaynağı
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/portal"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Portal
              </Link>
              <Link
                href="/portal/akilli-atama-merkezi"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Atama Merkezi
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Excel Toplu Yükle</h2>
          <p className="mt-1 text-xs font-bold text-slate-600">
            Kolonlar: {EXCEL_KOLONLARI.join(", ")} · Aynı hizmet_kodu güncellenir
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sablonIndir()}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black"
            >
              Excel Şablonu İndir
            </button>
            <button
              type="button"
              onClick={() => void katalogDisaAktar()}
              disabled={loading || kayitlar.length === 0}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black disabled:opacity-50"
            >
              Mevcut Kataloğu Excel&apos;e Aktar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={excelYukleniyor}
              onChange={(e) => setExcelDosya(e.target.files?.[0] ?? null)}
              className={inputSinifi}
            />
            <button
              type="button"
              onClick={() => void excelTopluYukle()}
              disabled={excelYukleniyor || !excelDosya}
              className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {excelYukleniyor ? "Yükleniyor..." : "Excel Yükle"}
            </button>
          </div>

          {yuklemeOzeti && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800">
              <p>Toplam satır: {yuklemeOzeti.toplamSatir}</p>
              <p>Yeni eklenen: {yuklemeOzeti.yeniEklenen}</p>
              <p>Güncellenen: {yuklemeOzeti.guncellenen}</p>
              <p>Hatalı: {yuklemeOzeti.hatali}</p>
              {yuklemeOzeti.hataDetayi.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs font-bold text-red-700">
                  {yuklemeOzeti.hataDetayi.slice(0, 20).map((item) => (
                    <li key={`${item.satir}-${item.hizmet_kodu ?? "?"}`}>
                      Satır {item.satir}
                      {item.hizmet_kodu ? ` (${item.hizmet_kodu})` : ""}: {item.hata}
                    </li>
                  ))}
                  {yuklemeOzeti.hataDetayi.length > 20 && (
                    <li>... ve {yuklemeOzeti.hataDetayi.length - 20} hata daha</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">
            {duzenleId ? "Kaydı Düzenle" : "Yeni Referans Süre"}
          </h2>
          <form onSubmit={(e) => void kaydet(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Hizmet Kodu">
              <input
                className={inputSinifi}
                value={form.hizmet_kodu}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hizmet_kodu: e.target.value.toUpperCase() }))
                }
                placeholder="NM, M_KLIMA..."
                required
              />
            </Field>
            <Field label="Hizmet Adı">
              <input
                className={inputSinifi}
                value={form.hizmet_adi}
                onChange={(e) => setForm((f) => ({ ...f, hizmet_adi: e.target.value }))}
                required
              />
            </Field>
            <Field label="İş Tipi (N/M/NM)">
              <select
                className={inputSinifi}
                value={form.is_tipi}
                onChange={(e) => setForm((f) => ({ ...f, is_tipi: e.target.value }))}
              >
                <option value="">Seçilmedi</option>
                <option value="N">N — Nakliye</option>
                <option value="M">M — Montaj</option>
                <option value="NM">NM — Nakliye + Montaj</option>
              </select>
            </Field>
            <Field label="Gerekli Yetenek">
              <input
                className={inputSinifi}
                value={form.gerekli_yetenek}
                onChange={(e) => setForm((f) => ({ ...f, gerekli_yetenek: e.target.value }))}
                placeholder="klima, beyaz..."
              />
            </Field>
            <Field label="Referans Süre (dk)">
              <input
                type="number"
                min={1}
                className={inputSinifi}
                value={form.referans_sure_dk}
                onChange={(e) => setForm((f) => ({ ...f, referans_sure_dk: e.target.value }))}
                required
              />
            </Field>
            <Field label="Zorluk Katsayısı">
              <input
                type="number"
                min={0.1}
                step={0.1}
                className={inputSinifi}
                value={form.zorluk_katsayisi}
                onChange={(e) => setForm((f) => ({ ...f, zorluk_katsayisi: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Açıklama">
                <textarea
                  className={`${inputSinifi} min-h-[80px]`}
                  value={form.aciklama}
                  onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm((f) => ({ ...f, aktif: e.target.checked }))}
              />
              Aktif kayıt
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={kaydediliyor}
                className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {kaydediliyor ? "Kaydediliyor..." : duzenleId ? "Güncelle" : "Ekle"}
              </button>
              {duzenleId && (
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black"
                  onClick={() => {
                    setDuzenleId(null)
                    setForm(bosForm)
                  }}
                >
                  İptal
                </button>
              )}
            </div>
          </form>
          {mesaj && <p className="mt-3 text-sm font-bold text-green-700">{mesaj}</p>}
          {hata && <p className="mt-3 text-sm font-bold text-red-700">{hata}</p>}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Katalog ({kayitlar.length})</h2>
          {loading ? (
            <p className="mt-3 text-sm font-bold text-slate-600">Yükleniyor...</p>
          ) : kayitlar.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-slate-600">
              Kayıt yok. SQL scriptini çalıştırdıysanız tablo erişimini kontrol edin.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {kayitlar.map((k) => (
                <article
                  key={k.id}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-blue-700">{k.hizmet_kodu}</p>
                      <p className="text-base font-black">{k.hizmet_adi}</p>
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        {k.is_tipi ? `İş: ${k.is_tipi}` : "İş tipi genel"}
                        {k.gerekli_yetenek ? ` · Yetenek: ${k.gerekli_yetenek}` : ""}
                        {k.is_tipi && !k.gerekli_yetenek
                          ? ` · Eşleşme: ${isTipindenKod(k.is_tipi) ?? k.is_tipi}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">
                        {k.referans_sure_dk} dk
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Katsayı: {k.zorluk_katsayisi ?? 1}
                      </p>
                    </div>
                  </div>
                  {k.aciklama && (
                    <p className="mt-2 text-xs font-bold text-slate-600">{k.aciklama}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${
                        k.aktif !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {k.aktif !== false ? "Aktif" : "Pasif"}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                      {k.kaynak ?? "manuel"}
                    </span>
                    <button
                      type="button"
                      onClick={() => formuDoldur(k)}
                      className="ml-auto text-xs font-black text-blue-700"
                    >
                      Düzenle
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}
