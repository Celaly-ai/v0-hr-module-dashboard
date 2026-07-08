"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type PersonelOzet = {
  id: string
  ad: string | null
  soyad: string | null
}

type UrunKayit = {
  id: string
  fis_no: string
  seri_no: string
  model: string
  barkod: string | null
  hasar_durumu: string
  hasar_aciklama: string | null
  hasar_foto_url: string | null
  kaynak: string | null
  bayi_kodu: string | null
  durum: string
  zimmetli_personel_id: string | null
  zimmetli_personel_ad: string | null
  aktif_zimmet: boolean
  son_islem_tipi: string | null
  son_islem_at: string | null
  created_at: string
}

type HasarDurumu = "hasarsiz" | "hasarli"
type Kaynak = "musteri" | "bod" | "bayii" | "kargo" | "degisim"
type ZimmetDurumu = "serviste" | "teknisyende" | "atolyede"
type ZimmetDusIslem = "nakliye" | "nakliye_montaj" | "teslim_edildi" | "iade_edildi"

const KAYNAK_ETIKET: Record<Kaynak, string> = {
  musteri: "Müşteri",
  bod: "BOD",
  bayii: "Bayii",
  kargo: "Kargo",
  degisim: "Değişim",
}

const DURUM_ETIKET: Record<string, string> = {
  serviste: "Serviste",
  teknisyende: "Teknisyende",
  atolyede: "Atölyede",
  teslim_edildi: "Teslim Edildi",
  iade_edildi: "İade Edildi",
  nakliye: "Nakliye",
  nakliye_montaj: "Nakliye Montaj",
}

const ZIMMET_DUS_ETIKET: Record<ZimmetDusIslem, string> = {
  nakliye: "Nakliye",
  nakliye_montaj: "Nakliye Montaj",
  teslim_edildi: "Müşteriye Teslim",
  iade_edildi: "İade",
}

const inputSinifi =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"

function personelAdi(p: PersonelOzet | null) {
  if (!p) return null
  const ad = `${p.ad || ""} ${p.soyad || ""}`.trim()
  return ad || null
}

function tarihFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR")
}

async function konumAl(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    return null
  }
}

export default function UrunTakipZinciriPage() {
  const [personel, setPersonel] = useState<PersonelOzet | null>(null)
  const [kayitlar, setKayitlar] = useState<UrunKayit[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState(false)
  const [mesaj, setMesaj] = useState<{ tip: "basari" | "hata"; metin: string } | null>(
    null,
  )

  const [fisNo, setFisNo] = useState("")
  const [seriNo, setSeriNo] = useState("")
  const [model, setModel] = useState("")
  const [hasarDurumu, setHasarDurumu] = useState<HasarDurumu>("hasarsiz")
  const [hasarAciklama, setHasarAciklama] = useState("")
  const [hasarFotoUrl, setHasarFotoUrl] = useState("")
  const [hasarDevam, setHasarDevam] = useState(false)
  const [kaynak, setKaynak] = useState<Kaynak | "">("")
  const [bayiKodu, setBayiKodu] = useState("")
  const [zimmetDurumu, setZimmetDurumu] = useState<ZimmetDurumu>("serviste")
  const [mevcutUrun, setMevcutUrun] = useState<UrunKayit | null>(null)

  const [dusSeriNo, setDusSeriNo] = useState("")
  const [dusModel, setDusModel] = useState("")
  const [dusUrun, setDusUrun] = useState<UrunKayit | null>(null)
  const [dusIslem, setDusIslem] = useState<ZimmetDusIslem>("nakliye")

  const zimmetAkisiAcik = useMemo(() => {
    if (hasarDurumu === "hasarsiz") return true
    return hasarDevam
  }, [hasarDurumu, hasarDevam])

  const kayitlariYukle = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("urun_takip_kayitlari")
      .select(
        "id, fis_no, seri_no, model, barkod, hasar_durumu, hasar_aciklama, hasar_foto_url, kaynak, bayi_kodu, durum, zimmetli_personel_id, zimmetli_personel_ad, aktif_zimmet, son_islem_tipi, son_islem_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      setMesaj({ tip: "hata", metin: "Kayıt listesi okunamadı: " + error.message })
      return
    }

    setKayitlar((data || []) as UrunKayit[])
  }, [])

  const urunAra = useCallback(async (seri: string, mdl: string) => {
    const temizSeri = seri.trim()
    const temizModel = mdl.trim()
    if (!temizSeri || !temizModel) return null

    const supabase = createClient()
    const { data, error } = await supabase
      .from("urun_takip_kayitlari")
      .select(
        "id, fis_no, seri_no, model, barkod, hasar_durumu, hasar_aciklama, hasar_foto_url, kaynak, bayi_kodu, durum, zimmetli_personel_id, zimmetli_personel_ad, aktif_zimmet, son_islem_tipi, son_islem_at, created_at",
      )
      .eq("seri_no", temizSeri)
      .eq("model", temizModel)
      .maybeSingle()

    if (error) {
      setMesaj({ tip: "hata", metin: "Ürün aranırken hata: " + error.message })
      return null
    }

    return (data as UrunKayit | null) ?? null
  }, [])

  useEffect(() => {
    async function baslat() {
      setYukleniyor(true)
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setYukleniyor(false)
        setMesaj({ tip: "hata", metin: "Oturum bulunamadı. Lütfen giriş yapın." })
        return
      }

      const { data: p } = await supabase
        .from("personeller")
        .select("id, ad, soyad")
        .or(
          `auth_id.eq.${session.user.id},kullanici_id.eq.${session.user.id},email.eq.${session.user.email}`,
        )
        .maybeSingle()

      if (p) setPersonel(p as PersonelOzet)

      await kayitlariYukle()
      setYukleniyor(false)
    }

    void baslat()
  }, [kayitlariYukle])

  async function logOlustur(
    urunId: string,
    kayit: Pick<UrunKayit, "fis_no" | "seri_no" | "model" | "barkod">,
    islemTipi: string,
    oncekiDurum: string | null,
    yeniDurum: string | null,
    aciklama: string | null,
    konum: { lat: number; lng: number } | null,
  ) {
    const supabase = createClient()
    const pAd = personelAdi(personel)

    const { error } = await supabase.from("urun_takip_loglari").insert({
      urun_takip_id: urunId,
      fis_no: kayit.fis_no,
      seri_no: kayit.seri_no,
      model: kayit.model,
      barkod: kayit.barkod,
      islem_tipi: islemTipi,
      onceki_durum: oncekiDurum,
      yeni_durum: yeniDurum,
      aciklama,
      personel_id: personel?.id ?? null,
      personel_ad: pAd,
      konum_lat: konum?.lat ?? null,
      konum_lng: konum?.lng ?? null,
    })

    if (error) throw new Error("Log kaydı oluşturulamadı: " + error.message)
  }

  async function mevcutUrunKontrol() {
    setMesaj(null)
    const bulunan = await urunAra(seriNo, model)
    setMevcutUrun(bulunan)
    if (bulunan) {
      setKaynak((bulunan.kaynak as Kaynak) || "")
      setBayiKodu(bulunan.bayi_kodu || "")
      if (
        bulunan.durum === "serviste" ||
        bulunan.durum === "teknisyende" ||
        bulunan.durum === "atolyede"
      ) {
        setZimmetDurumu(bulunan.durum)
      }
    }
  }

  async function dusUrunKontrol() {
    setMesaj(null)
    const bulunan = await urunAra(dusSeriNo, dusModel)
    setDusUrun(bulunan)
    if (!bulunan) {
      setMesaj({ tip: "hata", metin: "Bu seri no ve model ile kayıt bulunamadı." })
    }
  }

  function zimmetFormuSifirla() {
    setFisNo("")
    setSeriNo("")
    setModel("")
    setHasarDurumu("hasarsiz")
    setHasarAciklama("")
    setHasarFotoUrl("")
    setHasarDevam(false)
    setKaynak("")
    setBayiKodu("")
    setZimmetDurumu("serviste")
    setMevcutUrun(null)
  }

  async function hasarliKapat() {
    setIslem(true)
    setMesaj(null)

    try {
      if (!fisNo.trim() || !seriNo.trim() || !model.trim()) {
        setMesaj({ tip: "hata", metin: "Fiş no, seri no ve model zorunludur." })
        return
      }

      if (!hasarAciklama.trim()) {
        setMesaj({ tip: "hata", metin: "Hasarlı kapatma için açıklama zorunludur." })
        return
      }

      const supabase = createClient()
      const simdi = new Date().toISOString()
      const pAd = personelAdi(personel)
      const mevcut = await urunAra(seriNo, model)

      const ortak = {
        fis_no: fisNo.trim(),
        seri_no: seriNo.trim(),
        model: model.trim(),
        barkod: seriNo.trim(),
        hasar_durumu: "hasarli" as const,
        hasar_aciklama: hasarAciklama.trim(),
        hasar_foto_url: hasarFotoUrl.trim() || null,
        durum: "iade_edildi" as const,
        aktif_zimmet: false,
        son_islem_tipi: "hasarli_kapatildi",
        son_islem_at: simdi,
        zimmetli_personel_id: null,
        zimmetli_personel_ad: null,
      }

      if (mevcut) {
        const { error } = await supabase
          .from("urun_takip_kayitlari")
          .update(ortak)
          .eq("id", mevcut.id)

        if (error) throw new Error(error.message)

        await logOlustur(
          mevcut.id,
          { fis_no: ortak.fis_no, seri_no: ortak.seri_no, model: ortak.model, barkod: ortak.barkod },
          "hasarli_kapatildi",
          mevcut.durum,
          "iade_edildi",
          hasarAciklama.trim(),
          null,
        )
      } else {
        const { data, error } = await supabase
          .from("urun_takip_kayitlari")
          .insert(ortak)
          .select("id")
          .single()

        if (error) throw new Error(error.message)

        await logOlustur(
          data.id,
          { fis_no: ortak.fis_no, seri_no: ortak.seri_no, model: ortak.model, barkod: ortak.barkod },
          "hasarli_kapatildi",
          null,
          "iade_edildi",
          hasarAciklama.trim(),
          null,
        )
      }

      setMesaj({ tip: "basari", metin: "Hasarlı ürün kapatıldı. Zimmet düşürüldü." })
      zimmetFormuSifirla()
      await kayitlariYukle()
    } catch (err) {
      setMesaj({
        tip: "hata",
        metin: err instanceof Error ? err.message : "Kapatma işlemi başarısız.",
      })
    } finally {
      setIslem(false)
    }
  }

  async function zimmetKaydet() {
    setIslem(true)
    setMesaj(null)

    try {
      if (!fisNo.trim() || !seriNo.trim() || !model.trim()) {
        setMesaj({ tip: "hata", metin: "Fiş no, seri no ve model zorunludur." })
        return
      }

      if (hasarDurumu === "hasarli" && !hasarDevam) {
        setMesaj({ tip: "hata", metin: "Hasarlı ürün için Devam Et veya Kapat seçin." })
        return
      }

      if (hasarDurumu === "hasarli" && hasarDevam && !hasarAciklama.trim()) {
        setMesaj({ tip: "hata", metin: "Hasarlı devam için açıklama zorunludur." })
        return
      }

      const mevcut = mevcutUrun ?? (await urunAra(seriNo, model))
      const yeniKayit = !mevcut

      if (yeniKayit && !kaynak) {
        setMesaj({ tip: "hata", metin: "Yeni ürün için kaynak seçin." })
        return
      }

      if (yeniKayit && kaynak === "bayii" && !bayiKodu.trim()) {
        setMesaj({ tip: "hata", metin: "Bayii kaynağı için bayii kodu zorunludur." })
        return
      }

      const supabase = createClient()
      const simdi = new Date().toISOString()
      const pAd = personelAdi(personel)

      const ortak = {
        fis_no: fisNo.trim(),
        seri_no: seriNo.trim(),
        model: model.trim(),
        barkod: seriNo.trim(),
        hasar_durumu: hasarDurumu,
        hasar_aciklama:
          hasarDurumu === "hasarli" ? hasarAciklama.trim() || null : null,
        hasar_foto_url:
          hasarDurumu === "hasarli" ? hasarFotoUrl.trim() || null : null,
        kaynak: yeniKayit ? kaynak : kaynak || mevcut?.kaynak || null,
        bayi_kodu: kaynak === "bayii" ? bayiKodu.trim() || null : null,
        durum: zimmetDurumu,
        aktif_zimmet: true,
        son_islem_tipi: yeniKayit ? "zimmet_al" : "zimmet_guncelle",
        son_islem_at: simdi,
        zimmetli_personel_id: personel?.id ?? null,
        zimmetli_personel_ad: pAd,
      }

      if (mevcut) {
        const { error } = await supabase
          .from("urun_takip_kayitlari")
          .update(ortak)
          .eq("id", mevcut.id)

        if (error) throw new Error(error.message)

        await logOlustur(
          mevcut.id,
          {
            fis_no: ortak.fis_no,
            seri_no: ortak.seri_no,
            model: ortak.model,
            barkod: ortak.barkod,
          },
          "zimmet_guncelle",
          mevcut.durum,
          ortak.durum,
          mevcut.aktif_zimmet
            ? "Aktif zimmet varken güncellendi"
            : "Zimmet yeniden alındı",
          null,
        )
      } else {
        const { data, error } = await supabase
          .from("urun_takip_kayitlari")
          .insert(ortak)
          .select("id")
          .single()

        if (error) throw new Error(error.message)

        await logOlustur(
          data.id,
          {
            fis_no: ortak.fis_no,
            seri_no: ortak.seri_no,
            model: ortak.model,
            barkod: ortak.barkod,
          },
          "zimmet_al",
          null,
          ortak.durum,
          `Kaynak: ${kaynak ? KAYNAK_ETIKET[kaynak as Kaynak] : "-"}`,
          null,
        )
      }

      setMesaj({
        tip: "basari",
        metin: yeniKayit ? "Ürün zimmete alındı." : "Ürün zimmet bilgisi güncellendi.",
      })
      zimmetFormuSifirla()
      await kayitlariYukle()
    } catch (err) {
      setMesaj({
        tip: "hata",
        metin: err instanceof Error ? err.message : "Kayıt işlemi başarısız.",
      })
    } finally {
      setIslem(false)
    }
  }

  async function zimmetDus() {
    setIslem(true)
    setMesaj(null)

    try {
      if (!dusSeriNo.trim() || !dusModel.trim()) {
        setMesaj({ tip: "hata", metin: "Seri no ve model zorunludur." })
        return
      }

      const urun = dusUrun ?? (await urunAra(dusSeriNo, dusModel))
      if (!urun) {
        setMesaj({ tip: "hata", metin: "Ürün bulunamadı." })
        return
      }

      const konum = await konumAl()
      const simdi = new Date().toISOString()
      const yeniDurum =
        dusIslem === "nakliye"
          ? "nakliye"
          : dusIslem === "nakliye_montaj"
            ? "nakliye_montaj"
            : dusIslem

      const supabase = createClient()
      const { error } = await supabase
        .from("urun_takip_kayitlari")
        .update({
          aktif_zimmet: false,
          durum: yeniDurum,
          son_islem_tipi: dusIslem,
          son_islem_at: simdi,
          son_konum_lat: konum?.lat ?? null,
          son_konum_lng: konum?.lng ?? null,
          zimmetli_personel_id: null,
          zimmetli_personel_ad: null,
        })
        .eq("id", urun.id)

      if (error) throw new Error(error.message)

      await logOlustur(
        urun.id,
        {
          fis_no: urun.fis_no,
          seri_no: urun.seri_no,
          model: urun.model,
          barkod: urun.barkod,
        },
        dusIslem,
        urun.durum,
        yeniDurum,
        ZIMMET_DUS_ETIKET[dusIslem],
        konum,
      )

      setMesaj({ tip: "basari", metin: "Zimmet düşürüldü ve işlem loglandı." })
      setDusSeriNo("")
      setDusModel("")
      setDusUrun(null)
      await kayitlariYukle()
    } catch (err) {
      setMesaj({
        tip: "hata",
        metin: err instanceof Error ? err.message : "Zimmet düşürme başarısız.",
      })
    } finally {
      setIslem(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-12 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-700">FeyRoute · V1</p>
              <h1 className="text-2xl font-black">Ürün Takip Zinciri</h1>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Fiş numarası, barkod/seri no ve model ile ürün takip ve zimmet işlemi
                yapın.
              </p>
            </div>
            <Link
              href="/portal"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
            >
              Portal
            </Link>
          </div>
        </header>

        {mesaj && (
          <div
            className={`rounded-2xl border p-4 text-sm font-bold ${
              mesaj.tip === "basari"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {mesaj.metin}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Yeni Ürün / Zimmet Alma</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                Fiş No
              </span>
              <input
                className={inputSinifi}
                value={fisNo}
                onChange={(e) => setFisNo(e.target.value)}
                placeholder="Fiş numarası"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                Barkod / Seri No
              </span>
              <input
                className={inputSinifi}
                value={seriNo}
                onChange={(e) => setSeriNo(e.target.value)}
                onBlur={() => void mevcutUrunKontrol()}
                placeholder="Okutun veya yazın"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                Model
              </span>
              <input
                className={inputSinifi}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={() => void mevcutUrunKontrol()}
                placeholder="Model adı"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                Hasar Durumu
              </span>
              <select
                className={inputSinifi}
                value={hasarDurumu}
                onChange={(e) => {
                  setHasarDurumu(e.target.value as HasarDurumu)
                  setHasarDevam(false)
                }}
              >
                <option value="hasarsiz">Hasarsız</option>
                <option value="hasarli">Hasarlı</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void mevcutUrunKontrol()}
                disabled={islem}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-black"
              >
                Ürünü Kontrol Et
              </button>
            </div>
          </div>

          {hasarDurumu === "hasarli" && !hasarDevam && (
            <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-950">
                Hasarlı ürün — devam edecek misiniz yoksa kapatılacak mı?
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-amber-800">
                  Hasar Açıklama
                </span>
                <textarea
                  className={`${inputSinifi} min-h-[80px]`}
                  value={hasarAciklama}
                  onChange={(e) => setHasarAciklama(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-amber-800">
                  Hasar Fotoğraf URL
                </span>
                <input
                  className={inputSinifi}
                  value={hasarFotoUrl}
                  onChange={(e) => setHasarFotoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHasarDevam(true)}
                  disabled={islem}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white"
                >
                  Devam Et
                </button>
                <button
                  type="button"
                  onClick={() => void hasarliKapat()}
                  disabled={islem}
                  className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {mevcutUrun && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">
              <p className="font-black">Mevcut ürün bulundu</p>
              <p className="mt-1">Fiş: {mevcutUrun.fis_no}</p>
              <p>Durum: {DURUM_ETIKET[mevcutUrun.durum] || mevcutUrun.durum}</p>
              <p>
                Zimmetli: {mevcutUrun.zimmetli_personel_ad || "-"} (
                {mevcutUrun.aktif_zimmet ? "Aktif" : "Pasif"})
              </p>
              {mevcutUrun.aktif_zimmet && (
                <p className="mt-2 font-black text-amber-800">
                  Bu ürünün aktif zimmeti var. Yeni kayıt yerine durum güncellenecek.
                </p>
              )}
            </div>
          )}

          {zimmetAkisiAcik && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {hasarDurumu === "hasarli" && hasarDevam && (
                <>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                      Hasar Açıklama
                    </span>
                    <textarea
                      className={`${inputSinifi} min-h-[80px]`}
                      value={hasarAciklama}
                      onChange={(e) => setHasarAciklama(e.target.value)}
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                      Hasar Fotoğraf URL
                    </span>
                    <input
                      className={inputSinifi}
                      value={hasarFotoUrl}
                      onChange={(e) => setHasarFotoUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </label>
                </>
              )}

              {!mevcutUrun && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                      Kaynak
                    </span>
                    <select
                      className={inputSinifi}
                      value={kaynak}
                      onChange={(e) => setKaynak(e.target.value as Kaynak | "")}
                    >
                      <option value="">Seçin</option>
                      {(Object.keys(KAYNAK_ETIKET) as Kaynak[]).map((k) => (
                        <option key={k} value={k}>
                          {KAYNAK_ETIKET[k]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {kaynak === "bayii" && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                        Bayii Kodu
                      </span>
                      <input
                        className={inputSinifi}
                        value={bayiKodu}
                        onChange={(e) => setBayiKodu(e.target.value)}
                      />
                    </label>
                  )}
                </>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                  Durum
                </span>
                <select
                  className={inputSinifi}
                  value={zimmetDurumu}
                  onChange={(e) => setZimmetDurumu(e.target.value as ZimmetDurumu)}
                >
                  <option value="serviste">Serviste</option>
                  <option value="teknisyende">Teknisyende</option>
                  <option value="atolyede">Atölyede</option>
                </select>
              </label>

              <div className="flex items-end md:col-span-2">
                <button
                  type="button"
                  onClick={() => void zimmetKaydet()}
                  disabled={islem || yukleniyor}
                  className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {islem ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Zimmet Düş</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                Barkod / Seri No
              </span>
              <input
                className={inputSinifi}
                value={dusSeriNo}
                onChange={(e) => setDusSeriNo(e.target.value)}
                placeholder="Okutun veya yazın"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                Model
              </span>
              <input
                className={inputSinifi}
                value={dusModel}
                onChange={(e) => setDusModel(e.target.value)}
                placeholder="Model adı"
              />
            </label>

            <div className="flex items-end md:col-span-2">
              <button
                type="button"
                onClick={() => void dusUrunKontrol()}
                disabled={islem}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-black"
              >
                Ürünü Bul
              </button>
            </div>
          </div>

          {dusUrun && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">
              <p>Fiş No: {dusUrun.fis_no}</p>
              <p>Durum: {DURUM_ETIKET[dusUrun.durum] || dusUrun.durum}</p>
              <p>Zimmetli: {dusUrun.zimmetli_personel_ad || "-"}</p>
              <p>Son İşlem: {tarihFormat(dusUrun.son_islem_at)}</p>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                İşlem
              </span>
              <select
                className={inputSinifi}
                value={dusIslem}
                onChange={(e) => setDusIslem(e.target.value as ZimmetDusIslem)}
              >
                {(Object.keys(ZIMMET_DUS_ETIKET) as ZimmetDusIslem[]).map((k) => (
                  <option key={k} value={k}>
                    {ZIMMET_DUS_ETIKET[k]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void zimmetDus()}
                disabled={islem || yukleniyor}
                className="w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {islem ? "İşleniyor..." : "Zimmet Düş"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Son 50 Kayıt</h2>

          {yukleniyor ? (
            <p className="mt-3 text-sm font-bold text-slate-600">Liste yükleniyor...</p>
          ) : kayitlar.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-slate-600">Henüz kayıt yok.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="px-2 py-2 font-black">Fiş No</th>
                    <th className="px-2 py-2 font-black">Seri No</th>
                    <th className="px-2 py-2 font-black">Model</th>
                    <th className="px-2 py-2 font-black">Hasar</th>
                    <th className="px-2 py-2 font-black">Kaynak</th>
                    <th className="px-2 py-2 font-black">Durum</th>
                    <th className="px-2 py-2 font-black">Zimmetli</th>
                    <th className="px-2 py-2 font-black">Son İşlem</th>
                    <th className="px-2 py-2 font-black">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {kayitlar.map((k) => (
                    <tr key={k.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold">{k.fis_no}</td>
                      <td className="px-2 py-2 font-semibold">{k.seri_no}</td>
                      <td className="px-2 py-2 font-semibold">{k.model}</td>
                      <td className="px-2 py-2">
                        {k.hasar_durumu === "hasarli" ? "Hasarlı" : "Hasarsız"}
                      </td>
                      <td className="px-2 py-2">
                        {k.kaynak
                          ? KAYNAK_ETIKET[k.kaynak as Kaynak] || k.kaynak
                          : "-"}
                      </td>
                      <td className="px-2 py-2">
                        {DURUM_ETIKET[k.durum] || k.durum}
                      </td>
                      <td className="px-2 py-2">
                        {k.aktif_zimmet ? k.zimmetli_personel_ad || "Aktif" : "-"}
                      </td>
                      <td className="px-2 py-2">{k.son_islem_tipi || "-"}</td>
                      <td className="px-2 py-2">{tarihFormat(k.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
