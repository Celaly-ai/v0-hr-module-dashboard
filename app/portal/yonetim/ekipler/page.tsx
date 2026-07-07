"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

function ekipAktifMi(ekip: { aktif?: boolean | null; durum?: string | null }) {
  const durum = String(ekip.durum ?? "").trim().toLowerCase()
  if (ekip.aktif === false || durum === "pasif") return false
  if (ekip.aktif === true || durum === "aktif") return true
  return false
}

function personelAktifMi(personel: { durum?: string | null }) {
  return String(personel.durum ?? "").trim().toLowerCase() === "aktif"
}

type GorevTipiKayit = {
  kod: string
  ad: string
  sira: number
}

const GOREV_TIPI_FALLBACK: GorevTipiKayit[] = [
  { kod: "ariza", ad: "Arıza", sira: 10 },
  { kod: "montaj", ad: "Montaj", sira: 20 },
  { kod: "nakliye", ad: "Nakliye", sira: 30 },
  { kod: "nakliye_montaj", ad: "Nakliye + Montaj", sira: 40 },
  { kod: "servis", ad: "Genel Servis", sira: 50 },
]

function gorevTipiEtiketi(value: string | null | undefined, kayitlar: GorevTipiKayit[]) {
  return kayitlar.find((kayit) => kayit.kod === value)?.ad || value || "-"
}

function gorevTipiGecerliMi(value: string | null | undefined, secenekler: { kod: string }[]) {
  return secenekler.some((secenek) => secenek.kod === value)
}

type CalismaTipiKayit = {
  kod: string
  ad: string
  sira: number
}

const CALISMA_TIPI_KODLARI = [
  "normal",
  "joker",
  "mobil",
  "proje",
  "gece",
  "hafta_sonu",
  "vip",
  "yedek",
] as const

const CALISMA_TIPI_KOD_SET = new Set<string>(CALISMA_TIPI_KODLARI)

const CALISMA_TIPI_FALLBACK: CalismaTipiKayit[] = [
  { kod: "normal", ad: "Normal", sira: 10 },
  { kod: "joker", ad: "Joker", sira: 20 },
  { kod: "mobil", ad: "Mobil", sira: 30 },
  { kod: "proje", ad: "Proje", sira: 40 },
  { kod: "gece", ad: "Gece", sira: 50 },
  { kod: "hafta_sonu", ad: "Hafta Sonu", sira: 60 },
  { kod: "vip", ad: "VIP", sira: 70 },
  { kod: "yedek", ad: "Yedek", sira: 80 },
]

function calismaTipiSecenekleriniHazirla(kayitlar: CalismaTipiKayit[]) {
  const filtrelenmis = kayitlar.filter((kayit) => CALISMA_TIPI_KOD_SET.has(kayit.kod))
  const kaynak = filtrelenmis.length > 0 ? filtrelenmis : CALISMA_TIPI_FALLBACK
  return [...kaynak].sort((a, b) => a.sira - b.sira)
}

function calismaTipiEtiketi(value: string | null | undefined, kayitlar: CalismaTipiKayit[]) {
  return kayitlar.find((kayit) => kayit.kod === value)?.ad || value || "-"
}

function calismaTipiGecerliMi(value: string | null | undefined, secenekler: { kod: string }[]) {
  return secenekler.some((secenek) => secenek.kod === value)
}

const ONCELIK_SEVIYELERI = [
  { deger: 10, etiket: "🔴 Kritik" },
  { deger: 30, etiket: "🟠 Yüksek" },
  { deger: 50, etiket: "🟡 Normal" },
  { deger: 70, etiket: "🔵 Düşük" },
  { deger: 90, etiket: "⚪ Yedek" },
] as const

const VARSAYILAN_ONCELIK = 50

const JOKER_BILGI_METNI =
  "Joker ekipler AI tarafından acil işler ve yük dengeleme için öncelikli değerlendirilebilir."

function oncelikDegeri(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? "").trim())
  const gecerliSeviye = ONCELIK_SEVIYELERI.find((seviye) => seviye.deger === parsed)
  if (gecerliSeviye) return gecerliSeviye.deger
  if (!Number.isFinite(parsed)) return VARSAYILAN_ONCELIK

  return ONCELIK_SEVIYELERI.reduce((enYakin, seviye) =>
    Math.abs(seviye.deger - parsed) < Math.abs(enYakin.deger - parsed) ? seviye : enYakin,
  ).deger
}

function oncelikSelectDegeri(value: string | number | null | undefined) {
  return String(oncelikDegeri(value))
}

function oncelikEtiketi(value: string | number | null | undefined) {
  const hedef = oncelikDegeri(value)
  return ONCELIK_SEVIYELERI.find((seviye) => seviye.deger === hedef)?.etiket || "🟡 Normal"
}

function ekipAdiNormalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase()
}

function aktifEkipAdiVarMi(
  ekipAdi: string,
  kaynak: { ekip_adi?: string | null; aktif?: boolean | null; durum?: string | null }[],
) {
  const hedef = ekipAdiNormalize(ekipAdi)
  if (!hedef) return false
  return kaynak.some(
    (ekip) => ekipAktifMi(ekip) && ekipAdiNormalize(ekip.ekip_adi) === hedef,
  )
}

function ekipUyesiAktifMi(uye: { durum?: string | null; aktif?: boolean | null }) {
  if (uye.aktif === false) return false
  if (uye.aktif === true) return true
  return String(uye.durum ?? "").trim().toLowerCase() === "aktif"
}

type EkipUyeKayit = {
  id?: string
  ekip_id?: string
  personel_id: string
  rol?: string | null
  durum?: string | null
  aktif?: boolean | null
}

type EkipOzet = {
  id: string
  lider_personel_id?: string | null
  sorumlu_personel_id?: string | null
  arac_varlik_id?: string | null
  bolge?: string | null
  gorev?: string | null
  gorev_tipi?: string | null
  calisma_tipi?: string | null
  oncelik?: number | null
  aciklama?: string | null
  durum?: string | null
  aktif?: boolean | null
}

const LIDER_CAKISMA_MESAJI =
  "Seçilen lider başka aktif ekipte görevli. Lider aynı anda yalnızca bir aktif ekipte olabilir."

const ELEMAN_CAKISMA_MESAJI =
  "Seçilen personel başka aktif ekipte görevli. Aynı anda yalnızca bir aktif ekipte eleman veya lider olabilir."

function kullaniciHataMesaji(varsayilan: string) {
  return varsayilan
}

function aktifEkipIdSeti(
  ekipListesi: { id: string; aktif?: boolean | null; durum?: string | null }[],
  haricEkipId?: string,
) {
  return new Set(
    ekipListesi
      .filter((ekip) => ekipAktifMi(ekip) && ekip.id !== haricEkipId)
      .map((ekip) => ekip.id),
  )
}

function personelBaskaAktifEkipteLiderVeyaElemanMi(
  personelId: string,
  ekipListesi: EkipOzet[],
  uyeListesi: EkipUyeKayit[],
  haricEkipId?: string,
) {
  const aktifEkipIdler = aktifEkipIdSeti(ekipListesi, haricEkipId)

  const baskaEkipteLider = ekipListesi.some(
    (ekip) =>
      aktifEkipIdler.has(ekip.id) && ekip.lider_personel_id === personelId,
  )

  if (baskaEkipteLider) return true

  return uyeListesi.some(
    (uye) =>
      uye.personel_id === personelId &&
      ekipUyesiAktifMi(uye) &&
      uye.ekip_id &&
      aktifEkipIdler.has(uye.ekip_id) &&
      (uye.rol === "lider" || uye.rol === "eleman"),
  )
}

async function liderAtamasiGecerliMi(
  supabase: ReturnType<typeof createClient>,
  personelId: string,
  haricEkipId?: string,
) {
  const { data: ekipData, error: ekipError } = await supabase
    .from("ekipler")
    .select("id, lider_personel_id, durum, aktif")

  if (ekipError) {
    return { gecerli: false, mesaj: kullaniciHataMesaji("Ekip kontrolü yapılamadı.") }
  }

  const { data: uyeData, error: uyeError } = await supabase
    .from("ekip_uyeleri")
    .select("id, ekip_id, personel_id, rol, durum, aktif")
    .eq("personel_id", personelId)

  if (uyeError) {
    return { gecerli: false, mesaj: kullaniciHataMesaji("Üyelik kontrolü yapılamadı.") }
  }

  const gecersiz = personelBaskaAktifEkipteLiderVeyaElemanMi(
    personelId,
    ekipData || [],
    uyeData || [],
    haricEkipId,
  )

  if (gecersiz) {
    return { gecerli: false, mesaj: LIDER_CAKISMA_MESAJI }
  }

  return { gecerli: true }
}

async function elemanAtamasiGecerliMi(
  supabase: ReturnType<typeof createClient>,
  personelId: string,
  hedefEkipId: string,
) {
  return liderAtamasiGecerliMi(supabase, personelId, hedefEkipId).then((sonuc) => {
    if (!sonuc.gecerli) {
      return { gecerli: false, mesaj: ELEMAN_CAKISMA_MESAJI }
    }
    return sonuc
  })
}

async function ekipUyesiKaydet(
  supabase: ReturnType<typeof createClient>,
  ekipId: string,
  personelId: string,
  rol: "lider" | "sorumlu" | "eleman",
) {
  const { data: mevcutUye, error: kontrolError } = await supabase
    .from("ekip_uyeleri")
    .select("id")
    .eq("ekip_id", ekipId)
    .eq("personel_id", personelId)
    .maybeSingle()

  if (kontrolError) {
    return { ok: false as const, mesaj: kullaniciHataMesaji("Üyelik kaydı kontrol edilemedi.") }
  }

  if (mevcutUye?.id) {
    const { error } = await supabase
      .from("ekip_uyeleri")
      .update({
        rol,
        durum: "aktif",
        aktif: true,
      })
      .eq("id", mevcutUye.id)

    if (error) {
      return { ok: false as const, mesaj: kullaniciHataMesaji("Ekip üyeliği güncellenemedi.") }
    }

    return { ok: true as const }
  }

  const { error } = await supabase.from("ekip_uyeleri").insert({
    ekip_id: ekipId,
    personel_id: personelId,
    rol,
    durum: "aktif",
    aktif: true,
  })

  if (error) {
    return { ok: false as const, mesaj: kullaniciHataMesaji("Ekip üyeliği oluşturulamadı.") }
  }

  return { ok: true as const }
}

async function ekipLiderSorumluUyeleriniOlustur(
  supabase: ReturnType<typeof createClient>,
  ekipId: string,
  liderPersonelId: string,
  sorumluPersonelId: string,
) {
  if (liderPersonelId === sorumluPersonelId) {
    return ekipUyesiKaydet(supabase, ekipId, liderPersonelId, "lider")
  }

  const liderSonuc = await ekipUyesiKaydet(supabase, ekipId, liderPersonelId, "lider")
  if (!liderSonuc.ok) return liderSonuc

  return ekipUyesiKaydet(supabase, ekipId, sorumluPersonelId, "sorumlu")
}

async function ekipUyeleriniSenkronize(
  supabase: ReturnType<typeof createClient>,
  ekipId: string,
  liderPersonelId: string,
  sorumluPersonelId: string,
) {
  const { data: mevcutUyeler, error: uyeError } = await supabase
    .from("ekip_uyeleri")
    .select("id, personel_id, rol, durum, aktif")
    .eq("ekip_id", ekipId)

  if (uyeError) {
    return { ok: false as const, mesaj: kullaniciHataMesaji("Üyelik bilgileri okunamadı.") }
  }

  const liderSorumluKayitlari = (mevcutUyeler || []).filter(
    (uye) => uye.rol === "lider" || uye.rol === "sorumlu",
  )

  for (const uye of liderSorumluKayitlari) {
    if (!uye.id) continue
    const { error } = await supabase.from("ekip_uyeleri").delete().eq("id", uye.id)
    if (error) {
      return { ok: false as const, mesaj: kullaniciHataMesaji("Eski üyelik kayıtları temizlenemedi.") }
    }
  }

  const liderSorumluAyni = liderPersonelId === sorumluPersonelId
  const hedefPersonelIdler = liderSorumluAyni
    ? [liderPersonelId]
    : [liderPersonelId, sorumluPersonelId]

  for (const personelId of hedefPersonelIdler) {
    const { data: mevcutKayit } = await supabase
      .from("ekip_uyeleri")
      .select("id, rol")
      .eq("ekip_id", ekipId)
      .eq("personel_id", personelId)
      .maybeSingle()

    if (mevcutKayit?.id && mevcutKayit.rol === "eleman") {
      const { error } = await supabase.from("ekip_uyeleri").delete().eq("id", mevcutKayit.id)
      if (error) {
        return { ok: false as const, mesaj: kullaniciHataMesaji("Eski üyelik kayıtları temizlenemedi.") }
      }
    }
  }

  return ekipLiderSorumluUyeleriniOlustur(
    supabase,
    ekipId,
    liderPersonelId,
    sorumluPersonelId,
  )
}

async function olusturulanEkipSil(
  supabase: ReturnType<typeof createClient>,
  ekipId: string,
) {
  await supabase.from("ekip_uyeleri").delete().eq("ekip_id", ekipId)
  await supabase.from("ekipler").delete().eq("id", ekipId)
}

export default function YonetimEkiplerPage() {
  const router = useRouter()

  const [personeller, setPersoneller] = useState<any[]>([])
  const [araclar, setAraclar] = useState<any[]>([])
  const [ekipler, setEkipler] = useState<any[]>([])
  const [uyeler, setUyeler] = useState<any[]>([])
  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [durumGuncelleniyorId, setDurumGuncelleniyorId] = useState("")
  const [uyeEkleniyor, setUyeEkleniyor] = useState(false)
  const [duzenlenenEkipId, setDuzenlenenEkipId] = useState("")
  const [duzenlemeForm, setDuzenlemeForm] = useState({
    lider_personel_id: "",
    sorumlu_personel_id: "",
    arac_varlik_id: "",
    gorev_tipi: "",
    calisma_tipi: "",
    oncelik: "",
    bolge: "",
    gorev: "",
    aciklama: "",
  })
  const [duzenlemeOncekiEkip, setDuzenlemeOncekiEkip] = useState<EkipOzet | null>(null)
  const [duzenlemeKaydediliyor, setDuzenlemeKaydediliyor] = useState(false)

  const [form, setForm] = useState({
    ekip_adi: "",
    lider_personel_id: "",
    sorumlu_personel_id: "",
    arac_varlik_id: "",
    bolge: "",
    gorev: "",
    gorev_tipi: "",
    calisma_tipi: "",
    oncelik: "50",
    aciklama: "",
  })

  const [seciliEkipId, setSeciliEkipId] = useState("")
  const [seciliPersonelId, setSeciliPersonelId] = useState("")
  const [durumFiltre, setDurumFiltre] = useState("")
  const [gorevTipiKayitlari, setGorevTipiKayitlari] = useState<GorevTipiKayit[]>(GOREV_TIPI_FALLBACK)
  const [calismaTipiKayitlari, setCalismaTipiKayitlari] = useState<CalismaTipiKayit[]>(CALISMA_TIPI_FALLBACK)

  useEffect(() => {
    yukle()
  }, [])

  async function yukle() {
    setLoading(true)
    const supabase = createClient()

    const { data: personelData, error: personelError } = await supabase
      .from("personeller")
      .select("id, ad, soyad, durum")
      .eq("durum", "aktif")
      .order("ad", { ascending: true })

    if (personelError) {
      setHata(kullaniciHataMesaji("Personeller alınamadı."))
      setLoading(false)
      return
    }

    const aktifPersonelListesi = (personelData || []).filter(personelAktifMi)

    const { data: aracData } = await supabase
      .from("varliklar")
      .select("id, ad, plaka, demirbas_no, marka, model")
      .eq("kategori", "Araç")
      .order("ad", { ascending: true })

    const { data: ekipData } = await supabase
      .from("ekipler")
      .select("id, ekip_adi, lider_personel_id, sorumlu_personel_id, arac_varlik_id, bolge, gorev, gorev_tipi, calisma_tipi, oncelik, aciklama, durum, aktif, created_at")
      .order("created_at", { ascending: false })

    const { data: uyeData } = await supabase
      .from("ekip_uyeleri")
      .select("id, ekip_id, personel_id, rol, durum, aktif, created_at")
      .order("created_at", { ascending: true })

    const { data: gorevTipiData, error: gorevTipiError } = await supabase
      .from("ekip_gorev_tipleri")
      .select("kod, ad, sira")
      .eq("aktif", true)
      .order("sira", { ascending: true })

    if (gorevTipiError || !gorevTipiData?.length) {
      setGorevTipiKayitlari(GOREV_TIPI_FALLBACK)
    } else {
      setGorevTipiKayitlari(
        gorevTipiData.map((kayit) => ({
          kod: kayit.kod,
          ad: kayit.ad,
          sira: kayit.sira ?? 100,
        })),
      )
    }

    const { data: calismaTipiData, error: calismaTipiError } = await supabase
      .from("ekip_calisma_tipleri")
      .select("kod, ad, sira")
      .eq("aktif", true)
      .order("sira", { ascending: true })

    if (calismaTipiError || !calismaTipiData?.length) {
      setCalismaTipiKayitlari(CALISMA_TIPI_FALLBACK)
    } else {
      setCalismaTipiKayitlari(
        calismaTipiSecenekleriniHazirla(
          calismaTipiData.map((kayit) => ({
            kod: kayit.kod,
            ad: kayit.ad,
            sira: kayit.sira ?? 100,
          })),
        ),
      )
    }

    setPersoneller(aktifPersonelListesi)
    setAraclar(aracData || [])
    setEkipler(ekipData || [])
    setUyeler(uyeData || [])
    setLoading(false)
  }

  const aktifGorevTipiSecenekleri = useMemo(
    () => [...gorevTipiKayitlari].sort((a, b) => a.sira - b.sira),
    [gorevTipiKayitlari],
  )

  const aktifCalismaTipiSecenekleri = useMemo(
    () => calismaTipiSecenekleriniHazirla(calismaTipiKayitlari),
    [calismaTipiKayitlari],
  )

  const secilebilirPersoneller = useMemo(
    () => personeller.filter(personelAktifMi),
    [personeller],
  )

  const aktifPersonelIdSet = useMemo(
    () => new Set(secilebilirPersoneller.map((p) => p.id)),
    [secilebilirPersoneller],
  )

  function personelAdi(id?: string | null) {
    if (!id) return "-"
    const p = secilebilirPersoneller.find((x) => x.id === id)
    return p ? `${p.ad || ""} ${p.soyad || ""}`.trim() : "-"
  }

  function aracAdi(id: string) {
    const a = araclar.find((x) => x.id === id)
    if (!a) return "-"
    return `${a.plaka || a.demirbas_no || ""} ${a.marka || ""} ${a.model || ""}`.trim()
  }

  function ekipUyeleri(ekipId: string) {
    return uyeler.filter((u) => u.ekip_id === ekipId)
  }

  function ekipUyeleriGosterilen(ekipId: string) {
    return ekipUyeleri(ekipId).filter(
      (u) => aktifPersonelIdSet.has(u.personel_id) && ekipUyesiAktifMi(u),
    )
  }

  const filtreliEkipler = useMemo(() => {
    if (!durumFiltre) return ekipler
    if (durumFiltre === "aktif") return ekipler.filter((e) => ekipAktifMi(e))
    if (durumFiltre === "pasif") return ekipler.filter((e) => !ekipAktifMi(e))
    return ekipler
  }, [ekipler, durumFiltre])

  async function ekipOlustur() {
    setMesaj("")
    setHata("")

    const ekipAdi = form.ekip_adi.trim()

    if (!ekipAdi) {
      setHata("Ekip adı zorunludur.")
      return
    }

    if (!form.lider_personel_id) {
      setHata("Lider seçmelisiniz.")
      return
    }

    if (!form.sorumlu_personel_id) {
      setHata("Sorumlu seçmelisiniz.")
      return
    }

    if (!gorevTipiGecerliMi(form.gorev_tipi, aktifGorevTipiSecenekleri)) {
      setHata("Görev tipi seçmelisiniz.")
      return
    }

    if (!calismaTipiGecerliMi(form.calisma_tipi, aktifCalismaTipiSecenekleri)) {
      setHata("Çalışma tipi seçmelisiniz.")
      return
    }

    const gorevTipi = form.gorev_tipi
    const calismaTipi = form.calisma_tipi
    const oncelik = oncelikDegeri(form.oncelik)

    setKaydediliyor(true)
    const supabase = createClient()

    const { data: aktifEkipKayitlari, error: aktifEkipError } = await supabase
      .from("ekipler")
      .select("id, ekip_adi, lider_personel_id, durum, aktif")

    if (aktifEkipError) {
      setHata(kullaniciHataMesaji("Ekip kontrolü yapılamadı."))
      setKaydediliyor(false)
      return
    }

    if (
      aktifEkipAdiVarMi(ekipAdi, aktifEkipKayitlari || []) ||
      aktifEkipAdiVarMi(ekipAdi, ekipler)
    ) {
      setHata("Bu isimde aktif bir ekip zaten var.")
      setKaydediliyor(false)
      return
    }

    const liderKontrol = await liderAtamasiGecerliMi(supabase, form.lider_personel_id)
    if (!liderKontrol.gecerli) {
      setHata(liderKontrol.mesaj || LIDER_CAKISMA_MESAJI)
      setKaydediliyor(false)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      setHata("Oturum bulunamadı. Lütfen tekrar giriş yapın.")
      setKaydediliyor(false)
      return
    }

    const { data: mevcutPersonel } = await supabase
      .from("personeller")
      .select("sirket_id")
      .or(`auth_id.eq.${session.user.id},kullanici_id.eq.${session.user.id}`)
      .limit(1)
      .maybeSingle()

    if (!mevcutPersonel?.sirket_id) {
      setHata("Şirket bilgisi bulunamadı. Lütfen yöneticinize başvurun.")
      setKaydediliyor(false)
      return
    }

    const { data: yeniEkip, error } = await supabase
      .from("ekipler")
      .insert({
        sirket_id: mevcutPersonel.sirket_id,
        ekip_adi: ekipAdi,
        lider_personel_id: form.lider_personel_id,
        sorumlu_personel_id: form.sorumlu_personel_id,
        arac_varlik_id: form.arac_varlik_id || null,
        bolge: form.bolge.trim() || null,
        gorev: form.gorev.trim() || null,
        gorev_tipi: gorevTipi,
        calisma_tipi: calismaTipi,
        oncelik,
        aciklama: form.aciklama.trim() || null,
        durum: "aktif",
        aktif: true,
      })
      .select("id")
      .maybeSingle()

    if (error || !yeniEkip?.id) {
      setHata(kullaniciHataMesaji("Ekip oluşturulamadı."))
      setKaydediliyor(false)
      return
    }

    const uyeSonuc = await ekipLiderSorumluUyeleriniOlustur(
      supabase,
      yeniEkip.id,
      form.lider_personel_id,
      form.sorumlu_personel_id,
    )

    if (!uyeSonuc.ok) {
      await olusturulanEkipSil(supabase, yeniEkip.id)
      setHata(uyeSonuc.mesaj)
      setKaydediliyor(false)
      return
    }

    setForm({
      ekip_adi: "",
      lider_personel_id: "",
      sorumlu_personel_id: "",
      arac_varlik_id: "",
      bolge: "",
      gorev: "",
      gorev_tipi: "",
      calisma_tipi: "",
      oncelik: "50",
      aciklama: "",
    })

    setMesaj("Ekip oluşturuldu.")
    await yukle()
    setKaydediliyor(false)
  }

  async function ekipAktifYap(ekipId: string) {
    setMesaj("")
    setHata("")
    setDurumGuncelleniyorId(ekipId)

    const supabase = createClient()

    const { error } = await supabase
      .from("ekipler")
      .update({
        aktif: true,
        durum: "aktif",
      })
      .eq("id", ekipId)

    setDurumGuncelleniyorId("")

    if (error) {
      setHata(kullaniciHataMesaji("Ekip aktif yapılamadı."))
      return
    }

    setMesaj("Ekip aktif yapıldı.")
    await yukle()
  }

  async function ekipPasifYap(ekipId: string) {
    setMesaj("")
    setHata("")
    setDurumGuncelleniyorId(ekipId)

    const supabase = createClient()

    const { error } = await supabase
      .from("ekipler")
      .update({
        aktif: false,
        durum: "pasif",
      })
      .eq("id", ekipId)

    setDurumGuncelleniyorId("")

    if (error) {
      setHata(kullaniciHataMesaji("Ekip pasif yapılamadı."))
      return
    }

    setMesaj("Ekip pasif yapıldı.")
    await yukle()
  }

  function duzenlemeBaslat(ekip: EkipOzet) {
    setMesaj("")
    setHata("")
    setDuzenlenenEkipId(ekip.id)
    setDuzenlemeOncekiEkip({
      id: ekip.id,
      lider_personel_id: ekip.lider_personel_id || null,
      sorumlu_personel_id: ekip.sorumlu_personel_id || null,
      arac_varlik_id: ekip.arac_varlik_id || null,
      bolge: ekip.bolge || null,
      gorev: ekip.gorev || null,
      gorev_tipi: ekip.gorev_tipi || null,
      calisma_tipi: ekip.calisma_tipi || null,
      oncelik: ekip.oncelik ?? 50,
      aciklama: ekip.aciklama || null,
    })
    setDuzenlemeForm({
      lider_personel_id: ekip.lider_personel_id || "",
      sorumlu_personel_id: ekip.sorumlu_personel_id || "",
      arac_varlik_id: ekip.arac_varlik_id || "",
      gorev_tipi: ekip.gorev_tipi || "",
      calisma_tipi: ekip.calisma_tipi || "",
      oncelik: oncelikSelectDegeri(ekip.oncelik),
      bolge: ekip.bolge || "",
      gorev: ekip.gorev || "",
      aciklama: ekip.aciklama || "",
    })
  }

  function duzenlemeIptal() {
    setDuzenlenenEkipId("")
    setDuzenlemeOncekiEkip(null)
    setDuzenlemeForm({
      lider_personel_id: "",
      sorumlu_personel_id: "",
      arac_varlik_id: "",
      gorev_tipi: "",
      calisma_tipi: "",
      oncelik: "",
      bolge: "",
      gorev: "",
      aciklama: "",
    })
  }

  async function ekipGuncelle(ekipId: string) {
    setMesaj("")
    setHata("")

    if (!duzenlemeForm.lider_personel_id) {
      setHata("Lider seçmelisiniz.")
      return
    }

    if (!duzenlemeForm.sorumlu_personel_id) {
      setHata("Sorumlu seçmelisiniz.")
      return
    }

    if (!gorevTipiGecerliMi(duzenlemeForm.gorev_tipi, aktifGorevTipiSecenekleri)) {
      setHata("Görev tipi seçmelisiniz.")
      return
    }

    if (!calismaTipiGecerliMi(duzenlemeForm.calisma_tipi, aktifCalismaTipiSecenekleri)) {
      setHata("Çalışma tipi seçmelisiniz.")
      return
    }

    const oncelik = oncelikDegeri(duzenlemeForm.oncelik)

    setDuzenlemeKaydediliyor(true)
    const supabase = createClient()

    const liderKontrol = await liderAtamasiGecerliMi(
      supabase,
      duzenlemeForm.lider_personel_id,
      ekipId,
    )
    if (!liderKontrol.gecerli) {
      setHata(liderKontrol.mesaj || LIDER_CAKISMA_MESAJI)
      setDuzenlemeKaydediliyor(false)
      return
    }

    const guncellenecekEkip = {
      lider_personel_id: duzenlemeForm.lider_personel_id,
      sorumlu_personel_id: duzenlemeForm.sorumlu_personel_id,
      arac_varlik_id: duzenlemeForm.arac_varlik_id || null,
      gorev_tipi: duzenlemeForm.gorev_tipi,
      calisma_tipi: duzenlemeForm.calisma_tipi,
      oncelik,
      bolge: duzenlemeForm.bolge.trim() || null,
      gorev: duzenlemeForm.gorev.trim() || null,
      aciklama: duzenlemeForm.aciklama.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("ekipler").update(guncellenecekEkip).eq("id", ekipId)

    if (error) {
      setHata(kullaniciHataMesaji("Ekip güncellenemedi."))
      setDuzenlemeKaydediliyor(false)
      return
    }

    const senkronSonuc = await ekipUyeleriniSenkronize(
      supabase,
      ekipId,
      duzenlemeForm.lider_personel_id,
      duzenlemeForm.sorumlu_personel_id,
    )

    if (!senkronSonuc.ok) {
      if (duzenlemeOncekiEkip) {
        await supabase
          .from("ekipler")
          .update({
            lider_personel_id: duzenlemeOncekiEkip.lider_personel_id,
            sorumlu_personel_id: duzenlemeOncekiEkip.sorumlu_personel_id,
            arac_varlik_id: duzenlemeOncekiEkip.arac_varlik_id,
            gorev_tipi: duzenlemeOncekiEkip.gorev_tipi,
            calisma_tipi: duzenlemeOncekiEkip.calisma_tipi,
            oncelik: duzenlemeOncekiEkip.oncelik,
            bolge: duzenlemeOncekiEkip.bolge,
            gorev: duzenlemeOncekiEkip.gorev,
            aciklama: duzenlemeOncekiEkip.aciklama,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ekipId)

        await ekipUyeleriniSenkronize(
          supabase,
          ekipId,
          duzenlemeOncekiEkip.lider_personel_id || "",
          duzenlemeOncekiEkip.sorumlu_personel_id || "",
        )
      }

      setHata(senkronSonuc.mesaj)
      setDuzenlemeKaydediliyor(false)
      return
    }

    setDuzenlemeKaydediliyor(false)
    duzenlemeIptal()
    setMesaj("Ekip bilgileri güncellendi.")
    await yukle()
  }

  async function uyeEkle() {
    setMesaj("")
    setHata("")

    if (!seciliEkipId) {
      setHata("Ekip seçmelisiniz.")
      return
    }

    if (!seciliPersonelId) {
      setHata("Personel seçmelisiniz.")
      return
    }

    if (!aktifPersonelIdSet.has(seciliPersonelId)) {
      setHata("Pasif personel ekibe eklenemez.")
      return
    }

    setUyeEkleniyor(true)
    const supabase = createClient()

    const elemanKontrol = await elemanAtamasiGecerliMi(supabase, seciliPersonelId, seciliEkipId)
    if (!elemanKontrol.gecerli) {
      setHata(elemanKontrol.mesaj || ELEMAN_CAKISMA_MESAJI)
      setUyeEkleniyor(false)
      return
    }

    const { data: mevcutUye, error: uyeKontrolError } = await supabase
      .from("ekip_uyeleri")
      .select("id, ekip_id, personel_id, rol, durum, aktif")
      .eq("ekip_id", seciliEkipId)
      .eq("personel_id", seciliPersonelId)
      .maybeSingle()

    if (uyeKontrolError) {
      setHata(kullaniciHataMesaji("Üyelik kontrolü yapılamadı."))
      setUyeEkleniyor(false)
      return
    }

    if (mevcutUye && ekipUyesiAktifMi(mevcutUye)) {
      setHata("Seçilen personel zaten bu ekibin aktif üyesi.")
      setUyeEkleniyor(false)
      return
    }

    let error = null

    if (mevcutUye) {
      const sonuc = await supabase
        .from("ekip_uyeleri")
        .update({
          rol: "eleman",
          durum: "aktif",
          aktif: true,
        })
        .eq("id", mevcutUye.id)
      error = sonuc.error
    } else {
      const sonuc = await supabase.from("ekip_uyeleri").insert({
        ekip_id: seciliEkipId,
        personel_id: seciliPersonelId,
        rol: "eleman",
        durum: "aktif",
        aktif: true,
      })
      error = sonuc.error
    }

    setUyeEkleniyor(false)

    if (error) {
      setHata(kullaniciHataMesaji("Üye eklenemedi."))
      return
    }

    setSeciliPersonelId("")
    setMesaj("Personel ekibe eklendi.")
    await yukle()
  }

  async function uyeSil(id: string) {
    const supabase = createClient()

    await supabase.from("ekip_uyeleri").delete().eq("id", id)

    setMesaj("Üye ekipten çıkarıldı.")
    await yukle()
  }

  if (loading) {
    return <div className="p-6 font-bold">Yükleniyor...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.push("/portal")} className="text-2xl font-bold">
          ←
        </button>
        <div>
          <h1 className="text-xl font-black">Ekip Yönetimi</h1>
          <p className="text-xs font-semibold text-gray-700">
            Ekip oluştur, lider/sorumlu/araç/bölge/görev tanımla
          </p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {hata && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        {mesaj && (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm font-bold text-blue-900">
            {mesaj}
          </div>
        )}

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-bold text-gray-900" htmlFor="durum_filtre">
            Durum
          </label>
          <select
            id="durum_filtre"
            value={durumFiltre}
            onChange={(e) => setDurumFiltre(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-500 px-3 py-2 font-bold"
          >
            <option value="">Tümü</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black">Yeni Ekip Oluştur</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_ekip_adi">
                  Ekip Adı
                </label>
                <input
                  id="yeni_ekip_adi"
                  value={form.ekip_adi}
                  onChange={(e) => setForm({ ...form, ekip_adi: e.target.value })}
                  placeholder="Ekip adı"
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_lider">
                  Lider
                </label>
                <select
                  id="yeni_lider"
                  value={form.lider_personel_id}
                  onChange={(e) => setForm({ ...form, lider_personel_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-bold"
                >
                  <option value="">Lider seç</option>
                  {secilebilirPersoneller.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ad} {p.soyad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_sorumlu">
                  Sorumlu
                </label>
                <select
                  id="yeni_sorumlu"
                  value={form.sorumlu_personel_id}
                  onChange={(e) => setForm({ ...form, sorumlu_personel_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-bold"
                >
                  <option value="">Sorumlu seç</option>
                  {secilebilirPersoneller.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ad} {p.soyad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_arac">
                  Araç
                </label>
                <select
                  id="yeni_arac"
                  value={form.arac_varlik_id}
                  onChange={(e) => setForm({ ...form, arac_varlik_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-bold"
                >
                  <option value="">Araç seç</option>
                  {araclar.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.plaka || a.demirbas_no || a.ad} {a.marka || ""} {a.model || ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_bolge">
                  Bölge
                </label>
                <input
                  id="yeni_bolge"
                  value={form.bolge}
                  onChange={(e) => setForm({ ...form, bolge: e.target.value })}
                  placeholder="Bölge"
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_gorev_tipi">
                  Görev Tipi
                </label>
                <select
                  id="yeni_gorev_tipi"
                  value={form.gorev_tipi}
                  onChange={(e) => setForm({ ...form, gorev_tipi: e.target.value })}
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-bold"
                >
                  <option value="">Görev tipi seç *</option>
                  {aktifGorevTipiSecenekleri.map((secenek) => (
                    <option key={secenek.kod} value={secenek.kod}>
                      {secenek.ad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_calisma_tipi">
                  Çalışma Tipi
                </label>
                <select
                  id="yeni_calisma_tipi"
                  value={form.calisma_tipi}
                  onChange={(e) => setForm({ ...form, calisma_tipi: e.target.value })}
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-bold"
                >
                  <option value="">Çalışma tipi seç *</option>
                  {aktifCalismaTipiSecenekleri.map((calismaSecenegi) => (
                    <option key={`calisma-${calismaSecenegi.kod}`} value={calismaSecenegi.kod}>
                      {calismaSecenegi.ad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_oncelik">
                  AI Öncelik Seviyesi
                </label>
                <select
                  id="yeni_oncelik"
                  value={form.oncelik}
                  onChange={(e) => setForm({ ...form, oncelik: e.target.value })}
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-bold"
                >
                  {ONCELIK_SEVIYELERI.map((seviye) => (
                    <option key={seviye.deger} value={String(seviye.deger)}>
                      {seviye.etiket}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_gorev">
                  Görev Açıklaması
                </label>
                <input
                  id="yeni_gorev"
                  value={form.gorev}
                  onChange={(e) => setForm({ ...form, gorev: e.target.value })}
                  placeholder="Görev açıklaması"
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                />
              </div>

              <div className="md:col-span-6">
                <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="yeni_aciklama">
                  Açıklama
                </label>
                <input
                  id="yeni_aciklama"
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  placeholder="Açıklama"
                  className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                />
              </div>
            </div>
          </div>

          {form.calisma_tipi === "joker" && (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {JOKER_BILGI_METNI}
            </p>
          )}

          <button
            onClick={ekipOlustur}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Ekip Oluştur"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black">Ekibe Eleman Ekle</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <select
              value={seciliEkipId}
              onChange={(e) => setSeciliEkipId(e.target.value)}
              className="md:col-span-5 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Ekip seç</option>
              {ekipler.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.ekip_adi}
                </option>
              ))}
            </select>

            <select
              value={seciliPersonelId}
              onChange={(e) => setSeciliPersonelId(e.target.value)}
              className="md:col-span-5 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Personel seç</option>
              {secilebilirPersoneller.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void uyeEkle()}
              disabled={uyeEkleniyor}
              className="md:col-span-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {uyeEkleniyor ? "Ekleniyor..." : "Ekle"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black">Ekip Listesi</h2>

          {filtreliEkipler.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center font-bold text-gray-600">
              Ekip kaydı yok.
            </div>
          ) : (
            filtreliEkipler.map((e) => {
              const liderAdi = personelAdi(e.lider_personel_id)
              const sorumluAdi = personelAdi(e.sorumlu_personel_id)
              const liderSorumluParcalari = [
                liderAdi !== "-" ? `Lider: ${liderAdi}` : null,
                sorumluAdi !== "-" ? `Sorumlu: ${sorumluAdi}` : null,
              ].filter(Boolean)
              const duzenlemeModu = duzenlenenEkipId === e.id

              return (
              <div key={e.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-lg font-black">{e.ekip_adi}</p>

                {!duzenlemeModu && (
                  <>
                    <p className="text-sm font-semibold text-gray-700">
                      Görev tipi: {gorevTipiEtiketi(e.gorev_tipi, gorevTipiKayitlari)} · Çalışma tipi:{" "}
                      {calismaTipiEtiketi(e.calisma_tipi, calismaTipiKayitlari)} · AI Öncelik:{" "}
                      {oncelikEtiketi(e.oncelik)} · Görev: {e.gorev || "-"} · Bölge: {e.bolge || "-"}
                    </p>
                    {e.aciklama && (
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        Açıklama: {e.aciklama}
                      </p>
                    )}
                    {liderSorumluParcalari.length > 0 && (
                      <p className="text-xs font-bold text-gray-600 mt-1">
                        {liderSorumluParcalari.join(" · ")}
                      </p>
                    )}
                    <p className="text-xs font-bold text-gray-600">
                      Araç: {aracAdi(e.arac_varlik_id)}
                    </p>
                  </>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => duzenlemeBaslat(e)}
                    disabled={
                      duzenlemeKaydediliyor ||
                      duzenlemeModu ||
                      (duzenlenenEkipId !== "" && duzenlenenEkipId !== e.id)
                    }
                    className="rounded bg-blue-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    Düzenle
                  </button>
                  {ekipAktifMi(e) ? (
                    <button
                      type="button"
                      onClick={() => void ekipPasifYap(e.id)}
                      disabled={durumGuncelleniyorId === e.id || duzenlemeModu}
                      className="rounded bg-red-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      {durumGuncelleniyorId === e.id ? "Kaydediliyor..." : "Pasif Yap"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void ekipAktifYap(e.id)}
                      disabled={durumGuncelleniyorId === e.id || duzenlemeModu}
                      className="rounded bg-green-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      {durumGuncelleniyorId === e.id ? "Kaydediliyor..." : "Aktif Yap"}
                    </button>
                  )}
                </div>

                {duzenlemeModu && (
                  <div className="mt-4 space-y-6">
                    <div className="min-h-[28rem] rounded-xl border border-blue-200 bg-blue-50 p-5 md:p-6 space-y-6">
                      <p className="text-sm font-black text-blue-900">Ekip Düzenle</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_lider_${e.id}`}>
                            Lider
                          </label>
                          <select
                            id={`duzenle_lider_${e.id}`}
                            value={duzenlemeForm.lider_personel_id}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, lider_personel_id: ev.target.value })
                            }
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-bold"
                          >
                            <option value="">Lider seç</option>
                            {secilebilirPersoneller.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.ad} {p.soyad}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_sorumlu_${e.id}`}>
                            Sorumlu
                          </label>
                          <select
                            id={`duzenle_sorumlu_${e.id}`}
                            value={duzenlemeForm.sorumlu_personel_id}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, sorumlu_personel_id: ev.target.value })
                            }
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-bold"
                          >
                            <option value="">Sorumlu seç</option>
                            {secilebilirPersoneller.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.ad} {p.soyad}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_arac_${e.id}`}>
                            Araç
                          </label>
                          <select
                            id={`duzenle_arac_${e.id}`}
                            value={duzenlemeForm.arac_varlik_id}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, arac_varlik_id: ev.target.value })
                            }
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-bold"
                          >
                            <option value="">Araç seç</option>
                            {araclar.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.plaka || a.demirbas_no || a.ad} {a.marka || ""} {a.model || ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_gorev_tipi_${e.id}`}>
                            Görev Tipi
                          </label>
                          <select
                            id={`duzenle_gorev_tipi_${e.id}`}
                            value={duzenlemeForm.gorev_tipi}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, gorev_tipi: ev.target.value })
                            }
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-bold"
                          >
                            <option value="">Görev tipi seç *</option>
                            {aktifGorevTipiSecenekleri.map((secenek) => (
                              <option key={secenek.kod} value={secenek.kod}>
                                {secenek.ad}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_calisma_tipi_${e.id}`}>
                            Çalışma Tipi
                          </label>
                          <select
                            id={`duzenle_calisma_tipi_${e.id}`}
                            value={duzenlemeForm.calisma_tipi}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, calisma_tipi: ev.target.value })
                            }
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-bold"
                          >
                            <option value="">Çalışma tipi seç *</option>
                            {aktifCalismaTipiSecenekleri.map((calismaSecenegi) => (
                              <option key={`calisma-duzenle-${calismaSecenegi.kod}`} value={calismaSecenegi.kod}>
                                {calismaSecenegi.ad}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_oncelik_${e.id}`}>
                            AI Öncelik Seviyesi
                          </label>
                          <select
                            id={`duzenle_oncelik_${e.id}`}
                            value={duzenlemeForm.oncelik}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, oncelik: ev.target.value })
                            }
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-bold"
                          >
                            {ONCELIK_SEVIYELERI.map((seviye) => (
                              <option key={seviye.deger} value={String(seviye.deger)}>
                                {seviye.etiket}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_bolge_${e.id}`}>
                            Bölge
                          </label>
                          <input
                            id={`duzenle_bolge_${e.id}`}
                            value={duzenlemeForm.bolge}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, bolge: ev.target.value })
                            }
                            placeholder="Bölge"
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_gorev_${e.id}`}>
                            Görev Açıklaması
                          </label>
                          <input
                            id={`duzenle_gorev_${e.id}`}
                            value={duzenlemeForm.gorev}
                            onChange={(ev) =>
                              setDuzenlemeForm({ ...duzenlemeForm, gorev: ev.target.value })
                            }
                            placeholder="Görev açıklaması"
                            className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold text-gray-700" htmlFor={`duzenle_aciklama_${e.id}`}>
                          Açıklama
                        </label>
                        <textarea
                          id={`duzenle_aciklama_${e.id}`}
                          value={duzenlemeForm.aciklama}
                          onChange={(ev) =>
                            setDuzenlemeForm({ ...duzenlemeForm, aciklama: ev.target.value })
                          }
                          placeholder="Açıklama"
                          rows={4}
                          className="w-full rounded-lg border border-gray-500 px-3 py-2.5 font-semibold"
                        />
                      </div>

                      {duzenlemeForm.calisma_tipi === "joker" && (
                        <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {JOKER_BILGI_METNI}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => void ekipGuncelle(e.id)}
                          disabled={duzenlemeKaydediliyor}
                          className="rounded bg-blue-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                        >
                          {duzenlemeKaydediliyor ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                        <button
                          type="button"
                          onClick={duzenlemeIptal}
                          disabled={duzenlemeKaydediliyor}
                          className="rounded bg-gray-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                        >
                          İptal
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-gray-50 border p-4">
                      <p className="text-xs font-black mb-3">Üyeler</p>

                      {ekipUyeleriGosterilen(e.id).length === 0 ? (
                        <p className="text-xs font-semibold text-gray-600">Üye yok.</p>
                      ) : (
                        <div className="space-y-2">
                          {ekipUyeleriGosterilen(e.id).map((u) => (
                            <div
                              key={u.id}
                              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_8rem_auto] items-center gap-2 sm:gap-4 rounded-lg bg-white border px-3 py-2.5"
                            >
                              <p className="text-xs font-bold truncate">{personelAdi(u.personel_id)}</p>
                              <p className="text-xs font-semibold text-gray-700 capitalize">{u.rol || "-"}</p>
                              <button
                                type="button"
                                onClick={() => uyeSil(u.id)}
                                className="justify-self-start sm:justify-self-end rounded bg-red-700 px-3 py-1.5 text-[11px] font-black text-white"
                              >
                                Çıkar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!duzenlemeModu && (
                <div className="mt-3 rounded-xl bg-gray-50 border p-3">
                  <p className="text-xs font-black mb-2">Üyeler</p>

                  {ekipUyeleriGosterilen(e.id).length === 0 ? (
                    <p className="text-xs font-semibold text-gray-600">Üye yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {ekipUyeleriGosterilen(e.id).map((u) => (
                        <div
                          key={u.id}
                          className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_8rem_auto] items-center gap-2 sm:gap-4 rounded-lg bg-white border px-3 py-2"
                        >
                          <p className="text-xs font-bold truncate">{personelAdi(u.personel_id)}</p>
                          <p className="text-xs font-semibold text-gray-700 capitalize">{u.rol || "-"}</p>
                          <button
                            type="button"
                            onClick={() => uyeSil(u.id)}
                            className="justify-self-start sm:justify-self-end rounded bg-red-700 px-3 py-1.5 text-[11px] font-black text-white"
                          >
                            Çıkar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </div>
            )
            })
          )}
        </div>
      </div>
    </div>
  )
}
