"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type HesapTipi = "kasa" | "banka" | "pos" | "kredi_karti" | "diger"

type Hesap = {
  id: string
  hesap_adi: string
  hesap_tipi: string
  banka_adi: string | null
  iban: string | null
  baslangic_bakiyesi: number | null
  durum: string | null
}

type FormState = {
  hesap_adi: string
  hesap_tipi: HesapTipi
  banka_adi: string
  iban: string
  baslangic_bakiyesi: string
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
  hesap_adi: "",
  hesap_tipi: "kasa",
  banka_adi: "",
  iban: "",
  baslangic_bakiyesi: "",
}

function hesapTipiEtiketi(tip: string) {
  const etiketler: Record<string, string> = {
    kasa: "Kasa",
    banka: "Banka",
    pos: "POS",
    kredi_karti: "Kredi Kartı",
    diger: "Diğer",
  }
  return etiketler[tip] || tip
}

function bakiyeGoster(value: number | null | undefined) {
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

export default function MuhasebeKasaBankaPage() {
  const router = useRouter()

  const [sirketId, setSirketId] = useState<string | null>(null)
  const [hesaplar, setHesaplar] = useState<Hesap[]>([])
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
        metin: "Şirket bilgisi bulunamadı. Hesap kaydı oluşturulamadı.",
      })
      return null
    }

    return personel.sirket_id
  }

  async function hesaplariYukle(aktifSirketId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_kasa_banka")
      .select(
        "id, hesap_adi, hesap_tipi, banka_adi, iban, baslangic_bakiyesi, durum"
      )
      .eq("sirket_id", aktifSirketId)
      .eq("durum", "aktif")
      .order("created_at", { ascending: false })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Hesaplar alınamadı: " + error.message,
      })
      return
    }

    setHesaplar(data || [])
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
    await hesaplariYukle(aktifSirketId)
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

    if (!form.hesap_adi.trim()) {
      setMesaj({ tip: "hata", metin: "Hesap adı zorunludur." })
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

    const baslangicBakiyesi = form.baslangic_bakiyesi.trim()
      ? Number(form.baslangic_bakiyesi)
      : 0

    if (form.baslangic_bakiyesi.trim() && Number.isNaN(baslangicBakiyesi)) {
      setKaydediliyor(false)
      setMesaj({ tip: "hata", metin: "Geçerli bir başlangıç bakiyesi giriniz." })
      return
    }

    const supabase = createClient()

    const { error } = await supabase.from("muhasebe_kasa_banka").insert({
      sirket_id: aktifSirketId,
      hesap_adi: form.hesap_adi.trim(),
      hesap_tipi: form.hesap_tipi,
      banka_adi: form.banka_adi.trim() || null,
      iban: form.iban.trim() || null,
      baslangic_bakiyesi: baslangicBakiyesi,
      durum: "aktif",
    })

    setKaydediliyor(false)

    if (error) {
      setMesaj({ tip: "hata", metin: "Hesap kaydı oluşturulamadı: " + error.message })
      return
    }

    setForm(bosForm)
    setMesaj({ tip: "basari", metin: "Hesap başarıyla eklendi." })
    await hesaplariYukle(aktifSirketId)
  }

  const filtreliHesaplar = useMemo(() => {
    return hesaplar.filter((hesap) => {
      if (filtre.tip && hesap.hesap_tipi !== filtre.tip) return false

      if (filtre.arama.trim()) {
        const aranan = filtre.arama.trim().toLocaleLowerCase("tr-TR")
        const metin = `${hesap.hesap_adi || ""} ${hesap.banka_adi || ""} ${hesap.iban || ""}`
          .toLocaleLowerCase("tr-TR")

        if (!metin.includes(aranan)) return false
      }

      return true
    })
  }, [hesaplar, filtre])

  const ozet = useMemo(() => {
    const toplamBaslangic = hesaplar.reduce(
      (toplam, h) => toplam + Number(h.baslangic_bakiyesi || 0),
      0
    )

    return {
      toplam: hesaplar.length,
      kasa: hesaplar.filter((h) => h.hesap_tipi === "kasa").length,
      banka: hesaplar.filter((h) => h.hesap_tipi === "banka").length,
      pos: hesaplar.filter((h) => h.hesap_tipi === "pos").length,
      toplamBaslangic,
    }
  }, [hesaplar])

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
          <h1 className="text-xl font-black text-gray-900">Kasa / Banka</h1>
          <p className="text-xs font-semibold text-gray-700">
            Nakit kasa, banka, POS ve ödeme kanalları
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
            <p className="text-xs font-bold text-blue-800">Toplam Hesap</p>
            <p className="text-xl font-black text-blue-900">{ozet.toplam}</p>
          </div>

          <div className="rounded-2xl border border-green-300 bg-green-50 p-3">
            <p className="text-xs font-bold text-green-800">Kasa</p>
            <p className="text-xl font-black text-green-900">{ozet.kasa}</p>
          </div>

          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-3">
            <p className="text-xs font-bold text-orange-800">Banka</p>
            <p className="text-xl font-black text-orange-900">{ozet.banka}</p>
          </div>

          <div className="rounded-2xl border border-purple-300 bg-purple-50 p-3">
            <p className="text-xs font-bold text-purple-800">POS</p>
            <p className="text-xl font-black text-purple-900">{ozet.pos}</p>
          </div>

          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-3 col-span-2 md:col-span-1">
            <p className="text-xs font-bold text-gray-800">Toplam Başlangıç Bakiyesi</p>
            <p className="text-lg font-black text-gray-900">
              {bakiyeGoster(ozet.toplamBaslangic)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">Yeni Hesap Ekle</h2>

          <div>
            <label className={labelSinifi}>
              Hesap Adı <span className="text-red-600">*</span>
            </label>
            <input
              value={form.hesap_adi}
              onChange={(e) => formGuncelle("hesap_adi", e.target.value)}
              placeholder="Örn: Ana Kasa, İş Bankası TL Hesabı"
              className={inputSinifi}
            />
          </div>

          <div>
            <label className={labelSinifi}>Hesap Tipi</label>
            <select
              value={form.hesap_tipi}
              onChange={(e) => formGuncelle("hesap_tipi", e.target.value as HesapTipi)}
              className={selectSinifi}
            >
              <option value="kasa">Kasa</option>
              <option value="banka">Banka</option>
              <option value="pos">POS</option>
              <option value="kredi_karti">Kredi Kartı</option>
              <option value="diger">Diğer</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>Banka Adı</label>
              <input
                value={form.banka_adi}
                onChange={(e) => formGuncelle("banka_adi", e.target.value)}
                placeholder="Örn: Türkiye İş Bankası"
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi}>IBAN</label>
              <input
                value={form.iban}
                onChange={(e) => formGuncelle("iban", e.target.value)}
                placeholder="TR..."
                className={inputSinifi}
              />
            </div>
          </div>

          <div>
            <label className={labelSinifi}>Başlangıç Bakiyesi</label>
            <input
              type="number"
              value={form.baslangic_bakiyesi}
              onChange={(e) => formGuncelle("baslangic_bakiyesi", e.target.value)}
              placeholder="Örn: 5000"
              className={inputSinifi}
            />
          </div>

          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Hesap Kaydet"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Hesap Listesi</h2>
            <p className="text-xs font-semibold text-gray-700">
              Gösterilen: {filtreliHesaplar.length} / Toplam: {hesaplar.length}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className={labelSinifi}>Arama</label>
              <input
                value={filtre.arama}
                onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })}
                placeholder="Hesap adı, banka adı veya IBAN ara..."
                className={inputSinifi}
              />
            </div>

            <div className="md:col-span-4">
              <label className={labelSinifi}>Hesap Tipi</label>
              <select
                value={filtre.tip}
                onChange={(e) => setFiltre({ ...filtre, tip: e.target.value })}
                className={selectSinifi}
              >
                <option value="">Hepsi</option>
                <option value="kasa">Kasa</option>
                <option value="banka">Banka</option>
                <option value="pos">POS</option>
                <option value="kredi_karti">Kredi Kartı</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="p-4 text-center font-bold text-gray-700">Yükleniyor...</p>
          ) : hesaplar.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Henüz kasa/banka kaydı yok.
            </div>
          ) : filtreliHesaplar.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Arama kriterine uygun hesap bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filtreliHesaplar.map((hesap) => (
                <div
                  key={hesap.id}
                  className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-900">
                          {hesapTipiEtiketi(hesap.hesap_tipi)}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-black ${
                            hesap.durum === "aktif"
                              ? "bg-green-100 text-green-900"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {durumEtiketi(hesap.durum)}
                        </span>
                      </div>

                      <p className="mt-2 font-black text-gray-900">{hesap.hesap_adi}</p>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm font-semibold text-gray-700">
                        <p>
                          <span className="text-gray-500">Banka:</span>{" "}
                          {hesap.banka_adi || "-"}
                        </p>
                        <p className="truncate">
                          <span className="text-gray-500">IBAN:</span>{" "}
                          {hesap.iban || "-"}
                        </p>
                        <p>
                          <span className="text-gray-500">Başlangıç Bakiyesi:</span>{" "}
                          <span className="font-black text-gray-900">
                            {bakiyeGoster(hesap.baslangic_bakiyesi)}
                          </span>
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
