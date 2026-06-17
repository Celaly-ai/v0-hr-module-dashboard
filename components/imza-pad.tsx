"use client"

import { useRef } from "react"
import SignatureCanvas from "react-signature-canvas"

type Props = {
  onChange: (dataUrl: string) => void
}

export default function ImzaPad({ onChange }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null)

  function temizle() {
    sigRef.current?.clear()
    onChange("")
  }

  function kaydet() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      return
    }

    const dataUrl = sigRef.current
      .getTrimmedCanvas()
      .toDataURL("image/png")

    onChange(dataUrl)
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
        İmza Alanı
      </div>

      <div className="overflow-hidden rounded-xl border">
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width: 800,
            height: 220,
            className: "w-full bg-white",
          }}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={temizle}
          className="flex-1 rounded-xl border px-4 py-3 text-sm font-black"
        >
          Temizle
        </button>

        <button
          type="button"
          onClick={kaydet}
          className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
        >
          İmzayı Kaydet
        </button>
      </div>
    </div>
  )
}
