"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type FaturaTipi = "satis" | "alis" | "gider" | "iade" | "proforma"
type FaturaDurum = "bekliyor" | "kismi_odendi" | "odendi" | "iptal"

type Cari = {
  id: string
  cari_adi: string
}

type Fatura = {
  id: string
  cari_id: string | null
  fatura_tipi: string
  fatura_no: string | null
  fatura_tarihi: string | null
  vade_tarihi: string | null
  toplam_tutar: number
  odenen_tutar: number | null
  kalan_tutar: number | null
  durum: string
  belge_url: string | null
  aciklama: string | null
  created_at: string
}

type FormState = {
  fatura_tipi: FaturaTipi
  cari_id: string
  fatura_no: string
  fatura_tarihi: string
  vade_tarihi: string
  toplam_tutar: string
  odenen_tutar: string
  durum: FaturaDurum
  belge_url: string
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
  fatura_tipi: "satis",
  cari_id: "",
  fatura_no: "",
  fatura_tarihi: bugunTarihi(),
  vade_tarihi: "",
  toplam_tutar: "",
  odenen_tutar: "",
  durum: "bekliyor",
  belge_url: "",
  aciklama: "",
}

function faturaTipiEtiketi(tip: string) {
  const etiketler: Record<string, string> = {
    satis: "Satış",
    alis: "Alış",
    gider: "Gider",
    iade: "İade",
    proforma: "Proforma",
  }
  return etiketler[tip] || tip
}

function faturaDurumEtiketi(durum: string) {
  const etiketler: Record<string, string> = {
    bekliyor: "Bekliyor",
    kismi_odendi: "Kısmi Ödendi",
    odendi: "Ödendi",
    iptal: "İptal",
  }
  return etiketler[durum] || durum
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

function durumRenkSinifi(durum: string) {
  if (durum === "odendi") return "bg-green-100 text-green-900"
  if (durum === "kismi_odendi") return "bg-yellow-100 text-yellow-900"
  if (durum === "iptal") return "bg-gray-200 text-gray-800"
  return "bg-red-100 text-red-900"
}

export default function MuhasebeFaturalarPage() {
  const router = useRouter()

  const [sirketId, setSirketId] = useState<string | null>(null)
  const [cariler, setCariler] = useState<Cari[]>([])
  const [faturalar, setFaturalar] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState<Mesaj | null>(null)
  const [form, setForm] = useState<FormState>(bosForm)
  const [filtre, setFiltre] = useState({
    arama: "",
    fatura_tipi: "",
    durum: "",
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
        metin: "Şirket bilgisi bulunamadı. Fatura kaydı oluşturulamadı.",
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
      setMesaj({
        tip: "hata",
        metin: "Cariler alınamadı: " + error.message,
      })
      return
    }

    setCariler(data || [])
  }

  async function faturalariYukle(aktifSirketId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("muhasebe_faturalar")
      .select(
        "id, cari_id, fatura_tipi, fatura_no, fatura_tarihi, vade_tarihi, toplam_tutar, odenen_tutar, kalan_tutar, durum, belge_url, aciklama, created_at"
      )
      .eq("sirket_id", aktifSirketId)
      .order("created_at", { ascending: false })

    if (error) {
      setMesaj({
        tip: "hata",
        metin: "Faturalar alınamadı: " + error.message,
      })
      return
    }

    setFaturalar(data || [])
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
      faturalariYukle(aktifSirketId),
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

  async function kaydet() {
    setMesaj(null)

    if (!form.fatura_tipi) {
      setMesaj({ tip: "hata", metin: "Fatura tipi zorunludur." })
      return
    }

    if (!form.toplam_tutar.trim() || Number(form.toplam_tutar) <= 0) {
      setMesaj({ tip: "hata", metin: "Geçerli bir toplam tutar giriniz." })
      return
    }

    const toplamTutar = Number(form.toplam_tutar)
    const odenenTutar = form.odenen_tutar.trim() ? Number(form.odenen_tutar) : 0

    if (form.odenen_tutar.trim() && Number.isNaN(odenenTutar)) {
      setMesaj({ tip: "hata", metin: "Geçerli bir ödenen tutar giriniz." })
      return
    }

    if (odenenTutar > toplamTutar) {
      setMesaj({ tip: "hata", metin: "Ödenen tutar toplam tutardan büyük olamaz." })
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

    const { error } = await supabase.from("muhasebe_faturalar").insert({
      sirket_id: aktifSirketId,
      cari_id: form.cari_id || null,
      fatura_tipi: form.fatura_tipi,
      fatura_no: form.fatura_no.trim() || null,
      fatura_tarihi: form.fatura_tarihi || null,
      vade_tarihi: form.vade_tarihi || null,
      toplam_tutar: toplamTutar,
      odenen_tutar: odenenTutar,
      kalan_tutar: toplamTutar - odenenTutar,
      durum: form.durum,
      belge_url: form.belge_url.trim() || null,
      aciklama: form.aciklama.trim() || null,
      kaynak_modul: "manuel",
      kaynak_kayit_id: null,
    })

    setKaydediliyor(false)

    if (error) {
      setMesaj({ tip: "hata", metin: "Fatura kaydı oluşturulamadı: " + error.message })
      return
    }

    setForm({ ...bosForm, fatura_tarihi: bugunTarihi() })
    setMesaj({ tip: "basari", metin: "Fatura başarıyla eklendi." })
    await faturalariYukle(aktifSirketId)
  }

  const filtreliFaturalar = useMemo(() => {
    return faturalar.filter((fatura) => {
      if (filtre.fatura_tipi && fatura.fatura_tipi !== filtre.fatura_tipi) return false
      if (filtre.durum && fatura.durum !== filtre.durum) return false

      if (filtre.arama.trim()) {
        const aranan = filtre.arama.trim().toLocaleLowerCase("tr-TR")
        const cariAdi = cariAdiBul(fatura.cari_id)
        const metin = `${fatura.fatura_no || ""} ${cariAdi} ${fatura.aciklama || ""}`
          .toLocaleLowerCase("tr-TR")

        if (!metin.includes(aranan)) return false
      }

      return true
    })
  }, [faturalar, filtre, cariler])

  const ozet = useMemo(() => {
    const acikFaturalar = faturalar.filter(
      (f) => f.durum === "bekliyor" || f.durum === "kismi_odendi"
    )

    return {
      toplam: faturalar.length,
      alis: faturalar.filter((f) => f.fatura_tipi === "alis").length,
      satis: faturalar.filter((f) => f.fatura_tipi === "satis").length,
      gider: faturalar.filter((f) => f.fatura_tipi === "gider").length,
      acik: acikFaturalar.length,
      toplamTutar: faturalar.reduce(
        (toplam, f) => toplam + Number(f.toplam_tutar || 0),
        0
      ),
    }
  }, [faturalar])

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
          <h1 className="text-xl font-black text-gray-900">Fatura Merkezi</h1>
          <p className="text-xs font-semibold text-gray-700">
            Fotoğraflı ve manuel fatura takibi
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-800">Toplam Fatura</p>
            <p className="text-xl font-black text-blue-900">{ozet.toplam}</p>
          </div>

          <div className="rounded-2xl border border-green-300 bg-green-50 p-3">
            <p className="text-xs font-bold text-green-800">Satış</p>
            <p className="text-xl font-black text-green-900">{ozet.satis}</p>
          </div>

          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-3">
            <p className="text-xs font-bold text-orange-800">Alış</p>
            <p className="text-xl font-black text-orange-900">{ozet.alis}</p>
          </div>

          <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
            <p className="text-xs font-bold text-red-800">Gider</p>
            <p className="text-xl font-black text-red-900">{ozet.gider}</p>
          </div>

          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-3">
            <p className="text-xs font-bold text-yellow-800">Açık Fatura</p>
            <p className="text-xl font-black text-yellow-900">{ozet.acik}</p>
          </div>

          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-3 col-span-2 md:col-span-1 lg:col-span-1">
            <p className="text-xs font-bold text-gray-800">Toplam Tutar</p>
            <p className="text-sm font-black text-gray-900">
              {tutarGoster(ozet.toplamTutar)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">Yeni Fatura Ekle</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>
                Fatura Tipi <span className="text-red-600">*</span>
              </label>
              <select
                value={form.fatura_tipi}
                onChange={(e) =>
                  formGuncelle("fatura_tipi", e.target.value as FaturaTipi)
                }
                className={selectSinifi}
              >
                <option value="satis">Satış</option>
                <option value="alis">Alış</option>
                <option value="gider">Gider</option>
                <option value="iade">İade</option>
                <option value="proforma">Proforma</option>
              </select>
            </div>

            <div>
              <label className={labelSinifi}>Cari</label>
              <select
                value={form.cari_id}
                onChange={(e) => formGuncelle("cari_id", e.target.value)}
                className={selectSinifi}
              >
                <option value="">Cari seçiniz (opsiyonel)</option>
                {cariler.map((cari) => (
                  <option key={cari.id} value={cari.id}>
                    {cari.cari_adi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelSinifi}>Fatura No</label>
            <input
              value={form.fatura_no}
              onChange={(e) => formGuncelle("fatura_no", e.target.value)}
              placeholder="Örn: FAT-2026-001"
              className={inputSinifi}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>Fatura Tarihi</label>
              <input
                type="date"
                value={form.fatura_tarihi}
                onChange={(e) => formGuncelle("fatura_tarihi", e.target.value)}
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi}>Vade Tarihi</label>
              <input
                type="date"
                value={form.vade_tarihi}
                onChange={(e) => formGuncelle("vade_tarihi", e.target.value)}
                className={inputSinifi}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelSinifi}>
                Toplam Tutar <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={form.toplam_tutar}
                onChange={(e) => formGuncelle("toplam_tutar", e.target.value)}
                placeholder="Örn: 12500"
                className={inputSinifi}
              />
            </div>

            <div>
              <label className={labelSinifi}>Ödenen Tutar</label>
              <input
                type="number"
                value={form.odenen_tutar}
                onChange={(e) => formGuncelle("odenen_tutar", e.target.value)}
                placeholder="Örn: 5000"
                className={inputSinifi}
              />
            </div>
          </div>

          <div>
            <label className={labelSinifi}>Durum</label>
            <select
              value={form.durum}
              onChange={(e) => formGuncelle("durum", e.target.value as FaturaDurum)}
              className={selectSinifi}
            >
              <option value="bekliyor">Bekliyor</option>
              <option value="kismi_odendi">Kısmi Ödendi</option>
              <option value="odendi">Ödendi</option>
              <option value="iptal">İptal</option>
            </select>
          </div>

          <div>
            <label className={labelSinifi}>Belge / Fotoğraf URL</label>
            <input
              value={form.belge_url}
              onChange={(e) => formGuncelle("belge_url", e.target.value)}
              placeholder="https://... veya dosya bağlantısı"
              className={inputSinifi}
            />
          </div>

          <div>
            <label className={labelSinifi}>Açıklama</label>
            <textarea
              value={form.aciklama}
              onChange={(e) => formGuncelle("aciklama", e.target.value)}
              placeholder="Fatura ile ilgili kısa açıklama..."
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
            {kaydediliyor ? "Kaydediliyor..." : "Fatura Kaydet"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Fatura Listesi</h2>
            <p className="text-xs font-semibold text-gray-700">
              Gösterilen: {filtreliFaturalar.length} / Toplam: {faturalar.length}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className={labelSinifi}>Arama</label>
              <input
                value={filtre.arama}
                onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })}
                placeholder="Fatura no, cari adı veya açıklama ara..."
                className={inputSinifi}
              />
            </div>

            <div className="md:col-span-3">
              <label className={labelSinifi}>Fatura Tipi</label>
              <select
                value={filtre.fatura_tipi}
                onChange={(e) => setFiltre({ ...filtre, fatura_tipi: e.target.value })}
                className={selectSinifi}
              >
                <option value="">Hepsi</option>
                <option value="satis">Satış</option>
                <option value="alis">Alış</option>
                <option value="gider">Gider</option>
                <option value="iade">İade</option>
                <option value="proforma">Proforma</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className={labelSinifi}>Durum</label>
              <select
                value={filtre.durum}
                onChange={(e) => setFiltre({ ...filtre, durum: e.target.value })}
                className={selectSinifi}
              >
                <option value="">Hepsi</option>
                <option value="bekliyor">Bekliyor</option>
                <option value="kismi_odendi">Kısmi Ödendi</option>
                <option value="odendi">Ödendi</option>
                <option value="iptal">İptal</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="p-4 text-center font-bold text-gray-700">Yükleniyor...</p>
          ) : faturalar.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Henüz fatura kaydı yok.
            </div>
          ) : filtreliFaturalar.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-600">
              Arama kriterine uygun fatura bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filtreliFaturalar.map((fatura) => (
                <div
                  key={fatura.id}
                  className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-900">
                          {faturaTipiEtiketi(fatura.fatura_tipi)}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-black ${durumRenkSinifi(fatura.durum)}`}
                        >
                          {faturaDurumEtiketi(fatura.durum)}
                        </span>
                        {fatura.belge_url?.trim() && (
                          <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-black text-indigo-900">
                            Belge Var
                          </span>
                        )}
                      </div>

                      <p className="mt-2 font-black text-gray-900">
                        {fatura.fatura_no || "-"}
                      </p>
                      <p className="text-sm font-semibold text-gray-700">
                        Cari: {cariAdiBul(fatura.cari_id)}
                      </p>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm font-semibold text-gray-700">
                        <p>
                          <span className="text-gray-500">Fatura Tarihi:</span>{" "}
                          {tarihGoster(fatura.fatura_tarihi)}
                        </p>
                        <p>
                          <span className="text-gray-500">Vade Tarihi:</span>{" "}
                          {tarihGoster(fatura.vade_tarihi)}
                        </p>
                        <p>
                          <span className="text-gray-500">Toplam:</span>{" "}
                          <span className="font-black text-gray-900">
                            {tutarGoster(fatura.toplam_tutar)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Ödenen:</span>{" "}
                          {tutarGoster(fatura.odenen_tutar)}
                        </p>
                        <p>
                          <span className="text-gray-500">Kalan:</span>{" "}
                          <span className="font-black text-red-700">
                            {tutarGoster(fatura.kalan_tutar)}
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
