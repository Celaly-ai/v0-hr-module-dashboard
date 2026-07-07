"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function OneriYenileButonu() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")

  async function oneriUret() {
    setYukleniyor(true)
    setMesaj("")
    setHata("")

    const response = await fetch("/api/operasyon/atama-oneri-uret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yalniz_aron: true }),
    })

    const json = await response.json().catch(() => null)
    setYukleniyor(false)

    if (!response.ok) {
      setHata(json?.error || "Öneri üretilemedi.")
      return
    }

    setMesaj(json?.message || "Öneriler güncellendi.")
    router.refresh()
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={yukleniyor}
          onClick={() => void oneriUret()}
          className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {yukleniyor ? "Öneriler üretiliyor..." : "Ekip Önerilerini Yenile"}
        </button>
        <p className="text-xs font-bold text-slate-500">
          Motor aktif ekipler için top-3 öneri yazar
        </p>
      </div>
      {mesaj && (
        <p className="mt-2 text-xs font-bold text-green-700">{mesaj}</p>
      )}
      {hata && <p className="mt-2 text-xs font-bold text-red-700">{hata}</p>}
    </div>
  )
}
