"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type SonHareket = {
  id: string
  tur: string | null
  hareket_tipi: string | null
  tutar: number | null
  kategori_ad: string | null
  aciklama: string | null
  created_at: string | null
}

type SonFatura = {
  id: string
  fatura_no: string | null
  fatura_tipi: string
  toplam_tutar: number | null
  kalan_tutar: number | null
  durum: string
  created_at: string | null
}

type DashboardState = {
  gelir: number
  gider: number
  tahsilat: number
  odeme: number
  netDurum: number
  acikFatura: number
  cariSayisi: number
  kasaBankaSayisi: number
  sonHareketler: SonHareket[]
  sonFaturalar: SonFatura[]
}

const hizliIslemler = [
  {
    baslik: "Gelir / Gider Ekle",
    aciklama: "Manuel gelir ve gider kaydı oluştur",
    link: "/portal/muhasebe/ekle",
    sinif: "bg-blue-700 hover:bg-blue-800",
  },
  {
    baslik: "Tüm Hareketler",
    aciklama: "Tüm muhasebe hareketlerini görüntüle",
    link: "/portal/muhasebe/hareketler",
    sinif: "bg-gray-800 hover:bg-gray-900",
  },
  {
    baslik: "Cari Kartlar",
    aciklama: "Müşteri, tedarikçi ve cari hesaplar",
    link: "/portal/muhasebe/cariler",
    sinif: "bg-indigo-700 hover:bg-indigo-800",
  },
  {
    baslik: "Kasa / Banka",
    aciklama: "Nakit, banka ve POS hesapları",
    link: "/portal/muhasebe/kasa-banka",
    sinif: "bg-teal-700 hover:bg-teal-800",
  },
  {
    baslik: "Fatura Merkezi",
    aciklama: "Manuel fatura kayıtları ve belgeler",
    link: "/portal/muhasebe/faturalar",
    sinif: "bg-orange-700 hover:bg-orange-800",
  },
  {
    baslik: "Tahsilat / Ödeme",
    aciklama: "Cari ve kasa bağlantılı para hareketleri",
    link: "/portal/muhasebe/tahsilat-odeme",
    sinif: "bg-emerald-700 hover:bg-emerald-800",
  },
]

const bosDashboard: DashboardState = {
  gelir: 0,
  gider: 0,
  tahsilat: 0,
  odeme: 0,
  netDurum: 0,
  acikFatura: 0,
  cariSayisi: 0,
  kasaBankaSayisi: 0,
  sonHareketler: [],
  sonFaturalar: [],
}

function turEsles(
  tur: string | null | undefined,
  hareketTipi: string | null | undefined,
  hedef: string
) {
  return tur === hedef || hareketTipi === hedef
}

function para(value: number) {
  return Number(value || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  })
}

function faturaTipiEtiketi(tip: string) {
  const etiketler: Record<string, string> = {
    satis: "Satış",
    alis: "Alış",
    gider: "Gider",
    iade: "İade",
    proforma: "Proforma",
  }
  return etiketler[tip] || tip
}

function faturaDurumEtiketi(durum: string) {
  const etiketler: Record<string, string> = {
    bekliyor: "Bekliyor",
    kismi_odendi: "Kısmi Ödendi",
    odendi: "Ödendi",
    iptal: "İptal",
  }
  return etiketler[durum] || durum
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MuhasebePage() {
  const router = useRouter()

  const [dashboard, setDashboard] = useState<DashboardState>(bosDashboard)
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    veriYukle()
  }, [])

  async function sirketIdAl(supabase: ReturnType<typeof createClient>) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: personel } = await supabase
      .from("personeller")
      .select("sirket_id")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    return personel?.sirket_id ?? null
  }

  async function veriYukle() {
    setLoading(true)
    setHata(null)

    const supabase = createClient()
    const sirketId = await sirketIdAl(supabase)

    const hareketSorgu = supabase
      .from("muhasebe_hareketleri")
      .select("tur, hareket_tipi, tutar")

    const sonHareketSorgu = supabase
      .from("muhasebe_hareketleri")
      .select("id, tur, hareket_tipi, tutar, kategori_ad, aciklama, created_at")
      .order("created_at", { ascending: false })
      .limit(8)

    const faturaSorgu = supabase.from("muhasebe_faturalar").select("id, durum")

    const sonFaturaSorgu = supabase
      .from("muhasebe_faturalar")
      .select("id, fatura_no, fatura_tipi, toplam_tutar, kalan_tutar, durum, created_at")
      .order("created_at", { ascending: false })
      .limit(8)

    const cariSorgu = supabase
      .from("muhasebe_cariler")
      .select("id", { count: "exact", head: true })
      .eq("durum", "aktif")

    const kasaBankaSorgu = supabase
      .from("muhasebe_kasa_banka")
      .select("id", { count: "exact", head: true })
      .eq("durum", "aktif")

    if (sirketId) {
      hareketSorgu.eq("sirket_id", sirketId)
      sonHareketSorgu.eq("sirket_id", sirketId)
      faturaSorgu.eq("sirket_id", sirketId)
      sonFaturaSorgu.eq("sirket_id", sirketId)
      cariSorgu.eq("sirket_id", sirketId)
      kasaBankaSorgu.eq("sirket_id", sirketId)
    }

    const [
      { data: hareketData, error: hareketError },
      { data: sonHareketData, error: sonHareketError },
      { data: faturaData, error: faturaError },
      { data: sonFaturaData, error: sonFaturaError },
      { count: cariSayisi, error: cariError },
      { count: kasaBankaSayisi, error: kasaError },
    ] = await Promise.all([
      hareketSorgu,
      sonHareketSorgu,
      faturaSorgu,
      sonFaturaSorgu,
      cariSorgu,
      kasaBankaSorgu,
    ])

    const ilkHata =
      hareketError ||
      sonHareketError ||
      faturaError ||
      sonFaturaError ||
      cariError ||
      kasaError

    if (ilkHata) {
      setHata("Veriler alınamadı: " + ilkHata.message)
      setDashboard(bosDashboard)
      setLoading(false)
      return
    }

    let gelir = 0
    let gider = 0
    let tahsilat = 0
    let odeme = 0

    ;(hareketData || []).forEach((item) => {
      const tutar = Number(item.tutar || 0)
      if (turEsles(item.tur, item.hareket_tipi, "gelir")) gelir += tutar
      if (turEsles(item.tur, item.hareket_tipi, "gider")) gider += tutar
      if (turEsles(item.tur, item.hareket_tipi, "tahsilat")) tahsilat += tutar
      if (turEsles(item.tur, item.hareket_tipi, "odeme")) odeme += tutar
    })

    const acikFatura = (faturaData || []).filter(
      (f) => f.durum === "bekliyor" || f.durum === "kismi_odendi"
    ).length

    setDashboard({
      gelir,
      gider,
      tahsilat,
      odeme,
      netDurum: gelir + tahsilat - gider - odeme,
      acikFatura,
      cariSayisi: cariSayisi || 0,
      kasaBankaSayisi: kasaBankaSayisi || 0,
      sonHareketler: (sonHareketData || []) as SonHareket[],
      sonFaturalar: (sonFaturaData || []) as SonFatura[],
    })
    setLoading(false)
  }

  function hareketEtiketi(h: SonHareket) {
    const tip = h.tur || h.hareket_tipi || "-"
    const etiketler: Record<string, string> = {
      gelir: "Gelir",
      gider: "Gider",
      tahsilat: "Tahsilat",
      odeme: "Ödeme",
    }
    return etiketler[tip] || tip
  }

  function hareketRenk(tur: string | null, hareketTipi?: string | null) {
    const tip = tur || hareketTipi || ""
    if (tip === "gelir" || tip === "tahsilat") return "text-green-700"
    if (tip === "gider" || tip === "odeme") return "text-red-700"
    return "text-gray-900"
  }

  function hareketIsaret(tur: string | null, hareketTipi?: string | null) {
    const tip = tur || hareketTipi || ""
    if (tip === "gelir" || tip === "tahsilat") return "+"
    if (tip === "gider" || tip === "odeme") return "-"
    return ""
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="font-bold text-gray-800">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold text-gray-900"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-black text-gray-900">Muhasebe Kontrol Merkezi</h1>
          <p className="text-xs font-semibold text-gray-700">
            Gelir, gider, cari, fatura ve nakit akışı özeti
          </p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {hata && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-green-300 bg-green-50 p-3">
            <p className="text-xs font-bold text-green-800">Toplam Gelir</p>
            <p className="text-sm font-black text-green-900">{para(dashboard.gelir)}</p>
          </div>

          <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
            <p className="text-xs font-bold text-red-800">Toplam Gider</p>
            <p className="text-sm font-black text-red-900">{para(dashboard.gider)}</p>
          </div>

          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-800">Net Durum</p>
            <p className="text-sm font-black text-blue-900">{para(dashboard.netDurum)}</p>
          </div>

          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3">
            <p className="text-xs font-bold text-emerald-800">Toplam Tahsilat</p>
            <p className="text-sm font-black text-emerald-900">{para(dashboard.tahsilat)}</p>
          </div>

          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-3">
            <p className="text-xs font-bold text-orange-800">Toplam Ödeme</p>
            <p className="text-sm font-black text-orange-900">{para(dashboard.odeme)}</p>
          </div>

          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-3">
            <p className="text-xs font-bold text-yellow-800">Açık Fatura</p>
            <p className="text-xl font-black text-yellow-900">{dashboard.acikFatura}</p>
          </div>

          <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-3">
            <p className="text-xs font-bold text-indigo-800">Cari Sayısı</p>
            <p className="text-xl font-black text-indigo-900">{dashboard.cariSayisi}</p>
          </div>

          <div className="rounded-2xl border border-teal-300 bg-teal-50 p-3">
            <p className="text-xs font-bold text-teal-800">Kasa/Banka Sayısı</p>
            <p className="text-xl font-black text-teal-900">{dashboard.kasaBankaSayisi}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-black text-gray-900">Hızlı İşlemler</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hizliIslemler.map((islem) => (
              <button
                key={islem.link}
                type="button"
                onClick={() => router.push(islem.link)}
                className={`rounded-xl px-4 py-5 text-left text-white shadow-sm transition ${islem.sinif}`}
              >
                <p className="text-base font-black">{islem.baslik}</p>
                <p className="mt-1 text-xs font-semibold text-white/90">{islem.aciklama}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-300 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Son Hareketler</h2>
            <button
              type="button"
              onClick={() => router.push("/portal/muhasebe/hareketler")}
              className="text-xs font-black text-blue-700"
            >
              Tümünü Gör
            </button>
          </div>

          {dashboard.sonHareketler.length === 0 ? (
            <p className="text-sm font-semibold text-gray-600">Henüz kayıt yok.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.sonHareketler.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {hareketEtiketi(h)}
                      {h.kategori_ad ? ` · ${h.kategori_ad}` : ""}
                    </p>
                    <p className="text-xs font-semibold text-gray-600 truncate">
                      {h.aciklama || "-"} · {tarihSaat(h.created_at)}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 font-black ${hareketRenk(h.tur, h.hareket_tipi)}`}
                  >
                    {hareketIsaret(h.tur, h.hareket_tipi)}{" "}
                    {para(Number(h.tutar || 0))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-gray-300 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Son Faturalar</h2>
            <button
              type="button"
              onClick={() => router.push("/portal/muhasebe/faturalar")}
              className="text-xs font-black text-blue-700"
            >
              Tümünü Gör
            </button>
          </div>

          {dashboard.sonFaturalar.length === 0 ? (
            <p className="text-sm font-semibold text-gray-600">Henüz fatura kaydı yok.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.sonFaturalar.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-900">
                        {faturaTipiEtiketi(f.fatura_tipi)}
                      </span>
                      <p className="font-bold text-gray-900 truncate">
                        {f.fatura_no || "-"}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-gray-600">
                      {faturaDurumEtiketi(f.durum)} · Kalan:{" "}
                      {para(Number(f.kalan_tutar || 0))} · {tarihSaat(f.created_at)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-black text-gray-900">
                      {para(Number(f.toplam_tutar || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
