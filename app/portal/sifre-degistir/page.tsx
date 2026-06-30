"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SifreDegistirPage() {
  const router = useRouter()

  const [yeniSifre, setYeniSifre] = useState("")
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("")
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const kontrol = async () => {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/login")
        return
      }

      if (session.user.user_metadata?.ilk_giris !== true) {
        router.replace("/portal")
        return
      }

      setLoading(false)
    }

    kontrol()
  }, [router])

  async function sifreDegistir() {
    setHata("")
    setMesaj("")

    if (yeniSifre.length < 8) {
      setHata("Yeni şifre en az 8 karakter olmalıdır.")
      return
    }

    if (yeniSifre !== yeniSifreTekrar) {
      setHata("Şifreler aynı değil.")
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      router.replace("/login")
      return
    }

    const { error: sifreError } = await supabase.auth.updateUser({
      password: yeniSifre,
      data: {
        ...user.user_metadata,
        ilk_giris: false,
        sifre_degistirme_tarihi: new Date().toISOString(),
      },
    })

    if (sifreError) {
      setHata("Şifre değiştirilemedi: " + sifreError.message)
      setKaydediliyor(false)
      return
    }

    setMesaj("Şifreniz başarıyla değiştirildi. Portala yönlendiriliyorsunuz.")

    setTimeout(() => {
      router.replace("/portal")
    }, 1000)
  }

  async function cikisYap() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="font-bold text-gray-800">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-300 shadow-sm p-5 space-y-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Şifre Değiştirme Zorunlu
          </h1>
          <p className="text-sm font-semibold text-gray-700 mt-1">
            İlk girişte geçici şifrenizi kalıcı şifreyle değiştirmeniz gerekir.
          </p>
        </div>

        {hata && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        {mesaj && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-bold text-green-900">
            {mesaj}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1">
            Yeni Şifre
          </label>
          <input
            type="password"
            value={yeniSifre}
            onChange={(e) => setYeniSifre(e.target.value)}
            placeholder="En az 8 karakter"
            className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1">
            Yeni Şifre Tekrar
          </label>
          <input
            type="password"
            value={yeniSifreTekrar}
            onChange={(e) => setYeniSifreTekrar(e.target.value)}
            placeholder="Yeni şifreyi tekrar girin"
            className="w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <button
          type="button"
          onClick={sifreDegistir}
          disabled={kaydediliyor}
          className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
        >
          {kaydediliyor ? "Kaydediliyor..." : "Şifremi Değiştir"}
        </button>

        <button
          type="button"
          onClick={cikisYap}
          className="w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-sm font-black text-gray-900"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  )
}
