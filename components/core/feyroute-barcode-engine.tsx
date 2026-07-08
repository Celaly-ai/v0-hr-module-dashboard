"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type FeyRouteBarcodeDetectMeta = {
  source: "native" | "zxing"
  raw?: unknown
}

export type FeyRouteBarcodePhotoMeta = {
  source: "photo_fallback"
}

type Props = {
  label?: string
  onDetected: (value: string, meta: FeyRouteBarcodeDetectMeta) => void
  onPhotoFallback?: (file: File, meta: FeyRouteBarcodePhotoMeta) => void
  disabled?: boolean
}

const LIVE_UYARI =
  "Kamera barkodu okuyamadı. Barkodu kadraja yaklaştırın veya barkod fotoğrafı çekin."

const FOTO_ALINDI_MESAJ =
  "Barkod fotoğrafı alındı, ürün kimliği daha sonra doğrulanacaktır."

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: "environment" } },
}

type ScanMode = "idle" | "native" | "zxing" | "live_failed"

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike
  }
}

async function nativeBarcodeDestekleniyor(): Promise<boolean> {
  if (typeof window === "undefined" || !window.BarcodeDetector) return false
  try {
    const formats = await (window.BarcodeDetector as unknown as {
      getSupportedFormats: () => Promise<string[]>
    }).getSupportedFormats()
    return Array.isArray(formats) && formats.length > 0
  } catch {
    return false
  }
}

export function FeyRouteBarcodeEngine({
  label = "Barkod Oku",
  onDetected,
  onPhotoFallback,
  disabled = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null)
  const rafRef = useRef<number | null>(null)
  const scanModeRef = useRef<ScanMode>("idle")
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const [canliAktif, setCanliAktif] = useState(false)
  const [canliBasarisiz, setCanliBasarisiz] = useState(false)
  const [uyari, setUyari] = useState("")
  const [sonKod, setSonKod] = useState("")
  const [fotoAlindi, setFotoAlindi] = useState(false)

  const durdur = useCallback(() => {
    scanModeRef.current = "idle"

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    try {
      zxingControlsRef.current?.stop()
    } catch {
      // noop
    }
    zxingControlsRef.current = null

    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const video = videoRef.current
    if (video) {
      video.srcObject = null
    }

    setCanliAktif(false)
  }, [])

  const basariylaOku = useCallback(
    (value: string, meta: FeyRouteBarcodeDetectMeta) => {
      const kod = value.trim()
      if (!kod) return
      setSonKod(kod)
      setUyari("")
      setCanliBasarisiz(false)
      setFotoAlindi(false)
      durdur()
      onDetected(kod, meta)
    },
    [durdur, onDetected],
  )

  const canliTaramayiBitir = useCallback(() => {
    durdur()
    setCanliBasarisiz(true)
    setUyari(LIVE_UYARI)
    scanModeRef.current = "live_failed"
  }, [durdur])

  const nativeTara = useCallback(
    (video: HTMLVideoElement) => {
      if (!window.BarcodeDetector) throw new Error("native_unavailable")

      const detector = new window.BarcodeDetector({
        formats: [
          "qr_code",
          "code_128",
          "code_39",
          "code_93",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "itf",
          "pdf417",
          "data_matrix",
        ],
      })

      scanModeRef.current = "native"

      const dongu = async () => {
        if (scanModeRef.current !== "native") return
        try {
          const codes = await detector.detect(video)
          const kod = codes.find((item) => item.rawValue?.trim())?.rawValue
          if (kod) {
            basariylaOku(kod, { source: "native", raw: codes[0] })
            return
          }
        } catch {
          // sessiz devam
        }
        rafRef.current = requestAnimationFrame(() => void dongu())
      }

      rafRef.current = requestAnimationFrame(() => void dongu())
    },
    [basariylaOku],
  )

  const zxingTara = useCallback(
    async (video: HTMLVideoElement, stream: MediaStream) => {
      const { BrowserMultiFormatReader } = await import("@zxing/browser")
      const reader = new BrowserMultiFormatReader()
      scanModeRef.current = "zxing"

      const callback = (result: { getText: () => string } | undefined) => {
        if (result) {
          basariylaOku(result.getText(), { source: "zxing", raw: result })
        }
      }

      const readerAny = reader as {
        decodeFromStream?: (
          stream: MediaStream,
          video: HTMLVideoElement,
          cb: typeof callback,
        ) => Promise<{ stop: () => void }>
        decodeFromConstraints?: (
          constraints: MediaStreamConstraints,
          video: HTMLVideoElement,
          cb: typeof callback,
        ) => Promise<{ stop: () => void }>
        decodeFromVideoDevice: (
          deviceId: string | undefined,
          video: HTMLVideoElement,
          cb: typeof callback,
        ) => Promise<{ stop: () => void }>
      }

      if (readerAny.decodeFromStream) {
        zxingControlsRef.current = await readerAny.decodeFromStream(stream, video, callback)
        return
      }

      if (readerAny.decodeFromConstraints) {
        zxingControlsRef.current = await readerAny.decodeFromConstraints(
          VIDEO_CONSTRAINTS,
          video,
          callback,
        )
        return
      }

      zxingControlsRef.current = await readerAny.decodeFromVideoDevice(undefined, video, callback)
    },
    [basariylaOku],
  )

  const taramayiBaslat = useCallback(async () => {
    if (disabled) return

    setUyari("")
    setCanliBasarisiz(false)
    setFotoAlindi(false)

    if (!navigator.mediaDevices?.getUserMedia) {
      canliTaramayiBitir()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        canliTaramayiBitir()
        return
      }

      video.srcObject = stream
      await video.play()
      setCanliAktif(true)

      const nativeDestek = await nativeBarcodeDestekleniyor()
      if (nativeDestek) {
        try {
          nativeTara(video)
          return
        } catch {
          scanModeRef.current = "idle"
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
        }
      }

      try {
        await zxingTara(video, stream)
      } catch {
        canliTaramayiBitir()
      }
    } catch {
      canliTaramayiBitir()
    }
  }, [canliTaramayiBitir, disabled, nativeTara, zxingTara])

  const fotoSec = useCallback(
    (dosya: File | undefined) => {
      if (!dosya || disabled) return
      setFotoAlindi(true)
      setUyari("")
      setCanliBasarisiz(false)
      durdur()
      onPhotoFallback?.(dosya, { source: "photo_fallback" })
    },
    [disabled, durdur, onPhotoFallback],
  )

  useEffect(() => {
    return () => {
      durdur()
    }
  }, [durdur])

  const taramaAcik = canliAktif

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {label && (
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (taramaAcik) {
            canliTaramayiBitir()
            return
          }
          void taramayiBaslat()
        }}
        className="w-full rounded-2xl bg-blue-700 px-4 py-5 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {taramaAcik ? "Taramayı Durdur" : "📷 Barkod Oku"}
      </button>

      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={`w-full overflow-hidden rounded-2xl border border-slate-200 ${taramaAcik ? "block" : "hidden"}`}
      />

      {uyari && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">
          {uyari}
        </div>
      )}

      {sonKod && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-xs font-black uppercase text-emerald-900">Son Okunan Barkod</p>
          <p className="mt-1 break-all font-mono text-sm font-black text-emerald-950">{sonKod}</p>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const dosya = e.target.files?.[0]
            fotoSec(dosya)
            e.target.value = ""
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => fotoInputRef.current?.click()}
          className="w-full rounded-2xl bg-slate-800 px-4 py-5 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Barkod Fotoğrafı Çek
        </button>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          Canlı tarama çalışmazsa barkod fotoğrafı ile devam edin.
        </p>
      </div>

      {fotoAlindi && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
          {FOTO_ALINDI_MESAJ}
        </div>
      )}
    </div>
  )
}
