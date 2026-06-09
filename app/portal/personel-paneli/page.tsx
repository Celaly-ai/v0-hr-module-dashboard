"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Personel = {
  id: string
  ad?: string | null
  soyad?: string | null
  rol?: string | null
  unvan?: string | null
  departman?: string | null
  sirket_id?: string | null
}

type Vardiya = {
  tarih: string
  baslangic_saati: string | null
  bitis_saati: string | null
  durum: string | null
  calisma_gunu: boolean | null
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

function bugunISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const g = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${g}`
}

function tarihEkle(gun: number) {
  const d = new Date()
  d.setDate(d.getDate() + gun)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const g = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${g}`
}

function tarihYaz(value?: string | null) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
}

function saatYaz(value?: string | null) {
  if (!value) return "-"
  return String(value).slice(0, 5)
}

function durumYaz(value?: string | null) {
  if (value === "calisma") return "Çalışma"
  if (value === "izinli") return "İzinli"
  if (value === "raporlu") return "Raporlu"
  if (value === "egitim") return "Eğitim"
  if (value === "hafta_tatili") return "Hafta Tatili"
  if (value === "resmi_tatil") return "Resmi Tatil"
  return value || "Plan Yok"
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
  const [vardiyalar, setVardiyalar] = useState<Vardiya[]>([])
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
        router.replace("/portal/giris")
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

      const bugun = bugunISO()
      const onGunSonra = tarihEkle(9)

      const [{ data: v }, { data: m }, { data: t }] = await Promise.all([
        supabase
          .from("vardiya_planlari")
          .select("tarih, baslangic_saati, bitis_saati, durum, calisma_gunu")
          .eq("personel_id", p.id)
          .gte("tarih", bugun)
          .lte("tarih", onGunSonra)
          .order("tarih", { ascending: true }),

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

      setVardiyalar(v || [])
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

  const bugunkuVardiya = vardiyalar.find((v) => v.tarih === bugunISO()) || null

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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-4 shadow-sm">
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

      <main className="mx-auto max-w-md space-y-4 p-4">
        <div className={`rounded-3xl p-5 text-white shadow-sm ${mesaiAktif ? "bg-green-600" : "bg-slate-800"}`}>
          <p className="text-sm font-bold opacity-90">Bugünkü Durum</p>
          <p className="mt-2 text-3xl font-black">
            {mesaiAktif ? "Mesaidesiniz" : "Mesai Kapalı"}
          </p>
          <p className="mt-2 text-sm font-semibold">
            Son kayıt: {sonMesai ? `${sonMesai.tip === "giris" ? "Giriş" : "Çıkış"} · ${saatFormat(sonMesai.created_at)}` : "Bugün kayıt yok"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/portal/giris-cikis")}
            className="rounded-3xl border bg-white p-5 text-left shadow-sm active:scale-95"
          >
            <p className="text-3xl">📍</p>
            <p className="mt-3 text-lg font-black">Giriş / Çıkış</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Mesai kaydı</p>
          </button>

          <button
            onClick={() => router.push("/portal/izin")}
            className="rounded-3xl border bg-white p-5 text-left shadow-sm active:scale-95"
          >
            <p className="text-3xl">🏖️</p>
            <p className="mt-3 text-lg font-black">İzin Talebi</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Yeni talep oluştur</p>
          </button>

          <button
            onClick={() => router.push("/portal/talepler")}
            className="rounded-3xl border bg-white p-5 text-left shadow-sm active:scale-95"
          >
            <p className="text-3xl">📋</p>
            <p className="mt-3 text-lg font-black">Taleplerim</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Bekleyen: {bekleyenTalepSayisi}
            </p>
          </button>

          <button
            onClick={() => router.push("/portal/canli-konum")}
            className="rounded-3xl border bg-white p-5 text-left shadow-sm active:scale-95"
          >
            <p className="text-3xl">🗺️</p>
            <p className="mt-3 text-lg font-black">Konum</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Takip durumu</p>
          </button>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Bugünkü Vardiya</h2>

          {bugunkuVardiya ? (
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-black">
                {saatYaz(bugunkuVardiya.baslangic_saati)} - {saatYaz(bugunkuVardiya.bitis_saati)}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-600">
                {durumYaz(bugunkuVardiya.durum)}
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
              Bugün için vardiya planı bulunamadı.
            </p>
          )}
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Gelecek 10 Gün</h2>

          <div className="mt-3 space-y-2">
            {vardiyalar.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Vardiya kaydı bulunamadı.
              </p>
            ) : (
              vardiyalar.map((v) => (
                <div key={v.tarih} className="flex items-center justify-between rounded-2xl border bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-black">{tarihYaz(v.tarih)}</p>
                    <p className="text-xs font-semibold text-slate-500">{durumYaz(v.durum)}</p>
                  </div>
                  <p className="text-sm font-black">
                    {saatYaz(v.baslangic_saati)} - {saatYaz(v.bitis_saati)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
