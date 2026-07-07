"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DURUM_ETIKETLERI,
  TALEP_TURU_ETIKETLERI,
  tarihSaat,
} from "@/lib/bayi-operasyon-utils"
import { listBayiTalepleri } from "@/lib/services/bayi-operasyon-service"
import type { BayiTalep, BayiTalepTuru } from "@/lib/types/bayi-operasyon"

const inputSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
const selectSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm font-bold text-slate-900"
const labelSinifi = "mb-1 block text-xs font-bold text-slate-700"

export default function BayiTaleplerPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [talepler, setTalepler] = useState<BayiTalep[]>([])
  const [filtre, setFiltre] = useState({
    durum: "",
    talep_turu: "",
    oncelik: "",
    arama: "",
  })

  const yukle = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const sonuc = await listBayiTalepleri({
      durum: filtre.durum || undefined,
      talep_turu: filtre.talep_turu || undefined,
      oncelik: filtre.oncelik || undefined,
      arama: filtre.arama || undefined,
    })

    if (!sonuc.ok) {
      setHata(sonuc.error)
      setTalepler([])
      setLoading(false)
      return
    }

    setTalepler(sonuc.data)
    setLoading(false)
  }, [filtre])

  useEffect(() => {
    void yukle()
  }, [yukle])

  const ozet = useMemo(() => {
    const acik = talepler.filter((t) =>
      ["alindi", "inceleniyor", "planlandi", "atandi", "yolda", "ulasilamadi"].includes(t.durum)
    ).length
    return { toplam: talepler.length, acik }
  }, [talepler])

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-5xl px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-950">Talep Listesi</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {ozet.toplam} kayıt · {ozet.acik} açık talep
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelSinifi} htmlFor="arama">
                Arama
              </label>
              <input
                id="arama"
                value={filtre.arama}
                onChange={(e) => setFiltre((f) => ({ ...f, arama: e.target.value }))}
                className={inputSinifi}
                placeholder="Müşteri, telefon, talep no..."
              />
            </div>
            <div>
              <label className={labelSinifi} htmlFor="durum">
                Durum
              </label>
              <select
                id="durum"
                value={filtre.durum}
                onChange={(e) => setFiltre((f) => ({ ...f, durum: e.target.value }))}
                className={selectSinifi}
              >
                <option value="">Tümü</option>
                {Object.entries(DURUM_ETIKETLERI).map(([kod, etiket]) => (
                  <option key={kod} value={kod}>
                    {etiket}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelSinifi} htmlFor="talep_turu">
                Talep Türü
              </label>
              <select
                id="talep_turu"
                value={filtre.talep_turu}
                onChange={(e) => setFiltre((f) => ({ ...f, talep_turu: e.target.value }))}
                className={selectSinifi}
              >
                <option value="">Tümü</option>
                {(Object.keys(TALEP_TURU_ETIKETLERI) as BayiTalepTuru[]).map((tur) => (
                  <option key={tur} value={tur}>
                    {TALEP_TURU_ETIKETLERI[tur]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelSinifi} htmlFor="oncelik">
                Öncelik
              </label>
              <select
                id="oncelik"
                value={filtre.oncelik}
                onChange={(e) => setFiltre((f) => ({ ...f, oncelik: e.target.value }))}
                className={selectSinifi}
              >
                <option value="">Tümü</option>
                <option value="normal">Normal</option>
                <option value="acil">Acil</option>
                <option value="kritik">Kritik</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/talep-merkezi")}
            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
          >
            + Yeni Talep Oluştur
          </button>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          {loading ? (
            <p className="text-sm font-semibold text-slate-600">Yükleniyor...</p>
          ) : talepler.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">Kayıt bulunamadı.</p>
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
                  {talep.oncelik !== "normal" && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-black text-red-800">
                      {talep.oncelik}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-bold text-slate-900">
                  {talep.musteri_adi || talep.talep_no || "Talep"}
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  {talep.talep_no || "-"} · {talep.telefon || "-"} · {tarihSaat(talep.created_at)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
