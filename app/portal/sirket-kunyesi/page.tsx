"use client"

import { useEffect, useMemo, useState } from "react"
import {
  kunyeZorunluEksikleriniBul,
  sirketKaydindanKunyeOlustur,
} from "@/lib/services/sirket-kunye-service"

type Sirket = Record<string, any>

const BOS_FORM = {
  id: "",
  ad: "",
  unvan: "",
  kod: "",
  sektor: "",
  tel: "",
  email: "",
  logo_url: "",

  vergi_no: "",
  vergi_dairesi: "",
  mersis_no: "",
  ticaret_sicil_no: "",
  web_sitesi: "",

  il: "",
  ilce: "",
  mahalle: "",
  acik_adres: "",

  giris_cikis_lat: "",
  giris_cikis_lng: "",
  giris_cikis_mesafe_limiti: "",

  standart_mesai_baslangic: "",
  standart_mesai_bitis: "",

  yetkili_ad_soyad: "",
  yetkili_telefon: "",
  yetkili_email: "",
}

export default function SirketKunyesiPage() {
  const [form, setForm] = useState({ ...BOS_FORM })
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState("")
  const [basari, setBasari] = useState("")
  const [kunyeTamamlandi, setKunyeTamamlandi] = useState(false)

  const zorunluEksikler = useMemo(() => {
    const kunye = sirketKaydindanKunyeOlustur(
      {
        id: form.id || "gecici",
        ad: form.ad,
        unvan: form.unvan,
        il: form.il,
        ilce: form.ilce,
        acik_adres: form.acik_adres,
        giris_cikis_lat: form.giris_cikis_lat,
        giris_cikis_lng: form.giris_cikis_lng,
        giris_cikis_mesafe_limiti: form.giris_cikis_mesafe_limiti,
        standart_mesai_baslangic: form.standart_mesai_baslangic,
        standart_mesai_bitis: form.standart_mesai_bitis,
      },
      form.id || "gecici",
    )

    const eksikler = kunyeZorunluEksikleriniBul(kunye, form.id || "gecici")

    const formEksikleri: string[] = []
    if (!form.vergi_no.trim()) formEksikleri.push("Vergi no")
    if (!form.tel.trim()) formEksikleri.push("Telefon")
    if (!form.email.trim()) formEksikleri.push("E-posta")
    if (!form.mahalle.trim()) formEksikleri.push("Mahalle")

    return [...eksikler, ...formEksikleri]
  }, [form])

  function guncelle(field: string, value: string) {
    setForm((onceki) => ({
      ...onceki,
      [field]: value,
    }))
  }

  async function verileriYukle() {
    setLoading(true)
    setHata("")
    setBasari("")

    const response = await fetch("/api/yonetim/sirket-kunyesi", {
      cache: "no-store",
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata(json?.error || "Şirket künyesi alınamadı.")
      setLoading(false)
      return
    }

    const sirket = (json?.sirket || null) as Sirket | null

    if (sirket) {
      setForm({
        id: sirket.id || "",
        ad: sirket.ad || "",
        unvan: sirket.unvan || "",
        kod: sirket.kod || "",
        sektor: sirket.sektor || "",
        tel: sirket.tel || "",
        email: sirket.email || "",
        logo_url: sirket.logo_url || "",

        vergi_no: sirket.vergi_no || "",
        vergi_dairesi: sirket.vergi_dairesi || "",
        mersis_no: sirket.mersis_no || "",
        ticaret_sicil_no: sirket.ticaret_sicil_no || "",
        web_sitesi: sirket.web_sitesi || "",

        il: sirket.il || "",
        ilce: sirket.ilce || "",
        mahalle: sirket.mahalle || "",
        acik_adres: sirket.acik_adres || sirket.adres || "",

        giris_cikis_lat:
          sirket.giris_cikis_lat === null || sirket.giris_cikis_lat === undefined
            ? ""
            : String(sirket.giris_cikis_lat),
        giris_cikis_lng:
          sirket.giris_cikis_lng === null || sirket.giris_cikis_lng === undefined
            ? ""
            : String(sirket.giris_cikis_lng),
        giris_cikis_mesafe_limiti:
          sirket.giris_cikis_mesafe_limiti === null ||
          sirket.giris_cikis_mesafe_limiti === undefined
            ? ""
            : String(sirket.giris_cikis_mesafe_limiti),

        standart_mesai_baslangic: sirket.standart_mesai_baslangic || "",
        standart_mesai_bitis: sirket.standart_mesai_bitis || "",

        yetkili_ad_soyad: sirket.yetkili_ad_soyad || "",
        yetkili_telefon: sirket.yetkili_telefon || "",
        yetkili_email: sirket.yetkili_email || "",
      })

      setKunyeTamamlandi(Boolean(sirket.kunye_tamamlandi))
    }

    setLoading(false)
  }

  async function konumAl() {
    setHata("")
    setBasari("")

    if (!navigator.geolocation) {
      setHata("Tarayıcı konum servisini desteklemiyor.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        guncelle("giris_cikis_lat", String(pos.coords.latitude))
        guncelle("giris_cikis_lng", String(pos.coords.longitude))
        setBasari("Mevcut konum giriş/çıkış lokasyonu olarak alındı.")
      },
      (err) => {
        const mesajlar: Record<number, string> = {
          1: "Konum izni reddedildi. Tarayıcı ayarlarından izin verin.",
          2: "Konum alınamadı. İnternet bağlantısını kontrol edin.",
          3: "Konum isteği zaman aşımına uğradı.",
        }

        setHata(mesajlar[err.code] || "Konum alınamadı.")
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    )
  }

  async function kaydet() {
    setKaydediliyor(true)
    setHata("")
    setBasari("")

    const response = await fetch("/api/yonetim/sirket-kunyesi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata(json?.error || "Şirket künyesi kaydedilemedi.")
      setKaydediliyor(false)
      return
    }

    const sirket = json?.sirket || null

    if (sirket?.id) {
      guncelle("id", sirket.id)
    }

    setKunyeTamamlandi(Boolean(sirket?.kunye_tamamlandi))
    setBasari(
      sirket?.kunye_tamamlandi
        ? "Şirket künyesi tamamlandı ve kaydedildi."
        : "Şirket künyesi kaydedildi. Zorunlu alanlar tamamlanınca künye tamamlanmış kabul edilecek.",
    )
    setKaydediliyor(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="rounded-3xl border bg-white p-6 text-sm font-bold text-slate-600">
          Şirket künyesi yükleniyor...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Yönetim
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Şirket Künyesi
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Şirket bilgileri, teslim tutanakları, PDF belgeleri ve giriş/çıkış lokasyon doğrulaması için ana kaynaktır.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        {basari && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-black text-emerald-900">
            {basari}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Bolum title="Temel Şirket Bilgileri">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Şirket Adı *">
                  <input value={form.ad} onChange={(e) => guncelle("ad", e.target.value)} className="field" />
                </Field>

                <Field label="Şirket Ünvanı *">
                  <input value={form.unvan} onChange={(e) => guncelle("unvan", e.target.value)} className="field" />
                </Field>

                <Field label="Şirket Kodu">
                  <input value={form.kod} onChange={(e) => guncelle("kod", e.target.value)} className="field" />
                </Field>

                <Field label="Sektör">
                  <input value={form.sektor} onChange={(e) => guncelle("sektor", e.target.value)} className="field" />
                </Field>

                <Field label="Telefon *">
                  <input value={form.tel} onChange={(e) => guncelle("tel", e.target.value)} className="field" />
                </Field>

                <Field label="E-posta *">
                  <input value={form.email} onChange={(e) => guncelle("email", e.target.value)} className="field" />
                </Field>

                <Field label="Logo URL">
                  <input value={form.logo_url} onChange={(e) => guncelle("logo_url", e.target.value)} className="field" />
                </Field>

                <Field label="Web Sitesi">
                  <input value={form.web_sitesi} onChange={(e) => guncelle("web_sitesi", e.target.value)} className="field" />
                </Field>
              </div>
            </Bolum>

            <Bolum title="Resmi Bilgiler">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Vergi No *">
                  <input value={form.vergi_no} onChange={(e) => guncelle("vergi_no", e.target.value)} className="field" />
                </Field>

                <Field label="Vergi Dairesi">
                  <input value={form.vergi_dairesi} onChange={(e) => guncelle("vergi_dairesi", e.target.value)} className="field" />
                </Field>

                <Field label="Mersis No">
                  <input value={form.mersis_no} onChange={(e) => guncelle("mersis_no", e.target.value)} className="field" />
                </Field>

                <Field label="Ticaret Sicil No">
                  <input value={form.ticaret_sicil_no} onChange={(e) => guncelle("ticaret_sicil_no", e.target.value)} className="field" />
                </Field>
              </div>
            </Bolum>

            <Bolum title="Detaylı Adres ve Giriş/Çıkış Lokasyonu">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="İl *">
                  <input value={form.il} onChange={(e) => guncelle("il", e.target.value)} className="field" />
                </Field>

                <Field label="İlçe *">
                  <input value={form.ilce} onChange={(e) => guncelle("ilce", e.target.value)} className="field" />
                </Field>

                <Field label="Mahalle *">
                  <input value={form.mahalle} onChange={(e) => guncelle("mahalle", e.target.value)} className="field" />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Açık Adres *">
                  <textarea
                    value={form.acik_adres}
                    onChange={(e) => guncelle("acik_adres", e.target.value)}
                    className="field min-h-24 py-3"
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Giriş/Çıkış Enlem *">
                  <input
                    value={form.giris_cikis_lat}
                    onChange={(e) => guncelle("giris_cikis_lat", e.target.value)}
                    className="field"
                  />
                </Field>

                <Field label="Giriş/Çıkış Boylam *">
                  <input
                    value={form.giris_cikis_lng}
                    onChange={(e) => guncelle("giris_cikis_lng", e.target.value)}
                    className="field"
                  />
                </Field>

                <Field label="Mesafe Limiti (metre)">
                  <input
                    value={form.giris_cikis_mesafe_limiti}
                    onChange={(e) => guncelle("giris_cikis_mesafe_limiti", e.target.value)}
                    className="field"
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={konumAl}
                className="mt-4 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900 hover:bg-blue-100"
              >
                Mevcut Konumu Giriş/Çıkış Lokasyonu Yap
              </button>
            </Bolum>

            <Bolum title="Standart Mesai Saatleri">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Standart Mesai Başlangıç *">
                  <input
                    type="time"
                    value={form.standart_mesai_baslangic}
                    onChange={(e) => guncelle("standart_mesai_baslangic", e.target.value)}
                    className="field"
                  />
                </Field>

                <Field label="Standart Mesai Bitiş *">
                  <input
                    type="time"
                    value={form.standart_mesai_bitis}
                    onChange={(e) => guncelle("standart_mesai_bitis", e.target.value)}
                    className="field"
                  />
                </Field>
              </div>
            </Bolum>

            <Bolum title="Yetkili Bilgileri">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Yetkili Ad Soyad">
                  <input
                    value={form.yetkili_ad_soyad}
                    onChange={(e) => guncelle("yetkili_ad_soyad", e.target.value)}
                    className="field"
                  />
                </Field>

                <Field label="Yetkili Telefon">
                  <input
                    value={form.yetkili_telefon}
                    onChange={(e) => guncelle("yetkili_telefon", e.target.value)}
                    className="field"
                  />
                </Field>

                <Field label="Yetkili E-posta">
                  <input
                    value={form.yetkili_email}
                    onChange={(e) => guncelle("yetkili_email", e.target.value)}
                    className="field"
                  />
                </Field>
              </div>
            </Bolum>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Künye Durumu
              </h2>

              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  kunyeTamamlandi
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                <p className="text-sm font-black">
                  {kunyeTamamlandi ? "Künye Tamamlandı" : "Künye Eksik"}
                </p>

                <p className="mt-1 text-xs font-bold">
                  {kunyeTamamlandi
                    ? "Bu şirket için belge ve giriş/çıkış lokasyon bilgileri kullanılabilir."
                    : "Zorunlu alanlar tamamlanmadan şirket tam kullanıma açılmamalı."}
                </p>
              </div>

              {zorunluEksikler.length > 0 && (
                <div className="mt-4 rounded-2xl border border-dashed p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Eksik Zorunlu Alanlar
                  </p>

                  <div className="mt-3 space-y-2">
                    {zorunluEksikler.map((eksik) => (
                      <div key={eksik} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                        {eksik}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={kaydet}
                disabled={kaydediliyor}
                className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600"
              >
                {kaydediliyor ? "Kaydediliyor..." : "Şirket Künyesini Kaydet"}
              </button>

              <button
                type="button"
                onClick={() => void verileriYukle()}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Yenile
              </button>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Kullanılacağı Yerler
              </h2>

              <div className="mt-4 space-y-3 text-sm font-bold text-slate-700">
                <p>• Giriş/çıkış lokasyon doğrulaması</p>
                <p>• Ürün teslim tutanakları</p>
                <p>• PDF belge çıktıları</p>
                <p>• WhatsApp belge paylaşımı</p>
                <p>• Çoklu şirket operasyon ayrımı</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .field {
          min-height: 44px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 700;
          color: rgb(15 23 42);
          outline: none;
        }

        .field:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
        }
      `}</style>
    </div>
  )
}

function Bolum({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
