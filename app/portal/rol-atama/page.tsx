"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Personel = {
  id: string
  sirket_id: string | null
  personel_kodu: string | null
  ad: string | null
  soyad: string | null
  tel: string | null
  telefon_normalized: string | null
  rol: string | null
  durum: string | null
  lokasyon: string | null
  bolge: string | null
  ise_giris_tarihi: string | null
  notlar: string | null
}

type Rol = {
  id: string
  ad: string
  label: string | null
}

function adSoyad(p: Personel) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || "Personel"
}

function rolEtiket(rol: Rol) {
  return rol.label || rol.ad
}

export default function RolAtamaPage() {
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [roller, setRoller] = useState<Rol[]>([])
  const [seciliPersonelId, setSeciliPersonelId] = useState("")
  const [seciliRol, setSeciliRol] = useState("")
  const [arama, setArama] = useState("")
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null)

  const seciliPersonel = useMemo(() => {
    return personeller.find((p) => p.id === seciliPersonelId) || null
  }, [personeller, seciliPersonelId])

  const filtreliPersoneller = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR")

    return personeller.filter((p) => {
      const metin = `${p.personel_kodu || ""} ${p.ad || ""} ${p.soyad || ""} ${p.rol || ""}`.toLocaleLowerCase("tr-TR")
      return !q || metin.includes(q)
    })
  }, [personeller, arama])

  async function verileriYukle() {
    setLoading(true)
    setMesaj(null)

    const supabase = createClient()

    const [personelRes, rolRes] = await Promise.all([
      fetch("/api/yonetim/personeller", { cache: "no-store" }),
      supabase.from("roller").select("id, ad, label").order("ad", { ascending: true }),
    ])

    const personelJson = await personelRes.json().catch(() => null)

    if (!personelRes.ok) {
      setMesaj({ tip: "hata", metin: "Personeller alınamadı: " + (personelJson?.error || "API hatası") })
      setLoading(false)
      return
    }

    if (rolRes.error) {
      setMesaj({ tip: "hata", metin: "Roller alınamadı: " + rolRes.error.message })
      setLoading(false)
      return
    }

    const pList = Array.isArray(personelJson?.personeller) ? personelJson.personeller : []
    const rList = (rolRes.data || []) as Rol[]

    setPersoneller(pList)
    setRoller(rList)

    if (pList.length > 0) {
      setSeciliPersonelId(pList[0].id)
      setSeciliRol(pList[0].rol || "calisan")
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  function personelSec(id: string) {
    const p = personeller.find((item) => item.id === id)
    setSeciliPersonelId(id)
    setSeciliRol(p?.rol || "calisan")
    setMesaj(null)
  }

  async function kaydet() {
    if (!seciliPersonel || !seciliRol) return

    setKaydediliyor(true)
    setMesaj(null)

    const response = await fetch("/api/yonetim/rol-atama", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personel_id: seciliPersonel.id,
        yeni_rol: seciliRol,
        aciklama: "Rol Atama ekranından güncellendi.",
      }),
    })

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      setMesaj({ tip: "hata", metin: "Rol güncellenemedi: " + (json?.error || "API hatası") })
      setKaydediliyor(false)
      return
    }

    setPersoneller((onceki) =>
      onceki.map((p) => (p.id === seciliPersonel.id ? { ...p, rol: seciliRol } : p)),
    )

    setMesaj({ tip: "basari", metin: `${adSoyad(seciliPersonel)} rolü "${seciliRol}" olarak güncellendi.` })
    setKaydediliyor(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Personel
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Rol Atama
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Personelin sistem rolünü güncelleyin. Modül erişimleri ayrıca Yetki Yönetimi ekranından verilir.
          </p>
        </div>

        {mesaj && (
          <div
            className={`rounded-2xl border p-4 text-sm font-black ${
              mesaj.tip === "basari"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {mesaj.metin}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border bg-white p-6 text-sm font-bold text-slate-600">
            Rol atama ekranı yükleniyor...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="rounded-3xl border bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Personel Seç</h2>

              <input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Personel ara..."
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none"
              />

              <div className="mt-4 max-h-[640px] space-y-2 overflow-auto pr-1">
                {filtreliPersoneller.map((p) => {
                  const aktif = p.id === seciliPersonelId

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => personelSec(p.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        aktif
                          ? "border-blue-700 bg-blue-50 text-blue-950"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-black">{adSoyad(p)}</p>
                      <p className="mt-1 text-xs font-bold opacity-70">
                        {p.personel_kodu || "-"} · {p.rol || "rol yok"} · {p.durum || "-"}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">Seçili Personel</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {seciliPersonel ? adSoyad(seciliPersonel) : "Personel seçilmedi"}
              </h2>

              {seciliPersonel && (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Info title="Personel Kodu" value={seciliPersonel.personel_kodu || "-"} />
                    <Info title="Mevcut Rol" value={seciliPersonel.rol || "-"} />
                    <Info title="Durum" value={seciliPersonel.durum || "-"} />
                  </div>

                  <div>
                    <label className="text-sm font-black text-slate-700">Yeni Rol</label>
                    <select
                      value={seciliRol}
                      onChange={(e) => setSeciliRol(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none"
                    >
                      {roller.map((r) => (
                        <option key={r.id} value={r.ad}>
                          {rolEtiket(r)} ({r.ad})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={kaydet}
                    disabled={kaydediliyor || !seciliRol || seciliRol === seciliPersonel.rol}
                    className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {kaydediliyor ? "Kaydediliyor..." : "Rolü Güncelle"}
                  </button>

                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                    Rol değişikliği personelin kimliğini belirler. Modül kartlarını açıp kapatmak için Yetki Yönetimi ekranını kullanın.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}
