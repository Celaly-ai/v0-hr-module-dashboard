"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"

type Props = {
  onDetected: (value: string) => void
}

const KAMERA_HATA =
  "Kamera açılamadı. Telefon tarayıcısından kamera iznini kontrol edip tekrar deneyin."

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  const [aktif, setAktif] = useState(false)
  const [hata, setHata] = useState("")
  const [sonKod, setSonKod] = useState("")

  async function tara() {
    try {
      setHata("")

      const reader = new BrowserMultiFormatReader()
      setAktif(true)

      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (!result) return

          const kod = result.getText()
          setSonKod(kod)
          onDetected(kod)

          controlsRef.current?.stop()
          controlsRef.current = null
          setAktif(false)
        },
      )
    } catch {
      setHata(KAMERA_HATA)
      setAktif(false)
    }
  }

  function durdur() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setAktif(false)
  }

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [])

  return (
    <div className="rounded-2xl border bg-white p-4">
      <button
        type="button"
        onClick={aktif ? durdur : tara}
        className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
      >
        {aktif ? "Taramayı Durdur" : "📷 Barkod Oku"}
      </button>

      {hata && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">
          {hata}
        </div>
      )}

      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={`mt-3 w-full overflow-hidden rounded-2xl border ${aktif ? "" : "hidden"}`}
      />

      {sonKod && (
        <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
          <div className="text-xs font-black uppercase">
            Son Okunan Barkod
          </div>
          <div className="mt-1 font-mono text-sm font-black">
            {sonKod}
          </div>
        </div>
      )}
    </div>
  )
}
