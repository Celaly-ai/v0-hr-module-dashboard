"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  sirketKunyesiGirisCikisKonumu,
  sirketKunyesiKontrolEt,
} from "@/lib/services/sirket-kunye-service"
import type { SirketKunyeGirisCikisKonum, SirketKunyeKontrolSonuc } from "@/lib/types/sirket-kunye"
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar"
import { useRouter } from "next/navigation"

const ONAY_SINIRI_DAKIKA = 60
const KONUM_LOG_ARALIGI_MS = 120000

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

type Kayit = Record<string, any>

type ServisKonumu = SirketKunyeGirisCikisKonum

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function localISO(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const g = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${g}`
}

function temizSaat(value?: string | null) {
  if (!value) return ""
  return String(value).slice(0, 5)
}

function saatToDakika(saat?: string | null) {
  const temiz = temizSaat(saat)
  if (!temiz) return 0
  const [h, m] = temiz.split(":").map(Number)
  return h * 60 + m
}

function dateDakika(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

function dakikaYaz(dakika: number) {
  if (dakika <= 0) return "-"
  const saat = Math.floor(dakika / 60)
  const dk = dakika % 60
  if (saat > 0 && dk > 0) return `${saat}s ${dk}d`
  if (saat > 0) return `${saat}s`
  return `${dk}d`
}

function formatSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function durumEtiketi(durum?: string | null) {
  switch (durum) {
    case "calisma":
      return "Çalışma"
    case "izinli":
      return "İzinli"
    case "raporlu":
      return "Raporlu"
    case "egitim":
      return "Eğitim"
    case "hafta_tatili":
      return "Hafta Tatili"
    case "resmi_tatil":
      return "Resmi Tatil"
    default:
      return "Plan Yok"
  }
}

function ustKartClass(vardiya: Kayit | null, aktifDurum: "giris" | "cikis") {
  if (!vardiya) return "bg-gray-700"
  if (vardiya.durum === "calisma") {
    return aktifDurum === "giris" ? "bg-green-600" : "bg-gray-700"
  }
  if (vardiya.durum === "izinli") return "bg-blue-700"
  if (vardiya.durum === "raporlu") return "bg-red-700"
  if (vardiya.durum === "hafta_tatili") return "bg-gray-700"
  if (vardiya.durum === "resmi_tatil") return "bg-yellow-700"
  if (vardiya.durum === "egitim") return "bg-purple-700"
  return "bg-gray-700"
}

function ustKartIkon(vardiya: Kayit | null, aktifDurum: "giris" | "cikis") {
  if (!vardiya) return "⚫"
  if (vardiya.durum === "calisma") return aktifDurum === "giris" ? "🟢" : "⚫"
  if (vardiya.durum === "izinli") return "🔵"
  if (vardiya.durum === "raporlu") return "🔴"
  if (vardiya.durum === "hafta_tatili") return "⚪"
  if (vardiya.durum === "resmi_tatil") return "🟡"
  if (vardiya.durum === "egitim") return "🟣"
  return "⚫"
}

function ustKartBaslik(vardiya: Kayit | null, aktifDurum: "giris" | "cikis") {
  if (!vardiya) return "Plan Yok"
  if (vardiya.durum === "calisma") return aktifDurum === "giris" ? "Serviste" : "Dışarıda"
  return durumEtiketi(vardiya.durum)
}

function durumClass(durum: string) {
  if (durum === "Çalışıyor") return "bg-green-100 text-green-900 border-green-300"
  if (durum === "Zamanında") return "bg-emerald-100 text-emerald-900 border-emerald-300"
  return "bg-gray-100 text-gray-900 border-gray-300"
}

function kayitDakika(kayit: Kayit | null) {
  if (!kayit?.created_at) return null
  return dateDakika(new Date(kayit.created_at))
}

function analizRenk(value: number) {
  if (value <= 0) return "text-green-700"
  if (value <= 15) return "text-yellow-700"
  return "text-red-700"
}

function konumAl(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Konum desteklenmiyor"))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

type EkipBilgisi = {
  ekipAdi: string
  liderAdi: string
  sorumluAdi: string
  aracBilgisi: string
  rol: string
}

type GelecekVardiya = {
  tarih: string
  baslangic_saati: string | null
  bitis_saati: string | null
  durum: string | null
  aciklama: string | null
}

function tarihEkle(gun: number) {
  const d = new Date()
  d.setDate(d.getDate() + gun)
  return localISO(d)
}

function tarihYaz(value?: string | null) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
}

async function ekipBilgisiGetir(supabase: ReturnType<typeof createClient>, personelId: string) {
  const { data: uyelikListesi } = await supabase
    .from("ekip_uyeleri")
    .select("id, ekip_id, personel_id, rol")
    .eq("personel_id", personelId)
    .limit(1)

  const uyelik = (uyelikListesi || [])[0]
  if (!uyelik?.ekip_id) return null

  const { data: ekipListesi } = await supabase
    .from("ekipler")
    .select("id, ekip_adi, lider_personel_id, sorumlu_personel_id, arac_varlik_id")
    .eq("id", uyelik.ekip_id)
    .limit(1)

  const ekip = (ekipListesi || [])[0]
  if (!ekip) return null

  const personelIds = [ekip.lider_personel_id, ekip.sorumlu_personel_id].filter(Boolean) as string[]

  let liderAdi = "-"
  let sorumluAdi = "-"

  if (personelIds.length > 0) {
    const { data: personelListesi } = await supabase
      .from("personeller")
      .select("id, ad, soyad")
      .in("id", personelIds)

    const adBul = (id?: string | null) => {
      const p = (personelListesi || []).find((kayit) => kayit.id === id)
      return p ? `${p.ad || ""} ${p.soyad || ""}`.trim() || "-" : "-"
    }

    liderAdi = adBul(ekip.lider_personel_id)
    sorumluAdi = adBul(ekip.sorumlu_personel_id)
  }

  let aracBilgisi = "-"

  if (ekip.arac_varlik_id) {
    const { data: aracListesi } = await supabase
      .from("varliklar")
      .select("plaka, marka, model, ad")
      .eq("id", ekip.arac_varlik_id)
      .limit(1)

    const arac = (aracListesi || [])[0]
    if (arac) {
      aracBilgisi =
        [arac.plaka, arac.marka, arac.model].filter(Boolean).join(" ").trim() || arac.ad || "-"
    }
  }

  return {
    ekipAdi: ekip.ekip_adi || "-",
    liderAdi,
    sorumluAdi,
    aracBilgisi,
    rol: uyelik.rol || "-",
  } satisfies EkipBilgisi
}

function mesafeHesapla(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export default function GirisCikisPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [islem, setIslem] = useState(false)
  const [personel, setPersonel] = useState<Kayit | null>(null)
  const [vardiya, setVardiya] = useState<Kayit | null>(null)
  const [kayitlar, setKayitlar] = useState<Kayit[]>([])
  const [sonKayit, setSonKayit] = useState<Kayit | null>(null)
  const [servisKonumu, setServisKonumu] = useState<ServisKonumu | null>(null)
  const [kunyeKontrol, setKunyeKontrol] = useState<SirketKunyeKontrolSonuc | null>(null)
  const [ekipBilgisi, setEkipBilgisi] = useState<EkipBilgisi | null>(null)
  const [gelecekVardiyalar, setGelecekVardiyalar] = useState<GelecekVardiya[]>([])
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [konumTakipMesaji, setKonumTakipMesaji] = useState("Konum takibi beklemede.")
  const [yuklemeAdimi, setYuklemeAdimi] = useState("Başlatılıyor...")
  const [sonKonumGonderimSaati, setSonKonumGonderimSaati] = useState<string | null>(null)
  const [konumGonderimSayisi, setKonumGonderimSayisi] = useState(0)
  const konumLogIsleniyorRef = useRef(false)

  async function verileriYukle() {
    setLoading(true)
    setMesaj(null)

    try {
      const supabase = createClient()

      setYuklemeAdimi("Oturum kontrol ediliyor...")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      if (!user) {
        router.replace("/login")
        return
      }

      setYuklemeAdimi("Personel kaydı aranıyor...")

      const { data: personelData, error: personelError } = await supabase
        .from("personeller")
        .select("*")
        .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
        .maybeSingle()

      if (personelError || !personelData) {
        setMesaj({
          tip: "hata",
          metin: "Personel kaydı bulunamadı.",
        })
        setLoading(false)
        return
      }

      setPersonel(personelData)

      setYuklemeAdimi("Şirket künyesi kontrol ediliyor...")

      const kunyeSonuc = await sirketKunyesiKontrolEt(supabase, user.id, user.email)
      setKunyeKontrol(kunyeSonuc)

      if (!kunyeSonuc.tamam) {
        setServisKonumu(null)
        setMesaj({
          tip: "hata",
          metin:
            kunyeSonuc.hata ||
            "Şirket künyesi tamamlanmadan giriş/çıkış yapılamaz. Eksik alanları yöneticiniz tamamlamalıdır.",
        })
      } else {
        setServisKonumu(sirketKunyesiGirisCikisKonumu(kunyeSonuc.kunye))
      }

      const bugun = localISO(new Date())

      setYuklemeAdimi("Vardiya planı okunuyor...")

      const { data: vardiyaData } = await supabase
        .from("vardiya_planlari")
        .select("*")
        .eq("personel_id", personelData.id)
        .eq("tarih", bugun)
        .maybeSingle()

      setVardiya(vardiyaData)

      setYuklemeAdimi("Ekip bilgileri okunuyor...")
      const ekip = await ekipBilgisiGetir(supabase, personelData.id)
      setEkipBilgisi(ekip)

      setYuklemeAdimi("Gelecek vardiyalar okunuyor...")
      const onGunSonra = tarihEkle(9)

      const { data: vardiyaListesi } = await supabase
        .from("vardiya_planlari")
        .select("tarih, baslangic_saati, bitis_saati, durum, aciklama")
        .eq("personel_id", personelData.id)
        .gte("tarih", bugun)
        .lte("tarih", onGunSonra)
        .order("tarih", { ascending: true })

      setGelecekVardiyalar((vardiyaListesi || []) as GelecekVardiya[])

      setYuklemeAdimi("Giriş çıkış kayıtları okunuyor...")

      const { data: kayitData } = await supabase
        .from("giris_cikis_kayitlari")
        .select("*")
        .eq("personel_id", personelData.id)
        .gte("created_at", startOfToday().toISOString())
        .order("created_at", { ascending: false })

      const liste = kayitData || []

      setKayitlar(liste)
      setSonKayit(liste[0] || null)

      if (vardiyaData && vardiyaData.durum !== "calisma") {
        setKonumTakipMesaji(`${durumEtiketi(vardiyaData.durum)} günü olduğu için konum takibi pasiftir.`)
      } else if (!vardiyaData) {
        setKonumTakipMesaji("Bugün için vardiya planı bulunmadığı için konum takibi pasiftir.")
      }
    } catch (err: any) {
      setMesaj({
        tip: "hata",
        metin: err?.message || "Giriş/çıkış ekranı yüklenemedi.",
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    void verileriYukle()
  }, [])

  const kunyeTamam = Boolean(kunyeKontrol?.tamam)
  const vardiyaCalismaGunu = useMemo(() => {
    return Boolean(vardiya && vardiya.durum === "calisma" && vardiya.calisma_gunu !== false)
  }, [vardiya])

  async function konumLoguKaydet() {
    if (!personel?.id) {
      setKonumTakipMesaji("Personel bilgisi bulunamadı.")
      return
    }

    if (!vardiyaCalismaGunu) {
      setKonumTakipMesaji("Bugün çalışma günü olmadığı için konum gönderimi yapılmadı.")
      return
    }

    if (konumLogIsleniyorRef.current) {
      setKonumTakipMesaji("Konum gönderimi zaten devam ediyor.")
      return
    }

    konumLogIsleniyorRef.current = true
    setKonumTakipMesaji("Konum alınıyor...")

    try {
      const pos = await konumAl()
      const supabase = createClient()

      const { data, error } = await supabase.rpc("personel_konum_logu_kaydet", {
        p_personel_id: personel.id,
        p_enlem: pos.coords.latitude,
        p_boylam: pos.coords.longitude,
        p_hiz: pos.coords.speed ?? null,
        p_dogruluk: pos.coords.accuracy ?? null,
        p_pil_yuzde: null,
        p_kaynak: "mobile_app",
        p_uygulama_durumu: document.visibilityState === "visible" ? "aktif" : "arka_plan",
        p_cihaz_bilgisi: navigator.userAgent,
      })

      if (error) {
        console.error("Konum logu kaydedilemedi:", error.message)
        setKonumTakipMesaji(`Konum kaydedilemedi: ${error.message}`)
        return
      }

      const sonuc = data as {
        success?: boolean
        kaydedildi?: boolean
        reason?: string
        error?: string | null
      } | null

      if (sonuc?.kaydedildi) {
        const saat = new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })

        setSonKonumGonderimSaati(saat)
        setKonumGonderimSayisi((value) => value + 1)
        setKonumTakipMesaji("Konum başarıyla gönderildi.")
        return
      }

      setKonumTakipMesaji(
        sonuc?.reason || sonuc?.error || "Konum alınabildi ancak kayıt oluşturulmadı.",
      )
    } catch (err: any) {
      console.error("Konum logu için konum alınamadı:", err)
      setKonumTakipMesaji(err?.message || "Konum alınamadı. Tarayıcı konum iznini kontrol edin.")
    } finally {
      konumLogIsleniyorRef.current = false
    }
  }

  useEffect(() => {
    if (!personel?.id) return
    if (!vardiyaCalismaGunu) return
    if (sonKayit?.tip !== "giris") return

    void konumLoguKaydet()

    const intervalId = window.setInterval(() => {
      void konumLoguKaydet()
    }, KONUM_LOG_ARALIGI_MS)

    return () => {
      window.clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personel?.id, sonKayit?.tip, vardiyaCalismaGunu])

  const aktifDurum = useMemo(() => {
    return sonKayit?.tip === "giris" ? "giris" : "cikis"
  }, [sonKayit])

  const gunAnalizi = useMemo(() => {
    if (!vardiya || !vardiyaCalismaGunu) {
      return {
        ilkGiris: null,
        sonCikis: null,
        calismaDakika: 0,
        gecGirisDakika: 0,
        erkenCikisDakika: 0,
        fazlaMesaiDakika: 0,
      }
    }

    const sirali = [...kayitlar].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    const girisler = sirali.filter((k) => k.tip === "giris")
    const cikislar = sirali.filter((k) => k.tip === "cikis")

    const ilkGiris = girisler[0] || null
    const sonCikis = cikislar[cikislar.length - 1] || null

    const vardiyaBas = saatToDakika(vardiya.baslangic_saati)
    const vardiyaBit = saatToDakika(vardiya.bitis_saati)

    const ilkGirisDakika = kayitDakika(ilkGiris)
    const sonCikisDakika = kayitDakika(sonCikis)

    const gecGirisDakika =
      ilkGirisDakika !== null ? Math.max(0, ilkGirisDakika - vardiyaBas) : 0

    const erkenCikisDakika =
      sonCikisDakika !== null ? Math.max(0, vardiyaBit - sonCikisDakika) : 0

    const fazlaMesaiDakika =
      sonCikisDakika !== null ? Math.max(0, sonCikisDakika - vardiyaBit) : 0

    let calismaDakika = 0
    for (let i = 0; i < sirali.length; i += 1) {
      const mevcut = sirali[i]
      const sonraki = sirali[i + 1]

      if (mevcut?.tip === "giris" && sonraki?.tip === "cikis") {
        const giris = kayitDakika(mevcut)
        const cikis = kayitDakika(sonraki)
        if (giris !== null && cikis !== null && cikis > giris) {
          calismaDakika += cikis - giris
        }
      }
    }

    return {
      ilkGiris,
      sonCikis,
      calismaDakika,
      gecGirisDakika,
      erkenCikisDakika,
      fazlaMesaiDakika,
    }
  }, [kayitlar, vardiya, vardiyaCalismaGunu])

  async function handleKayit(tip: "giris" | "cikis") {
    if (!personel) return

    setMesaj(null)
    setIslem(true)

    try {
      if (!vardiya) {
        setMesaj({
          tip: "hata",
          metin: "Bugün için vardiya planınız bulunmuyor.",
        })
        setIslem(false)
        return
      }

      if (!vardiyaCalismaGunu) {
        setMesaj({
          tip: "hata",
          metin: `Bugünkü durumunuz: ${durumEtiketi(vardiya.durum)}. Giriş/çıkış yapılamaz.`,
        })
        setIslem(false)
        return
      }

      if (!kunyeTamam || !servisKonumu) {
        setMesaj({
          tip: "hata",
          metin:
            "Şirket künyesi tamamlanmadan giriş/çıkış yapılamaz. Lütfen Şirket Künyesi ekranında giriş/çıkış enlem, boylam ve mesafe limitini tanımlayın.",
        })
        setIslem(false)
        return
      }

      const pos = await konumAl()
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude

      const mesafe = mesafeHesapla(lat, lng, servisKonumu.lat, servisKonumu.lng)

      if (mesafe > servisKonumu.mesafeSiniri) {
        setMesaj({
          tip: "hata",
          metin: `Şirket giriş/çıkış lokasyonuna uzaklık ${mesafe} metre. Limit: ${servisKonumu.mesafeSiniri} metre.`,
        })
        setIslem(false)
        return
      }

      const supabase = createClient()
      const now = new Date()

      const vardiyaBas = saatToDakika(vardiya.baslangic_saati)
      const vardiyaBit = saatToDakika(vardiya.bitis_saati)
      const simdi = dateDakika(now)

      const kayitZamani = new Date(now)
      let bilgiMesaji = tip === "giris" ? "Girişiniz başarıyla alındı." : "Çıkış kaydedildi."

      if (tip === "giris" && simdi < vardiyaBas) {
        const [saat = 0, dakika = 0] = String(vardiya.baslangic_saati || "00:00")
          .split(":")
          .map((value) => Number(value || 0))

        kayitZamani.setHours(saat, dakika, 0, 0)

        bilgiMesaji = `Girişiniz başarıyla alındı. Vardiyanız ${vardiya.baslangic_saati} - ${vardiya.bitis_saati} saatleri arasındadır. Mesai kaydınız vardiya başlangıç saatinizden itibaren oluşturulacaktır.`
      }

      if (tip === "giris" && simdi > vardiyaBas) {
        const gecikme = simdi - vardiyaBas
        bilgiMesaji = `${gecikme} dakika geç başlandı.`

        await supabase.from("uyumsuzluklar").insert({
          personel_id: personel.id,
          tur: "gec_baslama",
          aciklama: bilgiMesaji,
        })
      }

      if (tip === "cikis" && simdi - vardiyaBit >= ONAY_SINIRI_DAKIKA) {
        bilgiMesaji = `Fazla mesai: ${dakikaYaz(simdi - vardiyaBit)}`
      }

      const { data: mesaiKaydi, error } = await supabase
        .from("giris_cikis_kayitlari")
        .insert({
          personel_id: personel.id,
          sirket_id: personel.sirket_id || null,
          tip,
          lat,
          lng,
          mesafe_metre: mesafe,
          basarili: true,
          created_at: kayitZamani.toISOString(),
        })
        .select("id")
        .single()

      if (error) {
        setMesaj({
          tip: "hata",
          metin: error.message,
        })
        setIslem(false)
        return
      }

      if (mesaiKaydi?.id) {
        const { data: konumOturumuSonuc, error: konumOturumuError } = await supabase.rpc(
          "personel_konum_oturumu_mesai_kaydi_isle",
          {
            p_mesai_kaydi_id: mesaiKaydi.id,
          },
        )

        if (konumOturumuError) {
          console.error("Konum oturumu işlenemedi:", konumOturumuError.message)
        } else {
          console.log("Konum oturumu sonucu:", konumOturumuSonuc)
        }
      }

      setMesaj({
        tip: "basari",
        metin: bilgiMesaji,
      })

      if (tip === "giris") {
        await konumLoguKaydet()
      }

      window.setTimeout(() => {
        setMesaj(null)
      }, 8000)

      await verileriYukle()
    } catch {
      setMesaj({
        tip: "hata",
        metin: "Konum alınamadı. Lütfen konum iznini açın.",
      })
    }

    setIslem(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white p-5 text-center shadow">
          <p className="font-bold text-gray-800">Yükleniyor...</p>
          <p className="mt-2 text-xs font-semibold text-gray-600">{yuklemeAdimi}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="text-2xl font-bold"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-black">Giriş / Çıkış</h1>
          <p className="text-xs font-semibold text-gray-600">
            Personel devam kontrol sistemi
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3 pb-28">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wide text-slate-500">Ekip Bilgisi</h2>
          {ekipBilgisi ? (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-bold text-slate-800">
              <p className="col-span-2 text-sm font-black text-slate-950">{ekipBilgisi.ekipAdi}</p>
              <p><span className="text-slate-500">Lider:</span> {ekipBilgisi.liderAdi}</p>
              <p><span className="text-slate-500">Sorumlu:</span> {ekipBilgisi.sorumluAdi}</p>
              <p><span className="text-slate-500">Araç:</span> {ekipBilgisi.aracBilgisi}</p>
              <p><span className="text-slate-500">Rolünüz:</span> {ekipBilgisi.rol}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs font-bold text-slate-600">Henüz ekibe bağlı değilsiniz.</p>
          )}
        </div>

        <div
          className={`rounded-xl px-3 py-2.5 text-white text-center ${ustKartClass(vardiya, aktifDurum)}`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">{ustKartIkon(vardiya, aktifDurum)}</span>
            <p className="text-base font-black">{ustKartBaslik(vardiya, aktifDurum)}</p>
          </div>

          <p className="mt-1 text-[11px] font-semibold">
            {personel?.ad_soyad || `${personel?.ad || ""} ${personel?.soyad || ""}`}
            {" · "}
            {vardiya ? durumEtiketi(vardiya.durum) : "Plan Yok"}
            {vardiyaCalismaGunu
              ? ` · ${temizSaat(vardiya?.baslangic_saati)}-${temizSaat(vardiya?.bitis_saati)}`
              : ""}
          </p>

          {vardiya && vardiya.durum !== "calisma" && vardiya.aciklama && (
            <p className="mt-1 text-[11px] font-semibold opacity-95">{vardiya.aciklama}</p>
          )}

          {servisKonumu && vardiyaCalismaGunu && (
            <p className="mt-1 text-[10px] font-semibold opacity-90">
              Konum: {servisKonumu.kaynak} · Limit {servisKonumu.mesafeSiniri} m
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm">
          <h2 className="text-xs font-black text-gray-900">Bugünkü Vardiya Analizi</h2>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold">
            <div className="rounded-lg bg-gray-50 border px-2 py-1.5">
              <p className="text-gray-500">İlk Giriş</p>
              <p className="text-gray-900">{formatSaat(gunAnalizi.ilkGiris?.created_at)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border px-2 py-1.5">
              <p className="text-gray-500">Son Çıkış</p>
              <p className="text-gray-900">{formatSaat(gunAnalizi.sonCikis?.created_at)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border px-2 py-1.5">
              <p className="text-gray-500">Çalışılan</p>
              <p className="text-gray-900">{dakikaYaz(gunAnalizi.calismaDakika)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border px-2 py-1.5">
              <p className="text-gray-500">Geç Giriş</p>
              <p className={analizRenk(gunAnalizi.gecGirisDakika)}>
                {dakikaYaz(gunAnalizi.gecGirisDakika)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border px-2 py-1.5">
              <p className="text-gray-500">Erken Çıkış</p>
              <p className={analizRenk(gunAnalizi.erkenCikisDakika)}>
                {dakikaYaz(gunAnalizi.erkenCikisDakika)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border px-2 py-1.5">
              <p className="text-gray-500">Fazla Mesai</p>
              <p className={gunAnalizi.fazlaMesaiDakika > 0 ? "text-blue-700" : "text-green-700"}>
                {dakikaYaz(gunAnalizi.fazlaMesaiDakika)}
              </p>
            </div>
          </div>
        </div>

        {mesaj && (
          <div
            className={`rounded-xl border p-3 text-sm font-bold ${
              mesaj.tip === "basari"
                ? "bg-green-50 border-green-300 text-green-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            {mesaj.metin}
          </div>
        )}

        {!vardiyaCalismaGunu && (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-3 text-sm font-bold text-blue-950">
            Bugün {vardiya ? durumEtiketi(vardiya.durum) : "plan yok"} olarak görünüyor. Giriş/çıkış ve konum takibi kapalıdır.
          </div>
        )}

        {!kunyeTamam && kunyeKontrol && !kunyeKontrol.tamam && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">
            Şirket künyesi tamamlanmadan giriş/çıkış yapılamaz.
            {kunyeKontrol.eksikler.length > 0 && (
              <span className="mt-2 block text-xs font-semibold">
                Eksik: {kunyeKontrol.eksikler.join(", ")}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleKayit("giris")}
            disabled={islem || aktifDurum === "giris" || !vardiyaCalismaGunu || !kunyeTamam}
            className="rounded-xl bg-green-600 py-3 text-sm text-white font-black disabled:opacity-40"
          >
            {islem ? "..." : "📍 Giriş"}
          </button>

          <button
            type="button"
            onClick={() => handleKayit("cikis")}
            disabled={islem || aktifDurum === "cikis" || !vardiyaCalismaGunu || !kunyeTamam}
            className="rounded-xl bg-red-600 py-3 text-sm text-white font-black disabled:opacity-40"
          >
            {islem ? "..." : "🚪 Çıkış"}
          </button>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xs font-black text-blue-950">Konum Takibi</h2>
              <p className="mt-1 text-[11px] font-semibold text-blue-900">{konumTakipMesaji}</p>
            </div>
            <div className="rounded-lg bg-white px-2 py-1 text-right text-[10px] font-black text-blue-950">
              <p>{konumGonderimSayisi} gönderim</p>
              <p>{sonKonumGonderimSaati || "-"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm">
          <h2 className="text-xs font-black">Bugünkü Hareketler</h2>
          {kayitlar.length === 0 ? (
            <p className="mt-2 rounded-lg bg-gray-50 border p-2 text-center text-[11px] font-bold text-gray-600">
              Kayıt yok
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {kayitlar.map((kayit) => (
                <div
                  key={kayit.id}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 flex items-center justify-between"
                >
                  <p className="text-[11px] font-black">
                    {kayit.tip === "giris" ? "📍 Giriş" : "🚪 Çıkış"} · {formatSaat(kayit.created_at)}
                  </p>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-black ${
                      kayit.tip === "giris" ? durumClass("Çalışıyor") : durumClass("Zamanında")
                    }`}
                  >
                    {kayit.tip === "giris" ? "Giriş" : "Çıkış"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm">
          <h2 className="text-xs font-black">Gelecek 10 Günlük Vardiya</h2>
          {gelecekVardiyalar.length === 0 ? (
            <p className="mt-2 rounded-lg bg-gray-50 border p-2 text-center text-[11px] font-bold text-gray-600">
              Vardiya kaydı bulunamadı.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {gelecekVardiyalar.map((plan) => (
                <div key={plan.tarih} className="rounded-lg border bg-slate-50 px-2 py-1.5">
                  <p className="text-[11px] font-black text-slate-900">{tarihYaz(plan.tarih)}</p>
                  <p className="text-[10px] font-bold text-slate-600">{durumEtiketi(plan.durum)}</p>
                  <p className="text-[10px] font-bold text-slate-800">
                    {temizSaat(plan.baslangic_saati) || "-"} - {temizSaat(plan.bitis_saati) || "-"}
                  </p>
                  {plan.aciklama && (
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-600 line-clamp-2">
                      {plan.aciklama}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] font-bold text-blue-900 text-center">
          Giriş/çıkış lokasyonu ve mesafe limiti yalnızca şirket künyesinden okunur.
        </p>
      </div>
      <MobileTabBar />
    </div>
  )
}
