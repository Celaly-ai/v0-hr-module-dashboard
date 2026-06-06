"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type MesaiKaydi = {
  personel_id: string
  ad: string | null
  soyad: string | null
  departman: string | null
  tarih: string | null
  ilk_giris: string | null
  son_cikis: string | null
  giris_durumu: string | null
  gecikme_dakika: number | null
  toplam_calisma_dakika: number | null
}

function tarihFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("tr-TR")
}

function saatFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function dakikaSaat(value?: number | null) {
  const dakika = Number(value || 0)
  if (!dakika) return "-"
  const saat = Math.floor(dakika / 60)
  const kalan = Math.round(dakika % 60)
  if (saat <= 0) return `${kalan} dk`
  return `${saat} sa ${kalan} dk`
}

function durumRenk(durum?: string | null) {
  const d = String(durum || "").toLocaleLowerCase("tr-TR")
  if (d.includes("geç")) return "bg-amber-100 text-amber-800 border-amber-300"
  if (d.includes("gelmedi")) return "bg-red-100 text-red-800 border-red-300"
  if (d.includes("zaman")) return "bg-emerald-100 text-emerald-800 border-emerald-300"
  return "bg-slate-100 text-slate-700 border-slate-300"
}

function bugun() {
  return new Date().toISOString().slice(0, 10)
}

function ayBasi() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

export default function MesaiRaporuPage() {
  const supabase = useMemo(() => createClient(), [])

  const [kayitlar, setKayitlar] = useState<MesaiKaydi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [baslangicTarihi, setBaslangicTarihi] = useState(ayBasi())
  const [bitisTarihi, setBitisTarihi] = useState(bugun())
  const [personelArama, setPersonelArama] = useState("")
  const [durumFiltresi, setDurumFiltresi] = useState("tum")

  async function verileriGetir() {
    setLoading(true)
    setError(null)

    let query = supabase
      .from("v_gunluk_giris_cikis_raporu")
      .select("*")
      .order("tarih", { ascending: false })

    if (baslangicTarihi) query = query.gte("tarih", baslangicTarihi)
    if (bitisTarihi) query = query.lte("tarih", bitisTarihi)

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setKayitlar([])
    } else {
      setKayitlar((data || []) as MesaiKaydi[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriGetir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtreliKayitlar = useMemo(() => {
    const arama = personelArama.trim().toLocaleLowerCase("tr-TR")

    return kayitlar.filter((k) => {
      const adSoyad = `${k.ad || ""} ${k.soyad || ""}`.toLocaleLowerCase("tr-TR")
      const durum = String(k.giris_durumu || "").toLocaleLowerCase("tr-TR")

      const personelUyar = !arama || adSoyad.includes(arama)

      const durumUyar =
        durumFiltresi === "tum" ||
        (durumFiltresi === "zamaninda" && durum.includes("zaman")) ||
        (durumFiltresi === "gec" && durum.includes("geç")) ||
        (durumFiltresi === "gelmedi" && durum.includes("gelmedi")) ||
        (durumFiltresi === "eksik_cikis" && k.ilk_giris && !k.son_cikis)

      return personelUyar && durumUyar
    })
  }, [kayitlar, personelArama, durumFiltresi])

  const ozet = useMemo(() => {
    const toplam = filtreliKayitlar.length
    const gelen = filtreliKayitlar.filter((k) => k.ilk_giris).length
    const gelmeyen = filtreliKayitlar.filter((k) =>
      String(k.giris_durumu || "").toLocaleLowerCase("tr-TR").includes("gelmedi"),
    ).length
    const gec = filtreliKayitlar.filter((k) => Number(k.gecikme_dakika || 0) > 0).length
    const eksikCikis = filtreliKayitlar.filter((k) => k.ilk_giris && !k.son_cikis).length
    const toplamDakika = filtreliKayitlar.reduce(
      (sum, k) => sum + Number(k.toplam_calisma_dakika || 0),
      0,
    )

    return { toplam, gelen, gelmeyen, gec, eksikCikis, toplamDakika }
  }, [filtreliKayitlar])

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          Mesai Giriş / Çıkış Raporu
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personel bazlı giriş, çıkış, geç kalma, eksik çıkış ve toplam çalışma süresi.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-5">
        <div>
          <label className="text-xs font-bold text-muted-foreground">Başlangıç</label>
          <input
            type="date"
            value={baslangicTarihi}
            onChange={(e) => setBaslangicTarihi(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Bitiş</label>
          <input
            type="date"
            value={bitisTarihi}
            onChange={(e) => setBitisTarihi(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Personel</label>
          <input
            value={personelArama}
            onChange={(e) => setPersonelArama(e.target.value)}
            placeholder="Ad soyad ara"
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Durum</label>
          <select
            value={durumFiltresi}
            onChange={(e) => setDurumFiltresi(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="tum">Tümü</option>
            <option value="zamaninda">Zamanında</option>
            <option value="gec">Geç Gelen</option>
            <option value="gelmedi">Gelmedi</option>
            <option value="eksik_cikis">Eksik Çıkış</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void verileriGetir()}
            disabled={loading}
            className="min-h-10 w-full rounded-lg bg-foreground px-4 text-sm font-black text-background disabled:opacity-60"
          >
            {loading ? "Yükleniyor..." : "Filtrele"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          Rapor verisi alınamadı: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi title="Toplam Kayıt" value={ozet.toplam} />
        <Kpi title="Gelen" value={ozet.gelen} />
        <Kpi title="Geç Kalan" value={ozet.gec} />
        <Kpi title="Gelmeyen" value={ozet.gelmeyen} />
        <Kpi title="Eksik Çıkış" value={ozet.eksikCikis} />
        <Kpi title="Toplam Süre" value={dakikaSaat(ozet.toplamDakika)} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-black">Detaylı Mesai Tablosu</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Liste aktif filtrelere göre gösterilir.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left">Personel</th>
                <th className="p-3 text-left">Departman</th>
                <th className="p-3 text-center">Tarih</th>
                <th className="p-3 text-center">İlk Giriş</th>
                <th className="p-3 text-center">Son Çıkış</th>
                <th className="p-3 text-center">Durum</th>
                <th className="p-3 text-center">Geç Kalma</th>
                <th className="p-3 text-center">Toplam Süre</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtreliKayitlar.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtreliKayitlar.map((k, index) => (
                  <tr key={`${k.personel_id}-${k.tarih}-${index}`} className="border-t">
                    <td className="p-3 font-bold">
                      {k.ad || "-"} {k.soyad || ""}
                    </td>
                    <td className="p-3">{k.departman || "-"}</td>
                    <td className="p-3 text-center">{tarihFormat(k.tarih)}</td>
                    <td className="p-3 text-center">{saatFormat(k.ilk_giris)}</td>
                    <td className="p-3 text-center">{saatFormat(k.son_cikis)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${durumRenk(k.giris_durumu)}`}>
                        {k.giris_durumu || "-"}
                      </span>
                    </td>
                    <td className="p-3 text-center">{dakikaSaat(k.gecikme_dakika)}</td>
                    <td className="p-3 text-center">{dakikaSaat(k.toplam_calisma_dakika)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}
