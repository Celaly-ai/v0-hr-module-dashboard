"use client"

import { useEffect, useMemo, useState } from "react"

type RolGecmisi = {
  id: string
  personel_id: string | null
  eski_rol: string | null
  yeni_rol: string | null
  degistiren_personel_id: string | null
  degistiren_ad: string | null
  aciklama: string | null
  created_at: string
}

type Personel = {
  id: string
  personel_kodu: string | null
  ad: string | null
  soyad: string | null
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

function adSoyad(p?: Personel | null) {
  if (!p) return "-"
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || p.personel_kodu || "-"
}

function rolClass(value?: string | null) {
  if (!value) return "bg-slate-100 text-slate-700 border-slate-300"

  const rol = value.toLocaleLowerCase("tr-TR")

  if (rol === "admin") return "bg-red-100 text-red-800 border-red-300"
  if (rol.includes("yonetici") || rol.includes("yönetici")) return "bg-purple-100 text-purple-800 border-purple-300"
  if (rol.includes("teknisyen")) return "bg-blue-100 text-blue-800 border-blue-300"
  if (rol.includes("muhasebe")) return "bg-emerald-100 text-emerald-800 border-emerald-300"
  if (rol.includes("sorumlu")) return "bg-amber-100 text-amber-800 border-amber-300"

  return "bg-slate-100 text-slate-800 border-slate-300"
}

export default function RolGecmisiPage() {
  const [kayitlar, setKayitlar] = useState<RolGecmisi[]>([])
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [arama, setArama] = useState("")
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")

  const personelMap = useMemo(() => {
    const map = new Map<string, Personel>()

    personeller.forEach((p) => {
      map.set(p.id, p)
    })

    return map
  }, [personeller])

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    try {
      const response = await fetch("/api/yonetim/rol-gecmisi", {
        cache: "no-store",
      })

      const json = await response.json().catch(() => null)

      if (!response.ok) {
        setHata("Rol geçmişi alınamadı: " + (json?.error || "API hatası"))
        setKayitlar([])
        setPersoneller([])
        setLoading(false)
        return
      }

      setKayitlar(Array.isArray(json?.kayitlar) ? json.kayitlar : [])
      setPersoneller(Array.isArray(json?.personeller) ? json.personeller : [])
    } catch (error: any) {
      setHata("Rol geçmişi alınamadı: " + (error?.message || "Bağlantı hatası"))
      setKayitlar([])
      setPersoneller([])
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  const filtreliKayitlar = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR")

    if (!q) return kayitlar

    return kayitlar.filter((k) => {
      const personel = k.personel_id ? personelMap.get(k.personel_id) : null

      const metin = `
        ${adSoyad(personel)}
        ${personel?.personel_kodu || ""}
        ${k.eski_rol || ""}
        ${k.yeni_rol || ""}
        ${k.degistiren_ad || ""}
        ${k.aciklama || ""}
      `.toLocaleLowerCase("tr-TR")

      return metin.includes(q)
    })
  }, [kayitlar, arama, personelMap])

  const ozet = useMemo(() => {
    const bugun = new Date()
    bugun.setHours(0, 0, 0, 0)

    return {
      toplam: kayitlar.length,
      bugun: kayitlar.filter((k) => new Date(k.created_at) >= bugun).length,
      degistirenSayisi: new Set(kayitlar.map((k) => k.degistiren_ad).filter(Boolean)).size,
    }
  }, [kayitlar])

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Personel
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Rol Geçmişi
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Personellerde yapılan rol değişikliklerini denetim amaçlı görüntüleyin.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Kpi title="Toplam Değişiklik" value={ozet.toplam} />
          <Kpi title="Bugünkü Değişiklik" value={ozet.bugun} />
          <Kpi title="İşlem Yapan Kişi" value={ozet.degistirenSayisi} />
        </div>

        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Personel, rol veya değiştiren ara..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 outline-none md:max-w-md"
            />

            <button
              type="button"
              onClick={() => void verileriYukle()}
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800"
            >
              Yenile
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="text-lg font-black text-slate-950">
              Değişiklik Kayıtları
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Listelenen kayıt: {filtreliKayitlar.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Tarih</th>
                  <th className="p-3 text-left">Personel</th>
                  <th className="p-3 text-left">Eski Rol</th>
                  <th className="p-3 text-left">Yeni Rol</th>
                  <th className="p-3 text-left">Değiştiren</th>
                  <th className="p-3 text-left">Açıklama</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center font-bold text-slate-500">
                      Rol geçmişi yükleniyor...
                    </td>
                  </tr>
                ) : filtreliKayitlar.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center font-bold text-slate-500">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtreliKayitlar.map((k) => {
                    const personel = k.personel_id ? personelMap.get(k.personel_id) : null

                    return (
                      <tr key={k.id} className="border-t align-top">
                        <td className="p-3 font-bold text-slate-700">
                          {tarihSaat(k.created_at)}
                        </td>

                        <td className="p-3">
                          <p className="font-black text-slate-950">{adSoyad(personel)}</p>
                          <p className="text-xs font-bold text-slate-500">
                            {personel?.personel_kodu || "-"}
                          </p>
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${rolClass(
                              k.eski_rol,
                            )}`}
                          >
                            {k.eski_rol || "-"}
                          </span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${rolClass(
                              k.yeni_rol,
                            )}`}
                          >
                            {k.yeni_rol || "-"}
                          </span>
                        </td>

                        <td className="p-3 font-bold text-slate-700">
                          {k.degistiren_ad || "-"}
                        </td>

                        <td className="p-3 font-bold text-slate-600">
                          {k.aciklama || "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ title, value }: { title: string | number; value: string | number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}
