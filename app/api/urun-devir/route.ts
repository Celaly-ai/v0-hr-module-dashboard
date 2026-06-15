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
  mevcut_zimmet_adi: string | null
  mevcut_zimmet_tipi: string | null
  mevcut_konum_adi: string | null
  son_hareket_at: string | null
  created_at: string | null
}

type Personel = {
  id: string
  ad: string | null
  soyad: string | null
  rol: string | null
  durum: string | null
}

function adSoyad(p: Personel) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || "Personel"
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

function durumEtiketi(value?: string | null) {
  switch (value) {
    case "kabul_edildi":
      return "Kabul Edildi"
    case "urun_sorumlusunda":
      return "Ürün Sorumlusunda"
    case "teknisyende":
      return "Teknisyende"
    case "montaj_bekliyor":
      return "Montaj Bekliyor"
    case "montaj_tamamlandi":
      return "Montaj Tamamlandı"
    default:
      return value || "-"
  }
}

export default function UrunDevirPage() {
  const supabase = useMemo(() => createClient(), [])

  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [seciliCihazIds, setSeciliCihazIds] = useState<string[]>([])
  const [arama, setArama] = useState("")
  const [kaynakPersonelAdi, setKaynakPersonelAdi] = useState("Servis")
  const [hedefPersonelId, setHedefPersonelId] = useState("")
  const [hedefPersonelAdi, setHedefPersonelAdi] = useState("")
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState("")
  const [basari, setBasari] = useState("")

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    const [cihazRes, personelRes] = await Promise.all([
      supabase
        .from("cihazlar")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),

      fetch("/api/yonetim/personeller", { cache: "no-store" }),
    ])

    const personelJson = await personelRes.json().catch(() => null)

    if (cihazRes.error) {
      setHata("Ürünler alınamadı: " + cihazRes.error.message)
      setCihazlar([])
      setLoading(false)
      return
    }

    if (!personelRes.ok) {
      setHata("Personeller alınamadı: " + (personelJson?.error || "API hatası"))
      setPersoneller([])
      setLoading(false)
      return
    }

    setCihazlar((cihazRes.data || []) as Cihaz[])
    setPersoneller((personelJson?.personeller || []) as Personel[])
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
        ${c.mevcut_zimmet_adi || ""}
        ${c.mevcut_konum_adi || ""}
        ${c.durum || ""}
      `.toLocaleLowerCase("tr-TR")

      return !q || metin.includes(q)
    })
  }, [cihazlar, arama])

  const seciliCihazlar = useMemo(() => {
    return cihazlar.filter((c) => seciliCihazIds.includes(c.id))
  }, [cihazlar, seciliCihazIds])

  function cihazSec(cihazId: string, secili: boolean) {
    setSeciliCihazIds((onceki) => {
      if (secili) return Array.from(new Set([...onceki, cihazId]))
      return onceki.filter((id) => id !== cihazId)
    })
  }

  function tumunuSec() {
    setSeciliCihazIds(filtreliCihazlar.map((c) => c.id))
  }

  function secimiTemizle() {
    setSeciliCihazIds([])
  }

  function hedefSec(personelId: string) {
    setHedefPersonelId(personelId)

    const p = personeller.find((item) => item.id === personelId)
    setHedefPersonelAdi(p ? adSoyad(p) : "")
  }

  async function devirEt() {
    setKaydediliyor(true)
    setHata("")
    setBasari("")

    if (seciliCihazIds.length === 0) {
      setHata("En az bir ürün seçmelisiniz.")
      setKaydediliyor(false)
      return
    }

    if (!hedefPersonelAdi.trim()) {
      setHata("Hedef personel seçmelisiniz.")
      setKaydediliyor(false)
      return
    }

    const response = await fetch("/api/urun-devir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cihaz_ids: seciliCihazIds,
        kaynak_personel_adi: kaynakPersonelAdi || "Servis",
        hedef_personel_id: hedefPersonelId || null,
        hedef_personel_adi: hedefPersonelAdi,
      }),
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata(json?.error || "Ürün devir işlemi başarısız.")
      setKaydediliyor(false)
      return
    }

    setBasari(
      `${json?.fis?.belge_no || "Devir fişi"} oluşturuldu. ${seciliCihazIds.length} ürün devredildi.`,
    )
    setSeciliCihazIds([])
    await verileriYukle()
    setKaydediliyor(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Operasyon
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Ürün Devir
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Servisteki veya personel zimmetindeki ürünleri ürün sorumlusuna, teknisyene ya da ilgili personele toplu olarak devredin.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        {basari && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-black text-emerald-900">
            {basari}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-black text-slate-950">
                Devredilecek Ürünler
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Seçilen ürün: {seciliCihazIds.length}
              </p>
            </div>

            <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_140px_140px]">
              <input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Barkod, seri no, marka, model veya zimmet ara..."
                className="field"
              />

              <button
                type="button"
                onClick={tumunuSec}
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                Tümünü Seç
              </button>

              <button
                type="button"
                onClick={secimiTemizle}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Temizle
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-14 p-3 text-center">Seç</th>
                    <th className="p-3 text-left">Barkod / Seri</th>
                    <th className="p-3 text-left">Ürün</th>
                    <th className="p-3 text-left">Durum</th>
                    <th className="p-3 text-left">Mevcut Zimmet</th>
                    <th className="p-3 text-left">Son Hareket</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center font-bold text-slate-500">
                        Ürünler yükleniyor...
                      </td>
                    </tr>
                  ) : filtreliCihazlar.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center font-bold text-slate-500">
                        Ürün bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filtreliCihazlar.map((c) => {
                      const secili = seciliCihazIds.includes(c.id)

                      return (
                        <tr key={c.id} className={secili ? "border-t bg-blue-50" : "border-t"}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={secili}
                              onChange={(e) => cihazSec(c.id, e.target.checked)}
                              className="h-5 w-5"
                            />
                          </td>

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
                          </td>

                          <td className="p-3 font-bold text-slate-700">
                            {durumEtiketi(c.durum)}
                          </td>

                          <td className="p-3">
                            <p className="font-black text-slate-950">
                              {c.mevcut_zimmet_adi || "-"}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {c.mevcut_zimmet_tipi || "-"}
                            </p>
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

          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Devir Bilgileri
              </h2>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="label">Kaynak</span>
                  <input
                    value={kaynakPersonelAdi}
                    onChange={(e) => setKaynakPersonelAdi(e.target.value)}
                    placeholder="Servis / Ürün sorumlusu / Teknisyen"
                    className="field"
                  />
                </label>

                <label className="block">
                  <span className="label">Hedef Personel</span>
                  <select
                    value={hedefPersonelId}
                    onChange={(e) => hedefSec(e.target.value)}
                    className="field"
                  >
                    <option value="">Personel seçin</option>
                    {personeller.map((p) => (
                      <option key={p.id} value={p.id}>
                        {adSoyad(p)} {p.rol ? `(${p.rol})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="label">Hedef Adı</span>
                  <input
                    value={hedefPersonelAdi}
                    onChange={(e) => setHedefPersonelAdi(e.target.value)}
                    placeholder="Personel adı"
                    className="field"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={devirEt}
                disabled={kaydediliyor || seciliCihazIds.length === 0}
                className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600"
              >
                {kaydediliyor ? "Devrediliyor..." : "Seçili Ürünleri Devret"}
              </button>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Seçili Ürün Özeti
              </h2>

              {seciliCihazlar.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed p-5 text-center text-sm font-bold text-slate-500">
                  Henüz ürün seçilmedi.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {seciliCihazlar.map((c) => (
                    <div key={c.id} className="rounded-2xl border bg-slate-50 p-3">
                      <p className="font-black text-slate-950">{c.barkod || "-"}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {c.marka || "-"} {c.model || ""} · Seri: {c.seri_no || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .field {
          min-height: 44px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 700;
          color: rgb(15 23 42);
          outline: none;
        }

        .field:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
        }

        .label {
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgb(100 116 139);
        }
      `}</style>
    </div>
  )
}
