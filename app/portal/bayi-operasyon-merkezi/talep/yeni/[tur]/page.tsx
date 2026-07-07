"use client"

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  TALEP_TURU_ETIKETLERI,
  adresGerektirenTur,
  gecerliTalepTuru,
  ocrAlanlariFormaUygula,
  ocrGuvenEtiketi,
  urunGerektirenTur,
} from "@/lib/bayi-operasyon-utils"
import {
  createBayiTalep,
  listBayiKartlari,
  uploadBayiTalepBelgesi,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiGorselAnalizSonuc, BayiKart, BayiTalepTuru } from "@/lib/types/bayi-operasyon"

type FormState = {
  bayi_kart_id: string
  musteri_adi: string
  telefon: string
  alternatif_telefon: string
  adres: string
  il: string
  ilce: string
  mahalle: string
  urun_turu: string
  model: string
  seri_no: string
  satis_tarihi: string
  aciklama: string
  personel_notu: string
}

const bosForm: FormState = {
  bayi_kart_id: "",
  musteri_adi: "",
  telefon: "",
  alternatif_telefon: "",
  adres: "",
  il: "",
  ilce: "",
  mahalle: "",
  urun_turu: "",
  model: "",
  seri_no: "",
  satis_tarihi: "",
  aciklama: "",
  personel_notu: "",
}

const inputSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-base font-semibold text-slate-900 placeholder:text-slate-500"
const selectSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-base font-bold text-slate-900"
const labelSinifi = "mb-1.5 block text-sm font-bold text-slate-900"

export default function BayiTalepYeniPage() {
  const router = useRouter()
  const params = useParams()

  const tur = useMemo(() => {
    const value = params?.tur
    const ham = Array.isArray(value) ? value[0] : String(value || "")
    return gecerliTalepTuru(ham) ? (ham as BayiTalepTuru) : null
  }, [params])

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [bayiler, setBayiler] = useState<BayiKart[]>([])
  const [form, setForm] = useState<FormState>(bosForm)
  const [gorsel, setGorsel] = useState<File | null>(null)
  const [gorselOnizleme, setGorselOnizleme] = useState<string | null>(null)
  const [ocrAnaliz, setOcrAnaliz] = useState<BayiGorselAnalizSonuc | null>(null)
  const [ocrYukleniyor, setOcrYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)

  const yukle = useCallback(async () => {
    setLoading(true)
    const sonuc = await listBayiKartlari()
    if (!sonuc.ok) {
      setHata(sonuc.error)
      setBayiler([])
    } else {
      setBayiler(sonuc.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void yukle()
  }, [yukle])

  function formGuncelle<K extends keyof FormState>(alan: K, deger: FormState[K]) {
    setForm((onceki) => ({ ...onceki, [alan]: deger }))
  }

  async function gorselSec(e: ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0] || null
    setGorsel(dosya)
    setOcrAnaliz(null)
    setGorselOnizleme(null)

    if (!dosya) return

    if (!dosya.type.startsWith("image/")) {
      setHata("Lütfen geçerli bir görsel dosyası seçin.")
      setGorsel(null)
      return
    }

    setHata(null)
    setOcrYukleniyor(true)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Full = event.target?.result as string
      setGorselOnizleme(base64Full)
      const base64Data = base64Full.split(",")[1]

      try {
        const response = await fetch("/api/bayi-operasyon/analyze-gorsel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mediaType: dosya.type,
            talep_turu: tur,
          }),
        })
        const result = await response.json()

        if (result.success && result.data) {
          setOcrAnaliz(result.data as BayiGorselAnalizSonuc)
        } else {
          setHata(result.error || "Görsel analiz edilemedi.")
        }
      } catch {
        setHata("Görsel analizi sırasında bağlantı hatası oluştu.")
      } finally {
        setOcrYukleniyor(false)
      }
    }
    reader.readAsDataURL(dosya)
  }

  function ocrFormaUygula() {
    if (!ocrAnaliz) return
    setForm((onceki) => ocrAlanlariFormaUygula(onceki, ocrAnaliz.alanlar, true))
    setMesaj("AI önerileri boş alanlara uygulandı.")
  }

  function dogrula(): string | null {
    if (!tur) return "Geçersiz talep türü."

    const musteriAdi = form.musteri_adi.trim()
    const telefon = form.telefon.trim()
    const aciklama = form.aciklama.trim()

    if (["montaj", "ariza", "acil", "tekrar_servis"].includes(tur)) {
      if (!musteriAdi) return "Müşteri adı zorunludur."
      if (!telefon) return "Telefon zorunludur."
    }

    if (tur === "randevu_sorgu" && !telefon && !musteriAdi) {
      return "Randevu sorgusu için müşteri adı veya telefon girin."
    }

    if (
      ["randevu_degisiklik", "adres_guncelle", "telefon_guncelle", "sikayet"].includes(tur) &&
      !aciklama
    ) {
      return "Açıklama zorunludur."
    }

    if (tur === "telefon_guncelle" && !telefon && !form.alternatif_telefon.trim()) {
      return "Telefon veya alternatif telefon girin."
    }

    if (adresGerektirenTur(tur) && tur === "adres_guncelle" && !form.adres.trim()) {
      return "Adres zorunludur."
    }

    return null
  }

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    setHata(null)
    setMesaj(null)

    if (!tur) {
      setHata("Geçersiz talep türü.")
      return
    }

    const dogrulamaHatasi = dogrula()
    if (dogrulamaHatasi) {
      setHata(dogrulamaHatasi)
      return
    }

    setKaydediliyor(true)

    const sonuc = await createBayiTalep({
      talep_turu: tur,
      bayi_kart_id: form.bayi_kart_id || null,
      musteri_adi: form.musteri_adi,
      telefon: form.telefon,
      alternatif_telefon: form.alternatif_telefon,
      adres: form.adres,
      il: form.il,
      ilce: form.ilce,
      mahalle: form.mahalle,
      urun_turu: form.urun_turu,
      model: form.model,
      seri_no: form.seri_no,
      satis_tarihi: form.satis_tarihi || undefined,
      aciklama: form.aciklama,
      personel_notu: form.personel_notu,
      ai_analiz_json: ocrAnaliz
        ? {
            mode: ocrAnaliz.mode,
            alanlar: ocrAnaliz.alanlar,
            guven_skoru: ocrAnaliz.guven_skoru,
            mesaj: ocrAnaliz.mesaj,
          }
        : null,
      ai_guven_skoru: ocrAnaliz?.guven_skoru ?? null,
    })

    if (!sonuc.ok) {
      setHata(sonuc.error)
      setKaydediliyor(false)
      return
    }

    if (gorsel) {
      const belgeSonuc = await uploadBayiTalepBelgesi(sonuc.data.id, gorsel, {
        ocrJson: ocrAnaliz
          ? {
              mode: ocrAnaliz.mode,
              alanlar: ocrAnaliz.alanlar,
              guven_skoru: ocrAnaliz.guven_skoru,
              ham_metin: ocrAnaliz.ham_metin,
            }
          : null,
      })
      if (!belgeSonuc.ok) {
        setMesaj(`Talep oluşturuldu (${sonuc.data.talep_no}) ancak görsel yüklenemedi.`)
        router.push(`/portal/bayi-operasyon-merkezi/talep/${sonuc.data.id}`)
        return
      }
    }

    router.push(`/portal/bayi-operasyon-merkezi/talep/${sonuc.data.id}`)
  }

  if (!tur) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <p className="font-bold text-red-700">Geçersiz talep türü.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="font-bold text-slate-700">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-lg px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/talep-merkezi")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-950">{TALEP_TURU_ETIKETLERI[tur]}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">Talep formu</p>
          </div>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        {mesaj && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {mesaj}
          </div>
        )}

        <form onSubmit={kaydet} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <label className={labelSinifi} htmlFor="bayi_kart_id">
              Bayi
            </label>
            <select
              id="bayi_kart_id"
              value={form.bayi_kart_id}
              onChange={(e) => formGuncelle("bayi_kart_id", e.target.value)}
              className={selectSinifi}
            >
              <option value="">Bayi seçin (opsiyonel)</option>
              {bayiler.map((bayi) => (
                <option key={bayi.id} value={bayi.id}>
                  {bayi.bayi_adi}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelSinifi} htmlFor="musteri_adi">
              Müşteri Adı
            </label>
            <input
              id="musteri_adi"
              value={form.musteri_adi}
              onChange={(e) => formGuncelle("musteri_adi", e.target.value)}
              className={inputSinifi}
              placeholder="Örn: Medine Duman"
            />
          </div>

          <div>
            <label className={labelSinifi} htmlFor="telefon">
              Telefon
            </label>
            <input
              id="telefon"
              type="tel"
              value={form.telefon}
              onChange={(e) => formGuncelle("telefon", e.target.value)}
              className={inputSinifi}
              placeholder="05xx xxx xx xx"
            />
          </div>

          <div>
            <label className={labelSinifi} htmlFor="alternatif_telefon">
              Alternatif Telefon
            </label>
            <input
              id="alternatif_telefon"
              type="tel"
              value={form.alternatif_telefon}
              onChange={(e) => formGuncelle("alternatif_telefon", e.target.value)}
              className={inputSinifi}
            />
          </div>

          {adresGerektirenTur(tur) && (
            <>
              <div>
                <label className={labelSinifi} htmlFor="adres">
                  Adres
                </label>
                <textarea
                  id="adres"
                  value={form.adres}
                  onChange={(e) => formGuncelle("adres", e.target.value)}
                  className={`${inputSinifi} min-h-[90px] resize-y`}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelSinifi} htmlFor="il">
                    İl
                  </label>
                  <input
                    id="il"
                    value={form.il}
                    onChange={(e) => formGuncelle("il", e.target.value)}
                    className={inputSinifi}
                  />
                </div>
                <div>
                  <label className={labelSinifi} htmlFor="ilce">
                    İlçe
                  </label>
                  <input
                    id="ilce"
                    value={form.ilce}
                    onChange={(e) => formGuncelle("ilce", e.target.value)}
                    className={inputSinifi}
                  />
                </div>
                <div>
                  <label className={labelSinifi} htmlFor="mahalle">
                    Mahalle
                  </label>
                  <input
                    id="mahalle"
                    value={form.mahalle}
                    onChange={(e) => formGuncelle("mahalle", e.target.value)}
                    className={inputSinifi}
                  />
                </div>
              </div>
            </>
          )}

          {urunGerektirenTur(tur) && (
            <>
              <div>
                <label className={labelSinifi} htmlFor="urun_turu">
                  Ürün Türü
                </label>
                <input
                  id="urun_turu"
                  value={form.urun_turu}
                  onChange={(e) => formGuncelle("urun_turu", e.target.value)}
                  className={inputSinifi}
                  placeholder="Çamaşır makinesi, buzdolabı..."
                />
              </div>
              <div>
                <label className={labelSinifi} htmlFor="model">
                  Model / Ürün Kodu
                </label>
                <input
                  id="model"
                  value={form.model}
                  onChange={(e) => formGuncelle("model", e.target.value)}
                  className={inputSinifi}
                />
              </div>
              <div>
                <label className={labelSinifi} htmlFor="seri_no">
                  Seri No
                </label>
                <input
                  id="seri_no"
                  value={form.seri_no}
                  onChange={(e) => formGuncelle("seri_no", e.target.value)}
                  className={inputSinifi}
                />
              </div>
              <div>
                <label className={labelSinifi} htmlFor="satis_tarihi">
                  Satış Tarihi
                </label>
                <input
                  id="satis_tarihi"
                  type="date"
                  value={form.satis_tarihi}
                  onChange={(e) => formGuncelle("satis_tarihi", e.target.value)}
                  className={inputSinifi}
                />
              </div>
            </>
          )}

          <div>
            <label className={labelSinifi} htmlFor="aciklama">
              Açıklama / Talep Detayı
            </label>
            <textarea
              id="aciklama"
              value={form.aciklama}
              onChange={(e) => formGuncelle("aciklama", e.target.value)}
              className={`${inputSinifi} min-h-[100px] resize-y`}
              placeholder="Bayi notu, randevu talebi, şikayet detayı..."
            />
          </div>

          <div>
            <label className={labelSinifi} htmlFor="personel_notu">
              Dahili Not
            </label>
            <textarea
              id="personel_notu"
              value={form.personel_notu}
              onChange={(e) => formGuncelle("personel_notu", e.target.value)}
              className={`${inputSinifi} min-h-[70px] resize-y`}
            />
          </div>

          <div>
            <label className={labelSinifi} htmlFor="gorsel">
              ERP Ekran Görüntüsü (opsiyonel)
            </label>
            <input
              id="gorsel"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={gorselSec}
              className="w-full text-sm font-semibold"
            />
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Görsel yüklendiğinde AI alan önerisi çıkarılır. Onaylamadan forma uygulayabilirsiniz.
            </p>

            {gorselOnizleme && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <img
                  src={gorselOnizleme}
                  alt="ERP önizleme"
                  className="max-h-48 w-full rounded-lg object-contain bg-white"
                />

                {ocrYukleniyor && (
                  <p className="text-sm font-bold text-blue-800">Görsel analiz ediliyor...</p>
                )}

                {ocrAnaliz && !ocrYukleniyor && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-black ${
                          ocrAnaliz.mode === "ai"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {ocrAnaliz.mode === "ai" ? "AI OCR" : "Stub mod"}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {ocrGuvenEtiketi(ocrAnaliz.guven_skoru)} ({ocrAnaliz.guven_skoru}%)
                      </span>
                    </div>

                    {ocrAnaliz.mesaj && (
                      <p className="text-xs font-semibold text-slate-600">{ocrAnaliz.mesaj}</p>
                    )}

                    <div className="grid grid-cols-1 gap-1 text-xs font-semibold text-slate-700 sm:grid-cols-2">
                      {Object.entries(ocrAnaliz.alanlar)
                        .filter(([, deger]) => deger)
                        .map(([alan, deger]) => (
                          <p key={alan}>
                            {alan.replace(/_/g, " ")}: {deger}
                          </p>
                        ))}
                    </div>

                    {ocrAnaliz.mode === "ai" &&
                      Object.values(ocrAnaliz.alanlar).some(Boolean) && (
                        <button
                          type="button"
                          onClick={ocrFormaUygula}
                          className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-black text-white"
                        >
                          Boş Alanlara Uygula
                        </button>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={kaydediliyor}
            className="w-full rounded-2xl bg-emerald-700 px-4 py-4 text-base font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Talebi Oluştur"}
          </button>
        </form>
      </div>
    </div>
  )
}
