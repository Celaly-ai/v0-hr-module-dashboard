"use client"

import { useState } from "react"
import FotoYukleyici from "@/components/foto-yukleyici"
import BarcodeScanner from "@/components/barcode-scanner"

const IADE_NEDENLERI = [
  "Arıza",
  "Değişim",
  "Müşteri İptali",
  "Sözleşme Sonu",
  "Hurda",
  "Yanlış Sevk",
  "Diğer",
]

function konumAl(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Konum desteklenmiyor."))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

export default function CihazIadePage() {
  const [barkod, setBarkod] = useState("")
  const [iadeNedeni, setIadeNedeni] = useState("Arıza")
  const [teslimEdenAdi, setTeslimEdenAdi] = useState("")
  const [teslimEdenTelefon, setTeslimEdenTelefon] = useState("")
  const [teslimAlanAdi, setTeslimAlanAdi] = useState("Depo / Servis")
  const [teslimAlanKurum, setTeslimAlanKurum] = useState("Servis")
  const [imzaliBelgeFotoUrl, setImzaliBelgeFotoUrl] = useState("")
  const [aciklama, setAciklama] = useState("")
  const [islem, setIslem] = useState(false)
  const [hata, setHata] = useState("")
  const [basari, setBasari] = useState("")

  async function iadeEt() {
    setIslem(true)
    setHata("")
    setBasari("")

    try {
      if (!barkod.trim()) {
        setHata("Barkod zorunludur.")
        setIslem(false)
        return
      }

      if (!iadeNedeni.trim() || !teslimEdenAdi.trim() || !imzaliBelgeFotoUrl.trim()) {
        setHata("İade nedeni, teslim eden ve imzalı belge fotoğraf linki zorunludur.")
        setIslem(false)
        return
      }

      const pos = await konumAl()

      const response = await fetch("/api/cihaz-iade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barkod: barkod.trim(),
          iade_tipi: "cihaz_iade",
          iade_nedeni: iadeNedeni,
          teslim_eden_adi: teslimEdenAdi.trim(),
          teslim_eden_telefon: teslimEdenTelefon.trim(),
          teslim_alan_adi: teslimAlanAdi.trim() || "Depo / Servis",
          teslim_alan_kurum: teslimAlanKurum.trim() || "Servis",
          imzali_belge_foto_url: imzaliBelgeFotoUrl.trim(),
          aciklama: aciklama.trim(),
          gps_lat: pos.coords.latitude,
          gps_lng: pos.coords.longitude,
          gps_dogruluk: pos.coords.accuracy,
          islem_kaynagi: "mobil_portal",
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        setHata(json?.error || "Cihaz iade işlemi başarısız.")
        setIslem(false)
        return
      }

      setBasari(`${json?.iade_belgesi?.belge_no || "İade belgesi"} oluşturuldu. Cihaz depoya alındı.`)
      setBarkod("")
      setTeslimEdenAdi("")
      setTeslimEdenTelefon("")
      setImzaliBelgeFotoUrl("")
      setAciklama("")
    } catch (err: any) {
      setHata(err?.message || "Konum alınamadı veya iade tamamlanamadı.")
    }

    setIslem(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Cihaz Takip Merkezi
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Cihaz İade
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Sadece iade işlemlerinde imzalı belge zorunludur.
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

        <div className="rounded-3xl border bg-white p-5 shadow-sm space-y-4">
          <BarcodeScanner onDetected={(value) => setBarkod(value)} />

          <Field label="Barkod">
            <input value={barkod} onChange={(e) => setBarkod(e.target.value)} placeholder="Barkod okut / gir" className="field" />
          </Field>

          <Field label="İade Nedeni">
            <select value={iadeNedeni} onChange={(e) => setIadeNedeni(e.target.value)} className="field">
              {IADE_NEDENLERI.map((neden) => (
                <option key={neden} value={neden}>{neden}</option>
              ))}
            </select>
          </Field>

          <Field label="Teslim Eden">
            <input value={teslimEdenAdi} onChange={(e) => setTeslimEdenAdi(e.target.value)} placeholder="Teslim eden kişi" className="field" />
          </Field>

          <Field label="Teslim Eden Telefon">
            <input value={teslimEdenTelefon} onChange={(e) => setTeslimEdenTelefon(e.target.value)} placeholder="05xx xxx xx xx" className="field" />
          </Field>

          <Field label="Teslim Alan">
            <input value={teslimAlanAdi} onChange={(e) => setTeslimAlanAdi(e.target.value)} className="field" />
          </Field>

          <Field label="Teslim Alan Kurum">
            <input value={teslimAlanKurum} onChange={(e) => setTeslimAlanKurum(e.target.value)} className="field" />
          </Field>

          <FotoYukleyici
            klasor="iade"
            etiket="İmzalı İade Belgesi"
            onUploaded={(url) => {
              setImzaliBelgeFotoUrl(url)
            }}
          />

          <Field label="Açıklama">
            <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="İade açıklaması" className="field min-h-28 py-3" />
          </Field>

          <button
            type="button"
            onClick={() => void iadeEt()}
            disabled={islem}
            className="w-full rounded-2xl bg-blue-700 px-5 py-5 text-base font-black text-white disabled:bg-slate-300 disabled:text-slate-600"
          >
            {islem ? "İade Tamamlanıyor..." : "İADEYİ TAMAMLA"}
          </button>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-950">
          İmzalı belge fotoğrafı olmadan iade tamamlanamaz. Bu kural sadece iade işlemleri için geçerlidir.
        </div>
      </div>

      <style jsx global>{`
        .field {
          min-height: 46px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding-left: 12px;
          padding-right: 12px;
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
