"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Store } from "lucide-react"
import {
  calculateBayiOperasyonDashboard,
  getBayiOperasyonContext,
} from "@/lib/services/bayi-operasyon-service"
import {
  DURUM_ETIKETLERI,
  TALEP_TURU_ETIKETLERI,
  tarihSaat,
} from "@/lib/bayi-operasyon-utils"
import type { BayiOperasyonDashboard } from "@/lib/types/bayi-operasyon"

const bosDashboard: BayiOperasyonDashboard = {
  bekleyenMontaj: 0,
  bekleyenAriza: 0,
  bugunkuRandevu: 0,
  gecikenIs: 0,
  tamamlananIs: 0,
  acilTalep: 0,
  ulasilamayanIs: 0,
  tekrarServis: 0,
  acikTalep: 0,
  bayiSayisi: 0,
  ortalamaPerformans: null,
  ortalamaRisk: null,
  sonTalepler: [],
}

const hizliIslemler = [
  {
    baslik: "Talep Merkezi",
    aciklama: "Montaj, arıza, acil ve diğer talepleri aç",
    link: "/portal/bayi-operasyon-merkezi/talep-merkezi",
    sinif: "bg-blue-700 hover:bg-blue-800",
  },
  {
    baslik: "Talep Listesi",
    aciklama: "Açık ve kapalı tüm talepleri görüntüle",
    link: "/portal/bayi-operasyon-merkezi/talepler",
    sinif: "bg-slate-800 hover:bg-slate-900",
  },
  {
    baslik: "Bayi Listesi",
    aciklama: "Bayi kartları, risk ve performans",
    link: "/portal/bayi-operasyon-merkezi/bayiler",
    sinif: "bg-indigo-700 hover:bg-indigo-800",
  },
  {
    baslik: "Yönetim Paneli",
    aciklama: "Operasyon havuzu ve SLA takibi",
    link: "/portal/bayi-operasyon-merkezi/yonetim",
    sinif: "bg-orange-700 hover:bg-orange-800",
  },
  {
    baslik: "Mesaj Merkezi",
    aciklama: "Talebe bağlı bayi iletişimi",
    link: "/portal/bayi-operasyon-merkezi/mesajlar",
    sinif: "bg-teal-700 hover:bg-teal-800",
  },
  {
    baslik: "SLA Uyarıları",
    aciklama: "Yönetici bildirimleri",
    link: "/portal/bayi-operasyon-merkezi/sla-uyarilari",
    sinif: "bg-red-700 hover:bg-red-800",
  },
  {
    baslik: "WhatsApp Test",
    aciklama: "Faz 2 webhook simülasyonu",
    link: "/portal/bayi-operasyon-merkezi/whatsapp-test",
    sinif: "bg-green-700 hover:bg-green-800",
  },
  {
    baslik: "Ziyaret Merkezi",
    aciklama: "Bayi saha ziyareti kaydı",
    link: "/portal/bayi-operasyon-merkezi/ziyaretler",
    sinif: "bg-violet-700 hover:bg-violet-800",
  },
  {
    baslik: "SMS Test",
    aciklama: "Netgsm / İleti Merkezi / Twilio test",
    link: "/portal/bayi-operasyon-merkezi/sms-test",
    sinif: "bg-indigo-700 hover:bg-indigo-800",
  },
  {
    baslik: "Bilgilendirme",
    aciklama: "WhatsApp/SMS mesaj kuyruğu",
    link: "/portal/bayi-operasyon-merkezi/bilgilendirme",
    sinif: "bg-cyan-700 hover:bg-cyan-800",
  },
]

const yakindaModuller: { baslik: string; aciklama: string }[] = []

export default function BayiOperasyonMerkeziPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [personelAdi, setPersonelAdi] = useState("Personel")
  const [dashboard, setDashboard] = useState<BayiOperasyonDashboard>(bosDashboard)

  const veriYukle = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const ctx = await getBayiOperasyonContext()
    if (!ctx.ok) {
      setHata(ctx.error)
      setDashboard(bosDashboard)
      setLoading(false)
      return
    }

    const ad = `${ctx.data.ad || ""} ${ctx.data.soyad || ""}`.trim()
    setPersonelAdi(ad || "Personel")

    const sonuc = await calculateBayiOperasyonDashboard()
    if (!sonuc.ok) {
      setHata(sonuc.error)
      setDashboard(bosDashboard)
      setLoading(false)
      return
    }

    setDashboard(sonuc.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void veriYukle()
  }, [veriYukle])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <p className="text-base font-bold text-slate-700">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-7xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-700" />
              <h1 className="text-xl font-black text-slate-950 md:text-2xl">
                Bayii Operasyon Merkezi
              </h1>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Bayi mesaj yazmasın, işlem oluştursun
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">Kullanıcı: {personelAdi}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-900">
            Faz 2e: Muhasebe karlılığı, ziyaret AI planı, onaylı AI yanıt + bilgilendirme.
          </p>
        </div>

        {hata && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {hata}
            {hata.includes("bayi_talepleri") || hata.includes("does not exist") ? (
              <p className="mt-2 font-semibold">
                Supabase&apos;de{" "}
                <code className="rounded bg-white px-1">scripts/010_bayi_operasyon_merkezi_v1.sql</code>{" "}
                dosyasını çalıştırın.
              </p>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
          <KpiKart baslik="Bekleyen Montaj" deger={dashboard.bekleyenMontaj} sinif="blue" />
          <KpiKart baslik="Bekleyen Arıza" deger={dashboard.bekleyenAriza} sinif="orange" />
          <KpiKart baslik="Bugünkü Randevu" deger={dashboard.bugunkuRandevu} sinif="indigo" />
          <KpiKart baslik="Geciken İş" deger={dashboard.gecikenIs} sinif="red" />
          <KpiKart baslik="Tamamlanan" deger={dashboard.tamamlananIs} sinif="green" />
          <KpiKart baslik="Acil Talep" deger={dashboard.acilTalep} sinif="red" />
          <KpiKart baslik="Ulaşılamayan" deger={dashboard.ulasilamayanIs} sinif="yellow" />
          <KpiKart baslik="Tekrar Servis" deger={dashboard.tekrarServis} sinif="purple" />
          <KpiKart baslik="Açık Talep" deger={dashboard.acikTalep} sinif="slate" />
          <KpiKart baslik="Aktif Bayi" deger={dashboard.bayiSayisi} sinif="teal" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-800">Ortalama Performans</p>
            <p className="mt-1 text-2xl font-black text-emerald-900">
              {dashboard.ortalamaPerformans === null ? "-" : `${dashboard.ortalamaPerformans}/100`}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4">
            <p className="text-xs font-bold text-orange-800">Ortalama Risk</p>
            <p className="mt-1 text-2xl font-black text-orange-900">
              {dashboard.ortalamaRisk === null ? "-" : `${dashboard.ortalamaRisk}/100`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-black text-slate-950">Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

        {yakindaModuller.length > 0 && (
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-black text-slate-950">Sonraki Fazlar</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {yakindaModuller.map((modul) => (
                <div
                  key={modul.baslik}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5"
                >
                  <p className="text-base font-black text-slate-900">{modul.baslik}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{modul.aciklama}</p>
                  <p className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-700">
                    Faz 2
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Son Talepler</h2>
            <button
              type="button"
              onClick={() => router.push("/portal/bayi-operasyon-merkezi/talepler")}
              className="text-xs font-black text-blue-700"
            >
              Tümünü Gör
            </button>
          </div>

          {dashboard.sonTalepler.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">
              Henüz bayi talebi yok. SQL migration sonrası talepler burada listelenecek.
            </p>
          ) : (
            <div className="space-y-2">
              {dashboard.sonTalepler.map((talep) => (
                <button
                  key={talep.id}
                  type="button"
                  onClick={() => router.push(`/portal/bayi-operasyon-merkezi/talep/${talep.id}`)}
                  className="w-full flex flex-col gap-1 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-900">
                        {TALEP_TURU_ETIKETLERI[talep.talep_turu]}
                      </span>
                      <p className="font-bold text-slate-900">
                        {talep.musteri_adi || talep.talep_no || "Talep"}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      {DURUM_ETIKETLERI[talep.durum]} · {tarihSaat(talep.created_at)}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{talep.telefon || "-"}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function kpiSinifi(tip: string) {
  const siniflar: Record<string, string> = {
    blue: "border-blue-300 bg-blue-50 text-blue-900",
    orange: "border-orange-300 bg-orange-50 text-orange-900",
    indigo: "border-indigo-300 bg-indigo-50 text-indigo-900",
    red: "border-red-300 bg-red-50 text-red-900",
    green: "border-emerald-300 bg-emerald-50 text-emerald-900",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-900",
    purple: "border-purple-300 bg-purple-50 text-purple-900",
    slate: "border-slate-300 bg-slate-50 text-slate-900",
    teal: "border-teal-300 bg-teal-50 text-teal-900",
  }
  return siniflar[tip] || siniflar.slate
}

function KpiKart({
  baslik,
  deger,
  sinif,
}: {
  baslik: string
  deger: number
  sinif: string
}) {
  return (
    <div className={`rounded-2xl border p-3 ${kpiSinifi(sinif)}`}>
      <p className="text-[11px] font-bold opacity-80">{baslik}</p>
      <p className="mt-1 text-xl font-black">{deger}</p>
    </div>
  )
}
