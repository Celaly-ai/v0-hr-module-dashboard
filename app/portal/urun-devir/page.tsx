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
  mevcut_konum_adi: string | null
}

type Personel = {
  id: string
  ad: string | null
  soyad: string | null
  rol: string | null
  unvan: string | null
}

function adSoyad(p: Personel) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || p.unvan || p.rol || "-"
}

function konumAl(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Konum desteklenmiyor."))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

export default function UrunDevirPage() {
  const supabase = useMemo(() => createClient(), [])

  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [barkod, setBarkod] = useState("")
  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [hedefPersonelId, setHedefPersonelId] = useState("")
  const [hasarVar, setHasarVar] = useState(false)
  const [hasarAciklama, setHasarAciklama] = useState("")
  const [loading, setLoading] = useState(true)
  const [islem, setIslem] = useState(false)
  const [hata, setHata] = useState("")
  const [basari, setBasari] = useState("")

  async function personelleriYukle() {
    setLoading(true)
    setHata("")

    const { data, error } = await supabase
      .from("personeller")
      .select("id, ad, soyad, rol, unvan")
      .or("durum.is.null,durum.eq.aktif")
      .order("ad", { ascending: true })

    if (error) {
      setHata("Personeller alınamadı: " + error.message)
      setPersoneller([])
      setLoading(false)
      return
    }

    setPersoneller((data || []) as Personel[])
    setLoading(false)
  }

  useEffect(() => {
    void personelleriYukle()
  }, [])

  async function cihazEkle() {
    setHata("")
    setBasari("")

    const temizBarkod = barkod.trim()

    if (!temizBarkod) {
      setHata("Barkod girilmelidir.")
      return
    }

    if (cihazlar.some((c) => c.barkod === temizBarkod || c.seri_no === temizBarkod)) {
      setHata("Bu cihaz zaten listeye eklendi.")
      return
    }

    const { data, error } = await supabase
      .from("cihazlar")
      .select("id, barkod, seri_no, marka, model, durum, mevcut_zimmet_adi, mevcut_konum_adi")
      .or(`barkod.eq.${temizBarkod},seri_no.eq.${temizBarkod}`)
      .maybeSingle()

    if (error || !data) {
      setHata("Cihaz bulunamadı. Önce cihazı sisteme alın.")
      return
    }

    setCihazlar((onceki) => [...onceki, data as Cihaz])
    setBarkod("")
  }

  function cihazSil(id: string) {
    setCihazlar((onceki) => onceki.filter((c) => c.id !== id))
  }

  async function devret() {
    setIslem(true)
    setHata("")
    setBasari("")

    try {
      if (cihazlar.length === 0) {
        setHata("En az bir cihaz eklenmelidir.")
        setIslem(false)
        return
      }

      if (!hedefPersonelId) {
        setHata("Hedef personel seçilmelidir.")
        setIslem(false)
        return
      }

      if (hasarVar && !hasarAciklama.trim()) {
        setHata("Hasar varsa açıklama zorunludur.")
        setIslem(false)
        return
      }

      const hedef = personeller.find((p) => p.id === hedefPersonelId)

      if (!hedef) {
        setHata("Hedef personel bulunamadı.")
        setIslem(false)
        return
      }

      const pos = await konumAl()

      const response = await fetch("/api/urun-devir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cihaz_ids: cihazlar.map((c) => c.id),
          hedef_personel_id: hedef.id,
          hedef_personel_adi: adSoyad(hedef),
          kaynak_personel_adi: "Depo / Servis",
          gps_lat: pos.coords.latitude,
          gps_lng: pos.coords.longitude,
          gps_dogruluk: pos.coords.accuracy,
          islem_kaynagi: "mobil_portal",
          hasar_var: hasarVar,
          hasar_aciklama: hasarAciklama,
        }),
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        setHata(json?.error || "Devir işlemi başarısız.")
        setIslem(false)
        return
      }

      setBasari(`${json?.fis?.belge_no || "Devir kaydı"} oluşturuldu. ${cihazlar.length} cihaz devredildi.`)
      setCihazlar([])
      setHedefPersonelId("")
      setHasarVar(false)
      setHasarAciklama("")
    } catch (err: any) {
      setHata(err?.message || "Konum alınamadı veya devir işlemi tamamlanamadı.")
    }

    setIslem(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Cihaz Takip Merkezi
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Cihaz Zimmet Devri
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Barkod okut, cihazı doğrula, hedef personeli seç ve zimmeti aktar.
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

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">1. Barkod Doğrula</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
            <input
              value={barkod}
              onChange={(e) => setBarkod(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void cihazEkle()
              }}
              placeholder="Barkod veya seri no okut / gir"
              className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-bold outline-none"
            />

            <button
              type="button"
              onClick={() => void cihazEkle()}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
            >
              Cihaz Ekle
            </button>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">
            2. Seçili Cihazlar
          </h2>

          {cihazlar.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed p-5 text-center text-sm font-bold text-slate-500">
              Henüz cihaz eklenmedi.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {cihazlar.map((c) => (
                <div key={c.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-950">{c.barkod || "-"}</p>
                      <p className="text-xs font-bold text-slate-500">
                        Seri: {c.seri_no || "-"}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {c.marka || "-"} {c.model || ""}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Mevcut zimmet: {c.mevcut_zimmet_adi || "-"} · Durum: {c.durum || "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => cihazSil(c.id)}
                      className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-800"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">3. Hedef Personel</h2>

          <select
            value={hedefPersonelId}
            onChange={(e) => setHedefPersonelId(e.target.value)}
            disabled={loading}
            className="mt-4 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold outline-none"
          >
            <option value="">Personel seçin</option>
            {personeller.map((p) => (
              <option key={p.id} value={p.id}>
                {adSoyad(p)} {p.rol ? `(${p.rol})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">4. Hasar Kontrolü</h2>

          <label className="mt-4 flex items-center gap-3 rounded-2xl border bg-slate-50 p-4 text-sm font-black text-slate-900">
            <input
              type="checkbox"
              checked={hasarVar}
              onChange={(e) => setHasarVar(e.target.checked)}
              className="h-5 w-5"
            />
            Hasar var
          </label>

          {hasarVar && (
            <textarea
              value={hasarAciklama}
              onChange={(e) => setHasarAciklama(e.target.value)}
              placeholder="Hasar açıklaması"
              className="mt-3 min-h-28 w-full rounded-xl border border-slate-300 p-4 text-sm font-bold outline-none"
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => void devret()}
          disabled={islem || cihazlar.length === 0 || !hedefPersonelId}
          className="w-full rounded-2xl bg-blue-700 px-5 py-5 text-base font-black text-white disabled:bg-slate-300 disabled:text-slate-600"
        >
          {islem ? "Zimmet Aktarılıyor..." : "ZİMMETİ AKTAR"}
        </button>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-bold text-blue-950">
          Her devirde barkod doğrulaması ve GPS kaydı arka planda hareket kaydına işlenir. İade dışında belge üretilmez.
        </div>
      </div>
    </div>
  )
}
