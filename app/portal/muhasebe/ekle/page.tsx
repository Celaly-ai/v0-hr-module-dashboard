"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function MuhasebeEklePage() {
  const router = useRouter()

  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState("")

  const [form, setForm] = useState({
    tur: "gider",
    kategori_id: "",
    tutar: "",
    odeme_yontemi: "nakit",
    aciklama: "",
  })

  useEffect(() => {
    kategorileriYukle()
  }, [])

  async function kategorileriYukle() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_kategorileri")
      .select("id, ad, tur")
      .eq("aktif", true)
      .order("ad", { ascending: true })

    if (error) {
      setMesaj("Kategoriler alınamadı: " + error.message)
      return
    }

    setKategoriler(data || [])
  }

  async function kaydet() {
    setMesaj("")

    if (!form.kategori_id) {
      setMesaj("Kategori seçimi zorunludur.")
      return
    }

    if (!form.tutar || Number(form.tutar) <= 0) {
      setMesaj("Geçerli bir tutar giriniz.")
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    const kategori = kategoriler.find((k) => k.id === form.kategori_id)

    const { error } = await supabase.from("muhasebe_hareketleri").insert({
      tur: form.tur,
      kategori_id: form.kategori_id,
      kategori_ad: kategori?.ad || null,
      tutar: Number(form.tutar),
      odeme_yontemi: form.odeme_yontemi,
      aciklama: form.aciklama.trim() || null,
      kaynak: "manuel",
    })

    setKaydediliyor(false)

    if (error) {
      setMesaj("Kayıt oluşturulamadı: " + error.message)
      return
    }

    router.push("/portal/muhasebe")
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
          <h1 className="text-xl font-black text-gray-900">Gelir / Gider Ekle</h1>
          <p className="text-xs font-semibold text-gray-700">
            Manuel muhasebe hareketi oluşturma
          </p>
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto space-y-4">
        {mesaj && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {mesaj}
          </div>
        )}

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Tür
            </label>
            <select
              value={form.tur}
              onChange={(e) =>
                setForm({
                  ...form,
                  tur: e.target.value,
                  kategori_id: "",
                })
              }
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
            >
              <option value="gider">Gider</option>
              <option value="gelir">Gelir</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Kategori
            </label>
            <select
              value={form.kategori_id}
              onChange={(e) => setForm({ ...form, kategori_id: e.target.value })}
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
            >
              <option value="">Kategori seçiniz</option>
              {kategoriler
                .filter((k) => k.tur === form.tur)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Tutar
            </label>
            <input
              type="number"
              value={form.tutar}
              onChange={(e) => setForm({ ...form, tutar: e.target.value })}
              placeholder="Örn: 1250"
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Ödeme Yöntemi
            </label>
            <select
              value={form.odeme_yontemi}
              onChange={(e) => setForm({ ...form, odeme_yontemi: e.target.value })}
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
            >
              <option value="nakit">Nakit</option>
              <option value="banka">Banka</option>
              <option value="pos">POS</option>
              <option value="kredi_karti">Kredi Kartı</option>
              <option value="havale">Havale / EFT</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-900">
              Açıklama
            </label>
            <textarea
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              placeholder="Kısa açıklama yazınız..."
              rows={4}
              className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500 resize-none"
            />
          </div>

          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  )
}
