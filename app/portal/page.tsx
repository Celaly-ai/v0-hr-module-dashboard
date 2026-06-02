"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Kayit = Record<string, any>

function rolNormalize(value?: string | null) {
  return String(value || "").toLocaleLowerCase("tr-TR").trim()
}

function aktifDurumMu(value?: string | null) {
  const durum = String(value || "").toLocaleLowerCase("tr-TR")
  return durum === "aktif" || durum === "active" || durum === "izinli"
}

export default function PortalPage() {
  const router = useRouter()

  const [personel, setPersonel] = useState<Kayit | null>(null)
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState("")

  const aktifRol = rolNormalize(personel?.rol)

  const yoneticiMi = [
    "admin",
    "yonetici",
    "yönetici",
    "servis_yoneticisi",
    "ik_yoneticisi",
    "muhasebe",
  ].includes(aktifRol)

  useEffect(() => {
    async function kontrolEt() {
      setLoading(true)
      setHata("")

      const supabase = createClient()

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        setHata("Oturum kontrol hatası: " + sessionError.message)
        setLoading(false)
        return
      }

      const user = session?.user

      if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 800))

        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession()

        const retryUser = retrySession?.user

        if (!retryUser) {
          router.replace("/portal/giris")
          return
        }
      }

      const { data: personelData, error: personelError } = await supabase
        .from("personeller")
        .select("id, ad, soyad, email, tel, rol, durum, auth_id, kullanici_id")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()

      if (personelError) {
        setHata("Personel sorgu hatası: " + personelError.message)
        setLoading(false)
        return
      }

      if (!personelData) {
        setHata("Giriş başarılı fakat bağlı personel kaydı bulunamadı.")
        setLoading(false)
        return
      }

      if (!aktifDurumMu(personelData.durum)) {
        await supabase.auth.signOut()
        setHata("Personel aktif değil. Durum: " + (personelData.durum || "-"))
        setLoading(false)
        return
      }

      if (!personelData.auth_id || !personelData.kullanici_id) {
        await supabase
          .from("personeller")
          .update({
            auth_id: user.id,
            kullanici_id: user.id,
          })
          .eq("id", personelData.id)
      }

      setPersonel(personelData)
      setLoading(false)
    }

    kontrolEt()
  }, [router])

  async function cikisYap() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/portal/giris"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-lg font-bold">Portal yükleniyor...</p>
      </div>
    )
  }

  if (hata) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-300 bg-white p-5 shadow-sm space-y-4">
          <h1 className="text-xl font-black text-red-900">Portal açılamadı</h1>
          <p className="text-sm font-semibold text-red-800">{hata}</p>

          <button
            type="button"
            onClick={cikisYap}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-black text-white"
          >
            Çıkış Yap ve Tekrar Giriş Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Hoş geldin</p>
          <p className="text-lg font-bold text-gray-800">
            {personel?.ad} {personel?.soyad}
          </p>
          <p className="text-xs font-semibold text-gray-500">
            Rol: {personel?.rol || "-"}
          </p>
        </div>

        <button
          type="button"
          onClick={cikisYap}
          className="text-sm text-red-500 font-bold"
        >
          Çıkış
        </button>
      </div>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {yoneticiMi && (
          <>
            <button
              type="button"
              onClick={() => router.push("/portal/yonetim/talepler")}
              className="w-full bg-indigo-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
            >
              <span className="text-4xl">🛡️</span>
              <div className="text-left">
                <p className="text-lg font-bold">Yönetici Paneli</p>
                <p className="text-sm opacity-80">Talepleri onayla / reddet</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/portal/yonetim/vardiya")}
              className="w-full bg-blue-700 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
            >
              <span className="text-4xl">📅</span>
              <div className="text-left">
                <p className="text-lg font-bold">Vardiya Yönetimi</p>
                <p className="text-sm opacity-80">Personel vardiyalarını planla</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/portal/personel-hesaplari")}
              className="w-full bg-slate-800 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
            >
              <span className="text-4xl">👤</span>
              <div className="text-left">
                <p className="text-lg font-bold">Personel Giriş Hesapları</p>
                <p className="text-sm opacity-80">Portal hesabı oluştur / kontrol et</p>
              </div>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => router.push("/portal/giris-cikis")}
          className="w-full bg-green-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-4xl">📍</span>
          <div className="text-left">
            <p className="text-lg font-bold">Çalışma Paneli</p>
            <p className="text-sm opacity-80">Giriş/çıkış, vardiya ve puantaj</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/portal/izin")}
          className="w-full bg-purple-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-4xl">🏖️</span>
          <div className="text-left">
            <p className="text-lg font-bold">İzin Talebi</p>
            <p className="text-sm opacity-80">İzin iste veya durumunu gör</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/portal/malzeme")}
          className="w-full bg-cyan-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-4xl">🧰</span>
          <div className="text-left">
            <p className="text-lg font-bold">Malzeme / Avadanlık</p>
            <p className="text-sm opacity-80">Malzeme veya ekipman talebi</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/portal/talepler")}
          className="w-full bg-gray-700 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-4xl">📋</span>
          <div className="text-left">
            <p className="text-lg font-bold">Taleplerim</p>
            <p className="text-sm opacity-80">Tüm taleplerim ve durumları</p>
          </div>
        </button>
      </div>
    </div>
  )
}
