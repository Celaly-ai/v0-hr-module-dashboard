"use client"

import { useState } from "react"
import { FeyRouteBarcodeEngine } from "@/components/core/feyroute-barcode-engine"

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

export default function CihazTeslimPage() {
  const [barkod, setBarkod] = useState("")
  const [musteriAdi, setMusteriAdi] = useState("")
  const [musteriTelefon, setMusteriTelefon] = useState("")
  const [musteriAdres, setMusteriAdres] = useState("")
  const [hasarVar, setHasarVar] = useState(false)
  const [hasarAciklama, setHasarAciklama] = useState("")
  const [islem, setIslem] = useState(false)
  const [hata, setHata] = useState("")
  const [basari, setBasari] = useState("")
  const [barkodFotoBilgi, setBarkodFotoBilgi] = useState("")

  async function teslimEt() {
    setIslem(true)
    setHata("")
    setBasari("")

    try {
      if (!barkod.trim()) {
        setHata("Barkod zorunludur.")
        setIslem(false)
        return
      }

      if (!musteriAdi.trim() || !musteriTelefon.trim() || !musteriAdres.trim()) {
        setHata("Müşteri adı, telefon ve adres zorunludur.")
        setIslem(false)
        return
      }

      if (hasarVar && !hasarAciklama.trim()) {
        setHata("Hasar varsa açıklama zorunludur.")
        setIslem(false)
        return
      }

      const pos = await konumAl()

      const response = await fetch("/api/cihaz-teslim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barkod: barkod.trim(),
          musteri_adi: musteriAdi.trim(),
          musteri_telefon: musteriTelefon.trim(),
          musteri_adres: musteriAdres.trim(),
          gps_lat: pos.coords.latitude,
          gps_lng: pos.coords.longitude,
          gps_dogruluk: pos.coords.accuracy,
          islem_kaynagi: "mobil_portal",
          hasar_var: hasarVar,
          hasar_aciklama: hasarAciklama.trim(),
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        setHata(json?.error || "Cihaz teslim işlemi başarısız.")
        setIslem(false)
        return
      }

      setBasari("Cihaz müşteriye teslim edildi. Personel zimmeti kapatıldı.")
      setBarkod("")
      setMusteriAdi("")
      setMusteriTelefon("")
      setMusteriAdres("")
      setHasarVar(false)
      setHasarAciklama("")
    } catch (err: any) {
      setHata(err?.message || "Konum alınamadı veya işlem tamamlanamadı.")
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
            Cihaz Teslim
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Barkod doğrulamasıyla cihazı müşteriye teslim edin ve personel zimmetini kapatın.
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
          <FeyRouteBarcodeEngine
            onDetected={(value) => {
              setBarkod(value)
              setBarkodFotoBilgi("")
            }}
            onPhotoFallback={() => {
              setBarkodFotoBilgi("Barkod fotoğrafı alındı; barkod metni okunamadı.")
            }}
          />

          {barkodFotoBilgi && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-black text-amber-950">
              {barkodFotoBilgi}
            </div>
          )}

          <Field label="Barkod">
            <input
              value={barkod}
              onChange={(e) => setBarkod(e.target.value)}
              placeholder="Barkod okut / gir"
              className="field"
            />
          </Field>

          <Field label="Müşteri Adı">
            <input
              value={musteriAdi}
              onChange={(e) => setMusteriAdi(e.target.value)}
              placeholder="Müşteri adı soyadı"
              className="field"
            />
          </Field>

          <Field label="Müşteri Telefon">
            <input
              value={musteriTelefon}
              onChange={(e) => setMusteriTelefon(e.target.value)}
              placeholder="05xx xxx xx xx"
              className="field"
            />
          </Field>

          <Field label="Müşteri Adres">
            <textarea
              value={musteriAdres}
              onChange={(e) => setMusteriAdres(e.target.value)}
              placeholder="Açık adres"
              className="field min-h-28 py-3"
            />
          </Field>

          <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-4 text-sm font-black text-slate-900">
            <input
              type="checkbox"
              checked={hasarVar}
              onChange={(e) => setHasarVar(e.target.checked)}
              className="h-5 w-5"
            />
            Hasar var
          </label>

          {hasarVar && (
            <Field label="Hasar Açıklaması">
              <textarea
                value={hasarAciklama}
                onChange={(e) => setHasarAciklama(e.target.value)}
                placeholder="Hasar açıklaması"
                className="field min-h-28 py-3"
              />
            </Field>
          )}

          <button
            type="button"
            onClick={() => void teslimEt()}
            disabled={islem}
            className="w-full rounded-2xl bg-blue-700 px-5 py-5 text-base font-black text-white disabled:bg-slate-300 disabled:text-slate-600"
          >
            {islem ? "Teslim Ediliyor..." : "CİHAZI MÜŞTERİYE TESLİM ET"}
          </button>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-bold text-blue-950">
          Teslim işleminde barkod ve GPS kaydı zorunludur. İade olmadığı için yazılı belge üretilmez.
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
