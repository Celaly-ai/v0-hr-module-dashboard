"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const YEMEK_MOLASI_DAKIKA = 60
const ONAY_SINIRI_DAKIKA = 60
const VARSAYILAN_MESAFE_SINIRI_METRE = 50

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

type Kayit = Record<string, any>

type ServisKonumu = {
  lat: number
  lng: number
  mesafeSiniri: number
  kaynak: string
}

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

function sayi(value: any) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function konumCikar(kayit: Kayit | null, kaynak: string): ServisKonumu | null {
  if (!kayit) return null

  const lat =
    sayi(kayit.lat) ??
    sayi(kayit.latitude) ??
    sayi(kayit.merkez_lat) ??
    sayi(kayit.konum_lat) ??
    sayi(kayit.servis_lat) ??
    sayi(kayit.giris_cikis_lat)

  const lng =
    sayi(kayit.lng) ??
    sayi(kayit.longitude) ??
    sayi(kayit.merkez_lng) ??
    sayi(kayit.konum_lng) ??
    sayi(kayit.servis_lng) ??
    sayi(kayit.giris_cikis_lng)

  if (lat === null || lng === null) return null

  const mesafeSiniri =
    sayi(kayit.giris_cikis_mesafe_limiti) ??
    sayi(kayit.mesafe_limiti) ??
    sayi(kayit.gps_mesafe_limiti) ??
    VARSAYILAN_MESAFE_SINIRI_METRE

  return {
    lat,
    lng,
    mesafeSiniri,
    kaynak,
  }
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
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)

  async function servisKonumuGetir(p: Kayit) {
    const supabase = createClient()

    const personelKonumu = konumCikar(p, "personel")
    if (personelKonumu) return personelKonumu

    if (p.sube_id) {
      const { data } = await supabase.from("subeler").select("*").eq("id", p.sube_id).maybeSingle()
      const subeKonumu = konumCikar(data, "sube")
      if (subeKonumu) return subeKonumu
    }

    if (p.sirket_id) {
      const { data } = await supabase.from("sirketler").select("*").eq("id", p.sirket_id).maybeSingle()
      const sirketKonumu = konumCikar(data, "sirket")
      if (sirketKonumu) return sirketKonumu
    }

    return null
  }

  async function verileriYukle() {
    setLoading(true)
    setMesaj(null)

    try {
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

      const konum = await servisKonumuGetir(personelData)
      setServisKonumu(konum)

      const bugun = localISO(new Date())

      const { data: vardiyaData } = await supabase
        .from("vardiya_planlari")
        .select("*")
        .eq("personel_id", personelData.id)
        .eq("tarih", bugun)
        .maybeSingle()

      setVardiya(vardiyaData)

      const { data: kayitData } = await supabase
        .from("giris_cikis_kayitlari")
        .select("*")
        .eq("personel_id", personelData.id)
        .gte("created_at", startOfToday().toISOString())
        .order("created_at", { ascending: false })

      const liste = kayitData || []

      setKayitlar(liste)
      setSonKayit(liste[0] || null)
    } catch (err: any) {
      setMesaj({
        tip: "hata",
        metin: err?.message || "Giriş/çıkış ekranı yüklenemedi.",
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    verileriYukle()
  }, [])

  const aktifDurum = useMemo(() => {
    return sonKayit?.tip === "giris" ? "giris" : "cikis"
  }, [sonKayit])

  const gunAnalizi = useMemo(() => {
    if (!vardiya) {
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
  }, [kayitlar, vardiya])


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

      if (vardiya.durum !== "calisma" || !vardiya.calisma_gunu) {
        setMesaj({
          tip: "hata",
          metin: `Bugünkü durumunuz: ${durumEtiketi(vardiya.durum)}. Giriş/çıkış yapılamaz.`,
        })
        setIslem(false)
        return
      }

      if (!servisKonumu) {
        setMesaj({
          tip: "hata",
          metin: "Şirket/şube servis konumu bulunamadı. Lütfen şirket veya şube lokasyon bilgisini tanımlayın.",
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
          metin: `Servise uzaklık ${mesafe} metre. Limit: ${servisKonumu.mesafeSiniri} metre.`,
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
        <p className="font-bold text-gray-800">Yükleniyor...</p>
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

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div
          className={`rounded-2xl p-4 text-white text-center ${
            aktifDurum === "giris" ? "bg-green-600" : "bg-gray-700"
          }`}
        >
          <p className="text-3xl">{aktifDurum === "giris" ? "🟢" : "⚫"}</p>

          <p className="mt-2 text-lg font-black">
            {aktifDurum === "giris" ? "Serviste" : "Dışarıda"}
          </p>

          <p className="text-xs font-semibold mt-2">
            {personel?.ad_soyad || `${personel?.ad || ""} ${personel?.soyad || ""}`}
          </p>

          <p className="text-xs font-semibold mt-1">
            Bugünkü Durum: {vardiya ? durumEtiketi(vardiya.durum) : "Plan Yok"}
          </p>

          {vardiya?.durum === "calisma" && (
            <p className="text-xs font-semibold mt-1">
              {temizSaat(vardiya.baslangic_saati)} - {temizSaat(vardiya.bitis_saati)}
            </p>
          )}

          {servisKonumu && (
            <p className="text-xs font-semibold mt-2 opacity-90">
              Konum kaynağı: {servisKonumu.kaynak} · Limit: {servisKonumu.mesafeSiniri} m
            </p>
          )}
        </div>


        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-black">Bugünkü Vardiya Analizi</h2>
            <p className="text-xs text-gray-600 font-semibold">
              Plan, giriş/çıkış ve puantaj özeti
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">Vardiya</p>
              <p className="text-gray-900">
                {vardiya ? `${temizSaat(vardiya.baslangic_saati)} - ${temizSaat(vardiya.bitis_saati)}` : "Plan yok"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">Durum</p>
              <p className="text-gray-900">
                {vardiya ? durumEtiketi(vardiya.durum) : "Plan Yok"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">İlk Giriş</p>
              <p className="text-gray-900">{formatSaat(gunAnalizi.ilkGiris?.created_at)}</p>
            </div>

            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">Son Çıkış</p>
              <p className="text-gray-900">{formatSaat(gunAnalizi.sonCikis?.created_at)}</p>
            </div>

            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">Çalışılan Süre</p>
              <p className="text-gray-900">{dakikaYaz(gunAnalizi.calismaDakika)}</p>
            </div>

            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">Geç Giriş</p>
              <p className={analizRenk(gunAnalizi.gecGirisDakika)}>
                {dakikaYaz(gunAnalizi.gecGirisDakika)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">Erken Çıkış</p>
              <p className={analizRenk(gunAnalizi.erkenCikisDakika)}>
                {dakikaYaz(gunAnalizi.erkenCikisDakika)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 border p-3">
              <p className="text-gray-500">Fazla Mesai</p>
              <p className={gunAnalizi.fazlaMesaiDakika > 0 ? "text-blue-700" : "text-green-700"}>
                {dakikaYaz(gunAnalizi.fazlaMesaiDakika)}
              </p>
            </div>
          </div>
        </div>
\n        {mesaj && (
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

        <button
          type="button"
          onClick={() => handleKayit("giris")}
          disabled={islem || aktifDurum === "giris"}
          className="w-full rounded-xl bg-green-600 py-4 text-white font-black disabled:opacity-40"
        >
          {islem ? "İşleniyor..." : "📍 Giriş Yap"}
        </button>

        <button
          type="button"
          onClick={() => handleKayit("cikis")}
          disabled={islem || aktifDurum === "cikis"}
          className="w-full rounded-xl bg-red-600 py-4 text-white font-black disabled:opacity-40"
        >
          {islem ? "İşleniyor..." : "🚪 Çıkış Yap"}
        </button>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-black">Bugünkü Hareketler</h2>
            <p className="text-xs text-gray-600 font-semibold">
              Gün içi giriş / çıkış kayıtları
            </p>
          </div>

          {kayitlar.length === 0 ? (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center text-sm font-bold text-gray-600">
              Kayıt bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2">
              {kayitlar.map((kayit) => (
                <div
                  key={kayit.id}
                  className="rounded-xl border border-gray-200 p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-black">
                      {kayit.tip === "giris" ? "📍 Giriş" : "🚪 Çıkış"}
                    </p>

                    <p className="text-xs text-gray-600 font-semibold">
                      {formatSaat(kayit.created_at)}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg border px-2 py-1 text-xs font-black ${
                      kayit.tip === "giris"
                        ? durumClass("Çalışıyor")
                        : durumClass("Zamanında")
                    }`}
                  >
                    {kayit.tip === "giris" ? "Giriş" : "Çıkış"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs font-bold text-blue-900">
            📍 Servis lokasyonu artık sabit değildir. Personel, şube veya şirket kayıtlarından dinamik okunur.
          </p>
        </div>
      </div>
    </div>
  )
}
