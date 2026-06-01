"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function KonumTestPage() {
  const [mesaj, setMesaj] = useState("")
  const [loading, setLoading] = useState(false)

  async function konumGonder() {
    setLoading(true)
    setMesaj("Konum alınıyor...")

    try {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (!user) {
        setMesaj("Oturum bulunamadı.")
        setLoading(false)
        return
      }

      const { data: personel } = await supabase
        .from("personeller")
        .select("id")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
        .maybeSingle()

      if (!personel?.id) {
        setMesaj("Personel kaydı bulunamadı.")
        setLoading(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const response = await fetch("/api/konum/kaydet", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personel_id: personel.id,
              enlem: position.coords.latitude,
              boylam: position.coords.longitude,
              hiz: position.coords.speed,
              dogruluk: position.coords.accuracy,
              kaynak: "portal_test",
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            setMesaj(data.error || "Konum gönderilemedi.")
            setLoading(false)
            return
          }

          setMesaj("Konum başarıyla gönderildi.")
          setLoading(false)
        },
        (error) => {
          setMesaj("Konum izni verilmedi: " + error.message)
          setLoading(false)
        },
        {
          enableHighAccuracy: true,
        },
      )
    } catch (error: any) {
      setMesaj(error?.message || "Hata oluştu")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-300 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900">
          Konum Testi
        </h1>

        <p className="mt-2 text-sm font-semibold text-gray-700">
          Mevcut konumu sisteme gönderir.
        </p>

        <button
          onClick={konumGonder}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
        >
          {loading ? "Gönderiliyor..." : "Konumu Gönder"}
        </button>

        {mesaj && (
          <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm font-bold text-gray-900">
            {mesaj}
          </div>
        )}
      </div>
    </div>
  )
}
