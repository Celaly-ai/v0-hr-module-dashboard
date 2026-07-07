"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Navigation } from "lucide-react"

type Personel = {
  id: string
  sirket_id: string | null
  ad: string | null
  soyad: string | null
}

type KonumState = {
  latitude: number
  longitude: number
  accuracy: number
}

type FormState = {
  asansor_durumu: string
  park_durumu: string
  tasima_zorlugu: string
  personel_notu: string
}

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

const bosForm: FormState = {
  asansor_durumu: "",
  park_durumu: "",
  tasima_zorlugu: "",
  personel_notu: "",
}

const inputSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-base font-semibold text-slate-900 placeholder:text-slate-500"
const selectSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-base font-bold text-slate-900"
const labelSinifi = "mb-1.5 block text-sm font-bold text-slate-900"

function adSoyad(personel: Personel | null) {
  if (!personel) return "Personel"
  return `${personel.ad || ""} ${personel.soyad || ""}`.trim() || "Personel"
}

function mesajClass(tip: Mesaj["tip"]) {
  if (tip === "basari") return "border-green-300 bg-green-50 text-green-900"
  return "border-red-300 bg-red-50 text-red-900"
}

export default function AdresKonumTeyitPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [konumAliniyor, setKonumAliniyor] = useState(false)
  const [personel, setPersonel] = useState<Personel | null>(null)
  const [konum, setKonum] = useState<KonumState | null>(null)
  const [konumHata, setKonumHata] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [form, setForm] = useState<FormState>(bosForm)

  const personelYukle = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.replace("/login")
      return
    }

    const personelSelect = "id, sirket_id, ad, soyad"

    const { data: authEslesme, error: authError } = await supabase
      .from("personeller")
      .select(personelSelect)
      .eq("auth_id", user.id)
      .limit(1)

    if (authError) {
      setHata("Personel kaydı kontrol edilirken hata oluştu: " + authError.message)
      setLoading(false)
      return
    }

    let personelKaydi = (authEslesme || [])[0] as Personel | undefined

    if (!personelKaydi) {
      const { data: kullaniciEslesme, error: kullaniciError } = await supabase
        .from("personeller")
        .select(personelSelect)
        .eq("kullanici_id", user.id)
        .limit(1)

      if (kullaniciError) {
        setHata("Personel kaydı kontrol edilirken hata oluştu: " + kullaniciError.message)
        setLoading(false)
        return
      }

      personelKaydi = (kullaniciEslesme || [])[0] as Personel | undefined
    }

    if (!personelKaydi && user.email) {
      const { data: emailEslesme, error: emailError } = await supabase
        .from("personeller")
        .select(personelSelect)
        .eq("email", user.email)
        .limit(1)

      if (emailError) {
        setHata("Personel kaydı kontrol edilirken hata oluştu: " + emailError.message)
        setLoading(false)
        return
      }

      personelKaydi = (emailEslesme || [])[0] as Personel | undefined
    }

    if (!personelKaydi?.id) {
      setHata("Bu kullanıcı için personel kaydı bulunamadı.")
      setLoading(false)
      return
    }

    if (!personelKaydi.sirket_id) {
      setHata("Personel kaydında şirket bilgisi bulunamadı.")
      setLoading(false)
      return
    }

    setPersonel(personelKaydi)
    setLoading(false)
  }, [router])

  useEffect(() => {
    void personelYukle()
  }, [personelYukle])

  function konumAl() {
    if (!navigator.geolocation) {
      setKonumHata("Bu cihaz GPS konumunu desteklemiyor.")
      return
    }

    setKonumAliniyor(true)
    setKonumHata(null)
    setMesaj(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setKonum({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setKonumAliniyor(false)
      },
      (geoError) => {
        setKonumAliniyor(false)
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setKonumHata("Konum izni verilmedi. Lütfen tarayıcı ayarlarından konum iznini açın.")
          return
        }
        if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setKonumHata("Konum bilgisi alınamadı. Açık alanda tekrar deneyin.")
          return
        }
        if (geoError.code === geoError.TIMEOUT) {
          setKonumHata("Konum alma zaman aşımına uğradı. Tekrar deneyin.")
          return
        }
        setKonumHata("Konum alınamadı: " + geoError.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  function formGuncelle<K extends keyof FormState>(alan: K, deger: FormState[K]) {
    setForm((onceki) => ({ ...onceki, [alan]: deger }))
  }

  async function kaydet(e: FormEvent) {
    e.preventDefault()
    setMesaj(null)

    if (!personel?.id || !personel.sirket_id) {
      setMesaj({ tip: "hata", metin: "Personel veya şirket bilgisi eksik." })
      return
    }

    if (!konum) {
      setMesaj({ tip: "hata", metin: "Kayıt için önce GPS konumu alınmalıdır." })
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    const { error } = await supabase.from("adres_konum_teyitleri").insert({
      sirket_id: personel.sirket_id,
      personel_id: personel.id,
      latitude: konum.latitude,
      longitude: konum.longitude,
      accuracy: konum.accuracy,
      asansor_durumu: form.asansor_durumu || null,
      park_durumu: form.park_durumu || null,
      tasima_zorlugu: form.tasima_zorlugu || null,
      personel_notu: form.personel_notu.trim() || null,
      kaynak: "personel_mobil",
      durum: "aktif",
    })

    setKaydediliyor(false)

    if (error) {
      setMesaj({ tip: "hata", metin: "Kayıt oluşturulamadı: " + error.message })
      return
    }

    setForm(bosForm)
    setKonum(null)
    setKonumHata(null)
    setMesaj({ tip: "basari", metin: "Saha koşulu kaydı başarıyla oluşturuldu." })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <p className="text-base font-bold text-slate-700">Yükleniyor...</p>
      </div>
    )
  }

  if (hata) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-4">
          <button
            type="button"
            onClick={() => router.push("/portal")}
            className="text-2xl font-bold text-slate-900"
          >
            ←
          </button>
          <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm font-bold text-red-900">
            {hata}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-lg px-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/portal")}
            className="mt-1 text-2xl font-bold text-slate-900"
          >
            ←
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-700" />
              <h1 className="text-xl font-black text-slate-950">Adres / Konum Teyidi</h1>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Bulunduğunuz konuma bağlı saha koşulu verisi toplayın
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Personel: {adSoyad(personel)}
            </p>
          </div>
        </div>

        {mesaj && (
          <div className={`rounded-2xl border p-4 text-sm font-bold ${mesajClass(mesaj.tip)}`}>
            {mesaj.metin}
          </div>
        )}

        <form onSubmit={kaydet} className="space-y-4">
          <button
            type="button"
            onClick={konumAl}
            disabled={konumAliniyor}
            className="w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white shadow-sm disabled:opacity-60"
          >
            {konumAliniyor ? "Konum Alınıyor..." : "GPS Konumunu Al"}
          </button>

          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">GPS Bilgisi</p>
              <Navigation className="h-5 w-5 text-slate-700" />
            </div>

            {konum ? (
              <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-semibold text-green-900 space-y-1">
                <p>Enlem: {konum.latitude.toFixed(6)}</p>
                <p>Boylam: {konum.longitude.toFixed(6)}</p>
                <p>Hassasiyet: ±{Math.round(konum.accuracy)} m</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-amber-800">
                Henüz konum alınmadı. Kayıt için GPS zorunludur.
              </p>
            )}

            {konumHata && (
              <p className="text-sm font-bold text-red-700">{konumHata}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-4">
            <div>
              <label className={labelSinifi} htmlFor="asansor_durumu">
                Asansör Durumu
              </label>
              <select
                id="asansor_durumu"
                value={form.asansor_durumu}
                onChange={(e) => formGuncelle("asansor_durumu", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Seçiniz</option>
                <option value="var">Var</option>
                <option value="yok">Yok</option>
                <option value="yuk_tasima">Yük Taşıma Asansörü</option>
                <option value="bilinmiyor">Bilinmiyor</option>
              </select>
            </div>

            <div>
              <label className={labelSinifi} htmlFor="park_durumu">
                Park Durumu
              </label>
              <select
                id="park_durumu"
                value={form.park_durumu}
                onChange={(e) => formGuncelle("park_durumu", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Seçiniz</option>
                <option value="onunde">Bina Önünde</option>
                <option value="yakin">Yakın Park</option>
                <option value="uzak">Uzak Park</option>
                <option value="yasak">Park Yasak</option>
                <option value="bilinmiyor">Bilinmiyor</option>
              </select>
            </div>

            <div>
              <label className={labelSinifi} htmlFor="tasima_zorlugu">
                Taşıma Zorluğu
              </label>
              <select
                id="tasima_zorlugu"
                value={form.tasima_zorlugu}
                onChange={(e) => formGuncelle("tasima_zorlugu", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Seçiniz</option>
                <option value="kolay">Kolay</option>
                <option value="orta">Orta</option>
                <option value="zor">Zor</option>
                <option value="cok_zor">Çok Zor</option>
              </select>
            </div>

            <div>
              <label className={labelSinifi} htmlFor="personel_notu">
                Personel Notu
              </label>
              <textarea
                id="personel_notu"
                value={form.personel_notu}
                onChange={(e) => formGuncelle("personel_notu", e.target.value)}
                className={`${inputSinifi} min-h-[80px] resize-y`}
                placeholder="İsteğe bağlı saha gözlemi..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={kaydediliyor || !konum}
            className="w-full rounded-2xl bg-emerald-700 px-4 py-4 text-base font-black text-white shadow-sm disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydı Tamamla"}
          </button>

          {!konum && (
            <p className="text-center text-xs font-bold text-amber-800">
              Kaydetmek için önce GPS konumu alın.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
