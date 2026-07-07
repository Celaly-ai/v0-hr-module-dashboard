"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { TALEP_TURU_ETIKETLERI } from "@/lib/bayi-operasyon-utils"
import type { BayiTalepTuru } from "@/lib/types/bayi-operasyon"

export default function BayiWhatsappTestPage() {
  const router = useRouter()

  const [mesaj, setMesaj] = useState("Medine Duman çamaşır makinesi montaj")
  const [telefon, setTelefon] = useState("05551234567")
  const [bayiAdi, setBayiAdi] = useState("Örnek Bayi")
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [sonuc, setSonuc] = useState<{
    talep_id: string
    talep_no: string | null
    talep_turu: string
  } | null>(null)

  async function gonder(e: FormEvent) {
    e.preventDefault()
    setGonderiliyor(true)
    setHata(null)
    setSonuc(null)

    try {
      const response = await fetch("/api/bayi-operasyon/whatsapp-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mesaj,
          telefon,
          bayi_adi: bayiAdi,
          gonderen_ad: bayiAdi,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setHata(data.error || "Talep oluşturulamadı.")
        setGonderiliyor(false)
        return
      }

      setSonuc(data.data)
    } catch {
      setHata("Bağlantı hatası.")
    }

    setGonderiliyor(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-lg px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal/bayi-operasyon-merkezi")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-950">WhatsApp Stub Test</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Faz 2: WhatsApp mesajını talebe dönüştürme simülasyonu
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          Gerçek WhatsApp entegrasyonu değil; webhook API&apos;sini test etmek için kullanılır.
        </div>

        <form onSubmit={gonder} className="rounded-2xl border border-slate-300 bg-white p-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-bold" htmlFor="bayi_adi">
              Bayi Adı
            </label>
            <input
              id="bayi_adi"
              value={bayiAdi}
              onChange={(e) => setBayiAdi(e.target.value)}
              className="w-full rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold" htmlFor="telefon">
              Telefon
            </label>
            <input
              id="telefon"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className="w-full rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold" htmlFor="mesaj">
              WhatsApp Mesajı
            </label>
            <textarea
              id="mesaj"
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              className="w-full min-h-[120px] rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold"
            />
          </div>
          <button
            type="submit"
            disabled={gonderiliyor}
            className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {gonderiliyor ? "Oluşturuluyor..." : "Talep Oluştur (Stub)"}
          </button>
        </form>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        {sonuc && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
            <p className="text-sm font-black text-emerald-900">Talep oluşturuldu</p>
            <p className="text-sm font-semibold text-emerald-800">
              No: {sonuc.talep_no || "-"} · Tür:{" "}
              {TALEP_TURU_ETIKETLERI[sonuc.talep_turu as BayiTalepTuru] || sonuc.talep_turu}
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/portal/bayi-operasyon-merkezi/talep/${sonuc.talep_id}`)
              }
              className="text-xs font-black text-emerald-900 underline"
            >
              Talep detayına git →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
