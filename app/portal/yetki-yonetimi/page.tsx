"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Personel = {
  id: string
  ad: string | null
  soyad: string | null
  rol: string | null
  durum: string | null
}

type Modul = {
  kod: string
  ad: string
  aciklama: string | null
  kategori: string
  standart: boolean
  sira: number
}

type Yetki = {
  personel_id: string
  modul_kod: string
  aktif: boolean
}

function adSoyad(p: Personel) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || "Personel"
}

export default function YetkiYonetimiPage() {
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [moduller, setModuller] = useState<Modul[]>([])
  const [yetkiler, setYetkiler] = useState<Yetki[]>([])
  const [seciliPersonelId, setSeciliPersonelId] = useState("")
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")
  const [kayitMesaji, setKayitMesaji] = useState("")

  const seciliPersonel = useMemo(() => {
    return personeller.find((p) => p.id === seciliPersonelId) || null
  }, [personeller, seciliPersonelId])

  const seciliYetkiKodlari = useMemo(() => {
    return new Set(
      yetkiler
        .filter((y) => y.personel_id === seciliPersonelId && y.aktif)
        .map((y) => y.modul_kod)
    )
  }, [yetkiler, seciliPersonelId])

  async function verileriYukle() {
    setLoading(true)
    setHata("")
    setKayitMesaji("")

    const supabase = createClient()

    const [personelApiRes, modulRes, yetkiRes] = await Promise.all([
      fetch("/api/yonetim/personeller", { cache: "no-store" }),

      supabase
        .from("moduller")
        .select("kod, ad, aciklama, kategori, standart, sira")
        .eq("aktif", true)
        .order("sira", { ascending: true }),

      supabase
        .from("personel_modul_yetkileri")
        .select("personel_id, modul_kod, aktif"),
    ])

    const personelJson = await personelApiRes.json().catch(() => null)

    if (!personelApiRes.ok) {
      setHata("Personeller okunamadı: " + (personelJson?.error || "API hatası"))
      setLoading(false)
      return
    }

    if (modulRes.error) {
      setHata("Modüller okunamadı: " + modulRes.error.message)
      setLoading(false)
      return
    }

    if (yetkiRes.error) {
      setHata("Yetkiler okunamadı: " + yetkiRes.error.message)
      setLoading(false)
      return
    }

    const personelListesi = (personelJson?.personeller || []) as Personel[]

    setPersoneller(personelListesi)
    setModuller((modulRes.data || []) as Modul[])
    setYetkiler((yetkiRes.data || []) as Yetki[])

    if (!seciliPersonelId && personelListesi.length > 0) {
      setSeciliPersonelId(personelListesi[0].id)
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  async function yetkiDegistir(modul: Modul, aktif: boolean) {
    if (!seciliPersonelId) return
    if (modul.standart) return

    setKayitMesaji("Kaydediliyor...")
    setHata("")

    const response = await fetch("/api/yonetim/personel-modul-yetki", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personel_id: seciliPersonelId,
        modul_kod: modul.kod,
        aktif,
      }),
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setHata("Yetki kaydedilemedi: " + (json?.error || "API hatası"))
      setKayitMesaji("")
      return
    }

    setYetkiler((onceki) => {
      const digerleri = onceki.filter(
        (y) => !(y.personel_id === seciliPersonelId && y.modul_kod === modul.kod)
      )

      return [
        ...digerleri,
        {
          personel_id: seciliPersonelId,
          modul_kod: modul.kod,
          aktif,
        },
      ]
    })

    setKayitMesaji("Yetki güncellendi.")
  }

  const standartModuller = moduller.filter((m) => m.standart)
  const opsiyonelModuller = moduller.filter((m) => !m.standart)

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Personel
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Yetki Yönetimi
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Personel bazlı opsiyonel modül erişimlerini buradan açıp kapatın.
          </p>
        </div>

        {hata ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        ) : null}

        {kayitMesaji ? (
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm font-black text-blue-900">
            {kayitMesaji}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border bg-white p-6 text-sm font-bold text-slate-600">
            Yetki yönetimi yükleniyor...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-3xl border bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-black text-slate-950">
                Personel Seç
              </h2>

              <div className="space-y-2">
                {personeller.map((p) => {
                  const aktif = p.id === seciliPersonelId

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSeciliPersonelId(p.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        aktif
                          ? "border-blue-700 bg-blue-50 text-blue-950"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-black">{adSoyad(p)}</p>
                      <p className="mt-1 text-xs font-bold opacity-70">
                        {p.rol || "rol yok"} · {p.durum || "durum yok"}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-500">Seçili Personel</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {seciliPersonel ? adSoyad(seciliPersonel) : "Personel seçilmedi"}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  Standart modüller herkeste zorunlu açıktır. Sadece opsiyonel modüller değiştirilebilir.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                  Standart Modüller
                </h3>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {standartModuller.map((m) => (
                    <div
                      key={m.kod}
                      className="rounded-2xl border border-slate-950 bg-white p-4"
                    >
                      <p className="font-black text-slate-950">{m.ad}</p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Zorunlu açık
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                  Opsiyonel Modüller
                </h3>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {opsiyonelModuller.map((m) => {
                    const aktif = seciliYetkiKodlari.has(m.kod)

                    return (
                      <div
                        key={m.kod}
                        className={`rounded-2xl border p-4 ${
                          aktif
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className="font-black text-slate-950">{m.ad}</p>
                        <p className="mt-1 min-h-10 text-sm font-bold text-slate-500">
                          {m.aciklama || "-"}
                        </p>

                        <button
                          type="button"
                          onClick={() => yetkiDegistir(m, !aktif)}
                          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black ${
                            aktif
                              ? "bg-red-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {aktif ? "Yetkiyi Kapat" : "Yetki Ver"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
