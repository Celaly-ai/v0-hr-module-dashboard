"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar"
import { useRouter } from "next/navigation"

export default function TaleplerPage() {
  const router = useRouter()
  const [talepler, setTalepler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState("Tumu")

  useEffect(() => {
    const yukle = async () => {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: p, error: personelError } = await supabase
        .from("personeller")
        .select("id")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
        .maybeSingle()

      if (personelError || !p) {
        router.replace("/login")
        return
      }

      const { data: t } = await supabase
        .from("calisan_talepler")
        .select("id, tip, baslik, aciklama, durum, medya_urls, yonetici_notu, onay_tarihi, created_at")
        .eq("personel_id", p.id)
        .order("created_at", { ascending: false })

      setTalepler(t || [])
      setYukleniyor(false)
    }

    yukle()
  }, [router])

  const durumNormal = (durum: string) => {
    if (durum === "Onaylandi") return "Onaylandı"
    return durum || "Beklemede"
  }

  const tipIkon = (tip: string) => {
    if (tip === "izin") return "🏖️"
    if (tip === "arac_hasar") return "💥"
    if (tip === "arac_bakim") return "🔧"
    if (tip === "malzeme") return "🧰"
    return "📋"
  }

  const durumRenk = (durum: string) => {
    const d = durumNormal(durum)
    if (d === "Onaylandı") return "bg-green-100 text-green-700"
    if (d === "Reddedildi") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  const durumIkon = (durum: string) => {
    const d = durumNormal(durum)
    if (d === "Onaylandı") return "✅"
    if (d === "Reddedildi") return "❌"
    return "⏳"
  }

  const durumEsitMi = (durum: string, hedef: string) => {
    return durumNormal(durum) === durumNormal(hedef)
  }

  const filtrelenmis =
    filtre === "Tumu" ? talepler : talepler.filter((t) => durumEsitMi(t.durum, filtre))

  if (yukleniyor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-gray-50 text-gray-900 [-webkit-overflow-scrolling:touch]">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/portal")} className="text-2xl text-gray-800">
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900">Taleplerim</h1>
      </div>

      <main className="p-4 max-w-sm mx-auto space-y-4 pb-32">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Bekleyen", durum: "Beklemede", renk: "bg-yellow-50 border-yellow-200 text-yellow-700" },
            { label: "Onaylanan", durum: "Onaylandı", renk: "bg-green-50 border-green-200 text-green-700" },
            { label: "Reddedilen", durum: "Reddedildi", renk: "bg-red-50 border-red-200 text-red-700" },
          ].map((item) => (
            <div key={item.durum} className={`border rounded-2xl p-3 text-center ${item.renk}`}>
              <p className="text-2xl font-bold">
                {talepler.filter((t) => durumEsitMi(t.durum, item.durum)).length}
              </p>
              <p className="text-xs font-medium">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { label: "Tümü", value: "Tumu" },
            { label: "Beklemede", value: "Beklemede" },
            { label: "Onaylandı", value: "Onaylandı" },
            { label: "Reddedildi", value: "Reddedildi" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltre(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border ${
                filtre === f.value
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtrelenmis.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
            <p className="text-4xl mb-3">📭</p>
            <p>Talep bulunamadı</p>
          </div>
        ) : (
          filtrelenmis.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-200">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{tipIkon(t.tip)}</span>

                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{t.baslik}</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                      {t.aciklama}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Talep tarihi: {new Date(t.created_at).toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${durumRenk(
                    t.durum
                  )}`}
                >
                  {durumIkon(t.durum)} {durumNormal(t.durum)}
                </span>
              </div>

              {Array.isArray(t.medya_urls) && t.medya_urls.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {t.medya_urls.map((url: string, index: number) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-gray-100 border rounded-lg px-3 py-2 text-gray-700 whitespace-nowrap"
                    >
                      📎 Ek {index + 1}
                    </a>
                  ))}
                </div>
              )}

              {t.yonetici_notu && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-700 font-medium mb-1">💬 Yönetici Notu</p>
                  <p className="text-sm text-blue-900">{t.yonetici_notu}</p>

                  {t.onay_tarihi && (
                    <p className="text-xs text-blue-700 mt-2">
                      İşlem tarihi: {new Date(t.onay_tarihi).toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
      <MobileTabBar />
    </div>
  )
}
