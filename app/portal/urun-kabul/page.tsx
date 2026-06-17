"use client"

import { useMemo, useState } from "react"
import BarcodeScanner from "@/components/barcode-scanner"

type CihazSatiri = {
  barkod: string
  seri_no: string
  marka: string
  model: string
}

const BOS_CIHAZ: CihazSatiri = {
  barkod: "",
  seri_no: "",
  marka: "",
  model: "",
}

export default function UrunKabulPage() {
  const [kaynakTipi, setKaynakTipi] = useState("bayi")
  const [kaynakAdi, setKaynakAdi] = useState("")
  const [teslimEdenAdi, setTeslimEdenAdi] = useState("")
  const [teslimEdenTelefon, setTeslimEdenTelefon] = useState("")
  const [cihazlar, setCihazlar] = useState<CihazSatiri[]>([{ ...BOS_CIHAZ }])
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState("")
  const [basari, setBasari] = useState("")
  const [belgeNo, setBelgeNo] = useState("")

  const gecerliCihazSayisi = useMemo(() => {
    return cihazlar.filter((c) => c.barkod.trim() && c.seri_no.trim()).length
  }, [cihazlar])

  function cihazGuncelle(index: number, field: keyof CihazSatiri, value: string) {
    setCihazlar((onceki) =>
      onceki.map((cihaz, i) => (i === index ? { ...cihaz, [field]: value } : cihaz)),
    )
  }

  function cihazEkle() {
    setCihazlar((onceki) => [...onceki, { ...BOS_CIHAZ }])
  }

  function cihazSil(index: number) {
    setCihazlar((onceki) => {
      if (onceki.length === 1) return onceki
      return onceki.filter((_, i) => i !== index)
    })
  }

  function formuTemizle() {
    setKaynakTipi("bayi")
    setKaynakAdi("")
    setTeslimEdenAdi("")
    setTeslimEdenTelefon("")
    setCihazlar([{ ...BOS_CIHAZ }])
    setBelgeNo("")
    setHata("")
    setBasari("")
  }

  async function kaydet() {
    setKaydediliyor(true)
    setHata("")
    setBasari("")
    setBelgeNo("")

    const temizCihazlar = cihazlar
      .map((c) => ({
        barkod: c.barkod.trim(),
        seri_no: c.seri_no.trim(),
        marka: c.marka.trim(),
        model: c.model.trim(),
      }))
      .filter((c) => c.barkod || c.seri_no)

    if (temizCihazlar.length === 0) {
      setHata("En az bir cihaz girilmelidir.")
      setKaydediliyor(false)
      return
    }

    const eksikBarkod = temizCihazlar.some((c) => !c.barkod)
    const eksikSeriNo = temizCihazlar.some((c) => !c.seri_no)

    if (eksikBarkod || eksikSeriNo) {
      setHata("Her cihaz için barkod ve seri no zorunludur.")
      setKaydediliyor(false)
      return
    }

    const tekrarKontrol = new Set<string>()

    for (const cihaz of temizCihazlar) {
      const anahtar = `${cihaz.barkod}__${cihaz.seri_no}`.toLocaleLowerCase("tr-TR")
      if (tekrarKontrol.has(anahtar)) {
        setHata("Aynı barkod / seri no aynı kayıt içinde tekrar edemez.")
        setKaydediliyor(false)
        return
      }
      tekrarKontrol.add(anahtar)
    }

    const response = await fetch("/api/urun-kabul", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kaynak_tipi: kaynakTipi,
        kaynak_adi: kaynakAdi,
        teslim_eden_adi: teslimEdenAdi,
        teslim_eden_telefon: teslimEdenTelefon,
        teslim_alan_adi: "Depo / Servis",
        urunler: temizCihazlar,
      }),
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata(json?.error || "Cihaz sisteme alınamadı.")
      setKaydediliyor(false)
      return
    }

    const no = json?.fis?.belge_no || ""
    setBelgeNo(no)
    setBasari(`${no || "Cihaz kayıt işlemi"} oluşturuldu. ${temizCihazlar.length} cihaz depoya alındı.`)
    setKaydediliyor(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Cihaz Takip Merkezi
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Cihaz Sisteme Al
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            İlk kez sorumluluğumuza giren cihazları barkod ve seri no ile depoya kaydedin.
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

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Kaynak Bilgisi
              </h2>

              <div className="mt-4 space-y-4">
                <Field label="Kaynak Tipi">
                  <select
                    value={kaynakTipi}
                    onChange={(e) => setKaynakTipi(e.target.value)}
                    className="field"
                  >
                    <option value="bayi">Bayi</option>
                    <option value="depo">Depo</option>
                    <option value="kargo">Kargo</option>
                    <option value="musteri">Müşteri</option>
                    <option value="diger">Diğer</option>
                  </select>
                </Field>

                <Field label="Kaynak Adı">
                  <input
                    value={kaynakAdi}
                    onChange={(e) => setKaynakAdi(e.target.value)}
                    placeholder="Örn: ABC Bayisi / Kargo / Depo"
                    className="field"
                  />
                </Field>

                <Field label="Teslim Eden">
                  <input
                    value={teslimEdenAdi}
                    onChange={(e) => setTeslimEdenAdi(e.target.value)}
                    placeholder="Teslim eden kişi"
                    className="field"
                  />
                </Field>

                <Field label="Teslim Eden Telefon">
                  <input
                    value={teslimEdenTelefon}
                    onChange={(e) => setTeslimEdenTelefon(e.target.value)}
                    placeholder="05xx xxx xx xx"
                    className="field"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Kayıt Özeti
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Info title="Satır" value={cihazlar.length} />
                <Info title="Geçerli" value={gecerliCihazSayisi} />
              </div>

              <button
                type="button"
                onClick={kaydet}
                disabled={kaydediliyor || gecerliCihazSayisi === 0}
                className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600"
              >
                {kaydediliyor ? "Kaydediliyor..." : "Cihazları Sisteme Al"}
              </button>

              <button
                type="button"
                onClick={formuTemizle}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Formu Temizle
              </button>

              {belgeNo && (
                <div className="mt-4 rounded-2xl border border-blue-300 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Oluşan Kayıt
                  </p>
                  <p className="mt-1 text-xl font-black text-blue-950">{belgeNo}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-bold text-blue-950">
              Bu işlemde belge veya imza gerekmez. Cihazlar ilk kayıt olarak depoya alınır. İmzalı belge sadece iade sürecinde zorunlu olacaktır.
            </div>
          </div>

          <div className="rounded-3xl border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Cihazlar
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Her cihaz için barkod ve seri no zorunludur.
                </p>
              </div>

              <button
                type="button"
                onClick={cihazEkle}
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                + Cihaz Ekle
              </button>
            </div>

            <div className="space-y-3 p-4">
              {cihazlar.map((c, index) => (
                <div key={index} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-700">
                      Cihaz {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => cihazSil(index)}
                      disabled={cihazlar.length === 1}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-800 disabled:opacity-40"
                    >
                      Sil
                    </button>
                  </div>

                  <div className="mb-4">
                    <BarcodeScanner
                      onDetected={(value) => {
                        cihazGuncelle(index, "barkod", value)
                      }}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Barkod">
                      <input
                        value={c.barkod}
                        onChange={(e) => cihazGuncelle(index, "barkod", e.target.value)}
                        placeholder="Barkod okut / gir"
                        className="field"
                      />
                    </Field>

                    <Field label="Seri No">
                      <input
                        value={c.seri_no}
                        onChange={(e) => cihazGuncelle(index, "seri_no", e.target.value)}
                        placeholder="Seri no"
                        className="field"
                      />
                    </Field>

                    <Field label="Marka">
                      <input
                        value={c.marka}
                        onChange={(e) => cihazGuncelle(index, "marka", e.target.value)}
                        placeholder="Marka"
                        className="field"
                      />
                    </Field>

                    <Field label="Model">
                      <input
                        value={c.model}
                        onChange={(e) => cihazGuncelle(index, "model", e.target.value)}
                        placeholder="Model"
                        className="field"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .field {
          min-height: 46px;
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

        textarea.field {
          padding-top: 12px;
        }

        .field:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
        }
      `}</style>
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

function Info({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}
