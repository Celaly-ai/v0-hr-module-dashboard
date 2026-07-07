"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar"

type Personel = {
  id: string
  ad?: string | null
  soyad?: string | null
  rol?: string | null
  unvan?: string | null
  departman?: string | null
  sirket_id?: string | null
}

type MesaiKaydi = {
  id: string
  tip: string
  created_at: string
}

type Talep = {
  id: string
  durum: string | null
}

function saatFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function PersonelPaneliPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [personel, setPersonel] = useState<Personel | null>(null)
  const [mesaiKayitlari, setMesaiKayitlari] = useState<MesaiKaydi[]>([])
  const [talepler, setTalepler] = useState<Talep[]>([])
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    async function yukle() {
      setLoading(true)
      setHata(null)

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
        .select("id, ad, soyad, rol, unvan, departman, sirket_id")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()

      if (personelError || !p) {
        setHata("Bu kullanıcı için personel kaydı bulunamadı.")
        setLoading(false)
        return
      }

      setPersonel(p)

      const [{ data: m }, { data: t }] = await Promise.all([
        supabase
          .from("giris_cikis_kayitlari")
          .select("id, tip, created_at")
          .eq("personel_id", p.id)
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .order("created_at", { ascending: false }),

        supabase
          .from("calisan_talepler")
          .select("id, durum")
          .eq("personel_id", p.id)
          .order("created_at", { ascending: false }),
      ])

      setMesaiKayitlari(m || [])
      setTalepler(t || [])
      setLoading(false)
    }

    void yukle()
  }, [router])

  const adSoyad = useMemo(() => {
    if (!personel) return ""
    return `${personel.ad || ""} ${personel.soyad || ""}`.trim()
  }, [personel])

  const sonMesai = mesaiKayitlari[0] || null
  const mesaiAktif = sonMesai?.tip === "giris"

  const bekleyenTalepSayisi = talepler.filter((t) => {
    return !t.durum || ["Beklemede", "Bekliyor"].includes(t.durum)
  }).length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-600">Personel paneli yükleniyor...</p>
      </div>
    )
  }

  if (hata) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <p className="font-black">Hata</p>
          <p className="mt-1 text-sm font-semibold">{hata}</p>
          <button
            onClick={() => router.push("/portal")}
            className="mt-4 w-full rounded-xl bg-red-700 py-3 text-white font-black"
          >
            Portala Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 overflow-x-hidden">
  <div className="sticky top-0 z-10 border-b bg-white px-4 pb-4 shadow-sm pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-blue-700">FeyRoute Personel</p>
            <h1 className="text-xl font-black">{adSoyad || "Personel"}</h1>
            <p className="text-xs font-semibold text-slate-500">
              {personel?.unvan || personel?.rol || "Çalışan"}
            </p>
          </div>

          <button
            onClick={() => router.push("/portal")}
            className="rounded-xl border bg-slate-50 px-3 py-2 text-sm font-black"
          >
            Portal
          </button>
        </div>
      </div>

      <main className="mx-auto w-full max-w-md space-y-4 p-4 pb-28">
        <div className={`rounded-3xl p-5 text-white shadow-sm ${mesaiAktif ? "bg-green-600" : "bg-slate-800"}`}>
          <p className="text-sm font-bold opacity-90">Bugünkü Durum</p>
          <p className="mt-2 text-3xl font-black">
            {mesaiAktif ? "Mesaidesiniz" : "Mesai Kapalı"}
          </p>
          <p className="mt-2 text-sm font-semibold">
            Son kayıt: {sonMesai ? `${sonMesai.tip === "giris" ? "Giriş" : "Çıkış"} · ${saatFormat(sonMesai.created_at)}` : "Bugün kayıt yok"}
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Personel Özeti</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Giriş/çıkış, vardiya planı ve ekip bilgileriniz Giriş/Çıkış ekranında görüntülenir.
          </p>
          <button
            type="button"
            onClick={() => router.push("/portal/giris-cikis")}
            className="mt-4 w-full rounded-xl bg-blue-700 py-3 text-sm font-black text-white"
          >
            Giriş / Çıkış Ekranına Git
          </button>
        </div>

        {bekleyenTalepSayisi > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">
            Bekleyen talep sayınız: {bekleyenTalepSayisi}
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  )
}
