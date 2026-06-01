"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

export default function MuhasebeHareketlerPage() {
  const router = useRouter()

  const [hareketler, setHareketler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [siliniyorId, setSiliniyorId] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  const [filtre, setFiltre] = useState({
    tur: "",
    arama: "",
  })

  useEffect(() => {
    verileriYukle()
  }, [])

  async function verileriYukle() {
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_hareketleri")
      .select("id, tur, tutar, kategori_ad, aciklama, odeme_yontemi, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Hareketler alınamadı: " + error.message,
      })
      setLoading(false)
      return
    }

    setHareketler(data || [])
    setLoading(false)
  }

  const filtreliHareketler = useMemo(() => {
    return hareketler.filter((h) => {
      const metin = `${h.kategori_ad || ""} ${h.aciklama || ""} ${h.odeme_yontemi || ""}`.toLocaleLowerCase("tr-TR")

      if (filtre.tur && h.tur !== filtre.tur) return false
      if (filtre.arama && !metin.includes(filtre.arama.toLocaleLowerCase("tr-TR"))) return false

      return true
    })
  }, [hareketler, filtre])

  async function sil(id: string) {
    const onay = window.confirm("Bu muhasebe kaydını silmek istiyor musunuz?")
    if (!onay) return

    setSiliniyorId(id)
    setMesaj(null)

    const supabase = createClient()

    const { error } = await supabase
      .from("muhasebe_hareketleri")
      .delete()
      .eq("id", id)

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Kayıt silinemedi: " + error.message,
      })
      setSiliniyorId(null)
      return
    }

    setMesaj({
      tip: "basari",
      metin: "Kayıt silindi.",
    })

    await verileriYukle()
    setSiliniyorId(null)
  }

  function para(value: number) {
    return Number(value || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    })
  }

  function tarihSaat(value?: string | null) {
    if (!value) return "-"
    return new Date(value).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function mesajClass(tip: Mesaj["tip"]) {
    if (tip === "basari") return "bg-green-50 border-green-300 text-green-900"
    return "bg-red-50 border-red-300 text-red-900"
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal/muhasebe")}
          className="text-2xl font-bold text-gray-900"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-black text-gray-900">Muhasebe Hareketleri</h1>
          <p className="text-xs font-semibold text-gray-700">
            Gelir ve gider kayıtlarını görüntüleme / silme
          </p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {mesaj && (
          <div className={`rounded-xl border p-4 text-sm font-bold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-black text-gray-900">Filtreler</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="mb-1 block text-sm font-bold text-gray-900">Tür</label>
              <select
                value={filtre.tur}
                onChange={(e) => setFiltre({ ...filtre, tur: e.target.value })}
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
              >
                <option value="">Tümü</option>
                <option value="gelir">Gelir</option>
                <option value="gider">Gider</option>
              </select>
            </div>

            <div className="md:col-span-8">
              <label className="mb-1 block text-sm font-bold text-gray-900">Arama</label>
              <input
                value={filtre.arama}
                onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })}
                placeholder="Kategori, açıklama veya ödeme yöntemi ara..."
                className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">Kayıtlar</h2>
            <p className="text-xs font-semibold text-gray-700">
              Gösterilen: {filtreliHareketler.length} / Toplam: {hareketler.length}
            </p>
          </div>

          {loading ? (
            <p className="p-4 text-center font-bold text-gray-700">Yükleniyor...</p>
          ) : filtreliHareketler.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Kayıt bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filtreliHareketler.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded px-2 py-1 text-xs font-black ${
                          h.tur === "gelir"
                            ? "bg-green-100 text-green-900"
                            : "bg-red-100 text-red-900"
                        }`}
                      >
                        {h.tur === "gelir" ? "Gelir" : "Gider"}
                      </span>

                      <p className="font-black text-gray-900">
                        {h.kategori_ad || "-"}
                      </p>
                    </div>

                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {h.aciklama || "-"}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {tarihSaat(h.created_at)} · {h.odeme_yontemi || "Ödeme yöntemi yok"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right space-y-2">
                    <p
                      className={`text-lg font-black ${
                        h.tur === "gelir" ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {h.tur === "gelir" ? "+" : "-"} {para(Number(h.tutar || 0))}
                    </p>

                    <button
                      type="button"
                      onClick={() => sil(h.id)}
                      disabled={siliniyorId === h.id}
                      className="rounded bg-red-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      {siliniyorId === h.id ? "Siliniyor..." : "Sil"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
