"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const SERVIS_MESAFE_SINIRI_METRE = 20
const GECICI_SERVIS_LAT = 37.940611
const GECICI_SERVIS_LNG = 40.151167

type Mesaj = { tip: "basari" | "hata"; metin: string }

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function localISO(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const g = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${g}`
}

function temizSaat(value?: string | null) {
  if (!value) return ""
  return String(value).slice(0, 5)
}

function konumAl(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Konum desteklenmiyor"))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

function mesafeHesapla(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371000

  const dLat = ((lat1 - lat2) * Math.PI) / 180
  const dLng = ((lng1 - lng2) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat2 * Math.PI) / 180) *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2

  return Math.round(
    R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  )
}

export default function GirisCikisPage() {
  const router = useRouter()

  const [personel, setPersonel] = useState<any>(null)
  const [sonKayit, setSonKayit] = useState<any>(null)
  const [vardiyalar, setVardiyalar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  const verileriYukle = useCallback(async () => {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    if (!user) {
      router.replace("/portal/giris")
      return
    }

    const { data: p } = await supabase
      .from("personeller")
      .select("id")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    if (!p) {
      setMesaj({
        tip: "hata",
        metin: "Personel kaydı bulunamadı.",
      })

      setYukleniyor(false)
      return
    }

    setPersonel(p)

    const bugun = localISO(startOfToday())

    const { data: liste } = await supabase
      .from("giris_cikis_kayitlari")
      .select("id, tip, created_at")
      .eq("personel_id", p.id)
      .gte("created_at", `${bugun}T00:00:00`)
      .lte("created_at", `${bugun}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(1)

    const { data: vardiyaListe } = await supabase
      .from("vardiya_planlari")
      .select("tarih, durum, baslangic_saati, bitis_saati")
      .eq("personel_id", p.id)
      .eq("tarih", bugun)

    setVardiyalar(vardiyaListe ?? [])
    setSonKayit(liste?.[0] ?? null)

    setYukleniyor(false)
  }, [router])

  useEffect(() => {
    void verileriYukle()
  }, [verileriYukle])

  const bugunkuVardiya = useMemo(() => {
    const tarih = localISO(startOfToday())

    return vardiyalar.find((v) => v.tarih === tarih) ?? null
  }, [vardiyalar])

  const aktifDurum =
    sonKayit?.tip === "giris" ? "giris" : "cikis"

  async function handleKayit(tip: "giris" | "cikis") {
    if (!personel) return

    setIslem(true)
    setMesaj(null)

    try {
      const pos = await konumAl()

      const lat = pos.coords.latitude
      const lng = pos.coords.longitude

      const mesafe = mesafeHesapla(
        lat,
        lng,
        GECICI_SERVIS_LAT,
        GECICI_SERVIS_LNG,
      )

      if (mesafe > SERVIS_MESAFE_SINIRI_METRE) {
        setMesaj({
          tip: "hata",
          metin: `Şirkete çok uzaktasınız (${mesafe}m)`,
        })

        setIslem(false)
        return
      }

      const supabase = createClient()

      const { error } = await supabase
        .from("giris_cikis_kayitlari")
        .insert([
          {
            personel_id: personel.id,
            tip,
            lat,
            lng,
            mesafe_metre: mesafe,
            basarili: true,
          },
        ])

      if (error) {
        setMesaj({
          tip: "hata",
          metin: error.message,
        })

        setIslem(false)
        return
      }

      setMesaj({
        tip: "basari",
        metin:
          tip === "giris"
            ? "✅ Giriş kaydedildi"
            : "✅ Çıkış kaydedildi",
      })

      await verileriYukle()
    } catch {
      setMesaj({
        tip: "hata",
        metin: "Konum alınamadı",
      })
    }

    setIslem(false)
  }

  if (yukleniyor) {
    return (
      <div className="min-h-[100dvh] bg-gray-100 flex items-center justify-center">
        <p className="font-bold text-gray-800">
          Yükleniyor...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-100">
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold text-gray-800"
        >
          ←
        </button>

        <h1 className="text-2xl font-bold text-gray-900">
          Giriş / Çıkış
        </h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div
          className={`rounded-3xl p-5 text-white text-center shadow-lg ${
            aktifDurum === "giris"
              ? "bg-green-600"
              : "bg-gray-700"
          }`}
        >
          <p className="text-5xl mb-2">
            {aktifDurum === "giris" ? "🟢" : "⚫"}
          </p>

          <p className="text-3xl font-bold">
            {aktifDurum === "giris"
              ? "Serviste"
              : "Dışarıda"}
          </p>

          <p className="mt-3 text-lg font-semibold">
            {bugunkuVardiya?.durum === "calisma"
              ? `${temizSaat(
                  bugunkuVardiya.baslangic_saati,
                )} - ${temizSaat(
                  bugunkuVardiya.bitis_saati,
                )}`
              : "Plan Yok"}
          </p>
        </div>

        {mesaj && (
          <div
            className={`rounded-2xl p-4 text-center font-bold ${
              mesaj.tip === "basari"
                ? "bg-green-100 text-green-900"
                : "bg-red-100 text-red-900"
            }`}
          >
            {mesaj.metin}
          </div>
        )}

        <button
          onClick={() => handleKayit("giris")}
          disabled={islem || aktifDurum === "giris"}
          className="w-full rounded-3xl bg-green-600 text-white py-5 text-2xl font-bold shadow-lg disabled:opacity-40"
        >
          {islem ? "⏳ İşleniyor..." : "📍 Giriş Yap"}
        </button>

        <button
          onClick={() => handleKayit("cikis")}
          disabled={islem || aktifDurum === "cikis"}
          className="w-full rounded-3xl bg-red-600 text-white py-5 text-2xl font-bold shadow-lg disabled:opacity-40"
        >
          {islem ? "⏳ İşleniyor..." : "🚪 Çıkış Yap"}
        </button>

        <div className="bg-white rounded-3xl p-4 shadow border">
          <p className="text-sm font-bold text-gray-800">
            📍 Konum zorunludur
          </p>

          <p className="text-sm text-gray-700 mt-1">
            Şirket konumuna maksimum{" "}
            {SERVIS_MESAFE_SINIRI_METRE} metre yakınlık
            gereklidir.
          </p>
        </div>
      </div>
    </div>
  )
}
