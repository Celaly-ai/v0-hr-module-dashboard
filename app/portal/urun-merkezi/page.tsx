"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Cihaz = {
  id: string
  barkod: string | null
  seri_no: string | null
  marka: string | null
  model: string | null
  urun_grubu: string | null
  kaynak_tipi: string | null
  kaynak_aciklama: string | null
  mevcut_konum_tipi: string | null
  mevcut_konum_adi: string | null
  mevcut_zimmet_tipi: string | null
  mevcut_zimmet_adi: string | null
  durum: string | null
  son_hareket_at: string | null
  kabul_at: string | null
  created_at: string | null
}

type Hareket = {
  id: string
  cihaz_id: string
  hareket_tipi: string | null
  onceki_durum: string | null
  yeni_durum: string | null
  kaynak_tipi: string | null
  kaynak_adi: string | null
  hedef_tipi: string | null
  hedef_adi: string | null
  teslim_eden_adi: string | null
  teslim_alan_adi: string | null
  aciklama: string | null
  created_at: string | null
}

type Fotograf = {
  id: string
  cihaz_id: string
  fotograf_tipi: string | null
  public_url: string | null
  storage_path: string | null
  created_at: string | null
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
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

function durumClass(value?: string | null) {
  switch (value) {
    case "bayi_deposunda":
      return "border-sky-300 bg-sky-50 text-sky-800"
    case "ortak_depoda":
      return "border-cyan-300 bg-cyan-50 text-cyan-800"
    case "servis_deposunda":
      return "border-emerald-300 bg-emerald-50 text-emerald-800"
    case "urun_sorumlusunda":
      return "border-purple-300 bg-purple-50 text-purple-800"
    case "teknisyende":
      return "border-amber-300 bg-amber-50 text-amber-800"
    case "musteride":
      return "border-green-300 bg-green-50 text-green-800"
    case "iadede":
      return "border-orange-300 bg-orange-50 text-orange-800"
    case "hurda":
      return "border-red-300 bg-red-50 text-red-800"
    default:
      return "border-slate-300 bg-slate-50 text-slate-700"
  }
}

function kaynakEtiketi(value?: string | null) {
  switch (value) {
    case "bayi_deposu":
      return "Bayi Deposu"
    case "ortak_depo":
      return "Ortak Depo"
    case "kargo":
      return "Kargo"
    case "musteri":
      return "Müşteri"
    case "servise_getirildi":
      return "Servise Getirildi"
    default:
      return value || "-"
  }
}

export default function UrunMerkeziPage() {
  const supabase = useMemo(() => createClient(), [])

  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [hareketler, setHareketler] = useState<Hareket[]>([])
  const [fotograflar, setFotograflar] = useState<Fotograf[]>([])
  const [seciliCihazId, setSeciliCihazId] = useState<string | null>(null)
  const [arama, setArama] = useState("")
  const [durumFiltresi, setDurumFiltresi] = useState("tum")
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    const { data: cihazData, error: cihazError } = await supabase
      .from("cihazlar")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)

    if (cihazError) {
      setHata("Ürünler alınamadı: " + cihazError.message)
      setCihazlar([])
      setHareketler([])
      setFotograflar([])
      setLoading(false)
      return
    }

    const ids = (cihazData || []).map((c) => c.id)

    let hareketData: Hareket[] = []
    let fotoData: Fotograf[] = []

    if (ids.length > 0) {
      const { data: hData } = await supabase
        .from("cihaz_hareketleri")
        .select("*")
        .in("cihaz_id", ids)
        .order("created_at", { ascending: false })

      const { data: fData } = await supabase
        .from("cihaz_fotograflari")
        .select("*")
        .in("cihaz_id", ids)
        .order("created_at", { ascending: false })

      hareketData = (hData || []) as Hareket[]
      fotoData = (fData || []) as Fotograf[]
    }

    setCihazlar((cihazData || []) as Cihaz[])
    setHareketler(hareketData)
    setFotograflar(fotoData)

    if (!seciliCihazId && cihazData && cihazData.length > 0) {
      setSeciliCihazId(cihazData[0].id)
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtreliCihazlar = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR")

    return cihazlar.filter((c) => {
      const metin = `
        ${c.barkod || ""}
        ${c.seri_no || ""}
        ${c.marka || ""}
        ${c.model || ""}
        ${c.urun_grubu || ""}
        ${c.kaynak_aciklama || ""}
        ${c.mevcut_konum_adi || ""}
        ${c.mevcut_zimmet_adi || ""}
      `.toLocaleLowerCase("tr-TR")

      const aramaUyar = !q || metin.includes(q)
      const durumUyar = durumFiltresi === "tum" || c.durum === durumFiltresi

      return aramaUyar && durumUyar
    })
  }, [cihazlar, arama, durumFiltresi])

  const seciliCihaz = useMemo(() => {
    return cihazlar.find((c) => c.id === seciliCihazId) || null
  }, [cihazlar, seciliCihazId])

  const seciliHareketler = useMemo(() => {
    if (!seciliCihazId) return []
    return hareketler.filter((h) => h.cihaz_id === seciliCihazId)
  }, [hareketler, seciliCihazId])

  const seciliFotograflar = useMemo(() => {
    if (!seciliCihazId) return []
    return fotograflar.filter((f) => f.cihaz_id === seciliCihazId)
  }, [fotograflar, seciliCihazId])

  const ozet = useMemo(() => {
    return {
      toplam: cihazlar.length,
      servisDeposunda: cihazlar.filter((c) => c.durum === "servis_deposunda").length,
      urunSorumlusunda: cihazlar.filter((c) => c.durum === "urun_sorumlusunda").length,
      teknisyende: cihazlar.filter((c) => c.durum === "teknisyende").length,
      musteride: cihazlar.filter((c) => c.durum === "musteride").length,
    }
  }, [cihazlar])

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Operasyon
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Ürün Merkezi
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Barkod, seri no, model, kaynak, zimmet ve hareket geçmişine göre cihazların nerede olduğunu takip edin.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi title="Toplam Ürün" value={ozet.toplam} />
          <Kpi title="Servis Deposunda" value={ozet.servisDeposunda} />
          <Kpi title="Ürün Sorumlusunda" value={ozet.urunSorumlusunda} />
          <Kpi title="Teknisyende" value={ozet.teknisyende} />
          <Kpi title="Müşteride" value={ozet.musteride} />
        </div>

        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_140px]">
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Barkod, seri no, marka, model, kaynak veya zimmet ara..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 outline-none"
            />

            <select
              value={durumFiltresi}
              onChange={(e) => setDurumFiltresi(e.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 outline-none"
            >
              <option value="tum">Tüm Durumlar</option>
              <option value="bayi_deposunda">Bayi Deposunda</option>
              <option value="ortak_depoda">Ortak Depoda</option>
              <option value="servis_deposunda">Servis Deposunda</option>
              <option value="urun_sorumlusunda">Ürün Sorumlusunda</option>
              <option value="teknisyende">Teknisyende</option>
              <option value="musteride">Müşteride</option>
              <option value="iadede">İadede</option>
              <option value="hurda">Hurda</option>
            </select>

            <button
              type="button"
              onClick={() => void verileriYukle()}
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800"
            >
              Yenile
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-black text-slate-950">
                Ürün Listesi
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Listelenen ürün: {filtreliCihazlar.length}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Barkod / Seri No</th>
                    <th className="p-3 text-left">Ürün</th>
                    <th className="p-3 text-left">Durum</th>
                    <th className="p-3 text-left">Kaynak</th>
                    <th className="p-3 text-left">Mevcut Konum</th>
                    <th className="p-3 text-left">Zimmet</th>
                    <th className="p-3 text-left">Son Hareket</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center font-bold text-slate-500">
                        Ürünler yükleniyor...
                      </td>
                    </tr>
                  ) : filtreliCihazlar.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center font-bold text-slate-500">
                        Ürün bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filtreliCihazlar.map((c) => {
                      const aktif = c.id === seciliCihazId

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSeciliCihazId(c.id)}
                          className={`cursor-pointer border-t align-top hover:bg-blue-50 ${
                            aktif ? "bg-blue-50" : ""
                          }`}
                        >
                          <td className="p-3">
                            <p className="font-black text-slate-950">{c.barkod || "-"}</p>
                            <p className="text-xs font-bold text-slate-500">
                              Seri: {c.seri_no || "-"}
                            </p>
                          </td>

                          <td className="p-3">
                            <p className="font-black text-slate-950">
                              {c.marka || "-"} {c.model || ""}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {c.urun_grubu || "-"}
                            </p>
                          </td>

                          <td className="p-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${durumClass(c.durum)}`}>
                              {durumEtiketi(c.durum)}
                            </span>
                          </td>

                          <td className="p-3 font-bold text-slate-700">
                            <p>{kaynakEtiketi(c.kaynak_tipi)}</p>
                            <p className="text-xs text-slate-500">{c.kaynak_aciklama || "-"}</p>
                          </td>

                          <td className="p-3 font-bold text-slate-700">
                            <p>{c.mevcut_konum_adi || "-"}</p>
                            <p className="text-xs text-slate-500">{c.mevcut_konum_tipi || "-"}</p>
                          </td>

                          <td className="p-3 font-bold text-slate-700">
                            <p>{c.mevcut_zimmet_adi || "-"}</p>
                            <p className="text-xs text-slate-500">{c.mevcut_zimmet_tipi || "-"}</p>
                          </td>

                          <td className="p-3 font-bold text-slate-700">
                            {tarihSaat(c.son_hareket_at || c.created_at)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">
              Ürün Kartı
            </h2>

            {!seciliCihaz ? (
              <div className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm font-bold text-slate-500">
                Detay görmek için listeden ürün seçin.
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Barkod
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {seciliCihaz.barkod || "-"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-600">
                    Seri No: {seciliCihaz.seri_no || "-"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Info title="Marka" value={seciliCihaz.marka || "-"} />
                  <Info title="Model" value={seciliCihaz.model || "-"} />
                  <Info title="Durum" value={durumEtiketi(seciliCihaz.durum)} />
                  <Info title="Kaynak" value={kaynakEtiketi(seciliCihaz.kaynak_tipi)} />
                  <Info title="Konum" value={seciliCihaz.mevcut_konum_adi || "-"} />
                  <Info title="Zimmet" value={seciliCihaz.mevcut_zimmet_adi || "-"} />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-950">
                    Barkod Fotoğrafları
                  </h3>

                  {seciliFotograflar.length === 0 ? (
                    <div className="mt-2 rounded-2xl border border-dashed p-4 text-center text-sm font-bold text-slate-500">
                      Fotoğraf yok.
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {seciliFotograflar.map((f) => (
                        <a
                          key={f.id}
                          href={f.public_url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-2xl border bg-slate-50"
                        >
                          {f.public_url ? (
                            <img
                              src={f.public_url}
                              alt={f.fotograf_tipi || "fotoğraf"}
                              className="h-32 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center text-xs font-bold text-slate-500">
                              Görsel yok
                            </div>
                          )}
                          <div className="p-2 text-xs font-black text-slate-700">
                            {f.fotograf_tipi || "fotoğraf"}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-950">
                    Hareket Geçmişi
                  </h3>

                  {seciliHareketler.length === 0 ? (
                    <div className="mt-2 rounded-2xl border border-dashed p-4 text-center text-sm font-bold text-slate-500">
                      Hareket yok.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {seciliHareketler.map((h) => (
                        <div key={h.id} className="rounded-2xl border bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-950">
                                {h.hareket_tipi || "-"}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {tarihSaat(h.created_at)}
                              </p>
                            </div>
                            <span className="rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-800">
                              {durumEtiketi(h.yeni_durum)}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <MiniInfo title="Kaynak" value={h.kaynak_adi || h.kaynak_tipi || "-"} />
                            <MiniInfo title="Hedef" value={h.hedef_adi || h.hedef_tipi || "-"} />
                            <MiniInfo title="Teslim Eden" value={h.teslim_eden_adi || "-"} />
                            <MiniInfo title="Teslim Alan" value={h.teslim_alan_adi || "-"} />
                          </div>

                          {h.aciklama && (
                            <p className="mt-3 text-xs font-bold text-slate-600">
                              {h.aciklama}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-2">
      <p className="font-black text-slate-500">{title}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  )
}
