"use client"

import { useEffect, useState } from "react"

export default function RolGecmisiPage() {
  const [data, setData] = useState<any>(null)
  const [hata, setHata] = useState("")
  const [loading, setLoading] = useState(true)

  async function yukle() {
    setLoading(true)
    setHata("")

    try {
      const res = await fetch("/api/yonetim/rol-gecmisi", {
        cache: "no-store",
      })

      const json = await res.json()

      if (!res.ok) {
        setHata(json?.error || "API hatası")
        setData(null)
      } else {
        setData(json)
      }
    } catch (err: any) {
      setHata(err?.message || "Bağlantı hatası")
      setData(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    void yukle()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-3xl border bg-white p-6">
          <h1 className="text-3xl font-black">Rol Geçmişi Test</h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Bu ekran önce API verisinin sayfaya gelip gelmediğini test eder.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void yukle()}
          className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
        >
          Yenile
        </button>

        {loading && (
          <div className="rounded-2xl border bg-white p-4 font-bold">
            Yükleniyor...
          </div>
        )}

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
            {hata}
          </div>
        )}

        <pre className="overflow-auto rounded-2xl border bg-white p-4 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
}
