"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import { createClient } from "@/lib/supabase/client"

type KonumKaydi = {
  personel_id: string
  sirket_id: string | null
  sube_id: string | null
  personel_kodu: string | null
  personel_adi: string | null
  departman: string | null
  unvan: string | null
  rol: string | null
  personel_durumu: string | null
  oturum_id: string | null
  oturum_durumu: string | null
  baslangic_zamani: string | null
  bitis_zamani: string | null
  toplam_kayit_sayisi: number | null
  son_konum_zamani: string | null
  takip_modu: string | null
  son_log_id: string | null
  enlem: number | null
  boylam: number | null
  dogruluk: number | null
  hiz: number | null
  kaynak: string | null
  uygulama_durumu: string | null
  kayit_zamani: string | null
  takip_durumu: string | null
  siralama_onceligi: number | null
}

function zamanFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function durumEtiketi(value?: string | null) {
  switch (value) {
    case "aktif":
      return "Aktif"
    case "pasif":
      return "Pasif"
    case "konum_bekleniyor":
      return "Konum Bekleniyor"
    case "konum_gecikmis":
      return "Konum Gecikmiş"
    case "oturum_yok":
      return "Oturum Yok"
    default:
      return value || "-"
  }
}

function durumClass(value?: string | null) {
  switch (value) {
    case "aktif":
      return "bg-emerald-100 text-emerald-800 border-emerald-300"
    case "konum_bekleniyor":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "konum_gecikmis":
      return "bg-amber-100 text-amber-800 border-amber-300"
    case "pasif":
      return "bg-slate-100 text-slate-700 border-slate-300"
    case "oturum_yok":
      return "bg-gray-100 text-gray-700 border-gray-300"
    default:
      return "bg-gray-100 text-gray-700 border-gray-300"
  }
}
function pinRenk(value?: string | null) {
  switch (value) {
    case "aktif":
      return "#16a34a"
    case "konum_gecikmis":
      return "#f59e0b"
    case "konum_bekleniyor":
      return "#2563eb"
    case "pasif":
      return "#64748b"
    case "oturum_yok":
      return "#9ca3af"
    default:
      return "#6b7280"
  }
}


function sayisalKoordinat(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function koordinatVar(k: KonumKaydi) {
  return sayisalKoordinat(k.enlem) !== null && sayisalKoordinat(k.boylam) !== null
}

const CanliKonumHaritasi = dynamic(
  async () => {
    const leaflet = await import("leaflet")
    const reactLeaflet = await import("react-leaflet")

    const { MapContainer, TileLayer, CircleMarker, Popup } = reactLeaflet

    function Harita({ kayitlar }: { kayitlar: KonumKaydi[] }) {
      const merkez = kayitlar.find(koordinatVar)
      const merkezEnlem = sayisalKoordinat(merkez?.enlem)
      const merkezBoylam = sayisalKoordinat(merkez?.boylam)

      const center: [number, number] =
        merkezEnlem !== null && merkezBoylam !== null
          ? [merkezEnlem, merkezBoylam]
          : [37.0, 35.321333]

      return (
        <MapContainer center={center} zoom={11} className="h-[420px] w-full rounded-2xl">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {kayitlar.map((k) => {
            const enlem = sayisalKoordinat(k.enlem)
            const boylam = sayisalKoordinat(k.boylam)

            if (enlem === null || boylam === null) return null

            return (
              <CircleMarker
                key={k.personel_id}
                center={[enlem, boylam]}
                radius={k.takip_durumu === "aktif" ? 12 : 9}
                pathOptions={{
                  color: pinRenk(k.takip_durumu),
                  fillColor: pinRenk(k.takip_durumu),
                  fillOpacity: 0.85,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <p className="font-bold">{k.personel_adi || "-"}</p>
                    <p>Kod: {k.personel_kodu || "-"}</p>
                    <p>Takip: {durumEtiketi(k.takip_durumu)}</p>
                    <p>Oturum: {k.oturum_durumu || "-"}</p>
                    <p>Son: {zamanFormat(k.kayit_zamani)}</p>
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
        Harita yükleniyor...
      </div>
    ),
  },
)

export default function CanliKonumPage() {
  const supabase = useMemo(() => createClient(), [])

  const [kayitlar, setKayitlar] = useState<KonumKaydi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [arama, setArama] = useState("")
  const [durumFiltresi, setDurumFiltresi] = useState("tum")

  async function verileriGetir() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("v_personel_son_konum_durumu")
      .select("*")
      .order("siralama_onceligi", { ascending: true })
      .order("personel_adi", { ascending: true })

    if (error) {
      setError(error.message)
      setKayitlar([])
    } else {
      setKayitlar((data || []) as KonumKaydi[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriGetir()

    const intervalId = window.setInterval(() => {
      void verileriGetir()
    }, 30000)

    return () => window.clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR")

    return kayitlar.filter((k) => {
      const ad = String(k.personel_adi || "").toLocaleLowerCase("tr-TR")
      const kod = String(k.personel_kodu || "").toLocaleLowerCase("tr-TR")
      const durumUyar = durumFiltresi === "tum" || k.takip_durumu === durumFiltresi
      const aramaUyar = !q || ad.includes(q) || kod.includes(q)
      return durumUyar && aramaUyar
    })
  }, [kayitlar, arama, durumFiltresi])

  const ozet = useMemo(() => {
    return {
      toplam: kayitlar.length,
      aktif: kayitlar.filter((k) => k.takip_durumu === "aktif").length,
      gecikmis: kayitlar.filter((k) => k.takip_durumu === "konum_gecikmis").length,
      bekleyen: kayitlar.filter((k) => k.takip_durumu === "konum_bekleniyor").length,
      konumlu: kayitlar.filter(koordinatVar).length,
      oturumYok: kayitlar.filter((k) => k.takip_durumu === "oturum_yok").length,
    }
  }, [kayitlar])

  const haritaListesi = useMemo(() => {
    return filtreli.filter(koordinatVar)
  }, [filtreli])

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Canlı Konum Takibi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mesai içindeki personelin son konum, oturum ve takip durumunu gösterir.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void verileriGetir()}
          className="rounded-xl bg-foreground px-4 py-3 text-sm font-black text-background"
        >
          Yenile
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          Konum verisi alınamadı: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi title="Toplam" value={ozet.toplam} />
        <Kpi title="Aktif" value={ozet.aktif} />
        <Kpi title="Gecikmiş" value={ozet.gecikmis} />
        <Kpi title="Bekleyen" value={ozet.bekleyen} />
        <Kpi title="Konum Var" value={ozet.konumlu} />
        <Kpi title="Oturum Yok" value={ozet.oturumYok} />
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground">Personel Ara</label>
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ad, soyad veya kod"
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground">Takip Durumu</label>
          <select
            value={durumFiltresi}
            onChange={(e) => setDurumFiltresi(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="tum">Tümü</option>
            <option value="aktif">Aktif</option>
            <option value="konum_bekleniyor">Konum Bekleniyor</option>
            <option value="konum_gecikmis">Konum Gecikmiş</option>
            <option value="pasif">Pasif</option>
            <option value="oturum_yok">Oturum Yok</option>
          </select>
        </div>

        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-xs font-bold text-muted-foreground">Harita V1</p>
          <p className="mt-1 text-sm font-black">
            Konumu olan kayıt: {haritaListesi.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bir sonraki adımda bu kayıtlar harita üzerine işaretlenecek.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-black">Canlı Harita</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Koordinatı olan personeller harita üzerinde gösterilir. Pin üzerine basınca personel detayı açılır.
        </p>

        <div className="mt-3">
          {haritaListesi.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm font-semibold text-muted-foreground">
              Koordinatlı personel kaydı bulunamadı.
            </div>
          ) : (
            <CanliKonumHaritasi kayitlar={haritaListesi} />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-black">Personel Takip Listesi</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Liste 30 saniyede bir otomatik yenilenir.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left">Personel</th>
                <th className="p-3 text-center">Takip</th>
                <th className="p-3 text-center">Oturum</th>
                <th className="p-3 text-center">Son Konum</th>
                <th className="p-3 text-center">Kayıt Sayısı</th>
                <th className="p-3 text-center">Koordinat</th>
                <th className="p-3 text-center">Kaynak</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtreli.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtreli.map((k) => (
                  <tr key={k.personel_id} className="border-t">
                    <td className="p-3">
                      <p className="font-black">{k.personel_adi || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {k.personel_kodu || "-"} · {k.unvan || k.rol || "-"}
                      </p>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${durumClass(k.takip_durumu)}`}>
                        {durumEtiketi(k.takip_durumu)}
                      </span>
                    </td>
                    <td className="p-3 text-center">{k.oturum_durumu || "-"}</td>
                    <td className="p-3 text-center">{zamanFormat(k.kayit_zamani)}</td>
                    <td className="p-3 text-center">{k.toplam_kayit_sayisi ?? 0}</td>
                    <td className="p-3 text-center">
                      {koordinatVar(k) ? `${k.enlem}, ${k.boylam}` : "-"}
                    </td>
                    <td className="p-3 text-center">{k.kaynak || "-"}</td>
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
