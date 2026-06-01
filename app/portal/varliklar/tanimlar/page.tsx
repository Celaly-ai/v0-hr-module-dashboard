"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

export default function VarlikTanimlarPage() {
  const router = useRouter()

  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [altKategoriler, setAltKategoriler] = useState<any[]>([])
  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])

  const [kategoriAd, setKategoriAd] = useState("")
  const [seciliKategoriId, setSeciliKategoriId] = useState("")
  const [altKategoriAd, setAltKategoriAd] = useState("")
  const [lokasyonAd, setLokasyonAd] = useState("")

  const [loading, setLoading] = useState(true)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  async function yukle() {
    setLoading(true)

    const supabase = createClient()

    const { data: k } = await supabase
      .from("varlik_kategorileri")
      .select("id, ad")
      .eq("aktif", true)
      .order("ad", { ascending: true })

    const { data: ak } = await supabase
      .from("varlik_alt_kategorileri")
      .select(`
        id,
        ad,
        kategori_id,
        varlik_kategorileri:kategori_id (
          id,
          ad
        )
      `)
      .eq("aktif", true)
      .order("ad", { ascending: true })

    const { data: l } = await supabase
      .from("varlik_lokasyonlari")
      .select("id, ad")
      .eq("aktif", true)
      .order("ad", { ascending: true })

    setKategoriler(k || [])
    setAltKategoriler(ak || [])
    setLokasyonlar(l || [])
    setLoading(false)
  }

  useEffect(() => {
    yukle()
  }, [])

  async function kategoriEkle() {
    const ad = kategoriAd.trim()

    if (!ad) {
      setMesaj({ tip: "hata", metin: "Kategori adı giriniz." })
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("varlik_kategorileri")
      .insert({ ad, aktif: true })

    if (error) {
      setMesaj({ tip: "hata", metin: "Kategori eklenemedi: " + error.message })
      return
    }

    setKategoriAd("")
    setMesaj({ tip: "basari", metin: "Kategori eklendi." })
    await yukle()
  }

  async function altKategoriEkle() {
    const ad = altKategoriAd.trim()

    if (!seciliKategoriId) {
      setMesaj({ tip: "hata", metin: "Alt kategori için kategori seçiniz." })
      return
    }

    if (!ad) {
      setMesaj({ tip: "hata", metin: "Alt kategori adı giriniz." })
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("varlik_alt_kategorileri")
      .insert({
        kategori_id: seciliKategoriId,
        ad,
        aktif: true,
      })

    if (error) {
      setMesaj({ tip: "hata", metin: "Alt kategori eklenemedi: " + error.message })
      return
    }

    setAltKategoriAd("")
    setMesaj({ tip: "basari", metin: "Alt kategori eklendi." })
    await yukle()
  }

  async function lokasyonEkle() {
    const ad = lokasyonAd.trim()

    if (!ad) {
      setMesaj({ tip: "hata", metin: "Lokasyon adı giriniz." })
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("varlik_lokasyonlari")
      .insert({ ad, aktif: true })

    if (error) {
      setMesaj({ tip: "hata", metin: "Lokasyon eklenemedi: " + error.message })
      return
    }

    setLokasyonAd("")
    setMesaj({ tip: "basari", metin: "Lokasyon eklendi." })
    await yukle()
  }

  async function pasifeAl(tablo: string, id: string, ad: string) {
    const onay = window.confirm(`${ad} pasife alınsın mı?`)
    if (!onay) return

    const supabase = createClient()
    const { error } = await supabase
      .from(tablo)
      .update({ aktif: false })
      .eq("id", id)

    if (error) {
      setMesaj({ tip: "hata", metin: "İşlem başarısız: " + error.message })
      return
    }

    setMesaj({ tip: "basari", metin: "Kayıt pasife alındı." })
    await yukle()
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
          onClick={() => router.push("/portal/varliklar")}
          className="text-2xl font-bold text-gray-800"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Varlık Tanımları</h1>
          <p className="text-xs font-medium text-gray-600">
            Kategori, alt kategori ve lokasyon tanımlarını yönetin
          </p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {mesaj && (
          <div className={`rounded-xl border p-4 font-semibold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-3">
            <h2 className="text-lg font-bold">Kategoriler</h2>

            <div className="flex gap-2">
              <input
                value={kategoriAd}
                onChange={(e) => setKategoriAd(e.target.value)}
                placeholder="Yeni kategori"
                className="flex-1 border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium"
              />
              <button
                type="button"
                onClick={kategoriEkle}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white"
              >
                Ekle
              </button>
            </div>

            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-gray-600">Yükleniyor...</p>
              ) : kategoriler.length === 0 ? (
                <p className="text-sm text-gray-600">Kategori yok.</p>
              ) : (
                kategoriler.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm font-bold">{k.ad}</span>
                    <button
                      type="button"
                      onClick={() => pasifeAl("varlik_kategorileri", k.id, k.ad)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white"
                    >
                      Pasife Al
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-3">
            <h2 className="text-lg font-bold">Alt Kategoriler</h2>

            <select
              value={seciliKategoriId}
              onChange={(e) => setSeciliKategoriId(e.target.value)}
              className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm font-bold bg-white"
            >
              <option value="">Kategori seç</option>
              {kategoriler.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                value={altKategoriAd}
                onChange={(e) => setAltKategoriAd(e.target.value)}
                placeholder="Yeni alt kategori"
                className="flex-1 border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium"
              />
              <button
                type="button"
                onClick={altKategoriEkle}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white"
              >
                Ekle
              </button>
            </div>

            <div className="space-y-2">
              {altKategoriler.length === 0 ? (
                <p className="text-sm text-gray-600">Alt kategori yok.</p>
              ) : (
                altKategoriler.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-bold">{a.ad}</p>
                      <p className="text-xs text-gray-600">
                        {a.varlik_kategorileri?.ad || "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => pasifeAl("varlik_alt_kategorileri", a.id, a.ad)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white"
                    >
                      Pasife Al
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-300 shadow-sm p-4 space-y-3">
            <h2 className="text-lg font-bold">Lokasyonlar</h2>

            <div className="flex gap-2">
              <input
                value={lokasyonAd}
                onChange={(e) => setLokasyonAd(e.target.value)}
                placeholder="Yeni lokasyon"
                className="flex-1 border border-gray-400 rounded-lg px-3 py-2 text-sm font-medium"
              />
              <button
                type="button"
                onClick={lokasyonEkle}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white"
              >
                Ekle
              </button>
            </div>

            <div className="space-y-2">
              {lokasyonlar.length === 0 ? (
                <p className="text-sm text-gray-600">Lokasyon yok.</p>
              ) : (
                lokasyonlar.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm font-bold">{l.ad}</span>
                    <button
                      type="button"
                      onClick={() => pasifeAl("varlik_lokasyonlari", l.id, l.ad)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white"
                    >
                      Pasife Al
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
