"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DURUM_ETIKETLERI,
  TALEP_TURU_ETIKETLERI,
  riskSeviyesiEtiketi,
  riskSeviyesiSinifi,
  tarihSaat,
} from "@/lib/bayi-operasyon-utils"
import {
  getBayiKart,
  getBayiRiskAnalizi,
  guncelleBayiSkorlari,
  listBayiTalepleri,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiKart, BayiTalep } from "@/lib/types/bayi-operasyon"
import type { BayiMetricsAnaliz } from "@/lib/bayi-risk-analiz"

function deger(value?: string | null) {
  if (!value?.trim()) return "-"
  return value
}

export default function BayiKartDetayPage() {
  const router = useRouter()
  const params = useParams()

  const bayiId = useMemo(() => {
    const value = params?.id
    return Array.isArray(value) ? value[0] || "" : String(value || "")
  }, [params])

  const [loading, setLoading] = useState(true)
  const [guncelleniyor, setGuncelleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [bayi, setBayi] = useState<BayiKart | null>(null)
  const [talepler, setTalepler] = useState<BayiTalep[]>([])
  const [analiz, setAnaliz] = useState<BayiMetricsAnaliz | null>(null)

  const yukle = useCallback(async () => {
    if (!bayiId) {
      setHata("Geçersiz bayi bağlantısı.")
      setLoading(false)
      return
    }

    setLoading(true)
    setHata(null)

    const [bayiSonuc, talepSonuc, analizSonuc] = await Promise.all([
      getBayiKart(bayiId),
      listBayiTalepleri({ bayi_kart_id: bayiId }),
      getBayiRiskAnalizi(bayiId),
    ])

    if (!bayiSonuc.ok) {
      setHata(bayiSonuc.error)
      setBayi(null)
      setTalepler([])
      setLoading(false)
      return
    }

    setBayi(bayiSonuc.data)
    setTalepler(talepSonuc.ok ? talepSonuc.data : [])
    setAnaliz(analizSonuc.ok ? analizSonuc.data : null)
    setLoading(false)
  }, [bayiId])

  useEffect(() => {
    void yukle()
  }, [yukle])

  async function skorlariGuncelle() {
    if (!bayiId) return
    setGuncelleniyor(true)
    setMesaj(null)
    const sonuc = await guncelleBayiSkorlari(bayiId)
    setGuncelleniyor(false)
    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }
    setBayi(sonuc.data)
    setMesaj("Risk, karlılık ve performans skorları güncellendi.")
    await yukle()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="font-bold text-slate-700">Yükleniyor...</p>
      </div>
    )
  }

  if (hata || !bayi) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/portal/bayi-operasyon-merkezi/bayiler")}
          className="text-2xl font-bold"
        >
          ←
        </button>
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
          {hata || "Bayi bulunamadı."}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-4xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/bayiler")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-950">{bayi.bayi_adi}</h1>
              <span
                className={`rounded px-2 py-0.5 text-xs font-black border ${riskSeviyesiSinifi(bayi.risk_seviyesi || "dusuk")}`}
              >
                {riskSeviyesiEtiketi(bayi.risk_seviyesi || "dusuk")}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">Bayi CRM Kartı</p>
          </div>
        </div>

        {mesaj && (
          <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-sm font-bold text-green-900">
            {mesaj}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3">
            <p className="text-xs font-bold text-emerald-800">Performans</p>
            <p className="text-xl font-black text-emerald-900">{bayi.performans_puani ?? 0}/100</p>
          </div>
          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-3">
            <p className="text-xs font-bold text-orange-800">Risk</p>
            <p className="text-xl font-black text-orange-900">{bayi.risk_skoru ?? 0}/100</p>
          </div>
          <div className="rounded-2xl border border-teal-300 bg-teal-50 p-3">
            <p className="text-xs font-bold text-teal-800">Karlılık</p>
            <p className="text-xl font-black text-teal-900">
              {bayi.karlilik_skoru ?? analiz?.karlilik_skoru ?? 0}/100
            </p>
          </div>
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-800">Sadakat</p>
            <p className="text-xl font-black text-blue-900">{bayi.sadakat_skoru ?? 0}/100</p>
          </div>
          <div className="rounded-2xl border border-purple-300 bg-purple-50 p-3">
            <p className="text-xs font-bold text-purple-800">30 Gün İş</p>
            <p className="text-xl font-black text-purple-900">{bayi.aylik_is_hacmi ?? 0}</p>
          </div>
        </div>

        {analiz && (
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-950">Risk & Karlılık Analizi</h2>
            <p className="text-sm font-semibold text-slate-700">{analiz.karlilik_notu}</p>

            {analiz.risk_faktorleri.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700">Risk Faktörleri</p>
                {analiz.risk_faktorleri.map((f) => (
                  <div
                    key={f.kod}
                    className="flex items-start justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-black text-orange-950">{f.etiket}</p>
                      <p className="text-xs font-semibold text-orange-800">{f.aciklama}</p>
                    </div>
                    <span className="text-sm font-black text-orange-900">+{f.puan}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-emerald-700">Aktif risk faktörü yok.</p>
            )}

            {analiz.muhasebe?.cari_bagli && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 space-y-2">
                <p className="text-xs font-black text-teal-900">Muhasebe Karlılığı (30 gün)</p>
                <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-teal-950 sm:grid-cols-3">
                  <p>Gelir: {analiz.muhasebe.gelir_30.toLocaleString("tr-TR")} ₺</p>
                  <p>Gider: {analiz.muhasebe.gider_30.toLocaleString("tr-TR")} ₺</p>
                  <p>Net: {analiz.muhasebe.net_30.toLocaleString("tr-TR")} ₺</p>
                  <p>Tahsilat: {analiz.muhasebe.tahsilat_30.toLocaleString("tr-TR")} ₺</p>
                  <p>Açık fatura: {analiz.muhasebe.acik_fatura_tutar.toLocaleString("tr-TR")} ₺</p>
                  <p>Skor: {analiz.muhasebe.karlilik_skoru}/100</p>
                </div>
                <p className="text-xs font-semibold text-teal-800">{analiz.muhasebe.not}</p>
              </div>
            )}

            {!analiz.muhasebe?.cari_bagli && (
              <p className="text-xs font-semibold text-slate-600">
                Muhasebe karlılığı için bayi kartını muhasebe carisine bağlayın.
              </p>
            )}

            <div className="space-y-1">
              <p className="text-xs font-black text-slate-700">Önerilen Aksiyonlar</p>
              {analiz.onerilen_aksiyonlar.map((a) => (
                <p key={a} className="text-sm font-semibold text-slate-800">
                  · {a}
                </p>
              ))}
            </div>

            <button
              type="button"
              disabled={guncelleniyor}
              onClick={() => void skorlariGuncelle()}
              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {guncelleniyor ? "Güncelleniyor..." : "Skorları Yenile"}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-2">
          <h2 className="text-base font-black">İletişim</h2>
          <div className="grid grid-cols-1 gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
            <p>Yetkili: {deger(bayi.yetkili_kisi)}</p>
            <p>Telefon: {deger(bayi.telefon)}</p>
            <p>WhatsApp: {deger(bayi.whatsapp)}</p>
            <p>E-posta: {deger(bayi.email)}</p>
            <p className="sm:col-span-2">Mağaza: {deger(bayi.magaza_adresi)}</p>
            <p className="sm:col-span-2">Depo: {deger(bayi.depo_adresi)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black">Bayi Talepleri</h2>
            <button
              type="button"
              onClick={() => router.push("/portal/bayi-operasyon-merkezi/talep-merkezi")}
              className="text-xs font-black text-blue-700"
            >
              + Yeni Talep
            </button>
          </div>

          {talepler.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">Bu bayiye bağlı talep yok.</p>
          ) : (
            talepler.map((talep) => (
              <button
                key={talep.id}
                type="button"
                onClick={() => router.push(`/portal/bayi-operasyon-merkezi/talep/${talep.id}`)}
                className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-900">
                    {TALEP_TURU_ETIKETLERI[talep.talep_turu]}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                    {DURUM_ETIKETLERI[talep.durum]}
                  </span>
                </div>
                <p className="mt-1 font-bold text-slate-900">
                  {talep.musteri_adi || talep.talep_no || "Talep"}
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  {tarihSaat(talep.created_at)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
