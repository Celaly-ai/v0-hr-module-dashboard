"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DURUM_ETIKETLERI,
  TALEP_TURU_ETIKETLERI,
  operasyonaAktarilabilirTur,
  slaAsildiMi,
  tarihSaat,
} from "@/lib/bayi-operasyon-utils"
import {
  calculateBayiYonetimPaneli,
  updateBayiTalepDurum,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiTalepDurum, BayiYonetimPaneli } from "@/lib/types/bayi-operasyon"

const bosPanel: BayiYonetimPaneli = {
  acikTalep: 0,
  slaAsildi: 0,
  acilBekleyen: 0,
  operasyonBekleyen: 0,
  operasyonAktarilmamis: 0,
  sikayetBekleyen: 0,
  kritikBayi: 0,
  okunmamisSlaUyari: 0,
  talepler: [],
}

const durumButonlari: { durum: BayiTalepDurum; etiket: string; sinif: string }[] = [
  { durum: "inceleniyor", etiket: "İncele", sinif: "bg-slate-700" },
  { durum: "planlandi", etiket: "Planla", sinif: "bg-indigo-700" },
  { durum: "atandi", etiket: "Ata", sinif: "bg-blue-700" },
  { durum: "tamamlandi", etiket: "Tamamla", sinif: "bg-emerald-700" },
  { durum: "kapandi", etiket: "Kapat", sinif: "bg-gray-800" },
]

export default function BayiYonetimPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [panel, setPanel] = useState<BayiYonetimPaneli>(bosPanel)
  const [guncelleniyorId, setGuncelleniyorId] = useState("")
  const [aktariliyorId, setAktariliyorId] = useState("")
  const [senkronizeEdiliyor, setSenkronizeEdiliyor] = useState(false)

  const yukle = useCallback(async () => {
    setLoading(true)
    setHata(null)
    const sonuc = await calculateBayiYonetimPaneli()
    if (!sonuc.ok) {
      setHata(sonuc.error)
      setPanel(bosPanel)
    } else {
      setPanel(sonuc.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void yukle()
  }, [yukle])

  async function operasyonaAktar(talepId: string) {
    setAktariliyorId(talepId)
    setHata(null)

    try {
      const response = await fetch("/api/bayi-operasyon/operasyon-havuzuna-aktar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talep_id: talepId }),
      })
      const data = await response.json()

      if (!data.success) {
        setHata(data.error || "Operasyon aktarımı başarısız.")
        setAktariliyorId("")
        return
      }

      if (data.data?.havuz_hatasi) {
        setHata(`Kuyruk oluşturuldu ancak havuz hatası: ${data.data.havuz_hatasi}`)
      }
    } catch {
      setHata("Operasyon aktarımı sırasında bağlantı hatası.")
    }

    setAktariliyorId("")
    await yukle()
  }

  async function operasyonSenkronizeEt() {
    setSenkronizeEdiliyor(true)
    setHata(null)

    try {
      const response = await fetch("/api/bayi-operasyon/operasyon-senkron", { method: "POST" })
      const data = await response.json()

      if (!data.success) {
        setHata(data.error || "Senkronizasyon başarısız.")
      }
    } catch {
      setHata("Senkronizasyon sırasında bağlantı hatası.")
    }

    setSenkronizeEdiliyor(false)
    await yukle()
  }

  async function durumGuncelle(talepId: string, durum: BayiTalepDurum) {
    setGuncelleniyorId(talepId)
    const sonuc = await updateBayiTalepDurum(talepId, durum)
    setGuncelleniyorId("")
    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }
    await yukle()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="font-bold text-slate-700">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-6xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-950">Yönetim Paneli</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Operasyon havuzu, SLA ve açık talepler
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/sla-uyarilari")}
            className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white"
          >
            SLA ({panel.okunmamisSlaUyari})
          </button>
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/bilgilendirme")}
            className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white"
          >
            Bilgilendirme
          </button>
          <button
            type="button"
            disabled={senkronizeEdiliyor}
            onClick={() => void operasyonSenkronizeEt()}
            className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {senkronizeEdiliyor ? "..." : "Operasyon Sync"}
          </button>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
          <Kpi baslik="Açık Talep" deger={panel.acikTalep} sinif="blue" />
          <Kpi baslik="SLA Aşıldı" deger={panel.slaAsildi} sinif="red" />
          <Kpi baslik="SLA Uyarı" deger={panel.okunmamisSlaUyari} sinif="red" />
          <Kpi baslik="Havuz Bekleyen" deger={panel.operasyonAktarilmamis} sinif="teal" />
          <Kpi baslik="Acil Bekleyen" deger={panel.acilBekleyen} sinif="orange" />
          <Kpi baslik="Operasyon" deger={panel.operasyonBekleyen} sinif="indigo" />
          <Kpi baslik="Şikayet" deger={panel.sikayetBekleyen} sinif="yellow" />
          <Kpi baslik="Riskli Bayi" deger={panel.kritikBayi} sinif="purple" />
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-base font-black">Operasyon Havuzu</h2>

          {panel.talepler.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">Açık talep yok.</p>
          ) : (
            panel.talepler.map((talep) => {
              const slaGecti = slaAsildiMi(talep) || talep.sla_asildi_mi
              return (
                <div
                  key={talep.id}
                  className={`rounded-xl border p-3 space-y-3 ${
                    slaGecti ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-900">
                          {TALEP_TURU_ETIKETLERI[talep.talep_turu]}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                          {DURUM_ETIKETLERI[talep.durum]}
                        </span>
                        {slaGecti && (
                          <span className="rounded bg-red-200 px-2 py-0.5 text-xs font-black text-red-900">
                            SLA Aşıldı
                          </span>
                        )}
                        {talep.operasyon_aktarildi_mi && talep.operasyon_fis_no && (
                          <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-black text-teal-900">
                            Havuz: {talep.operasyon_fis_no}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-bold text-slate-900">
                        {talep.musteri_adi || talep.talep_no || "Talep"}
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        {talep.talep_no} · {talep.telefon || "-"} · {tarihSaat(talep.created_at)}
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        Departman: {talep.sorumlu_departman || "operasyon"} · SLA:{" "}
                        {talep.sla_hedef_dk ? `${talep.sla_hedef_dk} dk` : "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/portal/bayi-operasyon-merkezi/talep/${talep.id}`)}
                      className="shrink-0 text-xs font-black text-blue-700"
                    >
                      Detay
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {operasyonaAktarilabilirTur(talep.talep_turu) &&
                      !talep.operasyon_aktarildi_mi && (
                        <button
                          type="button"
                          disabled={aktariliyorId === talep.id}
                          onClick={() => void operasyonaAktar(talep.id)}
                          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
                        >
                          {aktariliyorId === talep.id ? "..." : "Operasyona Aktar"}
                        </button>
                      )}
                    {durumButonlari.map((btn) => (
                      <button
                        key={btn.durum}
                        type="button"
                        disabled={guncelleniyorId === talep.id || talep.durum === btn.durum}
                        onClick={() => void durumGuncelle(talep.id, btn.durum)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-black text-white disabled:opacity-40 ${btn.sinif}`}
                      >
                        {guncelleniyorId === talep.id ? "..." : btn.etiket}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function kpiSinifi(tip: string) {
  const siniflar: Record<string, string> = {
    blue: "border-blue-300 bg-blue-50 text-blue-900",
    red: "border-red-300 bg-red-50 text-red-900",
    orange: "border-orange-300 bg-orange-50 text-orange-900",
    indigo: "border-indigo-300 bg-indigo-50 text-indigo-900",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-900",
    purple: "border-purple-300 bg-purple-50 text-purple-900",
    teal: "border-teal-300 bg-teal-50 text-teal-900",
  }
  return siniflar[tip] || siniflar.blue
}

function Kpi({ baslik, deger, sinif }: { baslik: string; deger: number; sinif: string }) {
  return (
    <div className={`rounded-2xl border p-3 ${kpiSinifi(sinif)}`}>
      <p className="text-[11px] font-bold opacity-80">{baslik}</p>
      <p className="mt-1 text-xl font-black">{deger}</p>
    </div>
  )
}
