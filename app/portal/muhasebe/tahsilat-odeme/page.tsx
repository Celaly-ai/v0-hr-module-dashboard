"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type IslemTipi = "tahsilat" | "odeme"

type Cari = {
  id: string
  cari_adi: string
}

type KasaBanka = {
  id: string
  hesap_adi: string
}

type Hareket = {
  id: string
  tur: string
  cari_id: string | null
  kasa_banka_id: string | null
  tarih: string | null
  tutar: number
  belge_no: string | null
  odeme_yontemi: string | null
  aciklama: string | null
  created_at: string
}

type FormState = {
  islem_tipi: IslemTipi
  cari_id: string
  kasa_banka_id: string
  tarih: string
  tutar: string
  belge_no: string
  odeme_yontemi: string
  aciklama: string
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

function bugunTarihi() {
  return new Date().toISOString().slice(0, 10)
}

const bosForm: FormState = {
  islem_tipi: "tahsilat",
  cari_id: "",
  kasa_banka_id: "",
  tarih: bugunTarihi(),
  tutar: "",
  belge_no: "",
  odeme_yontemi: "nakit",
  aciklama: "",
}

function islemTipiEtiketi(tip: string) {
  if (tip === "tahsilat") return "Tahsilat"
  if (tip === "odeme") return "Ödeme"
  return tip
}

function odemeYontemiEtiketi(yontem: string | null) {
  const etiketler: Record<string, string> = {
    nakit: "Nakit",
    banka: "Banka",
    pos: "POS",
    kredi_karti: "Kredi Kartı",
    havale: "Havale",
    diger: "Diğer",
  }
  if (!yontem) return "-"
  return etiketler[yontem] || yontem
}

function tutarGoster(value: number | null | undefined) {
  return (
    Number(value || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " TL"
  )
}

function tarihGoster(value: string | null | undefined) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function mesajClass(tip: Mesaj["tip"]) {
  if (tip === "basari") return "bg-green-50 border-green-300 text-green-900"
  return "bg-red-50 border-red-300 text-red-900"
}

export default function MuhasebeTahsilatOdemePage() {
  const router = useRouter()

  const [sirketId, setSirketId] = useState<string | null>(null)
  const [cariler, setCariler] = useState<Cari[]>([])
  const [hesaplar, setHesaplar] = useState<KasaBanka[]>([])
  const [hareketler, setHareketler] = useState<Hareket[]>([])
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [form, setForm] = useState<FormState>(bosForm)
  const [filtre, setFiltre] = useState({
    arama: "",
    islem_tipi: "",
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
        metin: "Şirket bilgisi bulunamadı. Kayıt oluşturulamadı.",
      })
      return null
    }

    return personel.sirket_id
  }

  async function carileriYukle(aktifSirketId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_cariler")
      .select("id, cari_adi")
      .eq("sirket_id", aktifSirketId)
      .eq("durum", "aktif")
      .order("cari_adi", { ascending: true })

    if (error) {
      setMesaj({ tip: "hata", metin: "Cariler alınamadı: " + error.message })
      return
    }

    setCariler(data || [])
  }

  async function hesaplariYukle(aktifSirketId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_kasa_banka")
      .select("id, hesap_adi")
      .eq("sirket_id", aktifSirketId)
      .eq("durum", "aktif")
      .order("hesap_adi", { ascending: true })

    if (error) {
      setMesaj({ tip: "hata", metin: "Hesaplar alınamadı: " + error.message })
      return
    }

    setHesaplar(data || [])
  }

  async function hareketleriYukle(aktifSirketId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_hareketleri")
      .select(
        "id, tur, cari_id, kasa_banka_id, tarih, tutar, belge_no, odeme_yontemi, aciklama, created_at"
      )
      .eq("sirket_id", aktifSirketId)
      .in("tur", ["tahsilat", "odeme"])
      .order("created_at", { ascending: false })

    if (error) {
      setMesaj({ tip: "hata", metin: "Hareketler alınamadı: " + error.message })
      return
    }

    setHareketler(data || [])
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
    await Promise.all([
      carileriYukle(aktifSirketId),
      hesaplariYukle(aktifSirketId),
      hareketleriYukle(aktifSirketId),
    ])
    setLoading(false)
  }

  function formGuncelle<K extends keyof FormState>(alan: K, deger: FormState[K]) {
    setForm((onceki) => ({
      ...onceki,
      [alan]: deger,
    }))
  }

  function cariAdiBul(cariId: string | null) {
    if (!cariId) return "-"
    return cariler.find((c) => c.id === cariId)?.cari_adi || "-"
  }

  function hesapAdiBul(hesapId: string | null) {
    if (!hesapId) return "-"
    return hesaplar.find((h) => h.id === hesapId)?.hesap_adi || "-"
  }

  async function kaydet() {
    setMesaj(null)

    if (!form.islem_tipi) {
      setMesaj({ tip: "hata", metin: "İşlem tipi zorunludur." })
      return
    }

    if (!form.cari_id) {
      setMesaj({ tip: "hata", metin: "Cari seçimi zorunludur." })
      return
    }

    if (!form.kasa_banka_id) {
      setMesaj({ tip: "hata", metin: "Kasa / banka seçimi zorunludur." })
      return
    }

    if (!form.tutar.trim() || Number(form.tutar) <= 0) {
      setMesaj({ tip: "hata", metin: "Geçerli bir tutar giriniz." })
      return
    }

    setKaydediliyor(true)

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setKaydediliyor(false)
      setMesaj({ tip: "hata", metin: "Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın." })
      return
    }

    const { data: personel, error: personelError } = await supabase
      .from("personeller")
      .select("id, sirket_id, ad_soyad")
      .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
      .maybeSingle()

    if (personelError || !personel?.sirket_id) {
      setKaydediliyor(false)
      setMesaj({ tip: "hata", metin: "Şirket bilgisi bulunamadı. Kayıt oluşturulamadı." })
      return
    }

    const tutar = Number(form.tutar)
    const isTahsilat = form.islem_tipi === "tahsilat"
    const islemTarihi = form.tarih || bugunTarihi()

    const { error } = await supabase.from("muhasebe_hareketleri").insert({
      sirket_id: personel.sirket_id,
      personel_id: personel.id,

      tarih: islemTarihi,
      islem_tarihi: islemTarihi,

      tur: form.islem_tipi,
      hareket_tipi: form.islem_tipi,

      cari_id: form.cari_id,
      kasa_banka_id: form.kasa_banka_id,

      tutar,
      borc_tutar: isTahsilat ? 0 : tutar,
      alacak_tutar: isTahsilat ? tutar : 0,

      belge_no: form.belge_no.trim() || null,
      odeme_yontemi: form.odeme_yontemi,
      odeme_tipi: form.odeme_yontemi,
      aciklama: form.aciklama.trim() || null,

      islem_yapan_ad_soyad: personel.ad_soyad || null,

      kaynak: "manuel",
      kaynak_modul: "manuel",
      onay_durumu: "onaylandi",
      odeme_durumu: "odendi",
      durum: "aktif",
    })

    setKaydediliyor(false)

    if (error) {
      setMesaj({ tip: "hata", metin: "Kayıt oluşturulamadı: " + error.message })
      return
    }

    setSirketId(personel.sirket_id)
    setForm({ ...bosForm, tarih: bugunTarihi() })
    setMesaj({ tip: "basari", metin: "Tahsilat / ödeme kaydı başarıyla eklendi." })
    await hareketleriYukle(personel.sirket_id)
  }

  const filtreliHareketler = useMemo(() => {
    return hareketler.filter((hareket) => {
      if (filtre.islem_tipi && hareket.tur !== filtre.islem_tipi) return false

      if (filtre.arama.trim()) {
        const aranan = filtre.arama.trim().toLocaleLowerCase("tr-TR")
        const cariAdi = cariAdiBul(hareket.cari_id)
        const metin = `${cariAdi} ${hareket.belge_no || ""} ${hareket.aciklama || ""}`
          .toLocaleLowerCase("tr-TR")

        if (!metin.includes(aranan)) return false
      }

      return true
    })
  }, [hareketler, filtre, cariler])

  const ozet = useMemo(() => {
    const toplamTahsilat = hareketler
      .filter((h) => h.tur === "tahsilat")
      .reduce((toplam, h) => toplam + Number(h.tutar || 0), 0)

    const toplamOdeme = hareketler
      .filter((h) => h.tur === "odeme")
      .reduce((toplam, h) => toplam + Number(h.tutar || 0), 0)

    return {
      toplamTahsilat,
      toplamOdeme,
      netNakit: toplamTahsilat - toplamOdeme,
      kayitSayisi: hareketler.length,
    }
  }, [hareketler])

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
          <h1 className="text-xl font-black text-gray-900">Tahsilat / Ödeme</h1>
          <p className="text-xs font-semibold text-gray-700">
            Cari, kasa ve banka bağlantılı para hareketleri
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-green-300 bg-green-50 p-3">
            <p className="text-xs font-bold text-green-800">Toplam Tahsilat</p>
            <p className="text-sm font-black text-green-900">
              {tutarGoster(ozet.toplamTahsilat)}
            </p>
          </div>

          <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
            <p className="text-xs font-bold text-red-800">Toplam Ödeme</p>
            <p className="text-sm font-black text-red-900">
              {tutarGoster(ozet.toplamOdeme)}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-800">Net Nakit Akışı</p>
            <p className="text-sm font-black text-blue-900">
              {tutarGoster(ozet.netNakit)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-3">
            <p className="text-xs font-bold text-gray-800">Kayıt Sayısı</p>
            <p className="text-xl font-black text-gray-900">{ozet.kayitSayisi}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">Yeni Tahsilat / Ödeme</h2>

          <div>
            <label className={labelSinifi}>
              İşlem Tipi <span className="text-red-600">*</span>
            </label>
            <select
              value={form.islem_tipi}
              onChange={(e) => formGuncelle("islem_tipi", e.target.value as IslemTipi)}
              className={selectSinifi}
            >
              <option value="tahsilat">Tahsilat</option>
              <option value="odeme">Ödeme</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>
                Cari <span className="text-red-600">*</span>
              </label>
              <select
                value={form.cari_id}
                onChange={(e) => formGuncelle("cari_id", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Cari seçiniz</option>
                {cariler.map((cari) => (
                  <option key={cari.id} value={cari.id}>
                    {cari.cari_adi}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelSinifi}>
                Kasa / Banka <span className="text-red-600">*</span>
              </label>
              <select
                value={form.kasa_banka_id}
                onChange={(e) => formGuncelle("kasa_banka_id", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Hesap seçiniz</option>
                {hesaplar.map((hesap) => (
                  <option key={hesap.id} value={hesap.id}>
                    {hesap.hesap_adi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>Tarih</label>
              <input
                type="date"
                value={form.tarih}
                onChange={(e) => formGuncelle("tarih", e.target.value)}
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi}>
                Tutar <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={form.tutar}
                onChange={(e) => formGuncelle("tutar", e.target.value)}
                placeholder="Örn: 2500"
                className={inputSinifi}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>Belge / Dekont No</label>
              <input
                value={form.belge_no}
                onChange={(e) => formGuncelle("belge_no", e.target.value)}
                placeholder="Varsa belge no"
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi}>Ödeme Yöntemi</label>
              <select
                value={form.odeme_yontemi}
                onChange={(e) => formGuncelle("odeme_yontemi", e.target.value)}
                className={selectSinifi}
              >
                <option value="nakit">Nakit</option>
                <option value="banka">Banka</option>
                <option value="pos">POS</option>
                <option value="kredi_karti">Kredi Kartı</option>
                <option value="havale">Havale</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelSinifi}>Açıklama</label>
            <textarea
              value={form.aciklama}
              onChange={(e) => formGuncelle("aciklama", e.target.value)}
              placeholder="İşlem açıklaması..."
              rows={3}
              className={`${inputSinifi} resize-none`}
            />
          </div>

          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor}
            className="w-full rounded-xl bg-blue-700 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Hareket Listesi</h2>
            <p className="text-xs font-semibold text-gray-700">
              Gösterilen: {filtreliHareketler.length} / Toplam: {hareketler.length}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8">
              <label className={labelSinifi}>Arama</label>
              <input
                value={filtre.arama}
                onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })}
                placeholder="Cari adı, belge no veya açıklama ara..."
                className={inputSinifi}
              />
            </div>

            <div className="md:col-span-4">
              <label className={labelSinifi}>İşlem Tipi</label>
              <select
                value={filtre.islem_tipi}
                onChange={(e) => setFiltre({ ...filtre, islem_tipi: e.target.value })}
                className={selectSinifi}
              >
                <option value="">Hepsi</option>
                <option value="tahsilat">Tahsilat</option>
                <option value="odeme">Ödeme</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="p-4 text-center font-bold text-gray-700">Yükleniyor...</p>
          ) : hareketler.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Henüz tahsilat/ödeme kaydı yok.
            </div>
          ) : filtreliHareketler.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Arama kriterine uygun kayıt bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filtreliHareketler.map((hareket) => (
                <div
                  key={hareket.id}
                  className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded px-2 py-1 text-xs font-black ${
                            hareket.tur === "tahsilat"
                              ? "bg-green-100 text-green-900"
                              : "bg-red-100 text-red-900"
                          }`}
                        >
                          {islemTipiEtiketi(hareket.tur)}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm font-semibold text-gray-700">
                        <p>
                          <span className="text-gray-500">Cari:</span>{" "}
                          {cariAdiBul(hareket.cari_id)}
                        </p>
                        <p>
                          <span className="text-gray-500">Kasa / Banka:</span>{" "}
                          {hesapAdiBul(hareket.kasa_banka_id)}
                        </p>
                        <p>
                          <span className="text-gray-500">Tarih:</span>{" "}
                          {tarihGoster(hareket.tarih)}
                        </p>
                        <p>
                          <span className="text-gray-500">Tutar:</span>{" "}
                          <span
                            className={`font-black ${
                              hareket.tur === "tahsilat"
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {tutarGoster(hareket.tutar)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Belge No:</span>{" "}
                          {hareket.belge_no || "-"}
                        </p>
                        <p>
                          <span className="text-gray-500">Ödeme Yöntemi:</span>{" "}
                          {odemeYontemiEtiketi(hareket.odeme_yontemi)}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="text-gray-500">Açıklama:</span>{" "}
                          {hareket.aciklama || "-"}
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
