"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DURUM_ETIKETLERI,
  TALEP_TURU_ETIKETLERI,
  slaUyariEtiketi,
  tarihSaat,
} from "@/lib/bayi-operasyon-utils"
import {
  listBayiSlaUyarilari,
  okunduBayiSlaUyari,
  senkronizeBayiSlaUyarilari,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiSlaUyariOzet } from "@/lib/types/bayi-operasyon"

export default function BayiSlaUyarilariPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [uyarilar, setUyarilar] = useState<BayiSlaUyariOzet[]>([])
  const [sadeceOkunmamis, setSadeceOkunmamis] = useState(true)
  const [senkronizeEdiliyor, setSenkronizeEdiliyor] = useState(false)

  const yukle = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const sonuc = await listBayiSlaUyarilari(sadeceOkunmamis)
    if (!sonuc.ok) {
      setHata(sonuc.error)
      setUyarilar([])
    } else {
      setUyarilar(sonuc.data)
    }

    setLoading(false)
  }, [sadeceOkunmamis])

  useEffect(() => {
    void yukle()
  }, [yukle])

  async function senkronizeEt() {
    setSenkronizeEdiliyor(true)
    const sonuc = await senkronizeBayiSlaUyarilari()
    setSenkronizeEdiliyor(false)
    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }
    await yukle()
  }

  async function okunduIsaretle(uyariId: string) {
    const sonuc = await okunduBayiSlaUyari(uyariId)
    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }
    setUyarilar((onceki) => onceki.filter((u) => u.id !== uyariId))
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-4xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/yonetim")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-950">SLA Uyarıları</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Yönetici bildirimleri — SLA aşımı ve acil talepler
            </p>
          </div>
          <button
            type="button"
            disabled={senkronizeEdiliyor}
            onClick={() => void senkronizeEt()}
            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {senkronizeEdiliyor ? "..." : "Senkronize Et"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSadeceOkunmamis(true)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              sadeceOkunmamis ? "bg-red-700 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            Okunmamış
          </button>
          <button
            type="button"
            onClick={() => setSadeceOkunmamis(false)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              !sadeceOkunmamis ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            Tümü
          </button>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm font-bold text-slate-600">Yükleniyor...</p>
        ) : uyarilar.length === 0 ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-600">Uyarı bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uyarilar.map((uyari) => (
              <div
                key={uyari.id}
                className={`rounded-2xl border p-4 ${
                  uyari.okundu_mi
                    ? "border-slate-200 bg-slate-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-red-200 px-2 py-0.5 text-xs font-black text-red-900">
                    {slaUyariEtiketi(uyari.uyari_tipi)}
                  </span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-900">
                    {TALEP_TURU_ETIKETLERI[uyari.talep.talep_turu]}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {DURUM_ETIKETLERI[uyari.talep.durum]}
                  </span>
                </div>
                <p className="mt-2 font-bold text-slate-900">{uyari.mesaj}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {uyari.talep.talep_no || "-"} · {uyari.talep.musteri_adi || "-"} ·{" "}
                  {tarihSaat(uyari.created_at)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/portal/bayi-operasyon-merkezi/talep/${uyari.talep.id}`)
                    }
                    className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-black text-white"
                  >
                    Talep Detayı
                  </button>
                  {!uyari.okundu_mi && (
                    <button
                      type="button"
                      onClick={() => void okunduIsaretle(uyari.id)}
                      className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-black text-white"
                    >
                      Okundu
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
