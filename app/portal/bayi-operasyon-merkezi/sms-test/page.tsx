"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

const ORNEK_MESAJ =
  "Sayın bayimiz, BAYI-123456 numaralı talebiniz inceleniyor. En kısa sürede dönüş yapılacaktır."

export default function BayiSmsTestPage() {
  const router = useRouter()

  const [telefon, setTelefon] = useState("05551234567")
  const [mesaj, setMesaj] = useState(ORNEK_MESAJ)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [saglayici, setSaglayici] = useState<string>("stub")
  const [messageId, setMessageId] = useState<string | null>(null)
  const [durum, setDurum] = useState<{
    whatsapp_mod?: string
    sms_saglayici?: string
    kanal_tercihi?: string
  }>({})

  useEffect(() => {
    void fetch("/api/bayi-operasyon/sms-test")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setDurum(data)
          if (data.sms_saglayici) setSaglayici(data.sms_saglayici)
        }
      })
      .catch(() => null)
  }, [])

  async function gonder(e: FormEvent) {
    e.preventDefault()
    setGonderiliyor(true)
    setHata(null)
    setMessageId(null)

    try {
      const response = await fetch("/api/bayi-operasyon/sms-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefon, mesaj }),
      })
      const data = await response.json()

      if (!data.success) {
        setHata(data.error || "SMS gönderilemedi.")
        setGonderiliyor(false)
        return
      }

      setSaglayici(data.saglayici || "stub")
      setMessageId(data.messageId || null)
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
            <h1 className="text-xl font-black text-slate-950">SMS Test</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Netgsm / İleti Merkezi / Twilio entegrasyon testi
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold text-slate-700 space-y-1">
          <p>
            SMS sağlayıcı:{" "}
            <span className="font-black text-slate-900">{durum.sms_saglayici || saglayici}</span>
          </p>
          <p>
            Kanal tercihi:{" "}
            <span className="font-black text-slate-900">{durum.kanal_tercihi || "auto"}</span>
          </p>
          <p>
            WhatsApp modu:{" "}
            <span className="font-black text-slate-900">{durum.whatsapp_mod || "-"}</span>
          </p>
        </div>

        {saglayici === "stub" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">
            Stub modu aktif — mesaj gerçekten gitmez, sunucu loguna yazılır. Canlı gönderim için
            sağlayıcı env değişkenlerini tanımlayın.
          </div>
        )}

        <form onSubmit={gonder} className="rounded-2xl border border-slate-300 bg-white p-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-bold" htmlFor="telefon">
              Telefon
            </label>
            <input
              id="telefon"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="05XXXXXXXXX"
              className="w-full rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold" htmlFor="mesaj">
              SMS Metni
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
            className="w-full rounded-xl bg-indigo-700 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {gonderiliyor ? "Gönderiliyor..." : "SMS Gönder"}
          </button>
        </form>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        {messageId && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 space-y-1">
            <p className="text-sm font-black text-emerald-900">SMS gönderildi</p>
            <p className="text-sm font-semibold text-emerald-800">
              Sağlayıcı: {saglayici} · Ref: {messageId}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 text-xs font-semibold text-slate-600 space-y-2">
          <p className="font-black text-slate-800">Ortam değişkenleri</p>
          <p>Netgsm: NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_HEADER</p>
          <p>İleti Merkezi: ILETIMERKEZI_API_KEY, ILETIMERKEZI_SECRET, ILETIMERKEZI_SENDER</p>
          <p>Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM</p>
          <p>BAYI_SMS_PROVIDER=netgsm|iletimerkezi|twilio|stub</p>
          <p>BAYI_BILGILENDIRME_KANAL=auto|sms|whatsapp</p>
        </div>
      </div>
    </div>
  )
}
