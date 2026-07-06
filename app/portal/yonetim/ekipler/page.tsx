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

function oncelikDegeri(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? "").trim())
  return Number.isFinite(parsed) ? parsed : 50
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
    gorev_tipi: "",
    calisma_tipi: "",
    oncelik: "",
    bolge: "",
    gorev: "",
    aciklama: "",
  })
  const [duzenlemeKaydediliyor, setDuzenlemeKaydediliyor] = useState(false)

  const [form, setForm] = useState({
    ekip_adi: "",
    lider_personel_id: "",
    sorumlu_personel_id: "",
    arac_varlik_id: "",
    bolge: "",
    gorev: "",
    gorev_tipi: "",
    calisma_tipi: "normal",
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
      setHata("Personeller alınamadı: " + personelError.message)
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
      setMesaj("Lider seçmelisiniz.")
      return
    }

    if (!form.sorumlu_personel_id) {
      setMesaj("Sorumlu seçmelisiniz.")
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
      .select("id, ekip_adi, durum, aktif")

    if (aktifEkipError) {
      setHata("Ekip kontrolü yapılamadı: " + aktifEkipError.message)
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

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      setMesaj("Oturum bulunamadı. Lütfen tekrar giriş yapın.")
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
      setMesaj("Şirket ID bulunamadı. Giriş yapan kullanıcı personel kaydında sirket_id dolu olmalı.")
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
      setHata("Ekip oluşturulamadı: " + (error?.message || "Bilinmeyen hata"))
      setKaydediliyor(false)
      return
    }

    const { error: liderUyeError } = await supabase.from("ekip_uyeleri").insert({
      ekip_id: yeniEkip.id,
      personel_id: form.lider_personel_id,
      rol: "lider",
      durum: "aktif",
      aktif: true,
    })

    if (liderUyeError) {
      setHata("Ekip lideri eklenemedi: " + liderUyeError.message)
      setKaydediliyor(false)
      return
    }

    const { error: sorumluUyeError } = await supabase.from("ekip_uyeleri").insert({
      ekip_id: yeniEkip.id,
      personel_id: form.sorumlu_personel_id,
      rol: "sorumlu",
      durum: "aktif",
      aktif: true,
    })

    if (sorumluUyeError) {
      setHata("Ekip sorumlusu eklenemedi: " + sorumluUyeError.message)
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
      calisma_tipi: "normal",
      oncelik: "50",
      aciklama: "",
    })

    setMesaj("Ekip başarıyla oluşturuldu.")
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
      setHata("Ekip aktif yapılamadı: " + error.message)
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
      setHata("Ekip pasif yapılamadı: " + error.message)
      return
    }

    setMesaj("Ekip pasif yapıldı.")
    await yukle()
  }

  function duzenlemeBaslat(ekip: {
    id: string
    gorev_tipi?: string | null
    calisma_tipi?: string | null
    oncelik?: number | null
    bolge?: string | null
    gorev?: string | null
    aciklama?: string | null
  }) {
    setMesaj("")
    setHata("")
    setDuzenlenenEkipId(ekip.id)
    setDuzenlemeForm({
      gorev_tipi: ekip.gorev_tipi || "",
      calisma_tipi: ekip.calisma_tipi || "normal",
      oncelik: ekip.oncelik != null ? String(ekip.oncelik) : "50",
      bolge: ekip.bolge || "",
      gorev: ekip.gorev || "",
      aciklama: ekip.aciklama || "",
    })
  }

  function duzenlemeIptal() {
    setDuzenlenenEkipId("")
    setDuzenlemeForm({
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

    const { error } = await supabase
      .from("ekipler")
      .update({
        gorev_tipi: duzenlemeForm.gorev_tipi,
        calisma_tipi: duzenlemeForm.calisma_tipi,
        oncelik,
        bolge: duzenlemeForm.bolge.trim() || null,
        gorev: duzenlemeForm.gorev.trim() || null,
        aciklama: duzenlemeForm.aciklama.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ekipId)

    setDuzenlemeKaydediliyor(false)

    if (error) {
      setHata("Ekip güncellenemedi: " + error.message)
      return
    }

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

    const { data: mevcutUye, error: uyeKontrolError } = await supabase
      .from("ekip_uyeleri")
      .select("id, ekip_id, personel_id, rol, durum, aktif")
      .eq("ekip_id", seciliEkipId)
      .eq("personel_id", seciliPersonelId)
      .maybeSingle()

    if (uyeKontrolError) {
      setHata("Üyelik kontrolü yapılamadı: " + uyeKontrolError.message)
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
      setHata("Üye eklenemedi: " + error.message)
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <input
              value={form.ekip_adi}
              onChange={(e) => setForm({ ...form, ekip_adi: e.target.value })}
              placeholder="Ekip adı"
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />

            <select
              value={form.lider_personel_id}
              onChange={(e) => setForm({ ...form, lider_personel_id: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Lider seç</option>
              {secilebilirPersoneller.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>

            <select
              value={form.sorumlu_personel_id}
              onChange={(e) => setForm({ ...form, sorumlu_personel_id: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Sorumlu seç</option>
              {secilebilirPersoneller.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>

            <select
              value={form.arac_varlik_id}
              onChange={(e) => setForm({ ...form, arac_varlik_id: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Araç seç</option>
              {araclar.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.plaka || a.demirbas_no || a.ad} {a.marka || ""} {a.model || ""}
                </option>
              ))}
            </select>

            <input
              value={form.bolge}
              onChange={(e) => setForm({ ...form, bolge: e.target.value })}
              placeholder="Bölge"
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />

            <select
              value={form.gorev_tipi}
              onChange={(e) => setForm({ ...form, gorev_tipi: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Görev tipi seç *</option>
              {aktifGorevTipiSecenekleri.map((secenek) => (
                <option key={secenek.kod} value={secenek.kod}>
                  {secenek.ad}
                </option>
              ))}
            </select>

            <select
              value={form.calisma_tipi}
              onChange={(e) => setForm({ ...form, calisma_tipi: e.target.value })}
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-bold"
            >
              <option value="">Çalışma tipi seç *</option>
              {aktifCalismaTipiSecenekleri.map((calismaSecenegi) => (
                <option key={`calisma-${calismaSecenegi.kod}`} value={calismaSecenegi.kod}>
                  {calismaSecenegi.ad}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={form.oncelik}
              onChange={(e) => setForm({ ...form, oncelik: e.target.value })}
              placeholder="Öncelik"
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />

            <input
              value={form.gorev}
              onChange={(e) => setForm({ ...form, gorev: e.target.value })}
              placeholder="Görev açıklaması"
              className="md:col-span-3 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />

            <input
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              placeholder="Açıklama"
              className="md:col-span-6 rounded-lg border border-gray-500 px-3 py-2 font-semibold"
            />
          </div>

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
                      {calismaTipiEtiketi(e.calisma_tipi, calismaTipiKayitlari)} · Öncelik:{" "}
                      {e.oncelik ?? 50} · Görev: {e.gorev || "-"} · Bölge: {e.bolge || "-"}
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
                  <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm font-black text-blue-900">Ekip Düzenle</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor={`duzenle_gorev_tipi_${e.id}`}>
                          Görev tipi *
                        </label>
                        <select
                          id={`duzenle_gorev_tipi_${e.id}`}
                          value={duzenlemeForm.gorev_tipi}
                          onChange={(ev) =>
                            setDuzenlemeForm({ ...duzenlemeForm, gorev_tipi: ev.target.value })
                          }
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

                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor={`duzenle_calisma_tipi_${e.id}`}>
                          Çalışma tipi *
                        </label>
                        <select
                          id={`duzenle_calisma_tipi_${e.id}`}
                          value={duzenlemeForm.calisma_tipi}
                          onChange={(ev) =>
                            setDuzenlemeForm({ ...duzenlemeForm, calisma_tipi: ev.target.value })
                          }
                          className="w-full rounded-lg border border-gray-500 px-3 py-2 font-bold"
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
                        <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor={`duzenle_oncelik_${e.id}`}>
                          Öncelik
                        </label>
                        <input
                          id={`duzenle_oncelik_${e.id}`}
                          type="number"
                          value={duzenlemeForm.oncelik}
                          onChange={(ev) =>
                            setDuzenlemeForm({ ...duzenlemeForm, oncelik: ev.target.value })
                          }
                          placeholder="Öncelik"
                          className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor={`duzenle_bolge_${e.id}`}>
                          Bölge
                        </label>
                        <input
                          id={`duzenle_bolge_${e.id}`}
                          value={duzenlemeForm.bolge}
                          onChange={(ev) =>
                            setDuzenlemeForm({ ...duzenlemeForm, bolge: ev.target.value })
                          }
                          placeholder="Bölge"
                          className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor={`duzenle_gorev_${e.id}`}>
                          Görev
                        </label>
                        <input
                          id={`duzenle_gorev_${e.id}`}
                          value={duzenlemeForm.gorev}
                          onChange={(ev) =>
                            setDuzenlemeForm({ ...duzenlemeForm, gorev: ev.target.value })
                          }
                          placeholder="Görev açıklaması"
                          className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor={`duzenle_aciklama_${e.id}`}>
                          Açıklama
                        </label>
                        <textarea
                          id={`duzenle_aciklama_${e.id}`}
                          value={duzenlemeForm.aciklama}
                          onChange={(ev) =>
                            setDuzenlemeForm({ ...duzenlemeForm, aciklama: ev.target.value })
                          }
                          placeholder="Açıklama"
                          rows={3}
                          className="w-full rounded-lg border border-gray-500 px-3 py-2 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void ekipGuncelle(e.id)}
                        disabled={duzenlemeKaydediliyor}
                        className="rounded bg-blue-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                      >
                        {duzenlemeKaydediliyor ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                      <button
                        type="button"
                        onClick={duzenlemeIptal}
                        disabled={duzenlemeKaydediliyor}
                        className="rounded bg-gray-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-3 rounded-xl bg-gray-50 border p-3">
                  <p className="text-xs font-black mb-2">Üyeler</p>

                  {ekipUyeleriGosterilen(e.id).length === 0 ? (
                    <p className="text-xs font-semibold text-gray-600">Üye yok.</p>
                  ) : (
                    ekipUyeleriGosterilen(e.id).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded-lg bg-white border px-2 py-2 mb-1"
                      >
                        <p className="text-xs font-bold">
                          {personelAdi(u.personel_id)} - {u.rol}
                        </p>
                        <button
                          onClick={() => uyeSil(u.id)}
                          className="rounded bg-red-700 px-2 py-1 text-[11px] font-black text-white"
                        >
                          Çıkar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
            })
          )}
        </div>
      </div>
    </div>
  )
}
