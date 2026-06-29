"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type CariTipi =
  | "musteri"
  | "tedarikci"
  | "taseron"
  | "personel"
  | "bayi"
  | "banka"
  | "diger"

type Cari = {
  id: string
  cari_kodu: string | null
  cari_adi: string
  cari_tipi: string
  telefon: string | null
  email: string | null
  vergi_no: string | null
  adres: string | null
  durum: string | null
}

type FormState = {
  cari_adi: string
  cari_tipi: CariTipi
  telefon: string
  email: string
  vergi_no: string
  adres: string
  notlar: string
}

type Mesaj = {
  tip: "basari" | "hata"
  metin: string
}

const inputSinifi =
  "w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-500"
const selectSinifi =
  "w-full rounded-lg border border-gray-500 bg-white px-3 py-3 text-sm font-bold text-gray-900"
const labelSinifi = "mb-1 block text-sm font-bold text-gray-900"

const bosForm: FormState = {
  cari_adi: "",
  cari_tipi: "musteri",
  telefon: "",
  email: "",
  vergi_no: "",
  adres: "",
  notlar: "",
}

function cariTipiEtiketi(tip: string) {
  const etiketler: Record<string, string> = {
    musteri: "Müşteri",
    tedarikci: "Tedarikçi",
    taseron: "Taşeron",
    personel: "Personel",
    bayi: "Bayi",
    banka: "Banka",
    diger: "Diğer",
  }
  return etiketler[tip] || tip
}

function adresKisa(adres: string | null, max = 50) {
  if (!adres?.trim()) return "-"
  const trimmed = adres.trim().replace(/\s+/g, " ")
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max) + "..."
}

function bakiyeGoster(value = 0) {
  return (
    Number(value || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " TL"
  )
}

function mesajClass(tip: Mesaj["tip"]) {
  if (tip === "basari") return "bg-green-50 border-green-300 text-green-900"
  return "bg-red-50 border-red-300 text-red-900"
}

function durumEtiketi(durum: string | null) {
  if (!durum?.trim()) return "-"
  return durum.charAt(0).toLocaleUpperCase("tr-TR") + durum.slice(1)
}

export default function MuhasebeCarilerPage() {
  const router = useRouter()

  const [sirketId, setSirketId] = useState<string | null>(null)
  const [cariler, setCariler] = useState<Cari[]>([])
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [form, setForm] = useState<FormState>(bosForm)
  const [filtre, setFiltre] = useState({
    arama: "",
    tip: "",
  })

  useEffect(() => {
    baslangicYukle()
  }, [])

  async function sirketIdAl(): Promise<string | null> {
    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMesaj({
        tip: "hata",
        metin: "Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.",
      })
      return null
    }

    const { data: personel, error: personelError } = await supabase
      .from("personeller")
      .select("sirket_id")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    if (personelError || !personel?.sirket_id) {
      setMesaj({
        tip: "hata",
        metin: "Şirket bilgisi bulunamadı. Cari kaydı oluşturulamadı.",
      })
      return null
    }

    return personel.sirket_id
  }

  async function carileriYukle(aktifSirketId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_cariler")
      .select(
        "id, cari_kodu, cari_adi, cari_tipi, telefon, email, vergi_no, adres, durum"
      )
      .eq("sirket_id", aktifSirketId)
      .eq("durum", "aktif")
      .order("created_at", { ascending: false })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Cariler alınamadı: " + error.message,
      })
      return
    }

    setCariler(data || [])
  }

  async function baslangicYukle() {
    setLoading(true)
    setMesaj(null)

    const aktifSirketId = await sirketIdAl()

    if (!aktifSirketId) {
      setLoading(false)
      return
    }

    setSirketId(aktifSirketId)
    await carileriYukle(aktifSirketId)
    setLoading(false)
  }

  function formGuncelle<K extends keyof FormState>(alan: K, deger: FormState[K]) {
    setForm((onceki) => ({
      ...onceki,
      [alan]: deger,
    }))
  }

  async function kaydet() {
    setMesaj(null)

    if (!form.cari_adi.trim()) {
      setMesaj({ tip: "hata", metin: "Cari adı zorunludur." })
      return
    }

    setKaydediliyor(true)

    let aktifSirketId = sirketId

    if (!aktifSirketId) {
      aktifSirketId = await sirketIdAl()
      if (!aktifSirketId) {
        setKaydediliyor(false)
        return
      }
      setSirketId(aktifSirketId)
    }

    const supabase = createClient()

    const { error } = await supabase.from("muhasebe_cariler").insert({
      sirket_id: aktifSirketId,
      cari_kodu: "CR-" + Date.now(),
      cari_adi: form.cari_adi.trim(),
      cari_tipi: form.cari_tipi,
      telefon: form.telefon.trim() || null,
      email: form.email.trim() || null,
      vergi_no: form.vergi_no.trim() || null,
      adres: form.adres.trim() || null,
      notlar: form.notlar.trim() || null,
      durum: "aktif",
    })

    setKaydediliyor(false)

    if (error) {
      setMesaj({ tip: "hata", metin: "Cari kaydı oluşturulamadı: " + error.message })
      return
    }

    setForm(bosForm)
    setMesaj({ tip: "basari", metin: "Cari kart başarıyla eklendi." })
    await carileriYukle(aktifSirketId)
  }

  const filtreliCariler = useMemo(() => {
    return cariler.filter((cari) => {
      if (filtre.tip && cari.cari_tipi !== filtre.tip) return false

      if (filtre.arama.trim()) {
        const aranan = filtre.arama.trim().toLocaleLowerCase("tr-TR")
        const metin = `${cari.cari_adi || ""} ${cari.telefon || ""} ${cari.vergi_no || ""} ${cari.email || ""}`
          .toLocaleLowerCase("tr-TR")

        if (!metin.includes(aranan)) return false
      }

      return true
    })
  }, [cariler, filtre])

  const ozet = useMemo(() => {
    return {
      toplam: cariler.length,
      musteri: cariler.filter((c) => c.cari_tipi === "musteri").length,
      tedarikci: cariler.filter((c) => c.cari_tipi === "tedarikci").length,
      personel: cariler.filter((c) => c.cari_tipi === "personel").length,
      taseron: cariler.filter((c) => c.cari_tipi === "taseron").length,
    }
  }, [cariler])

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/portal/muhasebe")}
          className="text-2xl font-bold text-gray-900"
        >
          ←
        </button>

        <div>
          <h1 className="text-xl font-black text-gray-900">Cari Kartlar</h1>
          <p className="text-xs font-semibold text-gray-700">
            Müşteri, tedarikçi, personel, taşeron ve bayi hesapları
          </p>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {mesaj && (
          <div
            className={`rounded-xl border p-4 text-sm font-bold ${mesajClass(mesaj.tip)}`}
          >
            {mesaj.metin}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-800">Toplam Cari</p>
            <p className="text-xl font-black text-blue-900">{ozet.toplam}</p>
          </div>

          <div className="rounded-2xl border border-green-300 bg-green-50 p-3">
            <p className="text-xs font-bold text-green-800">Müşteri</p>
            <p className="text-xl font-black text-green-900">{ozet.musteri}</p>
          </div>

          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-3">
            <p className="text-xs font-bold text-orange-800">Tedarikçi</p>
            <p className="text-xl font-black text-orange-900">{ozet.tedarikci}</p>
          </div>

          <div className="rounded-2xl border border-purple-300 bg-purple-50 p-3">
            <p className="text-xs font-bold text-purple-800">Personel</p>
            <p className="text-xl font-black text-purple-900">{ozet.personel}</p>
          </div>

          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-3 col-span-2 md:col-span-1">
            <p className="text-xs font-bold text-gray-800">Taşeron</p>
            <p className="text-xl font-black text-gray-900">{ozet.taseron}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">Yeni Cari Ekle</h2>

          <div>
            <label className={labelSinifi}>
              Cari Adı <span className="text-red-600">*</span>
            </label>
            <input
              value={form.cari_adi}
              onChange={(e) => formGuncelle("cari_adi", e.target.value)}
              placeholder="Örn: ABC Lojistik Ltd. Şti."
              className={inputSinifi}
            />
          </div>

          <div>
            <label className={labelSinifi}>Cari Tipi</label>
            <select
              value={form.cari_tipi}
              onChange={(e) => formGuncelle("cari_tipi", e.target.value as CariTipi)}
              className={selectSinifi}
            >
              <option value="musteri">Müşteri</option>
              <option value="tedarikci">Tedarikçi</option>
              <option value="taseron">Taşeron</option>
              <option value="personel">Personel</option>
              <option value="bayi">Bayi</option>
              <option value="banka">Banka</option>
              <option value="diger">Diğer</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>Telefon</label>
              <input
                value={form.telefon}
                onChange={(e) => formGuncelle("telefon", e.target.value)}
                placeholder="Örn: 0532 000 00 00"
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => formGuncelle("email", e.target.value)}
                placeholder="Örn: info@firma.com"
                className={inputSinifi}
              />
            </div>
          </div>

          <div>
            <label className={labelSinifi}>Vergi No</label>
            <input
              value={form.vergi_no}
              onChange={(e) => formGuncelle("vergi_no", e.target.value)}
              placeholder="Vergi / TC kimlik no"
              className={inputSinifi}
            />
          </div>

          <div>
            <label className={labelSinifi}>Adres</label>
            <textarea
              value={form.adres}
              onChange={(e) => formGuncelle("adres", e.target.value)}
              placeholder="Açık adres"
              rows={2}
              className={`${inputSinifi} resize-none`}
            />
          </div>

          <div>
            <label className={labelSinifi}>Notlar</label>
            <textarea
              value={form.notlar}
              onChange={(e) => formGuncelle("notlar", e.target.value)}
              placeholder="Ek notlar..."
              rows={2}
              className={`${inputSinifi} resize-none`}
            />
          </div>

          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Cari Kaydet"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Cari Listesi</h2>
            <p className="text-xs font-semibold text-gray-700">
              Gösterilen: {filtreliCariler.length} / Toplam: {cariler.length}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className={labelSinifi}>Arama</label>
              <input
                value={filtre.arama}
                onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })}
                placeholder="Cari adı, telefon veya vergi no ara..."
                className={inputSinifi}
              />
            </div>

            <div className="md:col-span-4">
              <label className={labelSinifi}>Cari Tipi</label>
              <select
                value={filtre.tip}
                onChange={(e) => setFiltre({ ...filtre, tip: e.target.value })}
                className={selectSinifi}
              >
                <option value="">Hepsi</option>
                <option value="musteri">Müşteri</option>
                <option value="tedarikci">Tedarikçi</option>
                <option value="taseron">Taşeron</option>
                <option value="personel">Personel</option>
                <option value="bayi">Bayi</option>
                <option value="banka">Banka</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="p-4 text-center font-bold text-gray-700">Yükleniyor...</p>
          ) : cariler.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Henüz cari kaydı yok.
            </div>
          ) : filtreliCariler.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Arama kriterine uygun cari bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filtreliCariler.map((cari) => (
                <div
                  key={cari.id}
                  className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-900">
                          {cariTipiEtiketi(cari.cari_tipi)}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-black ${
                            cari.durum === "aktif"
                              ? "bg-green-100 text-green-900"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {durumEtiketi(cari.durum)}
                        </span>
                      </div>

                      <p className="mt-2 font-black text-gray-900">{cari.cari_adi}</p>
                      <p className="text-xs font-semibold text-gray-500">
                        Kod: {cari.cari_kodu || "-"}
                      </p>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm font-semibold text-gray-700">
                        <p>
                          <span className="text-gray-500">Telefon:</span>{" "}
                          {cari.telefon || "-"}
                        </p>
                        <p>
                          <span className="text-gray-500">Email:</span>{" "}
                          {cari.email || "-"}
                        </p>
                        <p>
                          <span className="text-gray-500">Vergi No:</span>{" "}
                          {cari.vergi_no || "-"}
                        </p>
                        <p>
                          <span className="text-gray-500">Bakiye:</span>{" "}
                          <span className="font-black text-gray-900">{bakiyeGoster(0)}</span>
                        </p>
                        <p className="sm:col-span-2 truncate">
                          <span className="text-gray-500">Adres:</span>{" "}
                          {adresKisa(cari.adres)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
