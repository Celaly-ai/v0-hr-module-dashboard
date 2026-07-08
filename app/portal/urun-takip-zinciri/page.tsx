"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import BarcodeScanner from "@/components/barcode-scanner"

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

type Sekme = "al" | "dus"
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
  nakliye_montaj: "Nakliye + Montaj",
  teslim_edildi: "Müşteriye Teslim",
  iade_edildi: "İade",
}

const inputSinifi =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-900"

const btnSinifi =
  "w-full rounded-2xl px-4 py-4 text-base font-black disabled:cursor-not-allowed disabled:opacity-50"

function personelAdi(p: PersonelOzet | null) {
  if (!p) return null
  return `${p.ad || ""} ${p.soyad || ""}`.trim() || null
}

function tarihFormat(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Barkod formatı: SERINO|MODEL (| ; / ayırıcıları desteklenir) */
function barkodAyristir(ham: string): { seriNo: string; model: string; barkod: string } | null {
  const barkod = ham.trim()
  if (!barkod) return null

  const ayirici = barkod.match(/[|;/]/)
  if (ayirici) {
    const parcalar = barkod.split(/[|;/]/).map((p) => p.trim()).filter(Boolean)
    if (parcalar.length >= 2) {
      return { seriNo: parcalar[0], model: parcalar.slice(1).join(" "), barkod }
    }
  }

  return null
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
  const [aktifZimmetler, setAktifZimmetler] = useState<UrunKayit[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState(false)
  const [mesaj, setMesaj] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null)
  const [sekme, setSekme] = useState<Sekme>("al")

  const [fisNo, setFisNo] = useState("")
  const [alBarkod, setAlBarkod] = useState("")
  const [seriNo, setSeriNo] = useState("")
  const [model, setModel] = useState("")
  const [hasarDurumu, setHasarDurumu] = useState<HasarDurumu>("hasarsiz")
  const [hasarAciklama, setHasarAciklama] = useState("")
  const [hasarFotoUrl, setHasarFotoUrl] = useState<string | null>(null)
  const [hasarFotoYukleniyor, setHasarFotoYukleniyor] = useState(false)
  const [hasarDevam, setHasarDevam] = useState(false)
  const [kaynak, setKaynak] = useState<Kaynak | "">("")
  const [bayiKodu, setBayiKodu] = useState("")
  const [zimmetDurumu, setZimmetDurumu] = useState<ZimmetDurumu>("teknisyende")
  const [mevcutUrun, setMevcutUrun] = useState<UrunKayit | null>(null)

  const [dusBarkod, setDusBarkod] = useState("")
  const [dusSeriNo, setDusSeriNo] = useState("")
  const [dusModel, setDusModel] = useState("")
  const [dusUrun, setDusUrun] = useState<UrunKayit | null>(null)
  const [dusBarkodDogrulandi, setDusBarkodDogrulandi] = useState(false)
  const [dusIslem, setDusIslem] = useState<ZimmetDusIslem>("nakliye")

  const alBarkodRef = useRef<HTMLInputElement>(null)
  const dusBarkodRef = useRef<HTMLInputElement>(null)

  const zimmetAkisiAcik = useMemo(() => {
    if (!seriNo || !model) return false
    if (hasarDurumu === "hasarsiz") return true
    return hasarDevam
  }, [hasarDurumu, hasarDevam, seriNo, model])

  const aktifZimmetleriYukle = useCallback(async (personelId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("urun_takip_kayitlari")
      .select(
        "id, fis_no, seri_no, model, barkod, hasar_durumu, hasar_aciklama, hasar_foto_url, kaynak, bayi_kodu, durum, zimmetli_personel_id, zimmetli_personel_ad, aktif_zimmet, son_islem_tipi, son_islem_at, created_at",
      )
      .eq("zimmetli_personel_id", personelId)
      .eq("aktif_zimmet", true)
      .order("son_islem_at", { ascending: false, nullsFirst: false })

    if (error) {
      setMesaj({ tip: "hata", metin: "Zimmet listesi okunamadı: " + error.message })
      return
    }

    setAktifZimmetler((data || []) as UrunKayit[])
  }, [])

  const urunAra = useCallback(async (seri: string, mdl: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("urun_takip_kayitlari")
      .select(
        "id, fis_no, seri_no, model, barkod, hasar_durumu, hasar_aciklama, hasar_foto_url, kaynak, bayi_kodu, durum, zimmetli_personel_id, zimmetli_personel_ad, aktif_zimmet, son_islem_tipi, son_islem_at, created_at",
      )
      .eq("seri_no", seri.trim())
      .eq("model", mdl.trim())
      .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as UrunKayit | null) ?? null
  }, [])

  const urunAraBarkod = useCallback(async (barkod: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("urun_takip_kayitlari")
      .select(
        "id, fis_no, seri_no, model, barkod, hasar_durumu, hasar_aciklama, hasar_foto_url, kaynak, bayi_kodu, durum, zimmetli_personel_id, zimmetli_personel_ad, aktif_zimmet, son_islem_tipi, son_islem_at, created_at",
      )
      .eq("barkod", barkod.trim())
      .maybeSingle()

    if (error) throw new Error(error.message)
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
        setMesaj({ tip: "hata", metin: "Oturum bulunamadı. Lütfen giriş yapın." })
        setYukleniyor(false)
        return
      }

      const { data: p } = await supabase
        .from("personeller")
        .select("id, ad, soyad")
        .or(
          `auth_id.eq.${session.user.id},kullanici_id.eq.${session.user.id},email.eq.${session.user.email}`,
        )
        .maybeSingle()

      if (p) {
        setPersonel(p as PersonelOzet)
        await aktifZimmetleriYukle(p.id)
      }

      setYukleniyor(false)
    }

    void baslat()
  }, [aktifZimmetleriYukle])

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
      personel_ad: personelAdi(personel),
      konum_lat: konum?.lat ?? null,
      konum_lng: konum?.lng ?? null,
    })

    if (error) throw new Error("Log kaydı oluşturulamadı: " + error.message)
  }

  async function hasarFotoYukle(dosya: File) {
    if (!personel?.id) throw new Error("Personel bilgisi bulunamadı.")

    setHasarFotoYukleniyor(true)
    try {
      const supabase = createClient()
      const uzanti = dosya.name.split(".").pop()?.toLowerCase() || "jpg"
      const yol = `hasar/${personel.id}/${Date.now()}.${uzanti}`

      const { error } = await supabase.storage.from("urun-takip").upload(yol, dosya, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) throw new Error("Fotoğraf yüklenemedi: " + error.message)

      const { data } = supabase.storage.from("urun-takip").getPublicUrl(yol)
      setHasarFotoUrl(data.publicUrl)
      return data.publicUrl
    } finally {
      setHasarFotoYukleniyor(false)
    }
  }

  async function alBarkodIsle(ham: string) {
    setMesaj(null)
    setAlBarkod(ham)
    setHasarDevam(false)
    setMevcutUrun(null)
    setKaynak("")
    setBayiKodu("")

    const ayrilmis = barkodAyristir(ham)
    if (!ayrilmis) {
      setSeriNo("")
      setModel("")
      setMesaj({
        tip: "hata",
        metin: "Barkod okunamadı. Format: SERINO|MODEL",
      })
      return
    }

    setSeriNo(ayrilmis.seriNo)
    setModel(ayrilmis.model)

    try {
      let bulunan = await urunAra(ayrilmis.seriNo, ayrilmis.model)
      if (!bulunan) {
        bulunan = await urunAraBarkod(ayrilmis.barkod)
      }

      setMevcutUrun(bulunan)

      if (bulunan) {
        if (
          bulunan.aktif_zimmet &&
          bulunan.zimmetli_personel_id &&
          bulunan.zimmetli_personel_id !== personel?.id
        ) {
          setMesaj({
            tip: "hata",
            metin: `Bu ürün ${bulunan.zimmetli_personel_ad || "başka personel"} zimmetinde aktif.`,
          })
          return
        }

        if (
          bulunan.durum === "serviste" ||
          bulunan.durum === "teknisyende" ||
          bulunan.durum === "atolyede"
        ) {
          setZimmetDurumu(bulunan.durum)
        }
      }
    } catch (err) {
      setMesaj({
        tip: "hata",
        metin: err instanceof Error ? err.message : "Ürün kontrolü başarısız.",
      })
    }
  }

  async function dusBarkodIsle(ham: string) {
    setMesaj(null)
    setDusBarkod(ham)
    setDusBarkodDogrulandi(false)
    setDusUrun(null)
    setDusSeriNo("")
    setDusModel("")

    if (!personel?.id) {
      setMesaj({ tip: "hata", metin: "Personel bilgisi bulunamadı." })
      return
    }

    const ayrilmis = barkodAyristir(ham)
    if (!ayrilmis) {
      setMesaj({
        tip: "hata",
        metin: "Barkod okunamadı. Format: SERINO|MODEL",
      })
      return
    }

    setDusSeriNo(ayrilmis.seriNo)
    setDusModel(ayrilmis.model)

    const eslesen = aktifZimmetler.find(
      (z) =>
        z.seri_no === ayrilmis.seriNo &&
        z.model === ayrilmis.model &&
        z.zimmetli_personel_id === personel.id,
    )

    if (!eslesen) {
      setMesaj({
        tip: "hata",
        metin: "Okutulan barkod aktif zimmetinizdeki ürünle eşleşmiyor.",
      })
      return
    }

    setDusUrun(eslesen)
    setDusBarkodDogrulandi(true)
    setMesaj({ tip: "basari", metin: "Barkod doğrulandı. İşlem seçip zimmet düşebilirsiniz." })
  }

  function alFormuSifirla() {
    setFisNo("")
    setAlBarkod("")
    setSeriNo("")
    setModel("")
    setHasarDurumu("hasarsiz")
    setHasarAciklama("")
    setHasarFotoUrl(null)
    setHasarDevam(false)
    setKaynak("")
    setBayiKodu("")
    setZimmetDurumu("teknisyende")
    setMevcutUrun(null)
  }

  function dusFormuSifirla() {
    setDusBarkod("")
    setDusSeriNo("")
    setDusModel("")
    setDusUrun(null)
    setDusBarkodDogrulandi(false)
    setDusIslem("nakliye")
  }

  async function yenile() {
    if (personel?.id) await aktifZimmetleriYukle(personel.id)
  }

  async function hasarliSonlandir() {
    setIslem(true)
    setMesaj(null)

    try {
      if (!fisNo.trim() || !seriNo || !model) {
        setMesaj({ tip: "hata", metin: "Fiş no ve barkod zorunludur." })
        return
      }
      if (!hasarAciklama.trim()) {
        setMesaj({ tip: "hata", metin: "Hasar açıklaması zorunludur." })
        return
      }
      if (!hasarFotoUrl) {
        setMesaj({ tip: "hata", metin: "Hasar fotoğrafı çekilmelidir." })
        return
      }

      const konum = await konumAl()
      const supabase = createClient()
      const simdi = new Date().toISOString()
      const mevcut = mevcutUrun ?? (await urunAra(seriNo, model))

      const ortak = {
        fis_no: fisNo.trim(),
        seri_no: seriNo,
        model,
        barkod: alBarkod.trim() || `${seriNo}|${model}`,
        hasar_durumu: "hasarli" as const,
        hasar_aciklama: hasarAciklama.trim(),
        hasar_foto_url: hasarFotoUrl,
        durum: "iade_edildi" as const,
        aktif_zimmet: false,
        son_islem_tipi: "hasarli_sonlandirildi",
        son_islem_at: simdi,
        zimmetli_personel_id: null,
        zimmetli_personel_ad: null,
        son_konum_lat: konum?.lat ?? null,
        son_konum_lng: konum?.lng ?? null,
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
          "hasarli_sonlandirildi",
          mevcut.durum,
          "iade_edildi",
          hasarAciklama.trim(),
          konum,
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
          "hasarli_sonlandirildi",
          null,
          "iade_edildi",
          hasarAciklama.trim(),
          konum,
        )
      }

      setMesaj({ tip: "basari", metin: "Hasarlı işlem sonlandırıldı." })
      alFormuSifirla()
      await yenile()
    } catch (err) {
      setMesaj({
        tip: "hata",
        metin: err instanceof Error ? err.message : "İşlem sonlandırılamadı.",
      })
    } finally {
      setIslem(false)
    }
  }

  async function zimmetKaydet() {
    setIslem(true)
    setMesaj(null)

    try {
      if (!fisNo.trim() || !seriNo || !model) {
        setMesaj({ tip: "hata", metin: "Fiş no ve barkod zorunludur." })
        return
      }

      if (hasarDurumu === "hasarli") {
        if (!hasarDevam) {
          setMesaj({ tip: "hata", metin: "Hasarlı ürün için Devam Et veya İşlemi Sonlandır seçin." })
          return
        }
        if (!hasarAciklama.trim()) {
          setMesaj({ tip: "hata", metin: "Hasar açıklaması zorunludur." })
          return
        }
        if (!hasarFotoUrl) {
          setMesaj({ tip: "hata", metin: "Hasar fotoğrafı çekilmelidir." })
          return
        }
      }

      const mevcut = mevcutUrun ?? (await urunAra(seriNo, model))
      const yeniKayit = !mevcut

      if (
        mevcut?.aktif_zimmet &&
        mevcut.zimmetli_personel_id &&
        mevcut.zimmetli_personel_id !== personel?.id
      ) {
        setMesaj({
          tip: "hata",
          metin: `Bu ürün ${mevcut.zimmetli_personel_ad || "başka personel"} zimmetinde.`,
        })
        return
      }

      if (yeniKayit && !kaynak) {
        setMesaj({ tip: "hata", metin: "Yeni ürün için kaynak seçin." })
        return
      }

      if (yeniKayit && kaynak === "bayii" && !bayiKodu.trim()) {
        setMesaj({ tip: "hata", metin: "Bayii kodu zorunludur." })
        return
      }

      const konum = await konumAl()
      const supabase = createClient()
      const simdi = new Date().toISOString()
      const pAd = personelAdi(personel)
      const tamBarkod = alBarkod.trim() || `${seriNo}|${model}`

      const ortak = {
        fis_no: fisNo.trim(),
        seri_no: seriNo,
        model,
        barkod: tamBarkod,
        hasar_durumu: hasarDurumu,
        hasar_aciklama: hasarDurumu === "hasarli" ? hasarAciklama.trim() : null,
        hasar_foto_url: hasarDurumu === "hasarli" ? hasarFotoUrl : null,
        kaynak: yeniKayit ? kaynak : mevcut?.kaynak || kaynak || null,
        bayi_kodu: kaynak === "bayii" ? bayiKodu.trim() || null : mevcut?.bayi_kodu || null,
        durum: zimmetDurumu,
        aktif_zimmet: true,
        son_islem_tipi: yeniKayit ? "zimmet_al" : "zimmet_guncelle",
        son_islem_at: simdi,
        son_konum_lat: konum?.lat ?? null,
        son_konum_lng: konum?.lng ?? null,
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
          { fis_no: ortak.fis_no, seri_no: ortak.seri_no, model: ortak.model, barkod: ortak.barkod },
          "zimmet_guncelle",
          mevcut.durum,
          ortak.durum,
          mevcut.aktif_zimmet ? "Zimmet güncellendi" : "Zimmet alındı",
          konum,
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
          "zimmet_al",
          null,
          ortak.durum,
          `Kaynak: ${kaynak ? KAYNAK_ETIKET[kaynak as Kaynak] : "-"}`,
          konum,
        )
      }

      setMesaj({ tip: "basari", metin: yeniKayit ? "Zimmet alındı." : "Zimmet güncellendi." })
      alFormuSifirla()
      await yenile()
      alBarkodRef.current?.focus()
    } catch (err) {
      setMesaj({
        tip: "hata",
        metin: err instanceof Error ? err.message : "Kayıt başarısız.",
      })
    } finally {
      setIslem(false)
    }
  }

  async function zimmetDus() {
    setIslem(true)
    setMesaj(null)

    try {
      if (!dusBarkodDogrulandi || !dusUrun || !personel?.id) {
        setMesaj({ tip: "hata", metin: "Önce barkod okutarak doğrulama yapın." })
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
      const { data, error } = await supabase
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
        .eq("id", dusUrun.id)
        .eq("zimmetli_personel_id", personel.id)
        .eq("aktif_zimmet", true)
        .select("id")
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) {
        setMesaj({
          tip: "hata",
          metin: "Okutulan barkod aktif zimmetinizdeki ürünle eşleşmiyor.",
        })
        return
      }

      await logOlustur(
        dusUrun.id,
        {
          fis_no: dusUrun.fis_no,
          seri_no: dusUrun.seri_no,
          model: dusUrun.model,
          barkod: dusBarkod.trim() || dusUrun.barkod,
        },
        dusIslem,
        dusUrun.durum,
        yeniDurum,
        ZIMMET_DUS_ETIKET[dusIslem],
        konum,
      )

      setMesaj({ tip: "basari", metin: "Zimmet düşürüldü." })
      dusFormuSifirla()
      await yenile()
      dusBarkodRef.current?.focus()
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
    <main className="min-h-screen bg-slate-100 px-3 pb-10 pt-[calc(env(safe-area-inset-top)+12px)] text-slate-950">
      <div className="mx-auto max-w-md space-y-4">
        <header className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-700">Mobil Saha · V1</p>
              <h1 className="text-xl font-black">Ürün Takip Zinciri</h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Barkod okutarak hızlı zimmet alın veya düşürün.
              </p>
            </div>
            <Link
              href="/portal"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black"
            >
              Portal
            </Link>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-700 px-4 py-3 text-white">
            <p className="text-xs font-bold opacity-90">Benim Aktif Zimmetim</p>
            <p className="text-3xl font-black">{aktifZimmetler.length}</p>
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

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setSekme("al")
              setMesaj(null)
            }}
            className={`${btnSinifi} py-3 ${
              sekme === "al" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Zimmet Al
          </button>
          <button
            type="button"
            onClick={() => {
              setSekme("dus")
              setMesaj(null)
            }}
            className={`${btnSinifi} py-3 ${
              sekme === "dus" ? "bg-red-700 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Zimmet Düş
          </button>
        </div>

        {sekme === "al" && (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                Barkod Oku / Barkod Gir
              </span>
              <input
                ref={alBarkodRef}
                className={inputSinifi}
                value={alBarkod}
                onChange={(e) => void alBarkodIsle(e.target.value)}
                placeholder="SERINO|MODEL"
                autoComplete="off"
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Format: SERINO|MODEL
              </p>
            </label>

            <BarcodeScanner onDetected={(kod) => void alBarkodIsle(kod)} />

            {seriNo && model && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold">
                <p>
                  <span className="font-black">Seri No:</span> {seriNo}
                </p>
                <p className="mt-1">
                  <span className="font-black">Model:</span> {model}
                </p>
              </div>
            )}

            {seriNo && model && (
              <>
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
                      setHasarFotoUrl(null)
                    }}
                  >
                    <option value="hasarsiz">Hasarsız</option>
                    <option value="hasarli">Hasarlı</option>
                  </select>
                </label>

                {hasarDurumu === "hasarli" && !hasarDevam && (
                  <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase text-amber-900">
                        Hasar Açıklama
                      </span>
                      <textarea
                        className={`${inputSinifi} min-h-[88px]`}
                        value={hasarAciklama}
                        onChange={(e) => setHasarAciklama(e.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase text-amber-900">
                        Hasar Fotoğrafı Çek
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={hasarFotoYukleniyor}
                        className="w-full text-sm font-semibold"
                        onChange={(e) => {
                          const dosya = e.target.files?.[0]
                          if (dosya) void hasarFotoYukle(dosya)
                        }}
                      />
                      {hasarFotoYukleniyor && (
                        <p className="mt-1 text-xs font-bold text-amber-800">Yükleniyor...</p>
                      )}
                      {hasarFotoUrl && (
                        <p className="mt-1 text-xs font-bold text-emerald-800">
                          Fotoğraf kaydedildi ✓
                        </p>
                      )}
                    </label>

                    <div className="grid gap-2">
                      <button
                        type="button"
                        disabled={islem || hasarFotoYukleniyor}
                        onClick={() => {
                          if (!hasarAciklama.trim() || !hasarFotoUrl) {
                            setMesaj({
                              tip: "hata",
                              metin: "Devam için açıklama ve fotoğraf zorunludur.",
                            })
                            return
                          }
                          setHasarDevam(true)
                          setMesaj(null)
                        }}
                        className={`${btnSinifi} bg-blue-700 text-white`}
                      >
                        Devam Et
                      </button>
                      <button
                        type="button"
                        disabled={islem || hasarFotoYukleniyor}
                        onClick={() => void hasarliSonlandir()}
                        className={`${btnSinifi} bg-amber-700 text-white`}
                      >
                        İşlemi Sonlandır
                      </button>
                    </div>
                  </div>
                )}

                {mevcutUrun && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-950">
                    <p className="font-black">Kayıtlı ürün</p>
                    <p className="mt-1">Durum: {DURUM_ETIKET[mevcutUrun.durum] || mevcutUrun.durum}</p>
                  </div>
                )}

                {zimmetAkisiAcik && (
                  <div className="space-y-3">
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

                    <button
                      type="button"
                      disabled={islem || yukleniyor}
                      onClick={() => void zimmetKaydet()}
                      className={`${btnSinifi} bg-emerald-700 text-white`}
                    >
                      {islem ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {sekme === "dus" && (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-600">
              Zimmet düşmek için ürün barkodunu yeniden okutun.
            </p>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                Barkod Oku / Barkod Gir
              </span>
              <input
                ref={dusBarkodRef}
                className={inputSinifi}
                value={dusBarkod}
                onChange={(e) => void dusBarkodIsle(e.target.value)}
                placeholder="SERINO|MODEL"
                autoComplete="off"
              />
            </label>

            <BarcodeScanner onDetected={(kod) => void dusBarkodIsle(kod)} />

            {dusSeriNo && dusModel && (
              <div
                className={`rounded-2xl border p-3 text-sm font-semibold ${
                  dusBarkodDogrulandi
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                    : "border-red-300 bg-red-50 text-red-950"
                }`}
              >
                <p>
                  <span className="font-black">Seri:</span> {dusSeriNo}
                </p>
                <p className="mt-1">
                  <span className="font-black">Model:</span> {dusModel}
                </p>
                <p className="mt-2 font-black">
                  {dusBarkodDogrulandi ? "Barkod doğrulandı ✓" : "Doğrulama bekleniyor"}
                </p>
              </div>
            )}

            {dusUrun && dusBarkodDogrulandi && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold">
                <p>Fiş: {dusUrun.fis_no}</p>
                <p className="mt-1">Durum: {DURUM_ETIKET[dusUrun.durum] || dusUrun.durum}</p>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">
                İşlem
              </span>
              <select
                className={inputSinifi}
                value={dusIslem}
                disabled={!dusBarkodDogrulandi}
                onChange={(e) => setDusIslem(e.target.value as ZimmetDusIslem)}
              >
                {(Object.keys(ZIMMET_DUS_ETIKET) as ZimmetDusIslem[]).map((k) => (
                  <option key={k} value={k}>
                    {ZIMMET_DUS_ETIKET[k]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={islem || yukleniyor || !dusBarkodDogrulandi}
              onClick={() => void zimmetDus()}
              className={`${btnSinifi} bg-red-700 text-white`}
            >
              {islem ? "İşleniyor..." : "Zimmet Düş"}
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Benim Zimmetlerim</h2>

          {yukleniyor ? (
            <p className="mt-3 text-sm font-bold text-slate-600">Yükleniyor...</p>
          ) : aktifZimmetler.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-slate-600">Aktif zimmetiniz yok.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {aktifZimmetler.map((z) => (
                <div
                  key={z.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold"
                >
                  <p className="font-black">{z.model}</p>
                  <p className="mt-1 text-xs text-slate-600">Seri: {z.seri_no}</p>
                  <p className="text-xs text-slate-600">Fiş: {z.fis_no}</p>
                  <p className="mt-2">
                    {DURUM_ETIKET[z.durum] || z.durum} · {tarihFormat(z.son_islem_at || z.created_at)}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Zimmet düşmek için barkod okutun
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
