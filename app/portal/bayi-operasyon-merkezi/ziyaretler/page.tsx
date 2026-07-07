"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  ZIYARET_TIPI_ETIKETLERI,
  riskSeviyesiEtiketi,
  riskSeviyesiSinifi,
  tarihSaat,
} from "@/lib/bayi-operasyon-utils"
import {
  calculateBayiZiyaretMerkezi,
  createBayiZiyaret,
  listBayiKartlari,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiKart, BayiZiyaretAiPlan, BayiZiyaretMerkeziOzet, BayiZiyaretTipi } from "@/lib/types/bayi-operasyon"

const bosOzet: BayiZiyaretMerkeziOzet = {
  ziyaret_bekleyen: 0,
  bu_ay_ziyaret: 0,
  son_ziyaretler: [],
  ziyaret_bekleyen_bayiler: [],
}

export default function BayiZiyaretMerkeziPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [ozet, setOzet] = useState<BayiZiyaretMerkeziOzet>(bosOzet)
  const [bayiler, setBayiler] = useState<BayiKart[]>([])
  const [form, setForm] = useState({
    bayi_kart_id: "",
    ziyaret_tarihi: new Date().toISOString().slice(0, 10),
    ziyaret_tipi: "saha" as BayiZiyaretTipi,
    notlar: "",
  })
  const [aiPlan, setAiPlan] = useState<BayiZiyaretAiPlan | null>(null)
  const [aiPlanBayiId, setAiPlanBayiId] = useState("")
  const [aiYukleniyor, setAiYukleniyor] = useState(false)

  const yukle = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const [ozetSonuc, bayiSonuc] = await Promise.all([
      calculateBayiZiyaretMerkezi(),
      listBayiKartlari(),
    ])

    if (!ozetSonuc.ok) {
      setHata(ozetSonuc.error)
      setOzet(bosOzet)
    } else {
      setOzet(ozetSonuc.data)
    }

    setBayiler(bayiSonuc.ok ? bayiSonuc.data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void yukle()
  }, [yukle])

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    setKaydediliyor(true)
    setHata(null)
    setMesaj(null)

    const sonuc = await createBayiZiyaret(form)
    setKaydediliyor(false)

    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }

    setMesaj("Ziyaret kaydedildi ve bayi skorları güncellendi.")
    setForm((f) => ({ ...f, notlar: "" }))
    await yukle()
  }

  async function ziyaretPlaniUret(bayiKartId: string) {
    setAiPlanBayiId(bayiKartId)
    setAiYukleniyor(true)
    setAiPlan(null)
    setForm((f) => ({ ...f, bayi_kart_id: bayiKartId }))

    try {
      const response = await fetch("/api/bayi-operasyon/ziyaret-ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bayi_kart_id: bayiKartId }),
      })
      const data = await response.json()
      if (data.success) setAiPlan(data.data as BayiZiyaretAiPlan)
      else setHata(data.error || "AI plan üretilemedi.")
    } catch {
      setHata("AI plan sırasında bağlantı hatası.")
    }

    setAiYukleniyor(false)
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
            <h1 className="text-xl font-black text-slate-950">Ziyaret Merkezi</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Bayi saha ziyareti, görüşme kaydı ve risk takibi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center">
            <p className="text-xs font-bold text-amber-800">Ziyaret Bekleyen</p>
            <p className="text-2xl font-black text-amber-900">{ozet.ziyaret_bekleyen}</p>
          </div>
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
            <p className="text-xs font-bold text-emerald-800">Bu Ay Ziyaret</p>
            <p className="text-2xl font-black text-emerald-900">{ozet.bu_ay_ziyaret}</p>
          </div>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}
        {mesaj && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            {mesaj}
          </div>
        )}

        <form
          onSubmit={kaydet}
          className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3"
        >
          <h2 className="text-base font-black">Yeni Ziyaret Kaydı</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold">Bayi *</label>
              <select
                required
                value={form.bayi_kart_id}
                onChange={(e) => setForm((f) => ({ ...f, bayi_kart_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-400 px-3 py-2.5 text-sm font-semibold"
              >
                <option value="">Seçin</option>
                {bayiler.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bayi_adi}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Tarih</label>
              <input
                type="date"
                value={form.ziyaret_tarihi}
                onChange={(e) => setForm((f) => ({ ...f, ziyaret_tarihi: e.target.value }))}
                className="w-full rounded-xl border border-slate-400 px-3 py-2.5 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Ziyaret Tipi</label>
              <select
                value={form.ziyaret_tipi}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ziyaret_tipi: e.target.value as BayiZiyaretTipi }))
                }
                className="w-full rounded-xl border border-slate-400 px-3 py-2.5 text-sm font-semibold"
              >
                {Object.entries(ZIYARET_TIPI_ETIKETLERI).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold">Notlar</label>
              <textarea
                value={form.notlar}
                onChange={(e) => setForm((f) => ({ ...f, notlar: e.target.value }))}
                className="w-full min-h-[80px] rounded-xl border border-slate-400 px-3 py-2.5 text-sm font-semibold"
                placeholder="Ziyaret özeti, aksiyonlar..."
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Ziyaret Kaydet"}
          </button>
        </form>

        {ozet.ziyaret_bekleyen_bayiler.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-white p-4 shadow-sm space-y-2">
            <h2 className="text-base font-black">Ziyaret Bekleyen Bayiler (60+ gün)</h2>
            {ozet.ziyaret_bekleyen_bayiler.map((bayi) => (
              <div
                key={bayi.id}
                className="rounded-xl border border-slate-200 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{bayi.bayi_adi}</p>
                    <p className="text-xs font-semibold text-slate-600">
                      Son ziyaret: {bayi.son_ziyaret_tarihi || "Hiç yok"}
                    </p>
                  </div>
                  {bayi.risk_seviyesi && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-black ${riskSeviyesiSinifi(bayi.risk_seviyesi)}`}
                    >
                      {riskSeviyesiEtiketi(bayi.risk_seviyesi)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, bayi_kart_id: bayi.id }))
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-black text-white"
                  >
                    Forma Al
                  </button>
                  <button
                    type="button"
                    disabled={aiYukleniyor && aiPlanBayiId === bayi.id}
                    onClick={() => void ziyaretPlaniUret(bayi.id)}
                    className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                  >
                    {aiYukleniyor && aiPlanBayiId === bayi.id ? "..." : "AI Ziyaret Planı"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {aiPlan && (
          <div className="rounded-2xl border border-violet-300 bg-violet-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-violet-950">AI Ziyaret Planı</h2>
              <span className="rounded bg-violet-200 px-2 py-0.5 text-[10px] font-black uppercase text-violet-900">
                {aiPlan.mode === "ai" ? "Claude" : "Kural"} · {aiPlan.oncelik}
              </span>
            </div>
            <p className="text-sm font-semibold text-violet-900">{aiPlan.ozet}</p>
            <div>
              <p className="text-xs font-black text-violet-800">Sorulacaklar</p>
              <ul className="mt-1 space-y-1">
                {aiPlan.sorular.map((s) => (
                  <li key={s} className="text-sm font-semibold text-violet-950">
                    · {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-black text-violet-800">Aksiyonlar</p>
              <ul className="mt-1 space-y-1">
                {aiPlan.aksiyonlar.map((a) => (
                  <li key={a} className="text-sm font-semibold text-violet-950">
                    · {a}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                const notMetni = [
                  "AI ziyaret planı:",
                  ...aiPlan.sorular.map((s) => `- ${s}`),
                  ...aiPlan.aksiyonlar.map((a) => `Aksiyon: ${a}`),
                ].join("\n")
                setForm((f) => ({ ...f, notlar: notMetni.slice(0, 2000) }))
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white"
            >
              Planı Notlara Aktar
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-2">
          <h2 className="text-base font-black">Son Ziyaretler</h2>
          {ozet.son_ziyaretler.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">Henüz ziyaret kaydı yok.</p>
          ) : (
            ozet.son_ziyaretler.map((z) => (
              <div key={z.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-bold text-slate-900">{z.bayi_adi || "Bayi"}</p>
                <p className="text-xs font-semibold text-slate-600">
                  {ZIYARET_TIPI_ETIKETLERI[z.ziyaret_tipi]} · {z.ziyaret_tarihi} ·{" "}
                  {z.personel_adi || "-"}
                </p>
                {z.notlar && (
                  <p className="mt-1 text-sm font-semibold text-slate-700">{z.notlar}</p>
                )}
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  {tarihSaat(z.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
