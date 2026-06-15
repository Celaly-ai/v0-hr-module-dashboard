"use client"

import { useEffect, useMemo, useState } from "react"

type Fis = {
  id: string
  belge_no: string | null
  created_at: string | null
  toplam_urun: number | null
  kaynak_adi?: string | null
  teslim_eden_adi?: string | null
  hedef_personel_adi?: string | null
}

type Kalem = {
  id: string
  fis_id: string
  barkod: string | null
  seri_no: string | null
  marka?: string | null
  model?: string | null
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

export default function UrunFisleriPage() {
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")

  const [kabulFisleri, setKabulFisleri] = useState<Fis[]>([])
  const [kabulKalemleri, setKabulKalemleri] = useState<Kalem[]>([])

  const [devirFisleri, setDevirFisleri] = useState<Fis[]>([])
  const [devirKalemleri, setDevirKalemleri] = useState<Kalem[]>([])

  const [sekme, setSekme] = useState<"kabul" | "devir">("kabul")
  const [seciliFisId, setSeciliFisId] = useState<string>("")

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    const response = await fetch("/api/urun-fisleri", {
      cache: "no-store",
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata(json?.error || "Fişler alınamadı.")
      setLoading(false)
      return
    }

    setKabulFisleri(json?.kabulFisleri || [])
    setKabulKalemleri(json?.kabulKalemleri || [])

    setDevirFisleri(json?.devirFisleri || [])
    setDevirKalemleri(json?.devirKalemleri || [])

    const ilkFis =
      json?.kabulFisleri?.[0]?.id ||
      json?.devirFisleri?.[0]?.id ||
      ""

    setSeciliFisId(ilkFis)

    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  const aktifFisler =
    sekme === "kabul" ? kabulFisleri : devirFisleri

  const aktifKalemler =
    sekme === "kabul" ? kabulKalemleri : devirKalemleri

  const seciliFis = useMemo(() => {
    return aktifFisler.find((f) => f.id === seciliFisId)
  }, [aktifFisler, seciliFisId])

  const seciliKalemler = useMemo(() => {
    return aktifKalemler.filter(
      (k) => k.fis_id === seciliFisId,
    )
  }, [aktifKalemler, seciliFisId])

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Operasyon
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Ürün Fişleri
          </h1>

          <p className="mt-2 text-sm font-bold text-slate-600">
            Ürün kabul ve ürün devir fişlerini görüntüleyin.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setSekme("kabul")
              setSeciliFisId(kabulFisleri[0]?.id || "")
            }}
            className={`rounded-xl px-4 py-3 text-sm font-black ${
              sekme === "kabul"
                ? "bg-blue-700 text-white"
                : "border bg-white"
            }`}
          >
            Ürün Kabul Fişleri
          </button>

          <button
            type="button"
            onClick={() => {
              setSekme("devir")
              setSeciliFisId(devirFisleri[0]?.id || "")
            }}
            className={`rounded-xl px-4 py-3 text-sm font-black ${
              sekme === "devir"
                ? "bg-blue-700 text-white"
                : "border bg-white"
            }`}
          >
            Ürün Devir Fişleri
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">

          <div className="rounded-3xl border bg-white shadow-sm">

            <div className="border-b p-4">
              <h2 className="text-lg font-black">
                Fiş Listesi
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-center font-bold text-slate-500">
                Yükleniyor...
              </div>
            ) : aktifFisler.length === 0 ? (
              <div className="p-6 text-center font-bold text-slate-500">
                Fiş bulunamadı.
              </div>
            ) : (
              <div className="divide-y">
                {aktifFisler.map((fis) => (
                  <button
                    key={fis.id}
                    type="button"
                    onClick={() => setSeciliFisId(fis.id)}
                    className={`w-full p-4 text-left hover:bg-slate-50 ${
                      seciliFisId === fis.id
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <p className="font-black text-slate-950">
                      {fis.belge_no}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {tarihSaat(fis.created_at)}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Toplam Ürün: {fis.toplam_urun || 0}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border bg-white shadow-sm">

            <div className="border-b p-4">
              <h2 className="text-lg font-black">
                Fiş Detayı
              </h2>
            </div>

            {!seciliFis ? (
              <div className="p-8 text-center font-bold text-slate-500">
                Fiş seçin.
              </div>
            ) : (
              <div className="space-y-6 p-5">

                <div className="grid gap-3 md:grid-cols-2">

                  <Bilgi
                    baslik="Belge No"
                    deger={seciliFis.belge_no || "-"}
                  />

                  <Bilgi
                    baslik="Tarih"
                    deger={tarihSaat(seciliFis.created_at)}
                  />

                  <Bilgi
                    baslik="Toplam Ürün"
                    deger={String(
                      seciliFis.toplam_urun || 0,
                    )}
                  />

                  <Bilgi
                    baslik={
                      sekme === "kabul"
                        ? "Teslim Eden"
                        : "Teslim Alan"
                    }
                    deger={
                      sekme === "kabul"
                        ? seciliFis.teslim_eden_adi || "-"
                        : seciliFis.hedef_personel_adi || "-"
                    }
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
                    Ürünler
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">

                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-3 text-left">
                            Barkod
                          </th>
                          <th className="p-3 text-left">
                            Seri No
                          </th>
                          <th className="p-3 text-left">
                            Marka
                          </th>
                          <th className="p-3 text-left">
                            Model
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {seciliKalemler.map((kalem) => (
                          <tr
                            key={kalem.id}
                            className="border-t"
                          >
                            <td className="p-3 font-bold">
                              {kalem.barkod || "-"}
                            </td>

                            <td className="p-3">
                              {kalem.seri_no || "-"}
                            </td>

                            <td className="p-3">
                              {kalem.marka || "-"}
                            </td>

                            <td className="p-3">
                              {kalem.model || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                    </table>
                  </div>
                </div>

                <div className="flex gap-3">

                  <button
                    type="button"
                    className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
                  >
                    PDF Oluştur
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border px-4 py-3 text-sm font-black"
                  >
                    WhatsApp Gönder
                  </button>

                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Bilgi({
  baslik,
  deger,
}: {
  baslik: string
  deger: string
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {baslik}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950">
        {deger}
      </p>
    </div>
  )
}
