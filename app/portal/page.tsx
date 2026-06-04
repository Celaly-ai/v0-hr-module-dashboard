"use client"

import { useRouter } from "next/navigation"
import {
  Activity,
  BarChart3,
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
}

const KARTLAR: PortalKart[] = [
  {
    baslik: "Yönetim Talepleri",
    aciklama: "Personel taleplerini yönet, onayla veya reddet.",
    yol: "/portal/yonetim/talepler",
    ikon: ShieldCheck,
    renk: "border-blue-200 bg-blue-50 text-blue-900",
    grup: "Yönetim",
  },
  {
    baslik: "Vardiya Yönetimi",
    aciklama: "Personel vardiya planlarını ve çalışma düzenini yönet.",
    yol: "/portal/yonetim/vardiya",
    ikon: CalendarDays,
    renk: "border-violet-200 bg-violet-50 text-violet-900",
    grup: "Yönetim",
  },
  {
    baslik: "Ekip Yönetimi",
    aciklama: "Ekipleri, görev dağılımını ve personel gruplarını yönet.",
    yol: "/portal/yonetim/ekipler",
    ikon: Users,
    renk: "border-cyan-200 bg-cyan-50 text-cyan-900",
    grup: "Yönetim",
  },
  {
    baslik: "Personel Giriş Hesapları",
    aciklama: "Portal giriş hesaplarını oluştur ve yönet.",
    yol: "/portal/personel-hesaplari",
    ikon: UserCog,
    renk: "border-slate-200 bg-slate-50 text-slate-900",
    grup: "Yönetim",
  },
  {
    baslik: "Personel Yükle",
    aciklama: "Personel kayıtlarını toplu veya tekil şekilde yönet.",
    yol: "/portal/personel-yukle",
    ikon: FileSpreadsheet,
    renk: "border-emerald-200 bg-emerald-50 text-emerald-900",
    grup: "Yönetim",
  },
  {
    baslik: "Giriş / Çıkış",
    aciklama: "Personel günlük giriş ve çıkış kayıtları.",
    yol: "/portal/giris-cikis",
    ikon: LogIn,
    renk: "border-green-200 bg-green-50 text-green-900",
    grup: "Personel",
  },
  {
    baslik: "İzin Talebi",
    aciklama: "İzin talepleri oluştur ve takip et.",
    yol: "/portal/izin",
    ikon: ClipboardList,
    renk: "border-orange-200 bg-orange-50 text-orange-900",
    grup: "Personel",
  },
  {
    baslik: "Taleplerim",
    aciklama: "Kendi taleplerini ve süreçlerini görüntüle.",
    yol: "/portal/talepler",
    ikon: ClipboardList,
    renk: "border-yellow-200 bg-yellow-50 text-yellow-900",
    grup: "Personel",
  },
  {
    baslik: "Malzeme / Avadanlık",
    aciklama: "Malzeme ve avadanlık taleplerini yönet.",
    yol: "/portal/malzeme",
    ikon: Package,
    renk: "border-lime-200 bg-lime-50 text-lime-900",
    grup: "Operasyon",
  },
  {
    baslik: "Araçlar",
    aciklama: "Araç kayıtları ve operasyon araç yönetimi.",
    yol: "/portal/araclar",
    ikon: Car,
    renk: "border-zinc-200 bg-zinc-50 text-zinc-900",
    grup: "Operasyon",
  },
  {
    baslik: "Varlıklar",
    aciklama: "Demirbaş, zimmet, fotoğraf ve varlık yönetimi.",
    yol: "/portal/varliklar",
    ikon: Boxes,
    renk: "border-indigo-200 bg-indigo-50 text-indigo-900",
    grup: "Operasyon",
  },
  {
    baslik: "Muhasebe",
    aciklama: "Kasa, ödeme ve muhasebe hareketleri.",
    yol: "/portal/muhasebe",
    ikon: WalletCards,
    renk: "border-teal-200 bg-teal-50 text-teal-900",
    grup: "Finans",
  },
  {
    baslik: "Anket İş Havuzu",
    aciklama: "Tamamlanmış fişleri tekil veya Excel ile anket havuzuna al.",
    yol: "/portal/anket-is-havuzu",
    ikon: FileSpreadsheet,
    renk: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    grup: "Operasyon",
  },
  {
    baslik: "Müşteri Anketi",
    aciklama: "AI destekli müşteri görüşmesi, anketör notu ve sonuç analizi.",
    yol: "/portal/anket",
    ikon: Bot,
    renk: "border-pink-200 bg-pink-50 text-pink-900",
    grup: "Operasyon",
  },
  {
    baslik: "AI Görev Merkezi",
    aciklama: "AI tarafından oluşturulan görevleri izle ve durumlarını yönet.",
    yol: "/portal/ai-gorev-merkezi",
    ikon: Activity,
    renk: "border-red-200 bg-red-50 text-red-900",
    grup: "AI",
  },
  {
    baslik: "AI Canlı Operasyon Merkezi",
    aciklama: "Canlı operasyon, risk, iletişim ve AI karar ekranı.",
    yol: "/portal/ai-canli-operasyon-merkezi",
    ikon: BarChart3,
    renk: "border-purple-200 bg-purple-50 text-purple-900",
    grup: "AI",
  },
]

const GRUPLAR: PortalKart["grup"][] = ["Yönetim", "Operasyon", "AI", "Personel", "Finans"]

export default function PortalPage() {
  const router = useRouter()

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
            Admin hesabı tüm yönetim, operasyon, AI, finans ve personel panellerine buradan erişir.
          </p>
        </div>

        {GRUPLAR.map((grup) => {
          const kartlar = KARTLAR.filter((kart) => kart.grup === grup)

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
