"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { tarihSaat } from "@/lib/bayi-operasyon-utils"
import {
  isaretleBilgilendirmeGonderildi,
  listBayiBilgilendirmeKuyrugu,
} from "@/lib/services/bayi-operasyon-service"
import type { BayiBilgilendirmeOzet } from "@/lib/types/bayi-operasyon"

export default function BayiBilgilendirmePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [whatsappMod, setWhatsappMod] = useState<"stub" | "meta">("stub")
  const [smsSaglayici, setSmsSaglayici] = useState<string>("stub")
  const [kanalTercihi, setKanalTercihi] = useState<string>("auto")
  const [kayitlar, setKayitlar] = useState<BayiBilgilendirmeOzet[]>([])
  const [sadeceBekleyen, setSadeceBekleyen] = useState(true)
  const [isaretleniyorId, setIsaretleniyorId] = useState("")
  const [isleniyor, setIsleniyor] = useState(false)

  const yukle = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const [sonuc, modResponse] = await Promise.all([
      listBayiBilgilendirmeKuyrugu(sadeceBekleyen),
      fetch("/api/bayi-operasyon/bilgilendirme-isle").then((r) => r.json()).catch(() => null),
    ])

    if (modResponse?.whatsapp_mod === "meta" || modResponse?.whatsapp_mod === "stub") {
      setWhatsappMod(modResponse.whatsapp_mod)
    }
    if (modResponse?.sms_saglayici) setSmsSaglayici(modResponse.sms_saglayici)
    if (modResponse?.kanal_tercihi) setKanalTercihi(modResponse.kanal_tercihi)

    if (!sonuc.ok) {
      setHata(sonuc.error)
      setKayitlar([])
    } else {
      setKayitlar(sonuc.data)
    }

    setLoading(false)
  }, [sadeceBekleyen])

  useEffect(() => {
    void yukle()
  }, [yukle])

  async function gonderildiIsaretle(id: string) {
    setIsaretleniyorId(id)
    const sonuc = await isaretleBilgilendirmeGonderildi(id)
    setIsaretleniyorId("")
    if (!sonuc.ok) {
      setHata(sonuc.error)
      return
    }
    await yukle()
  }

  async function kuyruguIsle() {
    setIsleniyor(true)
    setHata(null)
    setMesaj(null)

    try {
      const response = await fetch("/api/bayi-operasyon/bilgilendirme-isle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 30 }),
      })
      const data = await response.json()

      if (!data.success) {
        setHata(data.error || "Kuyruk işlenemedi.")
      } else {
        if (data.whatsapp_mod) setWhatsappMod(data.whatsapp_mod)
        if (data.sms_saglayici) setSmsSaglayici(data.sms_saglayici)
        if (data.kanal_tercihi) setKanalTercihi(data.kanal_tercihi)
        setMesaj(data.mesaj || "Kuyruk işlendi.")
      }
    } catch {
      setHata("Kuyruk işleme sırasında bağlantı hatası.")
    }

    setIsleniyor(false)
    await yukle()
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
          <div>
            <h1 className="text-xl font-black text-slate-950">Bilgilendirme Kuyruğu</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Durum değişince oluşan WhatsApp/SMS mesajları
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi/sms-test")}
            className="rounded-xl bg-indigo-700 px-3 py-2 text-xs font-black text-white"
          >
            SMS Test
          </button>
          <button
            type="button"
            disabled={isleniyor}
            onClick={() => void kuyruguIsle()}
            className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {isleniyor ? "..." : "Kuyruğu İşle"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold text-slate-700 grid gap-2 sm:grid-cols-3">
          <p>
            WhatsApp:{" "}
            <span className={`font-black ${whatsappMod === "meta" ? "text-green-700" : "text-blue-700"}`}>
              {whatsappMod}
            </span>
          </p>
          <p>
            SMS:{" "}
            <span className={`font-black ${smsSaglayici !== "stub" ? "text-green-700" : "text-blue-700"}`}>
              {smsSaglayici}
            </span>
          </p>
          <p>
            Tercih: <span className="font-black text-slate-900">{kanalTercihi}</span>
          </p>
        </div>

        {(whatsappMod === "stub" && smsSaglayici === "stub") && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">
            Stub modu: mesajlar loglanır. Canlı gönderim için WhatsApp veya SMS env değişkenlerini
            tanımlayın.
          </div>
        )}

        {mesaj && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            {mesaj}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSadeceBekleyen(true)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              sadeceBekleyen ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            Bekleyen
          </button>
          <button
            type="button"
            onClick={() => setSadeceBekleyen(false)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              !sadeceBekleyen ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
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
        ) : kayitlar.length === 0 ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-600">Kayıt bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {kayitlar.map((k) => (
              <div
                key={k.id}
                className={`rounded-2xl border p-4 ${
                  k.durum === "bekliyor"
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-black text-green-900 uppercase">
                    {k.kanal}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                    {k.durum}
                  </span>
                  {k.talep_no && (
                    <span className="text-xs font-bold text-slate-600">{k.talep_no}</span>
                  )}
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  Alıcı: {k.alici || "-"}
                  {k.musteri_adi ? ` · ${k.musteri_adi}` : ""}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{k.mesaj}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{tarihSaat(k.created_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {k.bayi_talep_id && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/portal/bayi-operasyon-merkezi/talep/${k.bayi_talep_id}`)
                      }
                      className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-black text-white"
                    >
                      Talep
                    </button>
                  )}
                  {k.durum === "bekliyor" && (
                    <button
                      type="button"
                      disabled={isaretleniyorId === k.id}
                      onClick={() => void gonderildiIsaretle(k.id)}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                    >
                      {isaretleniyorId === k.id ? "..." : "Gönderildi İşaretle"}
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
