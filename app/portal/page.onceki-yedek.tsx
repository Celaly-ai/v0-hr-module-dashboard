"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  CalendarDays,
  Car,
  ClipboardList,
  FileSpreadsheet,
  LogIn,
  Package,
  ShieldCheck,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react"

type PortalKart = {
  baslik: string
  aciklama: string
  yol: string
  ikon: any
  renk: string
  grup: "Yönetim" | "Operasyon" | "AI" | "Personel" | "Finans"
  roller: string[]
}

const KARTLAR: PortalKart[] = [
  {
    baslik: "Yönetim Talepleri",
    aciklama: "Personel taleplerini yönet, onayla veya reddet.",
    yol: "/portal/yonetim/talepler",
    ikon: ShieldCheck,
    renk: "border-blue-200 bg-blue-50 text-blue-900",
    grup: "Yönetim",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi"],
  },
  {
    baslik: "Yönetici Bildirimleri",
    aciklama: "Anket, AI ve operasyon modüllerinden gelen yönetici takip bildirimlerini izle.",
    yol: "/portal/yonetici-bildirimleri",
    ikon: Bell,
    renk: "border-red-200 bg-red-50 text-red-900",
    grup: "Yönetim",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi"],
  },
  {
    baslik: "Vardiya Yönetimi",
    aciklama: "Personel vardiya planlarını ve çalışma düzenini yönet.",
    yol: "/portal/yonetim/vardiya",
    ikon: CalendarDays,
    renk: "border-violet-200 bg-violet-50 text-violet-900",
    grup: "Yönetim",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi"],
  },
  {
    baslik: "Ekip Yönetimi",
    aciklama: "Ekipleri, görev dağılımını ve personel gruplarını yönet.",
    yol: "/portal/yonetim/ekipler",
    ikon: Users,
    renk: "border-cyan-200 bg-cyan-50 text-cyan-900",
    grup: "Yönetim",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi"],
  },
  {
    baslik: "Personel Giriş Hesapları",
    aciklama: "Portal giriş hesaplarını oluştur ve yönet.",
    yol: "/portal/personel-hesaplari",
    ikon: UserCog,
    renk: "border-slate-200 bg-slate-50 text-slate-900",
    grup: "Yönetim",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi"],
  },
  {
    baslik: "Personel Yükle",
    aciklama: "Personel kayıtlarını toplu veya tekil şekilde yönet.",
    yol: "/portal/personel-yukle",
    ikon: FileSpreadsheet,
    renk: "border-emerald-200 bg-emerald-50 text-emerald-900",
    grup: "Yönetim",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi"],
  },
  {
    baslik: "Giriş / Çıkış",
    aciklama: "Personel günlük giriş ve çıkış kayıtları.",
    yol: "/portal/giris-cikis",
    ikon: LogIn,
    renk: "border-green-200 bg-green-50 text-green-900",
    grup: "Personel",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi", "muhasebe", "finans", "anketor", "anketör", "buro", "büro", "buro_personeli", "büro_personeli", "teknisyen", "montaj_teknisyeni", "ariza_teknisyeni", "arıza_teknisyeni", "nakliye", "calisan", "çalışan"],
  },
  {
    baslik: "İzin Talebi",
    aciklama: "İzin talepleri oluştur ve takip et.",
    yol: "/portal/izin",
    ikon: ClipboardList,
    renk: "border-orange-200 bg-orange-50 text-orange-900",
    grup: "Personel",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi", "muhasebe", "finans", "anketor", "anketör", "buro", "büro", "buro_personeli", "büro_personeli", "teknisyen", "montaj_teknisyeni", "ariza_teknisyeni", "arıza_teknisyeni", "nakliye", "calisan", "çalışan"],
  },
  {
    baslik: "Taleplerim",
    aciklama: "Kendi taleplerini ve süreçlerini görüntüle.",
    yol: "/portal/talepler",
    ikon: ClipboardList,
    renk: "border-yellow-200 bg-yellow-50 text-yellow-900",
    grup: "Personel",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "ik_yoneticisi", "muhasebe", "finans", "anketor", "anketör", "buro", "büro", "buro_personeli", "büro_personeli", "teknisyen", "montaj_teknisyeni", "ariza_teknisyeni", "arıza_teknisyeni", "nakliye", "calisan", "çalışan"],
  },
  {
    baslik: "Malzeme / Avadanlık",
    aciklama: "Malzeme ve avadanlık taleplerini yönet.",
    yol: "/portal/malzeme",
    ikon: Package,
    renk: "border-lime-200 bg-lime-50 text-lime-900",
    grup: "Operasyon",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "teknisyen", "montaj_teknisyeni", "ariza_teknisyeni", "arıza_teknisyeni", "nakliye", "calisan", "çalışan"],
  },
  {
    baslik: "Araçlar",
    aciklama: "Araç kayıtları ve operasyon araç yönetimi.",
    yol: "/portal/araclar",
    ikon: Car,
    renk: "border-zinc-200 bg-zinc-50 text-zinc-900",
    grup: "Operasyon",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi"],
  },
  {
    baslik: "Varlıklar",
    aciklama: "Demirbaş, zimmet, fotoğraf ve varlık yönetimi.",
    yol: "/portal/varliklar",
    ikon: Boxes,
    renk: "border-indigo-200 bg-indigo-50 text-indigo-900",
    grup: "Operasyon",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi"],
  },
  {
    baslik: "Muhasebe",
    aciklama: "Kasa, ödeme ve muhasebe hareketleri.",
    yol: "/portal/muhasebe",
    ikon: WalletCards,
    renk: "border-teal-200 bg-teal-50 text-teal-900",
    grup: "Finans",
    roller: ["admin", "yonetici", "yönetici", "muhasebe", "finans"],
  },
  {
    baslik: "Anket İş Havuzu",
    aciklama: "Tamamlanmış fişleri tekil veya Excel ile anket havuzuna al.",
    yol: "/portal/anket-is-havuzu",
    ikon: FileSpreadsheet,
    renk: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    grup: "Operasyon",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "anketor", "anketör", "buro", "büro", "buro_personeli", "büro_personeli"],
  },
  {
    baslik: "Müşteri Anketi",
    aciklama: "AI destekli müşteri görüşmesi, anketör notu ve sonuç analizi.",
    yol: "/portal/anket",
    ikon: Bot,
    renk: "border-pink-200 bg-pink-50 text-pink-900",
    grup: "Operasyon",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "anketor", "anketör", "buro", "büro", "buro_personeli", "büro_personeli"],
  },
  {
    baslik: "Riskli Anket Takibi",
    aciklama: "Tekrar aranacak, riskli veya yönetici aksiyonu gerektiren müşteri anketlerini takip et.",
    yol: "/portal/anket?odak=tekrar-aranacaklar",
    ikon: AlertTriangle,
    renk: "border-orange-200 bg-orange-50 text-orange-900",
    grup: "Operasyon",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi", "anketor", "anketör", "buro", "büro", "buro_personeli", "büro_personeli"],
  },
  {
    baslik: "AI Görev Merkezi",
    aciklama: "AI tarafından oluşturulan görevleri izle ve durumlarını yönet.",
    yol: "/portal/ai-gorev-merkezi",
    ikon: Activity,
    renk: "border-red-200 bg-red-50 text-red-900",
    grup: "AI",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi"],
  },
  {
    baslik: "AI Canlı Operasyon Merkezi",
    aciklama: "Canlı operasyon, risk, iletişim ve AI karar ekranı.",
    yol: "/portal/ai-canli-operasyon-merkezi",
    ikon: BarChart3,
    renk: "border-purple-200 bg-purple-50 text-purple-900",
    grup: "AI",
    roller: ["admin", "yonetici", "yönetici", "servis_yoneticisi"],
  },
]

const GRUPLAR: PortalKart["grup"][] = ["Yönetim", "Operasyon", "AI", "Personel", "Finans"]

export default function PortalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profileRole, setProfileRole] = useState("")
  const [personelRol, setPersonelRol] = useState("")
  const [kpi, setKpi] = useState({
    aktifPersonel: 0,
    bekleyenAnket: 0,
    acikTalep: 0,
    aiGorev: 0,
    yoneticiBildirim: 0,
    kritikRisk: 0,
    varlik: 0,
  })

  const aktifRol = (profileRole || personelRol || "").toLocaleLowerCase("tr-TR")

  const yukle = useCallback(async () => {
    setLoading(true)

    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    if (!user) {
      router.replace("/portal/giris")
      return
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    setProfileRole(profileData?.role || "")

    const { data: personelData } = await supabase
      .from("personeller")
      .select("rol")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    setPersonelRol(personelData?.rol || "")

    const [
      aktifPersonelCount,
      bekleyenAnketCount,
      acikTalepCount,
      aiGorevCount,
      yoneticiBildirimCount,
      kritikRiskCount,
      varlikCount,
    ] = await Promise.all([
      supabase.from("personeller").select("id", { count: "exact", head: true }).eq("durum", "aktif"),
      supabase.from("ai_anket_is_havuzu").select("id", { count: "exact", head: true }).in("anket_durumu", ["bekliyor", "devam_ediyor"]),
      supabase.from("talepler").select("id", { count: "exact", head: true }).in("durum", ["bekliyor", "acik", "incelemede"]),
      supabase.from("ai_gorev_merkezi").select("id", { count: "exact", head: true }).not("durum", "in", "(tamamlandi,arsivlendi,iptal)"),
      supabase.from("yonetici_bildirimleri").select("id", { count: "exact", head: true }).not("durum", "in", "(tamamlandi,kapandi,arsivlendi)"),
      supabase.from("ai_gorev_merkezi").select("id", { count: "exact", head: true }).in("oncelik", ["kritik", "Kritik", "yüksek", "yuksek", "riskli"]),
      supabase.from("varliklar").select("id", { count: "exact", head: true }),
    ])

    setKpi({
      aktifPersonel: aktifPersonelCount.count || 0,
      bekleyenAnket: bekleyenAnketCount.count || 0,
      acikTalep: acikTalepCount.count || 0,
      aiGorev: aiGorevCount.count || 0,
      yoneticiBildirim: yoneticiBildirimCount.count || 0,
      kritikRisk: kritikRiskCount.count || 0,
      varlik: varlikCount.count || 0,
    })

    setLoading(false)
  }, [router])

  useEffect(() => {
    void yukle()
  }, [yukle])

  const gorunenKartlar = useMemo(() => {
    if (!aktifRol) return []
    return KARTLAR.filter((kart) => kart.roller.includes(aktifRol))
  }, [aktifRol])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Admin Portal
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Yönetim ve Operasyon Paneli
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Yetkinize uygun yönetim, operasyon, AI, finans ve personel panellerine buradan erişebilirsiniz.
          </p>
          <p className="mt-3 inline-flex rounded-full border bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            Rol: {aktifRol || "yükleniyor"}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Aktif Personel</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{kpi.aktifPersonel}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Bekleyen Anket</p>
            <p className="mt-2 text-2xl font-black text-fuchsia-900">{kpi.bekleyenAnket}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Açık Talep</p>
            <p className="mt-2 text-2xl font-black text-orange-900">{kpi.acikTalep}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">AI Görev</p>
            <p className="mt-2 text-2xl font-black text-red-900">{kpi.aiGorev}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Yönetici Bildirimi</p>
            <p className="mt-2 text-2xl font-black text-orange-900">{kpi.yoneticiBildirim}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Kritik / Riskli Görev</p>
            <p className="mt-2 text-2xl font-black text-rose-900">{kpi.kritikRisk}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">Varlık</p>
            <p className="mt-2 text-2xl font-black text-indigo-900">{kpi.varlik}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border bg-white p-6 text-sm font-bold text-slate-600">
            Portal yetkileriniz yükleniyor...
          </div>
        ) : gorunenKartlar.length === 0 ? (
          <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-sm font-bold text-amber-900">
            Bu kullanıcı için portal kart yetkisi bulunamadı. Lütfen personel rolünü kontrol edin.
          </div>
        ) : null}

        {!loading && GRUPLAR.map((grup) => {
          const kartlar = gorunenKartlar.filter((kart) => kart.grup === grup)

          if (kartlar.length === 0) return null

          return (
            <div key={grup} className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                {grup}
              </h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {kartlar.map((kart) => {
                  const Ikon = kart.ikon

                  return (
                    <button
                      key={kart.yol}
                      type="button"
                      onClick={() => router.push(kart.yol)}
                      className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${kart.renk}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black">{kart.baslik}</h3>
                          <p className="mt-2 text-sm opacity-80">{kart.aciklama}</p>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-3">
                          <Ikon className="h-6 w-6" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
