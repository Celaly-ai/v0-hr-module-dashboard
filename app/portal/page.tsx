"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { sirketKunyesiKontrolEt } from "@/lib/services/sirket-kunye-service"
import type { SirketKunyeKontrolSonuc } from "@/lib/types/sirket-kunye"
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
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  Gauge,
  Home,
  Link2,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  Store,
  Trophy,
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
  email?: string | null
  auth_id?: string | null
  kullanici_id?: string | null
}

const ADMIN_ROLLERI = ["admin", "ceo"]

const PERFORMANSIM_MODULU: Modul = {
  kod: "performansim",
  ad: "Performansım",
  aciklama:
    "Kişisel performans puanınızı, sıralamanızı ve gelişim alanlarınızı görüntüleyin.",
  kategori: "standart",
  standart: true,
  aktif: true,
  sira: 6,
}

const PERFORMANS_YONETIM_ROLLERI = new Set([
  "admin",
  "ceo",
  "servis_yoneticisi",
  "ik_yoneticisi",
])

const PERFORMANS_YONETIM_MODULLERI: Modul[] = [
  {
    kod: "performans_yonetim_v2",
    ad: "Performans Yönetim V2",
    aciklama:
      "V2 performans sonuçlarını yönetici görünümünde salt okunur inceleyin.",
    kategori: "performans",
    standart: false,
    aktif: true,
    sira: 71,
  },
  {
    kod: "performans_eslestirme",
    ad: "Performans Eşleştirme",
    aciklama:
      "Performans teknisyen kayıtlarını personel profilleri ile eşleştirin.",
    kategori: "performans",
    standart: false,
    aktif: true,
    sira: 72,
  },
  {
    kod: "performans_veri_girisi",
    ad: "Performans Veri Girişi",
    aciklama:
      "Performans matris verilerini yükleyin ve normalize kayıtları yönetin.",
    kategori: "performans",
    standart: false,
    aktif: true,
    sira: 73,
  },
]

const PERFORMANS_VERI_GIRISI_MODULU = PERFORMANS_YONETIM_MODULLERI.find(
  (modul) => modul.kod === "performans_veri_girisi",
)!

const PERFORMANS_YONETIM_ESKI_KODLARI = new Set(["hizli_performans"])

const PERSONEL_STANDART_MODUL_KODLARI = [
  "mesai",
  "izin",
  "talepler",
  "iletisim",
  "adres_konum_teyit",
  "performansim",
] as const

const PERSONEL_GIZLI_MODUL_KODLARI = new Set([
  "ana_sayfa",
  "profil",
  "vardiya",
])

const KALDIRILAN_MODUL_KODLARI = new Set([
  "urun_kabul",
  "urun_devir",
  "urun_fisleri",
])

const modulYollari: Record<string, string> = {
  ana_sayfa: "/portal/personel-paneli",
  mesai: "/portal/giris-cikis",
  gorevlerim: "/portal/gorevlerim",
  izin: "/portal/izin",
  talepler: "/portal/talepler",
  vardiya: "",
  profil: "/portal/personel-paneli",
  iletisim: "/portal/iletisim",
  adres_konum_teyit: "/portal/adres-konum-teyit",
  performansim: "/portal/performansim",
  performans_yonetim_v2: "/portal/performans-yonetim-v2",
  performans_eslestirme: "/portal/performans-eslestirme",
  performans_veri_girisi: "/portal/hizli-performans",
  adres_konum_rapor: "/portal/adres-konum-rapor",

  yetki_yonetimi: "/portal/yetki-yonetimi",
  rol_atama: "/portal/rol-atama",
  rol_gecmisi: "/portal/rol-gecmisi",
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

  sirket_kunyesi: "/portal/sirket-kunyesi",

  urun_merkezi: "/portal/urun-merkezi",
  cihaz_teslim: "/portal/cihaz-teslim",
  cihaz_iade: "/portal/cihaz-iade",

  anket_is_havuzu: "/portal/anket-is-havuzu",
  musteri_anketi: "/portal/anket",
  riskli_anket_takibi: "/portal/anket?odak=tekrar-aranacaklar",

  ai_gorev_merkezi: "/portal/ai-gorev-merkezi",
  ai_canli_operasyon_merkezi: "/portal/ai-canli-operasyon-merkezi",
  akilli_atama_merkezi: "/portal/akilli-atama-merkezi",
  hizmet_sure_katalogu: "/portal/hizmet-sure-katalogu",

  bayi_operasyon_merkezi: "/portal/bayi-operasyon-merkezi",

  muhasebe: "/portal/muhasebe",
  belge_arsivi: "/portal/belge-arsivi",
}

const modulIkonlari: Record<string, any> = {
  ana_sayfa: Home,
  mesai: LogIn,
  gorevlerim: ClipboardCheck,
  izin: ClipboardList,
  talepler: ClipboardList,
  vardiya: CalendarDays,
  profil: UserCog,
  iletisim: MessageCircle,
  adres_konum_teyit: MapPin,
  performansim: Trophy,
  performans_yonetim_v2: BarChart3,
  performans_eslestirme: Link2,
  performans_veri_girisi: Gauge,
  adres_konum_rapor: MapPin,

  yetki_yonetimi: ShieldCheck,
  rol_atama: UserCog,
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

  sirket_kunyesi: Home,

  urun_merkezi: Boxes,
  cihaz_teslim: Package,
  cihaz_iade: FileSpreadsheet,

  anket_is_havuzu: FileSpreadsheet,
  musteri_anketi: Bot,
  riskli_anket_takibi: AlertTriangle,

  ai_gorev_merkezi: Activity,
  ai_canli_operasyon_merkezi: BarChart3,
  akilli_atama_merkezi: ClipboardCheck,
  hizmet_sure_katalogu: Clock,

  bayi_operasyon_merkezi: Store,

  muhasebe: WalletCards,
  belge_arsivi: FileSpreadsheet,
}

function normalizeRol(value?: string | null) {
  return (value || "").trim().toLocaleLowerCase("tr-TR")
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

function adSoyad(personel: Personel | null) {
  if (!personel) return "Personel"

  return (
    `${personel.ad || ""} ${personel.soyad || ""}`.trim() || "Personel"
  )
}

function kategoriBaslik(kategori: string) {
  if (kategori === "standart") return "Standart Modüller"
  if (kategori === "performans") return "Performans"
  if (kategori === "yonetim") return "Yönetim"
  if (kategori === "operasyon") return "Operasyon"
  if (kategori === "anket") return "Anket"
  if (kategori === "ai") return "AI"
  if (kategori === "finans") return "Finans"

  return kategori
}

function performansModulunuGarantiEt(moduller: Modul[]) {
  const performansModuluVar = moduller.some(
    (modul) => modul.kod === PERFORMANSIM_MODULU.kod,
  )

  if (performansModuluVar) {
    return moduller.map((modul) => {
      if (modul.kod !== PERFORMANSIM_MODULU.kod) {
        return modul
      }

      return {
        ...modul,
        ad: PERFORMANSIM_MODULU.ad,
        aciklama: PERFORMANSIM_MODULU.aciklama,
        kategori: "standart",
        standart: true,
        aktif: true,
      }
    })
  }

  return [...moduller, PERFORMANSIM_MODULU]
}

function performansYonetimRoluMu(rol?: string | null) {
  return PERFORMANS_YONETIM_ROLLERI.has(normalizeRol(rol))
}

function performansYonetimModulleriniEkle(moduller: Modul[], rol?: string | null) {
  if (!performansYonetimRoluMu(rol)) {
    return moduller
  }

  const yonetimTanimlari = new Map(
    PERFORMANS_YONETIM_MODULLERI.map((modul) => [modul.kod, modul]),
  )

  const temizModuller = moduller.filter(
    (modul) => !PERFORMANS_YONETIM_ESKI_KODLARI.has(modul.kod),
  )

  const mevcutKodlar = new Set(temizModuller.map((modul) => modul.kod))

  const birlestirilmis = temizModuller.map((modul) => {
    const tanim = yonetimTanimlari.get(modul.kod)

    if (!tanim) {
      return modul
    }

    return {
      ...modul,
      ...tanim,
    }
  })

  const eklenecek = PERFORMANS_YONETIM_MODULLERI.filter(
    (modul) => !mevcutKodlar.has(modul.kod),
  )

  return [...birlestirilmis, ...eklenecek]
}

function performansVeriGirisiModulunuGarantiEt(
  moduller: Modul[],
  rol?: string | null,
  adminMi = false,
) {
  if (!performansYonetimRoluMu(rol) && !adminMi) {
    return moduller
  }

  const veriGirisiVar = moduller.some(
    (modul) => modul.kod === PERFORMANS_VERI_GIRISI_MODULU.kod,
  )

  if (veriGirisiVar) {
    return moduller
  }

  return [...moduller, PERFORMANS_VERI_GIRISI_MODULU]
}

export default function PortalPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [modulLoading, setModulLoading] = useState(true)
  const [hata, setHata] = useState("")
  const [personel, setPersonel] = useState<Personel | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [moduller, setModuller] = useState<Modul[]>([])
  const [yetkiliModulKodlari, setYetkiliModulKodlari] = useState<string[]>(
    [],
  )

  const [kunyeKontrol, setKunyeKontrol] =
    useState<SirketKunyeKontrolSonuc | null>(null)

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
      router.replace("/login")
      return
    }

    const { data: personelListesi, error: personelError } = await supabase
      .from("personeller")
      .select(
        "id, ad, soyad, rol, unvan, email, auth_id, kullanici_id",
      )
      .or(
        `auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email}`,
      )
      .limit(10)

    if (personelError) {
      setHata(
        "Personel kaydı kontrol edilirken hata oluştu: " +
          personelError.message,
      )

      setLoading(false)
      setModulLoading(false)

      return
    }

    const personeller = (personelListesi || []) as Personel[]

    const personelData =
      personeller.find((p) => p.auth_id === user.id) ||
      personeller.find((p) => p.kullanici_id === user.id) ||
      personeller.find(
        (p) => normalizeEmail(p.email) === normalizeEmail(user.email),
      ) ||
      personeller[0] ||
      null

    if (!personelData) {
      setHata("Bu kullanıcı için personel kaydı bulunamadı.")

      setLoading(false)
      setModulLoading(false)

      return
    }

    const aktifRol = normalizeRol(personelData.rol)
    const adminMi = ADMIN_ROLLERI.includes(aktifRol)

    setPersonel(personelData)
    setIsAdmin(adminMi)

    const kunyeSonuc = await sirketKunyesiKontrolEt(
      supabase,
      user.id,
      user.email,
    )

    setKunyeKontrol(kunyeSonuc)

    if (!kunyeSonuc.tamam) {
      setModuller([])
      setYetkiliModulKodlari([])
      setLoading(false)
      setModulLoading(false)

      return
    }

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

    const garantiModuller = performansModulunuGarantiEt(
      (modulData || []) as Modul[],
    )
    const rolTabanliModuller = performansYonetimModulleriniEkle(
      garantiModuller,
      aktifRol,
    )

    let yetkiKodlari: string[] = []

    if (!adminMi) {
      const { data: yetkiData, error: yetkiError } = await supabase
        .from("personel_modul_yetkileri")
        .select("modul_kod")
        .eq("personel_id", personelData.id)
        .eq("aktif", true)

      if (yetkiError) {
        setHata("Modül yetkileri okunamadı: " + yetkiError.message)

        setModuller(rolTabanliModuller)
        setYetkiliModulKodlari([])
        setLoading(false)
        setModulLoading(false)

        return
      }

      yetkiKodlari = (yetkiData || [])
        .map((item) => item.modul_kod)
        .filter(Boolean) as string[]
    }

    setModuller(rolTabanliModuller)
    setYetkiliModulKodlari(yetkiKodlari)
    setLoading(false)
    setModulLoading(false)
  }, [router])

  useEffect(() => {
    void yukle()
  }, [yukle])

  const standartModuller = useMemo(() => {
    const kodSirasi = new Map<string, number>(
      PERSONEL_STANDART_MODUL_KODLARI.map((kod, index) => [
        kod,
        index,
      ]),
    )

    return moduller
      .filter(
        (modul) =>
          modul.standart &&
          kodSirasi.has(modul.kod) &&
          !KALDIRILAN_MODUL_KODLARI.has(modul.kod),
      )
      .sort(
        (a, b) =>
          (kodSirasi.get(a.kod) ?? 99) -
          (kodSirasi.get(b.kod) ?? 99),
      )
  }, [moduller])

  const opsiyonelModuller = useMemo(() => {
    const filtre = (modul: Modul) =>
      !PERSONEL_GIZLI_MODUL_KODLARI.has(modul.kod) &&
      !KALDIRILAN_MODUL_KODLARI.has(modul.kod)

    const performansYonetimGorebilir = performansYonetimRoluMu(personel?.rol)

    const filtrelenmis = moduller.filter((modul) => {
      if (!filtre(modul)) {
        return false
      }

      if (
        modul.kod === PERFORMANS_VERI_GIRISI_MODULU.kod &&
        (performansYonetimGorebilir || isAdmin)
      ) {
        return true
      }

      if (modul.standart) {
        return false
      }

      if (modul.kategori === "performans" && performansYonetimGorebilir) {
        return true
      }

      if (isAdmin) {
        return true
      }

      return yetkiliModulKodlari.includes(modul.kod)
    })

    return performansVeriGirisiModulunuGarantiEt(
      filtrelenmis,
      personel?.rol,
      isAdmin,
    )
  }, [moduller, isAdmin, yetkiliModulKodlari, personel?.rol])

  const opsiyonelGruplar = useMemo(() => {
    const kategoriSirasi = [
      "performans",
      "yonetim",
      "operasyon",
      "anket",
      "ai",
      "finans",
    ]

    return kategoriSirasi
      .map((kategori) => ({
        kategori,
        moduller: opsiyonelModuller.filter(
          (modul) => modul.kategori === kategori,
        ),
      }))
      .filter((grup) => grup.moduller.length > 0)
  }, [opsiyonelModuller])

  async function cikisYap() {
    const supabase = createClient()

    await supabase.auth.signOut()

    router.replace("/login")
  }

  function modulAc(modul: Modul) {
    const yol = modulYollari[modul.kod]

    if (!yol) return

    router.push(yol)
  }

  function ModulKart({
    modul,
    opsiyonel = false,
  }: {
    modul: Modul
    opsiyonel?: boolean
  }) {
    const Ikon = modulIkonlari[modul.kod] || Package
    const tiklanabilir = Boolean(modulYollari[modul.kod])
    const performansModulu = modul.kod === "performansim"

    return (
      <button
        type="button"
        onClick={() => tiklanabilir && modulAc(modul)}
        disabled={!tiklanabilir}
        className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${
          tiklanabilir
            ? "hover:-translate-y-0.5 hover:shadow-md"
            : "opacity-80"
        } ${
          performansModulu
            ? "border-blue-700 bg-gradient-to-br from-blue-700 to-blue-950 text-white"
            : opsiyonel
              ? "border-slate-200 bg-slate-50 text-slate-900"
              : "border-slate-950 bg-white text-slate-950"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black">{modul.ad}</h3>

            <p
              className={`mt-2 text-sm font-semibold ${
                performansModulu ? "text-blue-100" : "opacity-75"
              }`}
            >
              {modul.aciklama || "-"}
            </p>
          </div>

          <div
            className={`rounded-2xl p-3 ${
              performansModulu
                ? "bg-white/15 text-white"
                : "bg-white/80"
            }`}
          >
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
            {adSoyad(personel)} için standart modüller ve kişi bazlı
            opsiyonel modüller.
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
          <h2 className="text-lg font-black">
            Standart Yetki Kuralı
          </h2>

          <p className="mt-2 text-sm font-bold">
            Giriş/Çıkış, izin, talepler, iletişim, adres/konum teyidi ve
            kişisel Performansım merkezi tüm personellerde standarttır.
            Vardiya bilgileri Giriş/Çıkış ekranında görüntülenir. Diğer
            modüller admin tarafından kişi bazlı açılır.
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
        ) : kunyeKontrol && !kunyeKontrol.tamam ? (
          <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
            <h2 className="text-lg font-black">
              Şirket Künyesi Tamamlanmadı
            </h2>

            <p className="mt-2 text-sm font-bold">
              Şirket künyesi uygulamanın ana konfigürasyon kaynağıdır.
              Künye tamamlanmadan portal modülleri kullanılamaz.
            </p>

            {kunyeKontrol.hata && (
              <p className="mt-3 text-sm font-bold text-red-800">
                {kunyeKontrol.hata}
              </p>
            )}

            {kunyeKontrol.eksikler.length > 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-amber-400 bg-white/70 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                  Eksik Alanlar
                </p>

                <div className="mt-3 space-y-2">
                  {kunyeKontrol.eksikler.map((eksik) => (
                    <div
                      key={eksik}
                      className="rounded-xl bg-amber-100/70 px-3 py-2 text-sm font-bold text-amber-950"
                    >
                      {eksik}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin ? (
              <button
                type="button"
                onClick={() =>
                  router.push("/portal/sirket-kunyesi")
                }
                className="mt-5 w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white shadow-sm hover:bg-blue-800"
              >
                Şirket Künyesine Git
              </button>
            ) : (
              <p className="mt-5 text-sm font-black">
                Şirket künyesi tamamlanmadan modüller kullanılamaz.
                Yöneticinizle görüşün.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                {kategoriBaslik("standart")}
              </h2>

              <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
                {standartModuller.map((modul) => (
                  <ModulKart
                    key={modul.kod}
                    modul={modul}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                Opsiyonel Modüller
              </h2>

              {opsiyonelModuller.length === 0 ? (
                <div className="rounded-3xl border bg-white p-6 text-sm font-bold text-slate-600">
                  Ek modül yetkiniz bulunmuyor. Opsiyonel modüller sadece
                  admin tarafından kişi bazlı açılır.
                </div>
              ) : (
                <div className="space-y-6">
                  {opsiyonelGruplar.map((grup) => (
                    <div
                      key={grup.kategori}
                      className="space-y-3"
                    >
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                        {kategoriBaslik(grup.kategori)}
                      </h3>

                      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {grup.moduller.map((modul) => (
                          <ModulKart
                            key={modul.kod}
                            modul={modul}
                            opsiyonel
                          />
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