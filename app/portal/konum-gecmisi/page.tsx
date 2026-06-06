"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import { createClient } from "@/lib/supabase/client"

type Personel = {
  id: string
  personel_kodu: string | null
  ad: string | null
  soyad: string | null
}

type KonumLog = {
  id: string
  personel_id: string
  enlem: number | string | null
  boylam: number | string | null
  hiz: number | string | null
  dogruluk: number | string | null
  kaynak: string | null
  uygulama_durumu: string | null
  kayit_zamani: string | null
  created_at: string | null
}

function bugunISO() {
  return new Date().toISOString().slice(0, 10)
}

function saat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

function sayi(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function adSoyad(p: Personel) {
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || p.personel_kodu || "-"
}
function dakikaYaz(dakika: number) {
  if (!Number.isFinite(dakika) || dakika <= 0) return "-"
  const saat = Math.floor(dakika / 60)
  const dk = dakika % 60
  if (saat > 0 && dk > 0) return `${saat}s ${dk}d`
  if (saat > 0) return `${saat}s`
  return `${dk}d`
}

function mesafeMetre(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function mesafeYaz(metre: number) {
  if (!Number.isFinite(metre) || metre <= 0) return "-"
  if (metre >= 1000) return `${(metre / 1000).toFixed(2)} km`
  return `${Math.round(metre)} m`
}


const KonumGecmisiHaritasi = dynamic(
  async () => {
    const reactLeaflet = await import("react-leaflet")
    const { MapContainer, TileLayer, CircleMarker, Popup, Polyline } = reactLeaflet

    function Harita({ kayitlar }: { kayitlar: KonumLog[] }) {
      const noktalar = kayitlar
        .map((k) => {
          const enlem = sayi(k.enlem)
          const boylam = sayi(k.boylam)
          if (enlem === null || boylam === null) return null
          return {
            ...k,
            enlem,
            boylam,
          }
        })
        .filter(Boolean) as Array<KonumLog & { enlem: number; boylam: number }>

      const merkez = noktalar[0]
      const center: [number, number] = merkez
        ? [merkez.enlem, merkez.boylam]
        : [37.9406, 40.1511]

      const polyline: [number, number][] = noktalar.map((k) => [k.enlem, k.boylam])

      return (
        <MapContainer center={center} zoom={16} className="h-[420px] w-full rounded-2xl">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {polyline.length >= 2 && (
            <Polyline
              positions={polyline}
              pathOptions={{
                color: "#2563eb",
                weight: 5,
                opacity: 0.8,
              }}
            />
          )}

          {noktalar.map((k, index) => {
            const isFirst = index === 0
            const isLast = index === noktalar.length - 1
            const renk = isFirst ? "#16a34a" : isLast ? "#dc2626" : "#2563eb"
            const yaricap = isFirst || isLast ? 15 : 7
            const agirlik = isFirst || isLast ? 5 : 3
            const opaklik = isFirst || isLast ? 0.95 : 0.75

            return (
              <CircleMarker
                key={k.id}
                center={[k.enlem, k.boylam]}
                radius={yaricap}
                pathOptions={{
                  color: renk,
                  fillColor: renk,
                  fillOpacity: opaklik,
                  weight: agirlik,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <p className="font-bold">
                      {isFirst ? "Başlangıç" : isLast ? "Bitiş" : `Nokta ${index + 1}`}
                    </p>
                    <p>Saat: {saat(k.created_at || k.kayit_zamani)}</p>
                    <p>Kaynak: {k.kaynak || "-"}</p>
                    <p>Doğruluk: {k.dogruluk ?? "-"}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      )
    }

    return Harita
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border bg-muted/30 text-sm font-semibold text-muted-foreground">
        Rota haritası yükleniyor...
      </div>
    ),
  },
)

export default function KonumGecmisiPage() {
  const supabase = useMemo(() => createClient(), [])

  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [personelId, setPersonelId] = useState("")
  const [tarih, setTarih] = useState(bugunISO())
  const [kayitlar, setKayitlar] = useState<KonumLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function personelleriGetir() {
    const { data } = await supabase
      .from("personeller")
      .select("id, personel_kodu, ad, soyad")
      .eq("durum", "aktif")
      .order("ad", { ascending: true })

    setPersoneller((data || []) as Personel[])
  }

  async function kayitlariGetir() {
    setLoading(true)
    setError(null)

    const baslangic = new Date(`${tarih}T00:00:00`)
    const bitis = new Date(`${tarih}T23:59:59`)

    let query = supabase
      .from("personel_konum_loglari")
      .select("*")
      .gte("created_at", baslangic.toISOString())
      .lte("created_at", bitis.toISOString())
      .order("created_at", { ascending: true })

    if (personelId) {
      query = query.eq("personel_id", personelId)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setKayitlar([])
    } else {
      setKayitlar((data || []) as KonumLog[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void personelleriGetir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ozet = useMemo(() => {
    const ilk = kayitlar[0]
    const son = kayitlar[kayitlar.length - 1]

    const koordinatliKayitlar = kayitlar
      .map((k) => {
        const enlem = sayi(k.enlem)
        const boylam = sayi(k.boylam)
        if (enlem === null || boylam === null) return null
        return {
          ...k,
          enlem,
          boylam,
          zaman: new Date(k.created_at || k.kayit_zamani || "").getTime(),
        }
      })
      .filter(Boolean) as Array<KonumLog & { enlem: number; boylam: number; zaman: number }>

    let toplamMesafe = 0
    for (let i = 1; i < koordinatliKayitlar.length; i++) {
      const onceki = koordinatliKayitlar[i - 1]
      const simdiki = koordinatliKayitlar[i]
      toplamMesafe += mesafeMetre(onceki.enlem, onceki.boylam, simdiki.enlem, simdiki.boylam)
    }

    const ilkZaman = ilk?.created_at || ilk?.kayit_zamani || null
    const sonZaman = son?.created_at || son?.kayit_zamani || null
    const sureDakika =
      ilkZaman && sonZaman
        ? Math.max(0, Math.floor((new Date(sonZaman).getTime() - new Date(ilkZaman).getTime()) / 60000))
        : 0

    const hizlar = kayitlar
      .map((k) => sayi(k.hiz))
      .filter((v): v is number => v !== null && v > 0)

    const maksimumHiz = hizlar.length ? Math.max(...hizlar) : 0
    const ortalamaHiz = sureDakika > 0 ? (toplamMesafe / 1000) / (sureDakika / 60) : 0

    return {
      toplam: kayitlar.length,
      ilk: ilkZaman,
      son: sonZaman,
      koordinatli: koordinatliKayitlar.length,
      toplamMesafe,
      sureDakika,
      ortalamaHiz,
      maksimumHiz,
    }
  }, [kayitlar])

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Konum Geçmişi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personelin seçilen tarihte gönderdiği konum kayıtlarını gösterir.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground">Personel</label>
          <select
            value={personelId}
            onChange={(e) => setPersonelId(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Tüm Personeller</option>
            {personeller.map((p) => (
              <option key={p.id} value={p.id}>
                {adSoyad(p)} {p.personel_kodu ? `(${p.personel_kodu})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Tarih</label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div className="md:col-span-2 flex items-end">
          <button
            type="button"
            onClick={() => void kayitlariGetir()}
            className="min-h-10 w-full rounded-xl bg-foreground px-4 py-2 text-sm font-black text-background"
          >
            Konum Geçmişini Getir
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          Konum geçmişi alınamadı: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi title="Toplam Kayıt" value={ozet.toplam} />
        <Kpi title="Koordinatlı" value={ozet.koordinatli} />
        <Kpi title="Toplam Mesafe" value={mesafeYaz(ozet.toplamMesafe)} />
        <Kpi title="Süre" value={dakikaYaz(ozet.sureDakika)} />
        <Kpi title="Ortalama Hız" value={ozet.ortalamaHiz > 0 ? `${ozet.ortalamaHiz.toFixed(1)} km/s` : "-"} />
        <Kpi title="Maksimum Hız" value={ozet.maksimumHiz > 0 ? `${ozet.maksimumHiz.toFixed(1)} m/sn` : "-"} />
        <Kpi title="İlk Konum" value={tarihSaat(ozet.ilk)} />
        <Kpi title="Son Konum" value={tarihSaat(ozet.son)} />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-black">Rota Haritası</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Seçilen kayıtlar harita üzerinde sıralı rota çizgisi olarak gösterilir. Yeşil başlangıç, kırmızı bitiş noktasıdır.
        </p>

        <div className="mt-3">
          {ozet.koordinatli === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm font-semibold text-muted-foreground">
              Haritada gösterilecek koordinatlı kayıt bulunamadı.
            </div>
          ) : (
            <KonumGecmisiHaritasi kayitlar={kayitlar} />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-black">Konum Kayıtları</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Seçilen tarih ve personele ait ham konum hareketleri.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left">Saat</th>
                <th className="p-3 text-center">Enlem</th>
                <th className="p-3 text-center">Boylam</th>
                <th className="p-3 text-center">Hız</th>
                <th className="p-3 text-center">Doğruluk</th>
                <th className="p-3 text-center">Kaynak</th>
                <th className="p-3 text-center">Durum</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                kayitlar.map((k) => (
                  <tr key={k.id} className="border-t">
                    <td className="p-3 font-semibold">{saat(k.created_at || k.kayit_zamani)}</td>
                    <td className="p-3 text-center">{k.enlem ?? "-"}</td>
                    <td className="p-3 text-center">{k.boylam ?? "-"}</td>
                    <td className="p-3 text-center">{k.hiz ?? "-"}</td>
                    <td className="p-3 text-center">{k.dogruluk ?? "-"}</td>
                    <td className="p-3 text-center">{k.kaynak || "-"}</td>
                    <td className="p-3 text-center">{k.uygulama_durumu || "-"}</td>
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
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  )
}
