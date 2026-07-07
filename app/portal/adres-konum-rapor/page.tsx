"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ExternalLink, MapPin } from "lucide-react"

type AuthPersonel = {
  id: string
  sirket_id: string | null
}

type Personel = {
  id: string
  ad: string | null
  soyad: string | null
}

type Kayit = {
  id: string
  personel_id: string | null
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  asansor_durumu: string | null
  park_durumu: string | null
  tasima_zorlugu: string | null
  personel_notu: string | null
  durum: string | null
  created_at: string | null
}

type FiltreState = {
  tarihBaslangic: string
  tarihBitis: string
  personelId: string
  asansorDurumu: string
  parkDurumu: string
  tasimaZorlugu: string
}

const bosFiltre: FiltreState = {
  tarihBaslangic: "",
  tarihBitis: "",
  personelId: "",
  asansorDurumu: "",
  parkDurumu: "",
  tasimaZorlugu: "",
}

const inputSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
const selectSinifi =
  "w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm font-bold text-slate-900"
const labelSinifi = "mb-1 block text-xs font-bold text-slate-700"

function bugunBaslangic() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function bugunBitis() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function deger(value?: string | null) {
  if (value === null || value === undefined || String(value).trim() === "") return "-"
  return value
}

function adSoyad(personel?: Personel | null) {
  if (!personel) return "-"
  const ad = `${personel.ad || ""} ${personel.soyad || ""}`.trim()
  return ad || "-"
}

function tarihSaat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function koordinat(value?: number | null, basamak = 6) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-"
  return Number(value).toFixed(basamak)
}

function hassasiyet(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-"
  return `±${Math.round(Number(value))} m`
}

function asansorEtiketi(value?: string | null) {
  const etiketler: Record<string, string> = {
    var: "Var",
    yok: "Yok",
    yuk_tasima: "Yük Taşıma Asansörü",
    bilinmiyor: "Bilinmiyor",
  }
  if (!value) return "-"
  return etiketler[value] || value
}

function parkEtiketi(value?: string | null) {
  const etiketler: Record<string, string> = {
    onunde: "Bina Önünde",
    yakin: "Yakın Park",
    uzak: "Uzak Park",
    yasak: "Park Yasak",
    bilinmiyor: "Bilinmiyor",
  }
  if (!value) return "-"
  return etiketler[value] || value
}

function tasimaEtiketi(value?: string | null) {
  const etiketler: Record<string, string> = {
    kolay: "Kolay",
    orta: "Orta",
    zor: "Zor",
    cok_zor: "Çok Zor",
  }
  if (!value) return "-"
  return etiketler[value] || value
}

function googleMapsLink(latitude?: number | null, longitude?: number | null) {
  if (
    latitude === null ||
    longitude === null ||
    latitude === undefined ||
    longitude === undefined
  ) {
    return null
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

export default function AdresKonumRaporPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [kayitlar, setKayitlar] = useState<Kayit[]>([])
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [filtre, setFiltre] = useState<FiltreState>(bosFiltre)

  const personelMap = useMemo(() => {
    const map = new Map<string, Personel>()
    personeller.forEach((p) => map.set(p.id, p))
    return map
  }, [personeller])

  const veriYukle = useCallback(async () => {
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

    let sirketId: string | null = null

    const { data: authEslesme } = await supabase
      .from("personeller")
      .select("id, sirket_id")
      .eq("auth_id", user.id)
      .limit(1)

    let personelKaydi: AuthPersonel | undefined = (authEslesme || [])[0] as
      | AuthPersonel
      | undefined

    if (!personelKaydi) {
      const { data: kullaniciEslesme } = await supabase
        .from("personeller")
        .select("id, sirket_id")
        .eq("kullanici_id", user.id)
        .limit(1)
      personelKaydi = (kullaniciEslesme || [])[0] as AuthPersonel | undefined
    }

    if (!personelKaydi && user.email) {
      const { data: emailEslesme } = await supabase
        .from("personeller")
        .select("id, sirket_id")
        .eq("email", user.email)
        .limit(1)
      personelKaydi = (emailEslesme || [])[0] as AuthPersonel | undefined
    }

    sirketId = personelKaydi?.sirket_id ?? null

    const kayitSorgu = supabase
      .from("adres_konum_teyitleri")
      .select(
        "id, personel_id, latitude, longitude, accuracy, asansor_durumu, park_durumu, tasima_zorlugu, personel_notu, durum, created_at"
      )
      .order("created_at", { ascending: false })

    if (sirketId) {
      kayitSorgu.eq("sirket_id", sirketId)
    }

    const personelSorgu = supabase.from("personeller").select("id, ad, soyad")

    if (sirketId) {
      personelSorgu.eq("sirket_id", sirketId)
    }

    const [{ data: kayitData, error: kayitError }, { data: personelData, error: personelError }] =
      await Promise.all([kayitSorgu, personelSorgu])

    if (kayitError) {
      setHata("Kayıtlar alınamadı: " + kayitError.message)
      setKayitlar([])
      setPersoneller([])
      setLoading(false)
      return
    }

    if (personelError) {
      setHata("Personel listesi alınamadı: " + personelError.message)
      setKayitlar([])
      setPersoneller([])
      setLoading(false)
      return
    }

    setKayitlar((kayitData || []) as Kayit[])
    setPersoneller((personelData || []) as Personel[])
    setLoading(false)
  }, [router])

  useEffect(() => {
    void veriYukle()
  }, [veriYukle])

  const filtreliKayitlar = useMemo(() => {
    return kayitlar.filter((kayit) => {
      if (filtre.personelId && kayit.personel_id !== filtre.personelId) return false
      if (filtre.asansorDurumu && kayit.asansor_durumu !== filtre.asansorDurumu) return false
      if (filtre.parkDurumu && kayit.park_durumu !== filtre.parkDurumu) return false
      if (filtre.tasimaZorlugu && kayit.tasima_zorlugu !== filtre.tasimaZorlugu) return false

      if (filtre.tarihBaslangic && kayit.created_at) {
        const baslangic = new Date(`${filtre.tarihBaslangic}T00:00:00`)
        if (new Date(kayit.created_at) < baslangic) return false
      }

      if (filtre.tarihBitis && kayit.created_at) {
        const bitis = new Date(`${filtre.tarihBitis}T23:59:59.999`)
        if (new Date(kayit.created_at) > bitis) return false
      }

      return true
    })
  }, [kayitlar, filtre])

  const kpiler = useMemo(() => {
    const bugunBas = bugunBaslangic()
    const bugunSon = bugunBitis()

    const bugunkuKayit = filtreliKayitlar.filter((k) => {
      if (!k.created_at) return false
      const tarih = new Date(k.created_at)
      return tarih >= bugunBas && tarih <= bugunSon
    }).length

    const personelIdSet = new Set(
      filtreliKayitlar.map((k) => k.personel_id).filter(Boolean) as string[]
    )

    const hassasiyetDegerleri = filtreliKayitlar
      .map((k) => Number(k.accuracy))
      .filter((v) => !Number.isNaN(v))

    const ortalamaHassasiyet =
      hassasiyetDegerleri.length > 0
        ? hassasiyetDegerleri.reduce((toplam, v) => toplam + v, 0) / hassasiyetDegerleri.length
        : null

    return {
      toplamKayit: filtreliKayitlar.length,
      bugunkuKayit,
      personelSayisi: personelIdSet.size,
      ortalamaHassasiyet,
    }
  }, [filtreliKayitlar])

  const filtrePersonelSecenekleri = useMemo(() => {
    const ids = new Set(kayitlar.map((k) => k.personel_id).filter(Boolean) as string[])
    return personeller
      .filter((p) => ids.has(p.id))
      .sort((a, b) => adSoyad(a).localeCompare(adSoyad(b), "tr-TR"))
  }, [kayitlar, personeller])

  function filtreGuncelle<K extends keyof FiltreState>(alan: K, deger: FiltreState[K]) {
    setFiltre((onceki) => ({ ...onceki, [alan]: deger }))
  }

  function filtreleriTemizle() {
    setFiltre(bosFiltre)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <p className="text-base font-bold text-slate-700">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="mx-auto max-w-7xl px-4 space-y-4">
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
              <h1 className="text-xl font-black text-slate-950 md:text-2xl">
                Adres / Konum Raporları
              </h1>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Saha koşulu ve GPS kayıtlarını görüntüleyin
            </p>
          </div>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {hata}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-800">Toplam Kayıt</p>
            <p className="mt-1 text-2xl font-black text-blue-900">{kpiler.toplamKayit}</p>
          </div>

          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-800">Bugünkü Kayıt</p>
            <p className="mt-1 text-2xl font-black text-emerald-900">{kpiler.bugunkuKayit}</p>
          </div>

          <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-4">
            <p className="text-xs font-bold text-indigo-800">Kayıt Yapan Personel</p>
            <p className="mt-1 text-2xl font-black text-indigo-900">{kpiler.personelSayisi}</p>
          </div>

          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4">
            <p className="text-xs font-bold text-orange-800">Ort. GPS Hassasiyeti</p>
            <p className="mt-1 text-2xl font-black text-orange-900">
              {kpiler.ortalamaHassasiyet === null
                ? "-"
                : `±${Math.round(kpiler.ortalamaHassasiyet)} m`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-slate-950">Filtreler</h2>
            <button
              type="button"
              onClick={filtreleriTemizle}
              className="text-xs font-black text-blue-700"
            >
              Temizle
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelSinifi} htmlFor="tarih_baslangic">
                Tarih Başlangıç
              </label>
              <input
                id="tarih_baslangic"
                type="date"
                value={filtre.tarihBaslangic}
                onChange={(e) => filtreGuncelle("tarihBaslangic", e.target.value)}
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi} htmlFor="tarih_bitis">
                Tarih Bitiş
              </label>
              <input
                id="tarih_bitis"
                type="date"
                value={filtre.tarihBitis}
                onChange={(e) => filtreGuncelle("tarihBitis", e.target.value)}
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi} htmlFor="personel">
                Personel
              </label>
              <select
                id="personel"
                value={filtre.personelId}
                onChange={(e) => filtreGuncelle("personelId", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Tümü</option>
                {filtrePersonelSecenekleri.map((p) => (
                  <option key={p.id} value={p.id}>
                    {adSoyad(p)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelSinifi} htmlFor="asansor">
                Asansör Durumu
              </label>
              <select
                id="asansor"
                value={filtre.asansorDurumu}
                onChange={(e) => filtreGuncelle("asansorDurumu", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Tümü</option>
                <option value="var">Var</option>
                <option value="yok">Yok</option>
                <option value="yuk_tasima">Yük Taşıma Asansörü</option>
                <option value="bilinmiyor">Bilinmiyor</option>
              </select>
            </div>

            <div>
              <label className={labelSinifi} htmlFor="park">
                Park Durumu
              </label>
              <select
                id="park"
                value={filtre.parkDurumu}
                onChange={(e) => filtreGuncelle("parkDurumu", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Tümü</option>
                <option value="onunde">Bina Önünde</option>
                <option value="yakin">Yakın Park</option>
                <option value="uzak">Uzak Park</option>
                <option value="yasak">Park Yasak</option>
                <option value="bilinmiyor">Bilinmiyor</option>
              </select>
            </div>

            <div>
              <label className={labelSinifi} htmlFor="tasima">
                Taşıma Zorluğu
              </label>
              <select
                id="tasima"
                value={filtre.tasimaZorlugu}
                onChange={(e) => filtreGuncelle("tasimaZorlugu", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Tümü</option>
                <option value="kolay">Kolay</option>
                <option value="orta">Orta</option>
                <option value="zor">Zor</option>
                <option value="cok_zor">Çok Zor</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-base font-black text-slate-950">
            Kayıt Listesi ({filtreliKayitlar.length})
          </h2>

          {filtreliKayitlar.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600">Kayıt bulunamadı.</p>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-2 py-2 font-black">Tarih/Saat</th>
                      <th className="px-2 py-2 font-black">Personel</th>
                      <th className="px-2 py-2 font-black">Enlem</th>
                      <th className="px-2 py-2 font-black">Boylam</th>
                      <th className="px-2 py-2 font-black">Hassasiyet</th>
                      <th className="px-2 py-2 font-black">Asansör</th>
                      <th className="px-2 py-2 font-black">Park</th>
                      <th className="px-2 py-2 font-black">Taşıma</th>
                      <th className="px-2 py-2 font-black">Not</th>
                      <th className="px-2 py-2 font-black">Harita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtreliKayitlar.map((kayit) => {
                      const mapsLink = googleMapsLink(kayit.latitude, kayit.longitude)

                      return (
                        <tr key={kayit.id} className="border-b border-slate-100 align-top">
                          <td className="px-2 py-3 font-semibold">{tarihSaat(kayit.created_at)}</td>
                          <td className="px-2 py-3 font-semibold">
                            {kayit.personel_id
                              ? adSoyad(personelMap.get(kayit.personel_id))
                              : "-"}
                          </td>
                          <td className="px-2 py-3 font-semibold">{koordinat(kayit.latitude)}</td>
                          <td className="px-2 py-3 font-semibold">{koordinat(kayit.longitude)}</td>
                          <td className="px-2 py-3 font-semibold">{hassasiyet(kayit.accuracy)}</td>
                          <td className="px-2 py-3 font-semibold">
                            {asansorEtiketi(kayit.asansor_durumu)}
                          </td>
                          <td className="px-2 py-3 font-semibold">
                            {parkEtiketi(kayit.park_durumu)}
                          </td>
                          <td className="px-2 py-3 font-semibold">
                            {tasimaEtiketi(kayit.tasima_zorlugu)}
                          </td>
                          <td className="px-2 py-3 font-semibold max-w-[220px]">
                            {deger(kayit.personel_notu)}
                          </td>
                          <td className="px-2 py-3">
                            {mapsLink ? (
                              <a
                                href={mapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Google Maps
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {filtreliKayitlar.map((kayit) => {
                  const mapsLink = googleMapsLink(kayit.latitude, kayit.longitude)

                  return (
                    <div
                      key={kayit.id}
                      className="rounded-xl border border-slate-200 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {tarihSaat(kayit.created_at)}
                          </p>
                          <p className="text-xs font-semibold text-slate-600">
                            {kayit.personel_id
                              ? adSoyad(personelMap.get(kayit.personel_id))
                              : "-"}
                          </p>
                        </div>
                        {mapsLink && (
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Harita
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                        <p>Enlem: {koordinat(kayit.latitude)}</p>
                        <p>Boylam: {koordinat(kayit.longitude)}</p>
                        <p>Hassasiyet: {hassasiyet(kayit.accuracy)}</p>
                        <p>Asansör: {asansorEtiketi(kayit.asansor_durumu)}</p>
                        <p>Park: {parkEtiketi(kayit.park_durumu)}</p>
                        <p>Taşıma: {tasimaEtiketi(kayit.tasima_zorlugu)}</p>
                      </div>

                      <p className="text-xs font-semibold text-slate-700">
                        Not: {deger(kayit.personel_notu)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
