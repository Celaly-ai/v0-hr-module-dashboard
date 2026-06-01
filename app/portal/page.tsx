"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function PortalPage() {
  const router = useRouter()

  const [personel, setPersonel] = useState<any>(null)
  const [profileRole, setProfileRole] = useState("")
  const [arac, setArac] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [yetenekEksikSayisi, setYetenekEksikSayisi] = useState(0)

  const aktifRol = (profileRole || personel?.rol || "").toLocaleLowerCase("tr-TR")

  const yoneticiMi = [
    "admin",
    "yonetici",
    "yönetici",
    "servis_yoneticisi",
    "ik_yoneticisi",
  ].includes(aktifRol)

  useEffect(() => {
    const kontrol = async () => {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (!user) {
        router.replace("/portal/giris")
        return
      }

      if (user.user_metadata?.ilk_giris === true) {
        router.replace("/portal/sifre-degistir")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      setProfileRole(profileData?.role || "")

      const { data: personelData, error: personelError } = await supabase
        .from("personeller")
        .select("id, ad, soyad, rol, durum")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
        .maybeSingle()

      if (personelError || !personelData) {
        await supabase.auth.signOut()
        router.replace("/portal/giris")
        return
      }

      const durum = (personelData.durum || "").toLocaleLowerCase("tr-TR")

      if (
        durum !== "aktif" &&
        durum !== "active" &&
        durum !== "izinli" &&
        durum !== "izınli"
      ) {
        await supabase.auth.signOut()
        router.replace("/portal/giris")
        return
      }

      setPersonel(personelData)

      const { data: aracData } = await supabase
        .from("araclar")
        .select("id")
        .eq("personel_id", personelData.id)
        .maybeSingle()

      setArac(aracData)

      const { count: toplamYetenek } = await supabase
        .from("yetenekler")
        .select("id", { count: "exact", head: true })
        .eq("aktif", true)

      const { count: isaretlenenYetenek } = await supabase
        .from("personel_yetenekleri")
        .select("yetenek_id", { count: "exact", head: true })
        .eq("personel_id", personelData.id)

      setYetenekEksikSayisi(
        Math.max(0, (toplamYetenek || 0) - (isaretlenenYetenek || 0)),
      )

      setLoading(false)
    }

    kontrol()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Yükleniyor...</p>
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
        </div>

        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = "/portal/giris"
          }}
          className="text-sm text-red-500 font-medium"
        >
          Çıkış
        </button>
      </div>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {yetenekEksikSayisi > 0 && (
          <button
            onClick={() => router.push("/portal/yetenek-beyani")}
            className="w-full bg-yellow-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
          >
            <span className="text-4xl">🧩</span>
            <div className="text-left">
              <p className="text-lg font-bold">Yetenek Beyanım</p>
              <p className="text-sm opacity-90">
                Eksik {yetenekEksikSayisi} yetenek beyanınız var
              </p>
            </div>
          </button>
        )}

        {yoneticiMi && (
          <>
            <button
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
              onClick={() => router.push("/portal/yonetim/vardiya")}
              className="w-full bg-blue-700 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
            >
              <span className="text-4xl">📅</span>
              <div className="text-left">
                <p className="text-lg font-bold">Vardiya Yönetimi</p>
                <p className="text-sm opacity-80">Personel vardiyalarını planla</p>
              </div>
            </button>
          </>
        )}

        <button
          onClick={() => router.push("/portal/giris-cikis")}
          className="w-full bg-green-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-4xl">📍</span>
          <div className="text-left">
            <p className="text-lg font-bold">Çalışma Paneli</p>
            <p className="text-sm opacity-80">
              Giriş/çıkış, vardiya ve puantaj bilgileri
            </p>
          </div>
        </button>

        <button
          onClick={() => router.push("/portal/izin")}
          className="w-full bg-purple-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-4xl">🏖️</span>
          <div className="text-left">
            <p className="text-lg font-bold">İzin Talebi</p>
            <p className="text-sm opacity-80">İzin iste veya durumunu gör</p>
          </div>
        </button>

        {arac && (
          <button
            onClick={() => router.push("/portal/arac")}
            className="w-full bg-orange-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
          >
            <span className="text-4xl">🚗</span>
            <div className="text-left">
              <p className="text-lg font-bold">Araç & Zimmet</p>
              <p className="text-sm opacity-80">Hasar ve bakım talebi</p>
            </div>
          </button>
        )}

        <button
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
          onClick={() => router.push("/portal/ekipler")}
          className="w-full bg-indigo-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="text-4xl">👥</span>
          <div className="text-left">
            <p className="text-lg font-bold">Ekiplerim</p>
            <p className="text-sm opacity-80">
              Ekip bilgileri ve takım üyeleri
            </p>
          </div>
        </button>
        <button
  onClick={() => router.push("/portal/konum-test")}
  className="w-full bg-slate-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-95 transition-transform"
>
  <span className="text-4xl">📡</span>
  <div className="text-left">
    <p className="text-lg font-bold">Konum Testi</p>
    <p className="text-sm opacity-80">
      Mevcut konumu sisteme gönder
    </p>
  </div>
</button>

        <button
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
