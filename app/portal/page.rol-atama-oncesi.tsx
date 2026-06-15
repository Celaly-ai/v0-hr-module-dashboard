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
  Home,
  LogIn,
  LogOut,
  Package,
  ShieldCheck,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react"

type Modul = {
  kod: string
  ad: string
  aciklama: string | null
  kategori: string
  standart: boolean
  aktif: boolean
  sira: number
}

type Personel = {
  id: string
  ad: string | null
  soyad: string | null
  rol: string | null
  unvan: string | null
}

const ADMIN_ROLLERI = ["admin", "ceo"]

const modulYollari: Record<string, string> = {
  ana_sayfa: "/portal",
  mesai: "/portal/giris-cikis",
  izin: "/portal/izin",
  talepler: "/portal/talepler",
  vardiya: "/portal/personel-paneli",
  profil: "/portal/personel-paneli",

  yetki_yonetimi: "/portal/yetki-yonetimi",
  mesai_raporlari: "/portal/mesai-raporu",
  yonetim_talepleri: "/portal/yonetim/talepler",
  yonetici_bildirimleri: "/portal/yonetici-bildirimleri",
  vardiya_yonetimi: "/portal/yonetim/vardiya",
  ekip_yonetimi: "/portal/yonetim/ekipler",
  personel_hesaplari: "/portal/personel-hesaplari",
  personel_yukle: "/portal/personel-yukle",

  malzeme: "/portal/malzeme",
  araclar: "/portal/araclar",
  varliklar: "/portal/varliklar",

  anket_is_havuzu: "/portal/anket-is-havuzu",
  musteri_anketi: "/portal/anket",
  riskli_anket_takibi: "/portal/anket?odak=tekrar-aranacaklar",

  ai_gorev_merkezi: "/portal/ai-gorev-merkezi",
  ai_canli_operasyon_merkezi: "/portal/ai-canli-operasyon-merkezi",

  muhasebe: "/portal/muhasebe",
  belge_arsivi: "/portal/belge-arsivi",
}

const modulIkonlari: Record<string, any> = {
  ana_sayfa: Home,
  mesai: LogIn,
  izin: ClipboardList,
  talepler: ClipboardList,
  vardiya: CalendarDays,
  profil: UserCog,

  yetki_yonetimi: ShieldCheck,
  mesai_raporlari: FileSpreadsheet,
  yonetim_talepleri: ShieldCheck,
  yonetici_bildirimleri: Bell,
  vardiya_yonetimi: CalendarDays,
  ekip_yonetimi: Users,
  personel_hesaplari: UserCog,
  personel_yukle: FileSpreadsheet,

  malzeme: Package,
  araclar: Car,
  varliklar: Boxes,

  anket_is_havuzu: FileSpreadsheet,
  musteri_anketi: Bot,
  riskli_anket_takibi: AlertTriangle,

  ai_gorev_merkezi: Activity,
  ai_canli_operasyon_merkezi: BarChart3,

  muhasebe: WalletCards,
  belge_arsivi: FileSpreadsheet,
}

function normalizeRol(value?: string | null) {
  return (value || "").trim().toLocaleLowerCase("tr-TR")
}

function adSoyad(personel: Personel | null) {
  if (!personel) return "Personel"
  return `${personel.ad || ""} ${personel.soyad || ""}`.trim() || "Personel"
}

function kategoriBaslik(kategori: string) {
  if (kategori === "standart") return "Standart Modüller"
  if (kategori === "yonetim") return "Yönetim"
  if (kategori === "operasyon") return "Operasyon"
  if (kategori === "anket") return "Anket"
  if (kategori === "ai") return "AI"
  if (kategori === "finans") return "Finans"
  return kategori
}

export default function PortalPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [modulLoading, setModulLoading] = useState(true)
  const [hata, setHata] = useState("")
  const [personel, setPersonel] = useState<Personel | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [moduller, setModuller] = useState<Modul[]>([])
  const [yetkiliModulKodlari, setYetkiliModulKodlari] = useState<string[]>([])

  const yukle = useCallback(async () => {
    setLoading(true)
    setModulLoading(true)
    setHata("")

    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    if (!user) {
      router.replace("/portal/giris")
      return
    }

    const { data: personelData, error: personelError } = await supabase
      .from("personeller")
      .select("id, ad, soyad, rol, unvan")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    if (personelError || !personelData) {
      setHata("Bu kullanıcı için personel kaydı bulunamadı.")
      setLoading(false)
      setModulLoading(false)
      return
    }

    const aktifRol = normalizeRol(personelData.rol)
    const adminMi = ADMIN_ROLLERI.includes(aktifRol)

    setPersonel(personelData as Personel)
    setIsAdmin(adminMi)

    const { data: modulData, error: modulError } = await supabase
      .from("moduller")
      .select("kod, ad, aciklama, kategori, standart, aktif, sira")
      .eq("aktif", true)
      .order("sira", { ascending: true })

    if (modulError) {
      setHata("Modüller okunamadı: " + modulError.message)
      setModuller([])
      setYetkiliModulKodlari([])
      setLoading(false)
      setModulLoading(false)
      return
    }

    let yetkiKodlari: string[] = []

    if (!adminMi) {
      const { data: yetkiData, error: yetkiError } = await supabase
        .from("personel_modul_yetkileri")
        .select("modul_kod")
        .eq("personel_id", personelData.id)
        .eq("aktif", true)

      if (yetkiError) {
        setHata("Modül yetkileri okunamadı: " + yetkiError.message)
        setModuller((modulData || []) as Modul[])
        setYetkiliModulKodlari([])
        setLoading(false)
        setModulLoading(false)
        return
      }

      yetkiKodlari = (yetkiData || [])
        .map((item) => item.modul_kod)
        .filter(Boolean) as string[]
    }

    setModuller((modulData || []) as Modul[])
    setYetkiliModulKodlari(yetkiKodlari)
    setLoading(false)
    setModulLoading(false)
  }, [router])

  useEffect(() => {
    void yukle()
  }, [yukle])

  const standartModuller = useMemo(() => {
    return moduller.filter((modul) => modul.standart)
  }, [moduller])

  const opsiyonelModuller = useMemo(() => {
    if (isAdmin) return moduller.filter((modul) => !modul.standart)

    return moduller.filter((modul) => {
      return !modul.standart && yetkiliModulKodlari.includes(modul.kod)
    })
  }, [moduller, isAdmin, yetkiliModulKodlari])

  const opsiyonelGruplar = useMemo(() => {
    const kategoriSirasi = ["yonetim", "operasyon", "anket", "ai", "finans"]

    return kategoriSirasi
      .map((kategori) => ({
        kategori,
        moduller: opsiyonelModuller.filter((modul) => modul.kategori === kategori),
      }))
      .filter((grup) => grup.moduller.length > 0)
  }, [opsiyonelModuller])

  async function cikisYap() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/portal/giris")
  }

  function modulAc(modul: Modul) {
    const yol = modulYollari[modul.kod]

    if (!yol) return

    router.push(yol)
  }

  function ModulKart({ modul, opsiyonel = false }: { modul: Modul; opsiyonel?: boolean }) {
    const Ikon = modulIkonlari[modul.kod] || Package
    const tiklanabilir = Boolean(modulYollari[modul.kod])

    return (
      <button
        type="button"
        onClick={() => tiklanabilir && modulAc(modul)}
        disabled={!tiklanabilir}
        className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${
          tiklanabilir ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-80"
        } ${
          opsiyonel
            ? "border-slate-200 bg-slate-50 text-slate-900"
            : "border-slate-950 bg-white text-slate-950"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black">{modul.ad}</h3>
            <p className="mt-2 text-sm font-semibold opacity-75">
              {modul.aciklama || "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/80 p-3">
            <Ikon className="h-6 w-6" />
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6 overflow-hidden">
        <div className="rounded-3xl border border-slate-950 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            FeyRoute Personel
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Portal
          </h1>

          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
            {adSoyad(personel)} için standart modüller ve kişi bazlı opsiyonel modüller.
          </p>

          <p className="mt-3 inline-flex rounded-full border bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            Rol: {personel?.rol || (isAdmin ? "admin" : "çalışan")}
          </p>
        </div>

        <button
          type="button"
          onClick={cikisYap}
          className="w-full rounded-2xl bg-red-600 px-4 py-4 text-base font-black text-white shadow-sm"
        >
          <span className="inline-flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Çıkış Yap
          </span>
        </button>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          <h2 className="text-lg font-black">Standart Yetki Kuralı</h2>
          <p className="mt-2 text-sm font-bold">
            Mesai, izin, talepler, vardiya ve profil tüm personellerde standarttır.
            Diğer modüller admin tarafından kişi bazlı açılır.
          </p>
        </div>

        {loading || modulLoading ? (
          <div className="rounded-3xl border bg-white p-6 text-sm font-bold text-slate-600">
            Portal modülleri yükleniyor...
          </div>
        ) : hata ? (
          <div className="rounded-3xl border border-red-300 bg-red-50 p-6 text-sm font-bold text-red-900">
            {hata}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                {kategoriBaslik("standart")}
              </h2>

              <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
                {standartModuller.map((modul) => (
                  <ModulKart key={modul.kod} modul={modul} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                Opsiyonel Modüller
              </h2>

              {opsiyonelModuller.length === 0 ? (
                <div className="rounded-3xl border bg-white p-6 text-sm font-bold text-slate-600">
                  Ek modül yetkiniz bulunmuyor. Opsiyonel modüller sadece admin tarafından kişi bazlı açılır.
                </div>
              ) : (
                <div className="space-y-6">
                  {opsiyonelGruplar.map((grup) => (
                    <div key={grup.kategori} className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                        {kategoriBaslik(grup.kategori)}
                      </h3>

                      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {grup.moduller.map((modul) => (
                          <ModulKart key={modul.kod} modul={modul} opsiyonel />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
