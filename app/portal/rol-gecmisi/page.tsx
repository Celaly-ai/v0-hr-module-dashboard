"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type RolGecmisi = {
  id: string
  personel_id: string
  eski_rol: string | null
  yeni_rol: string | null
  degistiren_personel_id: string | null
  degistiren_ad: string | null
  aciklama: string | null
  created_at: string
  personeller?: {
    ad: string | null
    soyad: string | null
    personel_kodu: string | null
  } | null
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

function personelAdi(kayit: RolGecmisi) {
  const p = kayit.personeller
  if (!p) return "-"
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || p.personel_kodu || "-"
}

export default function RolGecmisiPage() {
  const [kayitlar, setKayitlar] = useState<RolGecmisi[]>([])
  const [arama, setArama] = useState("")
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")

  async function verileriYukle() {
    setLoading(true)
    setHata("")

    const supabase = createClient()

    const { data, error } = await supabase
      .from("personel_rol_gecmisi")
      .select(`
        id,
        personel_id,
        eski_rol,
        yeni_rol,
        degistiren_personel_id,
        degistiren_ad,
        aciklama,
        created_at,
        personeller:personel_id (
          ad,
          soyad,
          personel_kodu
        )
      `)
      .order("created_at", { ascending: false })
      .limit(300)

    if (error) {
      setHata("Rol geçmişi alınamadı: " + error.message)
      setKayitlar([])
      setLoading(false)
      return
    }

    setKayitlar((data || []) as unknown as RolGecmisi[])
    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  const filtreliKayitlar = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR")

    if (!q) return kayitlar

    return kayitlar.filter((k) => {
      const metin = `
        ${personelAdi(k)}
        ${k.personeller?.personel_kodu || ""}
        ${k.eski_rol || ""}
        ${k.yeni_rol || ""}
        ${k.degistiren_ad || ""}
        ${k.aciklama || ""}
      `.toLocaleLowerCase("tr-TR")

      return metin.includes(q)
    })
  }, [kayitlar, arama])

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
              Toplam kayıt: {filtreliKayitlar.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
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
                  filtreliKayitlar.map((k) => (
                    <tr key={k.id} className="border-t">
                      <td className="p-3 font-bold text-slate-700">
                        {tarihSaat(k.created_at)}
                      </td>
                      <td className="p-3">
                        <p className="font-black text-slate-950">{personelAdi(k)}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {k.personeller?.personel_kodu || "-"}
                        </p>
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {k.eski_rol || "-"}
                      </td>
                      <td className="p-3 font-black text-blue-800">
                        {k.yeni_rol || "-"}
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {k.degistiren_ad || "-"}
                      </td>
                      <td className="p-3 font-bold text-slate-600">
                        {k.aciklama || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
