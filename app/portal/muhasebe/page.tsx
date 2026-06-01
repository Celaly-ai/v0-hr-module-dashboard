"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function MuhasebePage() {
  const router = useRouter()

  const [gelir, setGelir] = useState(0)
  const [gider, setGider] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sonHareketler, setSonHareketler] = useState<any[]>([])

  useEffect(() => {
    veriYukle()
  }, [])

  async function veriYukle() {
    const supabase = createClient()

    const [{ data: toplamData }, { data: sonData }] = await Promise.all([
      supabase.from("muhasebe_hareketleri").select("tur, tutar"),
      supabase
        .from("muhasebe_hareketleri")
        .select("id, tur, tutar, kategori_ad, aciklama, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ])

    const liste = toplamData || []

    let toplamGelir = 0
    let toplamGider = 0

    liste.forEach((item) => {
      if (item.tur === "gelir") toplamGelir += Number(item.tutar || 0)
      if (item.tur === "gider") toplamGider += Number(item.tutar || 0)
    })

    setGelir(toplamGelir)
    setGider(toplamGider)
    setSonHareketler(sonData || [])
    setLoading(false)
  }

  function para(value: number) {
    return Number(value || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="font-bold text-gray-800">Yükleniyor...</p>
      </div>
    )
  }

  const net = gelir - gider

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold text-gray-900"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-black text-gray-900">Muhasebe Paneli</h1>
          <p className="text-xs font-semibold text-gray-700">
            Gelir, gider ve net durum takibi
          </p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => router.push("/portal/muhasebe/ekle")}
          className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white shadow-sm"
        >
          + Yeni Gelir / Gider Kaydı
        </button>

        <button
          type="button"
          onClick={() => router.push("/portal/muhasebe/hareketler")}
          className="w-full rounded-xl bg-gray-800 px-4 py-4 text-sm font-black text-white shadow-sm"
        >
          Tüm Hareketleri Gör
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-bold text-green-800">Toplam Gelir</p>
            <p className="text-2xl font-black text-green-900">{para(gelir)}</p>
          </div>

          <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">Toplam Gider</p>
            <p className="text-2xl font-black text-red-900">{para(gider)}</p>
          </div>

          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-800">Net Durum</p>
            <p className="text-2xl font-black text-blue-900">{para(net)}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-300 p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-black text-gray-900">Son Hareketler</h2>

          {sonHareketler.length === 0 ? (
            <p className="text-sm font-semibold text-gray-600">Henüz kayıt yok.</p>
          ) : (
            <div className="space-y-2">
              {sonHareketler.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2"
                >
                  <div>
                    <p className="font-bold text-gray-900">
                      {h.kategori_ad || "-"}
                    </p>
                    <p className="text-xs font-semibold text-gray-600">
                      {h.aciklama || "-"}
                    </p>
                  </div>

                  <p
                    className={`font-black ${
                      h.tur === "gelir" ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {h.tur === "gelir" ? "+" : "-"} {para(Number(h.tutar || 0))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
