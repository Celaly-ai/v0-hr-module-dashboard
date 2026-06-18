"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Cihaz = {
  id: string
  barkod: string | null
  seri_no: string | null
  marka: string | null
  model: string | null
  durum: string | null
  mevcut_konum_adi: string | null
  mevcut_zimmet_adi: string | null
  mevcut_zimmet_tipi: string | null
  son_hareket_at: string | null
  created_at: string | null
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

function gunFarki(value?: string | null) {
  if (!value) return 0
  const tarih = new Date(value).getTime()
  const simdi = Date.now()
  return Math.floor((simdi - tarih) / (1000 * 60 * 60 * 24))
}

function durumEtiketi(value?: string | null) {
  switch (value) {
    case "bayi_deposunda":
      return "Bayi Deposunda"
    case "ortak_depoda":
      return "Ortak Depoda"
    case "servis_deposunda":
      return "Servis Deposunda"
    case "urun_sorumlusunda":
      return "Ürün Sorumlusunda"
    case "teknisyende":
      return "Teknisyende"
    case "musteride":
      return "Müşteride"
    case "iadede":
      return "İadede"
    case "hurda":
      return "Hurda"
    default:
      return value || "-"
  }
}

export default function UrunOperasyonDashboardPage() {
  const supabase = useMemo(() => createClient(), [])

  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    const { data, error } = await supabase
      .from("cihazlar")
      .select("*")
      .order("son_hareket_at", { ascending: true })
      .limit(1000)

    if (error) {
      setHata("Cihaz operasyon verileri alınamadı: " + error.message)
      setCihazlar([])
      setLoading(false)
      return
    }

    setCihazlar((data || []) as Cihaz[])
    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ozet = useMemo(() => {
    return {
      toplam: cihazlar.length,
      bayiDeposunda: cihazlar.filter((c) => c.durum === "bayi_deposunda").length,
      ortakDepoda: cihazlar.filter((c) => c.durum === "ortak_depoda").length,
      servisDeposunda: cihazlar.filter((c) => c.durum === "servis_deposunda").length,
      urunSorumlusunda: cihazlar.filter((c) => c.durum === "urun_sorumlusunda").length,
      teknisyende: cihazlar.filter((c) => c.durum === "teknisyende").length,
      musteride: cihazlar.filter((c) => c.durum === "musteride").length,
      iadede: cihazlar.filter((c) => c.durum === "iadede").length,
    }
  }, [cihazlar])

  const riskliCihazlar = useMemo(() => {
    return cihazlar
      .filter((c) => {
        const gun = gunFarki(c.son_hareket_at || c.created_at)
        return (
          (c.durum === "teknisyende" && gun >= 7) ||
          (c.durum === "urun_sorumlusunda" && gun >= 7) ||
          gun >= 15
        )
      })
      .slice(0, 50)
  }, [cihazlar])

  const zimmetOzeti = useMemo(() => {
    const map = new Map<string, { ad: string; tip: string; adet: number; son: string | null }>()

    cihazlar.forEach((c) => {
      const ad = c.mevcut_zimmet_adi || "Zimmet Yok"
      const tip = c.mevcut_zimmet_tipi || "-"
      const key = `${tip}-${ad}`
      const mevcut = map.get(key)

      if (!mevcut) {
        map.set(key, {
          ad,
          tip,
          adet: 1,
          son: c.son_hareket_at || c.created_at,
        })
      } else {
        mevcut.adet += 1
        const eski = mevcut.son ? new Date(mevcut.son).getTime() : 0
        const yeni = c.son_hareket_at ? new Date(c.son_hareket_at).getTime() : 0
        if (yeni > eski) mevcut.son = c.son_hareket_at
      }
    })

    return Array.from(map.values()).sort((a, b) => b.adet - a.adet)
  }, [cihazlar])

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Cihaz Operasyon
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Ürün Operasyon Dashboard
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Cihazların şu anda kimde olduğunu, hangi durumda beklediğini ve riskli zimmetleri takip edin.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Kpi title="Toplam" value={ozet.toplam} />
          <Kpi title="Bayi Deposu" value={ozet.bayiDeposunda} />
          <Kpi title="Ortak Depo" value={ozet.ortakDepoda} />
          <Kpi title="Servis Deposu" value={ozet.servisDeposunda} />
          <Kpi title="Ürün Sorumlusu" value={ozet.urunSorumlusunda} />
          <Kpi title="Teknisyen" value={ozet.teknisyende} />
          <Kpi title="Müşteri" value={ozet.musteride} />
          <Kpi title="İadede" value={ozet.iadede} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Riskli / Hareketsiz Cihazlar">
            <Tablo cihazlar={riskliCihazlar} loading={loading} />
          </Panel>

          <Panel title="Zimmet Özeti">
            {loading ? (
              <p className="p-4 text-sm font-bold text-slate-500">Yükleniyor...</p>
            ) : zimmetOzeti.length === 0 ? (
              <p className="p-4 text-sm font-bold text-slate-500">Zimmet kaydı yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left">Zimmet</th>
                      <th className="p-3 text-left">Tip</th>
                      <th className="p-3 text-left">Cihaz</th>
                      <th className="p-3 text-left">Son Hareket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zimmetOzeti.map((z) => (
                      <tr key={`${z.tip}-${z.ad}`} className="border-t">
                        <td className="p-3 font-black text-slate-950">{z.ad}</td>
                        <td className="p-3 font-bold text-slate-600">{z.tip}</td>
                        <td className="p-3 font-black text-slate-950">{z.adet}</td>
                        <td className="p-3 font-bold text-slate-600">{tarihSaat(z.son)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Tüm Cihazlar">
          <Tablo cihazlar={cihazlar} loading={loading} />
        </Panel>
      </div>
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Tablo({ cihazlar, loading }: { cihazlar: Cihaz[]; loading: boolean }) {
  if (loading) {
    return <p className="p-4 text-sm font-bold text-slate-500">Yükleniyor...</p>
  }

  if (cihazlar.length === 0) {
    return <p className="p-4 text-sm font-bold text-slate-500">Kayıt yok.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-left">Barkod / Seri</th>
            <th className="p-3 text-left">Ürün</th>
            <th className="p-3 text-left">Durum</th>
            <th className="p-3 text-left">Konum</th>
            <th className="p-3 text-left">Zimmet</th>
            <th className="p-3 text-left">Bekleme</th>
          </tr>
        </thead>
        <tbody>
          {cihazlar.map((c) => (
            <tr key={c.id} className="border-t align-top">
              <td className="p-3">
                <p className="font-black text-slate-950">{c.barkod || "-"}</p>
                <p className="text-xs font-bold text-slate-500">{c.seri_no || "-"}</p>
              </td>
              <td className="p-3 font-bold text-slate-700">
                {(c.marka || "-") + " " + (c.model || "")}
              </td>
              <td className="p-3 font-black text-slate-950">{durumEtiketi(c.durum)}</td>
              <td className="p-3 font-bold text-slate-700">{c.mevcut_konum_adi || "-"}</td>
              <td className="p-3 font-bold text-slate-700">{c.mevcut_zimmet_adi || "-"}</td>
              <td className="p-3 font-black text-slate-950">
                {gunFarki(c.son_hareket_at || c.created_at)} gün
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
