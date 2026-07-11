"use client"

// KYM İşlem ve Aksiyon Merkezi canlı V1 sürümüdür.
// Onaylı değişiklik talebi ve build testi olmadan değiştirilmemelidir.

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { yukleKymBelgesi } from "@/lib/services/kym-service"
import type { KymBelgeDurumu, KymBelgeSatiri } from "@/lib/types/kym"

type Isletme = {
  id: string
  isletme_adi: string
}

type Islem = {
  id: string
  isletme_id: string
  isletme_belge_id?: string | null
  belge_tanim_id?: string | null
  belge_kodu?: string | null
  belge_adi?: string | null
  baslik: string
  aciklama?: string | null
  durum: string
  oncelik: string
  risk_puani: number
  sorumlu_adi?: string | null
  sorumlu_birim?: string | null
  hedef_tarih?: string | null
  gecikmis?: boolean | null
  aktif?: boolean | null
  created_at?: string | null
}

type Ozet = {
  acik_islem?: number | null
  geciken_islem?: number | null
  yuksek_oncelikli_islem?: number | null
  sorumlusuz_islem?: number | null
  tamamlanan_islem?: number | null
}

type BelgeDetayi = {
  id: string
  durum?: string | null
  mevcut_mu?: boolean | null
  gecerlilik_baslangic?: string | null
  gecerlilik_bitis?: string | null
  notlar?: string | null
  son_dosya_id?: string | null
  ai_guven_skoru?: number | null
  ai_ozet?: string | null
  ai_eksikler?: string[] | null
  ai_cikarilan_veriler?: Record<string, unknown> | null
}

type BelgeMeta = {
  belge_kodu: string
  belge_adi: string
  yukumluluk_kodu: string
  yukumluluk_basligi: string
  kategori: string
}

type BelgeDosyasi = {
  id: string
  dosya_url: string
  dosya_adi?: string | null
  dosya_tipi?: string | null
  created_at?: string | null
}

type BelgeDogrulama = {
  id: string
  sonuc?: string | null
  yeni_durum?: string | null
  guven_skoru?: number | null
  belge_sahibi?: string | null
  belge_numarasi?: string | null
  belge_tarihi?: string | null
  gecerlilik_baslangic?: string | null
  gecerlilik_bitis?: string | null
  ozet?: string | null
  eksikler?: string[] | null
  uyumsuzluklar?: string[] | null
  created_at?: string | null
}

type AnalizFiltresi =
  | "acik"
  | "geciken"
  | "yuksek"
  | "sorumlusuz"
  | "tumu"

type YuklemeAsamasi =
  | "yukleniyor"
  | "analiz"
  | "tamamlandi"
  | "manuel"
  | null

const supabase = createClient()

const DURUMLAR = [
  ["bekliyor", "Bekliyor"],
  ["hazirlaniyor", "Hazırlanıyor"],
  ["evrak_bekliyor", "Evrak Bekliyor"],
  ["basvuruya_hazir", "Başvuruya Hazır"],
  ["basvuru_yapildi", "Başvuru Yapıldı"],
  ["sonuc_bekleniyor", "Sonuç Bekleniyor"],
  ["belge_alindi", "Belge Alındı"],
  ["tamamlandi", "Tamamlandı"],
  ["iptal", "İptal"],
] as const

const BELGE_DURUM_ETIKETLERI: Record<string, string> = {
  yok: "Belge Yok",
  yuklendi_incelemede: "Yüklendi / İncelemede",
  dogrulandi_guncel: "Doğrulandı / Güncel",
  suresi_yaklasiyor: "Süresi Yaklaşıyor",
  yanlis_belge: "Yanlış Belge",
  eksik_bilgi_var: "Eksik Bilgi Var",
  suresi_doldu: "Süresi Doldu",
  manuel_inceleme_gerekli: "Manuel İnceleme Gerekli",
  basvuru_yapildi: "Başvuru Yapıldı",
  uygulanmiyor: "Gereksiz / Uygulanmıyor",
}

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"

const LABEL_CLASS = "mb-1.5 block text-sm font-semibold text-slate-900"

const KABUL_DOSYALAR = ".pdf,.png,.jpg,.jpeg,.webp"
const MAX_DOSYA_BOYUTU = 8 * 1024 * 1024

function durumAdi(value: string) {
  return DURUMLAR.find(([kod]) => kod === value)?.[1] ?? value
}

function belgeDurumAdi(value?: string | null) {
  if (!value) return "Bilinmiyor"
  return BELGE_DURUM_ETIKETLERI[value] ?? value
}

function tarihYaz(value?: string | null) {
  if (!value) return "Belirlenmedi"

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function tarihSaatYaz(value?: string | null) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function hataMesaji(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Beklenmeyen bir hata oluştu."
}

function sayi(value?: number | null) {
  return Number(value ?? 0)
}

function metinDeger(value?: string | null) {
  const text = String(value ?? "").trim()
  return text.length > 0 ? text : "-"
}

function acikIslemMi(islem: Islem) {
  return (
    islem.aktif !== false &&
    !["tamamlandi", "iptal"].includes(islem.durum)
  )
}

function ilkUygunIslem(liste: Islem[]): Islem | null {
  const belgeIslemi = liste.find(
    (item) => item.isletme_belge_id && acikIslemMi(item),
  )

  if (belgeIslemi) return belgeIslemi

  return liste.find((item) => acikIslemMi(item)) ?? null
}

export default function KymIslemlerPage() {
  const [isletme, setIsletme] = useState<Isletme | null>(null)
  const [islemler, setIslemler] = useState<Islem[]>([])
  const [ozet, setOzet] = useState<Ozet | null>(null)
  const [secilen, setSecilen] = useState<Islem | null>(null)
  const [belge, setBelge] = useState<BelgeDetayi | null>(null)
  const [belgeMeta, setBelgeMeta] = useState<BelgeMeta | null>(null)
  const [dosyalar, setDosyalar] = useState<BelgeDosyasi[]>([])
  const [dogrulamalar, setDogrulamalar] = useState<BelgeDogrulama[]>([])
  const [filtre, setFiltre] = useState<AnalizFiltresi>("acik")

  const [manuelBaslik, setManuelBaslik] = useState("")
  const [manuelAciklama, setManuelAciklama] = useState("")
  const [manuelOncelik, setManuelOncelik] = useState("P3")
  const [manuelRiskPuani, setManuelRiskPuani] = useState(50)
  const [manuelHedefTarih, setManuelHedefTarih] = useState("")
  const [manuelSorumluAdi, setManuelSorumluAdi] = useState("")
  const [manuelSorumluBirim, setManuelSorumluBirim] = useState("")

  const [detaySorumluAdi, setDetaySorumluAdi] = useState("")
  const [detaySorumluBirim, setDetaySorumluBirim] = useState("")
  const [detayHedefTarih, setDetayHedefTarih] = useState("")
  const [secilenDosya, setSecilenDosya] = useState<File | null>(null)

  const [yukleniyor, setYukleniyor] = useState(true)
  const [detayYukleniyor, setDetayYukleniyor] = useState(false)
  const [islemYapiliyor, setIslemYapiliyor] = useState(false)
  const [yuklemeAsamasi, setYuklemeAsamasi] =
    useState<YuklemeAsamasi>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)

  const islemSec = useCallback((islem: Islem) => {
    setSecilen(islem)
    setDetaySorumluAdi(islem.sorumlu_adi ?? "")
    setDetaySorumluBirim(islem.sorumlu_birim ?? "")
    setDetayHedefTarih(islem.hedef_tarih ?? "")
    setSecilenDosya(null)
    setYuklemeAsamasi(null)
  }, [])

  const verileriGetir = useCallback(async () => {
    setYukleniyor(true)
    setHata(null)

    try {
      let aktifIsletme = isletme

      if (!aktifIsletme) {
        const { data, error } = await supabase
          .from("kym_isletmeler")
          .select("id, isletme_adi")
          .eq("aktif", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        if (!data) throw new Error("Aktif KYM işletmesi bulunamadı.")

        aktifIsletme = data as Isletme
        setIsletme(aktifIsletme)
      }

      const [
        { data: islemData, error: islemError },
        { data: ozetData, error: ozetError },
      ] = await Promise.all([
        supabase
          .from("v_kym_islem_listesi")
          .select("*")
          .eq("isletme_id", aktifIsletme.id)
          .order("risk_puani", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("v_kym_islem_dashboard_ozet")
          .select("*")
          .eq("isletme_id", aktifIsletme.id)
          .maybeSingle(),
      ])

      if (islemError) throw islemError
      if (ozetError) throw ozetError

      const liste = (islemData ?? []) as Islem[]
      setIslemler(liste)
      setOzet((ozetData ?? null) as Ozet | null)

      setSecilen((mevcut) => {
        if (mevcut) {
          const guncel = liste.find((item) => item.id === mevcut.id)
          return guncel ?? ilkUygunIslem(liste)
        }
        return ilkUygunIslem(liste)
      })
    } catch (error) {
      setHata(hataMesaji(error))
    } finally {
      setYukleniyor(false)
    }
  }, [isletme])

  const belgeDetayiniGetir = useCallback(async (islem: Islem | null) => {
    setBelge(null)
    setBelgeMeta(null)
    setDosyalar([])
    setDogrulamalar([])

    if (!islem?.isletme_belge_id) return

    setDetayYukleniyor(true)

    try {
      const belgeId = islem.isletme_belge_id

      const [
        { data: belgeData, error: belgeError },
        { data: metaData, error: metaError },
        { data: dosyaData, error: dosyaError },
        { data: dogrulamaData, error: dogrulamaError },
      ] = await Promise.all([
        supabase
          .from("kym_isletme_belgeleri")
          .select(
            "id, durum, mevcut_mu, gecerlilik_baslangic, gecerlilik_bitis, notlar, son_dosya_id, ai_guven_skoru, ai_ozet, ai_eksikler, ai_cikarilan_veriler",
          )
          .eq("id", belgeId)
          .maybeSingle(),

        supabase
          .from("v_kym_belge_listesi")
          .select(
            "belge_kodu, belge_adi, yukumluluk_kodu, yukumluluk_basligi, kategori",
          )
          .eq("isletme_belge_id", belgeId)
          .maybeSingle(),

        supabase
          .from("kym_belge_dosyalari")
          .select("id, dosya_url, dosya_adi, dosya_tipi, created_at")
          .eq("isletme_belge_id", belgeId)
          .order("created_at", { ascending: false }),

        supabase
          .from("kym_belge_dogrulamalari")
          .select(
            "id, sonuc, yeni_durum, guven_skoru, belge_sahibi, belge_numarasi, belge_tarihi, gecerlilik_baslangic, gecerlilik_bitis, ozet, eksikler, uyumsuzluklar, created_at",
          )
          .eq("isletme_belge_id", belgeId)
          .order("created_at", { ascending: false })
          .limit(10),
      ])

      if (belgeError) throw belgeError
      if (metaError) throw metaError
      if (dosyaError) throw dosyaError
      if (dogrulamaError) throw dogrulamaError

      setBelge((belgeData ?? null) as BelgeDetayi | null)

      if (metaData) {
        setBelgeMeta(metaData as BelgeMeta)
      } else {
        setBelgeMeta({
          belge_kodu: islem.belge_kodu ?? "",
          belge_adi: islem.belge_adi ?? islem.baslik,
          yukumluluk_kodu: "",
          yukumluluk_basligi: islem.aciklama ?? "",
          kategori: "",
        })
      }

      setDosyalar((dosyaData ?? []) as BelgeDosyasi[])
      setDogrulamalar((dogrulamaData ?? []) as BelgeDogrulama[])
    } catch (error) {
      setHata(hataMesaji(error))
    } finally {
      setDetayYukleniyor(false)
    }
  }, [])

  useEffect(() => {
    void verileriGetir()
  }, [verileriGetir])

  useEffect(() => {
    void belgeDetayiniGetir(secilen)
  }, [belgeDetayiniGetir, secilen])

  useEffect(() => {
    if (!secilen) return
    setDetaySorumluAdi(secilen.sorumlu_adi ?? "")
    setDetaySorumluBirim(secilen.sorumlu_birim ?? "")
    setDetayHedefTarih(secilen.hedef_tarih ?? "")
  }, [secilen])

  const gorunenIslemler = useMemo(() => {
    if (filtre === "tumu") return islemler

    if (filtre === "geciken") {
      return islemler.filter((item) => item.gecikmis)
    }

    if (filtre === "yuksek") {
      return islemler.filter((item) => ["P1", "P2"].includes(item.oncelik))
    }

    if (filtre === "sorumlusuz") {
      return islemler.filter((item) => !item.sorumlu_adi)
    }

    return islemler.filter((item) => acikIslemMi(item))
  }, [filtre, islemler])

  const sonDogrulama = dogrulamalar[0] ?? null

  const belgeSahibi = metinDeger(
    sonDogrulama?.belge_sahibi ??
      String(belge?.ai_cikarilan_veriler?.belge_sahibi ?? ""),
  )

  const belgeNumarasi = metinDeger(
    sonDogrulama?.belge_numarasi ??
      String(belge?.ai_cikarilan_veriler?.belge_numarasi ?? ""),
  )

  const belgeTarihi = metinDeger(
    sonDogrulama?.belge_tarihi ??
      String(belge?.ai_cikarilan_veriler?.belge_tarihi ?? ""),
  )

  const gecerlilikBaslangic = metinDeger(
    belge?.gecerlilik_baslangic ?? sonDogrulama?.gecerlilik_baslangic,
  )

  const gecerlilikBitis = metinDeger(
    belge?.gecerlilik_bitis ?? sonDogrulama?.gecerlilik_bitis,
  )

  const sonUyumsuzluklar =
    sonDogrulama?.uyumsuzluklar?.length
      ? sonDogrulama.uyumsuzluklar
      : []

  async function calistir(
    gorev: () => Promise<void>,
    basariMesaji: string,
    secimGuncelle = true,
  ) {
    setIslemYapiliyor(true)
    setHata(null)
    setMesaj(null)

    try {
      await gorev()
      setMesaj(basariMesaji)
      await verileriGetir()

      if (secimGuncelle && secilen) {
        await belgeDetayiniGetir(secilen)
      }
    } catch (error) {
      setHata(hataMesaji(error))
    } finally {
      setIslemYapiliyor(false)
    }
  }

  async function manuelIslemOlustur() {
    if (!isletme) return

    if (!manuelBaslik.trim()) {
      setHata("İşlem başlığı zorunludur.")
      return
    }

    await calistir(async () => {
      const { error } = await supabase.rpc("kym_islem_olustur", {
        p_isletme_id: isletme.id,
        p_isletme_belge_id: null,
        p_baslik: manuelBaslik.trim(),
        p_aciklama: manuelAciklama.trim() || null,
        p_islem_tipi: "diger",
        p_oncelik: manuelOncelik,
        p_risk_puani: manuelRiskPuani,
        p_hedef_tarih: manuelHedefTarih || null,
        p_sorumlu_personel_id: null,
        p_sorumlu_adi: manuelSorumluAdi.trim() || null,
        p_sorumlu_birim: manuelSorumluBirim.trim() || null,
      })

      if (error) throw error

      setManuelBaslik("")
      setManuelAciklama("")
      setManuelOncelik("P3")
      setManuelRiskPuani(50)
      setManuelHedefTarih("")
      setManuelSorumluAdi("")
      setManuelSorumluBirim("")
    }, "Yeni işlem oluşturuldu.")
  }

  async function acikBelgelerdenIslemOlustur() {
    if (!isletme) return

    await calistir(async () => {
      const { data, error } = await supabase.rpc(
        "kym_acik_belgeler_icin_islem_olustur",
        { p_isletme_id: isletme.id },
      )

      if (error) throw error
      setMesaj(`${Number(data ?? 0)} açık belge için işlem üretildi.`)
    }, "Açık belgeler kontrol edildi.")
  }

  async function durumGuncelle(yeniDurum: string) {
    if (!secilen) return

    await calistir(async () => {
      const { error } = await supabase.rpc("kym_islem_durum_guncelle", {
        p_islem_id: secilen.id,
        p_yeni_durum: yeniDurum,
        p_aciklama: "KYM İşlem Merkezi üzerinden güncellendi.",
      })

      if (error) throw error
    }, "İşlem durumu güncellendi.")
  }

  async function sorumluKaydet() {
    if (!secilen) return

    await calistir(async () => {
      const { error } = await supabase.rpc("kym_islem_sorumlu_ata", {
        p_islem_id: secilen.id,
        p_sorumlu_personel_id: null,
        p_sorumlu_adi: detaySorumluAdi.trim() || null,
        p_sorumlu_birim: detaySorumluBirim.trim() || null,
        p_aciklama: "KYM İşlem Merkezi üzerinden sorumlu atandı.",
      })

      if (error) throw error
    }, "Sorumlu bilgisi güncellendi.")
  }

  async function hedefTarihKaydet() {
    if (!secilen) return

    await calistir(async () => {
      const { error } = await supabase.rpc(
        "kym_islem_hedef_tarih_guncelle",
        {
          p_islem_id: secilen.id,
          p_hedef_tarih: detayHedefTarih || null,
          p_aciklama:
            "KYM İşlem Merkezi üzerinden hedef tarih güncellendi.",
        },
      )

      if (error) throw error
    }, "Hedef tarih güncellendi.")
  }

  async function belgeYukleVeAnalizEt() {
    if (!secilen?.isletme_belge_id) {
      setHata("Bu işlem bir belge kaydına bağlı değil.")
      return
    }

    if (!secilenDosya) {
      setHata("Yüklenecek dosyayı seçin.")
      return
    }

    if (secilenDosya.size > MAX_DOSYA_BOYUTU) {
      setHata("Belge boyutu 8 MB sınırını aşıyor.")
      return
    }

    const izinliTipler = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ]

    if (
      secilenDosya.type &&
      !izinliTipler.includes(secilenDosya.type)
    ) {
      setHata("Yalnızca PDF, PNG, JPG, JPEG ve WEBP dosyaları kabul edilir.")
      return
    }

    setIslemYapiliyor(true)
    setHata(null)
    setMesaj(null)
    setYuklemeAsamasi("yukleniyor")

    const belgeSatiri: KymBelgeSatiri = {
      isletme_belge_id: secilen.isletme_belge_id,
      isletme_id: secilen.isletme_id,
      belge_kodu: belgeMeta?.belge_kodu ?? secilen.belge_kodu ?? "",
      belge_adi:
        belgeMeta?.belge_adi ??
        secilen.belge_adi ??
        secilen.baslik,
      yukumluluk_kodu: belgeMeta?.yukumluluk_kodu ?? "",
      yukumluluk_basligi: belgeMeta?.yukumluluk_basligi ?? "",
      kategori: belgeMeta?.kategori ?? "",
      risk_puani: secilen.risk_puani,
      oncelik: secilen.oncelik,
      durum: (belge?.durum ?? "yok") as KymBelgeDurumu,
    }

    const analizZamanlayici = window.setTimeout(() => {
      setYuklemeAsamasi("analiz")
    }, 700)

    try {
      const sonuc = await yukleKymBelgesi({
        belge: belgeSatiri,
        dosya: secilenDosya,
        isletmeAdi: isletme?.isletme_adi ?? null,
      })

      window.clearTimeout(analizZamanlayici)

      if (!sonuc.basarili) {
        setHata(sonuc.hata ?? "Belge yüklenemedi.")
        setYuklemeAsamasi(null)
        return
      }

      setSecilenDosya(null)

      const dosyaInput = document.getElementById(
        "belge-dosya-input",
      ) as HTMLInputElement | null

      if (dosyaInput) dosyaInput.value = ""

      if (sonuc.analizTamamlandi) {
        setYuklemeAsamasi("tamamlandi")
        setMesaj(
          `Analiz tamamlandı. ${sonuc.ozet ?? "Belge başarıyla incelendi."}`,
        )
      } else {
        setYuklemeAsamasi("manuel")
        setMesaj(
          sonuc.ozet ??
            "Belge yüklendi. Manuel inceleme gerekli.",
        )
      }

      await verileriGetir()

      if (secilen) {
        await belgeDetayiniGetir(secilen)
      }
    } catch (error) {
      window.clearTimeout(analizZamanlayici)
      setHata(hataMesaji(error))
      setYuklemeAsamasi(null)
    } finally {
      setIslemYapiliyor(false)
    }
  }

  async function belgeGereklilikGuncelle(gerekli: boolean) {
    if (!secilen?.isletme_belge_id) return

    const belgeId = secilen.isletme_belge_id
    const islemId = secilen.id

    await calistir(
      async () => {
        if (gerekli) {
          const { error: belgeError } = await supabase
            .from("kym_isletme_belgeleri")
            .update({
              durum: "yok",
              mevcut_mu: false,
              notlar: "Belge yeniden gerekli olarak işaretlendi.",
            })
            .eq("id", belgeId)

          if (belgeError) throw belgeError

          const { error: islemError } = await supabase.rpc(
            "kym_islem_durum_guncelle",
            {
              p_islem_id: islemId,
              p_yeni_durum: "bekliyor",
              p_aciklama:
                "Belge yeniden gerekli olarak işaretlendi.",
            },
          )

          if (islemError) throw islemError
        } else {
          const { error: belgeError } = await supabase
            .from("kym_isletme_belgeleri")
            .update({
              durum: "uygulanmiyor",
              mevcut_mu: false,
              notlar:
                "İşletme için gereksiz/uygulanmıyor olarak işaretlendi.",
            })
            .eq("id", belgeId)

          if (belgeError) throw belgeError

          const { error: islemError } = await supabase.rpc(
            "kym_islem_durum_guncelle",
            {
              p_islem_id: islemId,
              p_yeni_durum: "tamamlandi",
              p_aciklama:
                "Belge işletme için uygulanmıyor olarak işaretlendi.",
            },
          )

          if (islemError) throw islemError
        }
      },
      gerekli
        ? "Belge yeniden gerekli olarak işaretlendi ve işlem bekliyor durumuna alındı."
        : "Belge gereksiz/uygulanmıyor olarak işaretlendi. Bağlı işlem tamamlandı.",
      false,
    )

    const guncelListe = await supabase
      .from("v_kym_islem_listesi")
      .select("*")
      .eq("isletme_id", isletme?.id ?? "")
      .order("risk_puani", { ascending: false })
      .order("created_at", { ascending: false })

    const liste = (guncelListe.data ?? []) as Islem[]

    if (!gerekli) {
      const sonraki = ilkUygunIslem(liste)
      if (sonraki) islemSec(sonraki)
    } else {
      const guncel = liste.find((item) => item.id === islemId)
      if (guncel) islemSec(guncel)
      await belgeDetayiniGetir(guncel ?? secilen)
    }
  }

  async function belgeyiAc(dosya: BelgeDosyasi) {
    setHata(null)

    const { data, error } = await supabase.storage
      .from("kym-belgeleri")
      .createSignedUrl(dosya.dosya_url, 60 * 60)

    if (error) {
      setHata(error.message)
      return
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  const analizKartlari: Array<{
    key: AnalizFiltresi
    baslik: string
    deger: number
    aciklama: string
  }> = [
    {
      key: "acik",
      baslik: "Açık İşlem",
      deger: sayi(ozet?.acik_islem),
      aciklama: "Tamamlanmamış tüm işlemler",
    },
    {
      key: "geciken",
      baslik: "Geciken",
      deger: sayi(ozet?.geciken_islem),
      aciklama: "Hedef tarihi geçmiş işlemler",
    },
    {
      key: "yuksek",
      baslik: "Yüksek Öncelikli",
      deger: sayi(ozet?.yuksek_oncelikli_islem),
      aciklama: "P1 ve P2 öncelikli işlemler",
    },
    {
      key: "sorumlusuz",
      baslik: "Sorumlusuz",
      deger: sayi(ozet?.sorumlusuz_islem),
      aciklama: "Henüz sorumlu atanmamış işlemler",
    },
  ]

  const yuklemeDurumMetni = (() => {
    if (yuklemeAsamasi === "yukleniyor") return "Belge yükleniyor..."
    if (yuklemeAsamasi === "analiz") return "AI analiz ediyor..."
    if (yuklemeAsamasi === "tamamlandi") return "Analiz tamamlandı"
    if (yuklemeAsamasi === "manuel") return "Manuel inceleme gerekli"
    return null
  })()

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Kurumsal Yönetim Merkezi
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                İşlem ve Aksiyon Merkezi
              </h1>
              <p className="mt-1 text-sm text-slate-700">
                {isletme?.isletme_adi ?? "İşletme yükleniyor..."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={islemYapiliyor || !isletme}
                onClick={() => void acikBelgelerdenIslemOlustur()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Açık Belgelerden İşlem Üret
              </button>

              <button
                type="button"
                disabled={yukleniyor}
                onClick={() => void verileriGetir()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Yenile
              </button>
            </div>
          </div>
        </section>

        {hata ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {hata}
          </div>
        ) : null}

        {mesaj ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {mesaj}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {analizKartlari.map((kart) => (
            <button
              key={kart.key}
              type="button"
              onClick={() => setFiltre(kart.key)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-500 ${
                filtre === kart.key
                  ? "border-slate-900 ring-2 ring-slate-900"
                  : "border-slate-200"
              }`}
            >
              <p className="text-sm font-medium text-slate-700">
                {kart.baslik}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {kart.deger}
              </p>
              <p className="mt-2 text-xs text-slate-600">{kart.aciklama}</p>
              <p className="mt-3 text-xs font-semibold text-slate-900">
                Listeyi filtrele
              </p>
            </button>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {[
                  ["acik", "Açık"],
                  ["geciken", "Geciken"],
                  ["yuksek", "Yüksek Öncelikli"],
                  ["sorumlusuz", "Sorumlusuz"],
                  ["tumu", "Tümü"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFiltre(value as AnalizFiltresi)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      filtre === value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {yukleniyor ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-700">
                İşlemler yükleniyor...
              </div>
            ) : gorunenIslemler.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-700">
                Bu analize uygun işlem bulunmuyor.
              </div>
            ) : (
              <div className="space-y-3">
                {gorunenIslemler.map((islem) => (
                  <button
                    key={islem.id}
                    type="button"
                    onClick={() => islemSec(islem)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-500 ${
                      secilen?.id === islem.id
                        ? "border-slate-900 ring-2 ring-slate-900"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-900">
                            {islem.oncelik}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                            {durumAdi(islem.durum)}
                          </span>
                          {islem.gecikmis ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                              Gecikmiş
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-3 font-semibold text-slate-900">
                          {islem.baslik}
                        </h2>
                        <p className="mt-1 text-sm text-slate-700">
                          {islem.aciklama || "Açıklama bulunmuyor."}
                        </p>
                        {islem.belge_adi ? (
                          <p className="mt-2 text-xs font-medium text-slate-600">
                            İlgili belge: {islem.belge_adi}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-sm text-slate-700">
                        <p>Risk: {islem.risk_puani}/100</p>
                        <p className="mt-1">
                          Hedef: {tarihYaz(islem.hedef_tarih)}
                        </p>
                        <p className="mt-1">
                          Sorumlu: {islem.sorumlu_adi || "Atanmadı"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {secilen ? (
              <>
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Belge Yükleme ve AI Analiz Merkezi
                  </h2>
                  <p className="mt-2 text-sm text-slate-800">
                    İlgili belgeyi yükleyin. Sistem belgeyi kaydeder, AI ile
                    inceler ve sonucu aşağıda gösterir.
                  </p>

                  {!secilen.isletme_belge_id ? (
                    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                      Bu manuel işlem bir belge kaydına bağlı değil. Belge
                      yüklemek için listeden belgeye bağlı bir işlem seçin.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="belge-dosya-input" className={LABEL_CLASS}>
                          Belge dosyası
                        </label>
                        <input
                          id="belge-dosya-input"
                          type="file"
                          accept={KABUL_DOSYALAR}
                          disabled={islemYapiliyor}
                          onChange={(event) =>
                            setSecilenDosya(event.target.files?.[0] ?? null)
                          }
                          className={`${INPUT_CLASS} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white`}
                        />
                        <p className="mt-2 text-xs text-slate-700">
                          Kabul edilen dosyalar: PDF, PNG, JPG, JPEG, WEBP ·
                          Maksimum boyut: 8 MB
                        </p>
                        {secilenDosya ? (
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            Seçilen: {secilenDosya.name}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        disabled={
                          islemYapiliyor ||
                          !secilenDosya ||
                          belge?.durum === "uygulanmiyor"
                        }
                        onClick={() => void belgeYukleVeAnalizEt()}
                        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Belgeyi Yükle ve AI Analiz Et
                      </button>

                      {yuklemeDurumMetni ? (
                        <div
                          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                            yuklemeAsamasi === "tamamlandi"
                              ? "bg-emerald-100 text-emerald-900"
                              : yuklemeAsamasi === "manuel"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-white text-slate-900 ring-1 ring-slate-300"
                          }`}
                        >
                          {yuklemeDurumMetni}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {secilen.isletme_belge_id ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900">
                      Bu belge işletme için gerekli mi?
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">
                      Gereksiz olarak işaretlenen belgeler açık işlem
                      sayılarına dahil edilmez.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={
                          islemYapiliyor ||
                          detayYukleniyor ||
                          belge?.durum !== "uygulanmiyor"
                        }
                        onClick={() => void belgeGereklilikGuncelle(true)}
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Gerekli
                      </button>

                      <button
                        type="button"
                        disabled={
                          islemYapiliyor ||
                          detayYukleniyor ||
                          belge?.durum === "uygulanmiyor"
                        }
                        onClick={() => void belgeGereklilikGuncelle(false)}
                        className="rounded-xl border border-slate-400 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Gereksiz / Uygulanmıyor
                      </button>
                    </div>

                    {belge?.durum === "uygulanmiyor" ? (
                      <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">
                        Bu belge şu an gereksiz/uygulanmıyor olarak işaretli.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-semibold text-slate-900">
                    Belge Analiz Sonucu
                  </h2>
                  <p className="mt-1 text-sm text-slate-700">{secilen.baslik}</p>

                  {!secilen.isletme_belge_id ? (
                    <p className="mt-4 text-sm text-slate-700">
                      Bu işlem belge kaydına bağlı değil.
                    </p>
                  ) : detayYukleniyor ? (
                    <p className="mt-4 text-sm text-slate-700">
                      Belge detayları yükleniyor...
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            Belge adı
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {belgeMeta?.belge_adi ??
                              secilen.belge_adi ??
                              secilen.baslik}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            Belge durumu
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {belgeDurumAdi(belge?.durum)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            AI güven skoru
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {belge?.ai_guven_skoru ?? sonDogrulama?.guven_skoru ?? "-"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            Belge sahibi
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {belgeSahibi}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            Belge numarası
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {belgeNumarasi}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            Belge tarihi
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {belgeTarihi}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            Geçerlilik başlangıç
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {gecerlilikBaslangic}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-600">
                            Geçerlilik bitiş
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {gecerlilikBitis}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-600">
                          AI analiz özeti
                        </p>
                        <p className="mt-2 text-sm text-slate-900">
                          {belge?.ai_ozet ??
                            sonDogrulama?.ozet ??
                            "Henüz AI analiz özeti bulunmuyor."}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-600">
                          Eksikler
                        </p>
                        {belge?.ai_eksikler?.length ||
                        sonDogrulama?.eksikler?.length ? (
                          <ul className="mt-2 space-y-1 text-sm text-slate-900">
                            {(belge?.ai_eksikler?.length
                              ? belge.ai_eksikler
                              : sonDogrulama?.eksikler ?? []
                            ).map((item, index) => (
                              <li key={`${item}-${index}`}>• {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-700">
                            Kayıtlı eksik bulunmuyor.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-600">
                          Uyumsuzluklar
                        </p>
                        {sonUyumsuzluklar.length ? (
                          <ul className="mt-2 space-y-1 text-sm text-red-800">
                            {sonUyumsuzluklar.map((item, index) => (
                              <li key={`${item}-${index}`}>• {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-700">
                            Kayıtlı uyumsuzluk bulunmuyor.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-600">
                          Yüklenen dosyalar
                        </p>

                        {dosyalar.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-700">
                            Henüz dosya yüklenmemiş.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {dosyalar.map((dosya) => (
                              <div
                                key={dosya.id}
                                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                              >
                                <span className="truncate text-sm font-medium text-slate-900">
                                  {dosya.dosya_adi || "Belge dosyası"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void belgeyiAc(dosya)}
                                  className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  Dosyayı Görüntüle
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-600">
                          Analiz geçmişi
                        </p>

                        {dogrulamalar.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-700">
                            Henüz analiz kaydı bulunmuyor.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {dogrulamalar.map((kayit) => (
                              <div
                                key={kayit.id}
                                className="rounded-lg bg-slate-50 p-3"
                              >
                                <div className="flex flex-wrap justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {kayit.sonuc ?? "Analiz"}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {tarihSaatYaz(kayit.created_at)}
                                  </p>
                                </div>

                                <p className="mt-2 text-sm text-slate-800">
                                  {kayit.ozet || "Özet bulunmuyor."}
                                </p>

                                {kayit.uyumsuzluklar?.length ? (
                                  <div className="mt-2">
                                    <p className="text-xs font-semibold text-red-800">
                                      Uyumsuzluklar
                                    </p>
                                    <ul className="mt-1 space-y-1 text-xs text-red-800">
                                      {kayit.uyumsuzluklar.map(
                                        (item, index) => (
                                          <li key={`${item}-${index}`}>
                                            • {item}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-semibold text-slate-900">
                    İşlem Yönetimi
                  </h2>
                  <p className="mt-1 text-sm text-slate-700">{secilen.baslik}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-600">
                        İşlem durumu
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {durumAdi(secilen.durum)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-600">
                        Risk / Öncelik
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {secilen.risk_puani}/100 · {secilen.oncelik}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label htmlFor="islem-durum" className={LABEL_CLASS}>
                        Durum güncelle
                      </label>
                      <select
                        id="islem-durum"
                        value={secilen.durum}
                        disabled={islemYapiliyor}
                        onChange={(event) =>
                          void durumGuncelle(event.target.value)
                        }
                        className={INPUT_CLASS}
                      >
                        {DURUMLAR.map(([kod, ad]) => (
                          <option key={kod} value={kod}>
                            {ad}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="detay-sorumlu-adi" className={LABEL_CLASS}>
                        Sorumlu adı
                      </label>
                      <input
                        id="detay-sorumlu-adi"
                        value={detaySorumluAdi}
                        onChange={(event) =>
                          setDetaySorumluAdi(event.target.value)
                        }
                        placeholder="Örn: Ahmet Yılmaz"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="detay-sorumlu-birim"
                        className={LABEL_CLASS}
                      >
                        Sorumlu birim
                      </label>
                      <input
                        id="detay-sorumlu-birim"
                        value={detaySorumluBirim}
                        onChange={(event) =>
                          setDetaySorumluBirim(event.target.value)
                        }
                        placeholder="Örn: İnsan Kaynakları"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={islemYapiliyor}
                      onClick={() => void sorumluKaydet()}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sorumluyu Kaydet
                    </button>

                    <div>
                      <label htmlFor="detay-hedef-tarih" className={LABEL_CLASS}>
                        Hedef tarih
                      </label>
                      <input
                        id="detay-hedef-tarih"
                        type="date"
                        value={detayHedefTarih}
                        onChange={(event) =>
                          setDetayHedefTarih(event.target.value)
                        }
                        className={INPUT_CLASS}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={islemYapiliyor}
                      onClick={() => void hedefTarihKaydet()}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Hedef Tarihi Kaydet
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-700 shadow-sm">
                Açık işlem bulunamadı. Yeni manuel işlem oluşturabilir veya
                açık belgelerden işlem üretebilirsiniz.
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Yeni Manuel İşlem
              </h2>

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="manuel-baslik" className={LABEL_CLASS}>
                    İşlem başlığı
                  </label>
                  <input
                    id="manuel-baslik"
                    value={manuelBaslik}
                    onChange={(event) => setManuelBaslik(event.target.value)}
                    placeholder="Örn: Ruhsat yenileme takibi"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="manuel-aciklama" className={LABEL_CLASS}>
                    Açıklama
                  </label>
                  <textarea
                    id="manuel-aciklama"
                    value={manuelAciklama}
                    onChange={(event) => setManuelAciklama(event.target.value)}
                    placeholder="İşlem detayını yazın"
                    rows={3}
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="manuel-oncelik" className={LABEL_CLASS}>
                      Öncelik
                    </label>
                    <select
                      id="manuel-oncelik"
                      value={manuelOncelik}
                      onChange={(event) => setManuelOncelik(event.target.value)}
                      className={INPUT_CLASS}
                    >
                      {["P1", "P2", "P3", "P4", "P5"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="manuel-risk" className={LABEL_CLASS}>
                      Risk puanı
                    </label>
                    <input
                      id="manuel-risk"
                      type="number"
                      min={0}
                      max={100}
                      value={manuelRiskPuani}
                      onChange={(event) =>
                        setManuelRiskPuani(Number(event.target.value))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="manuel-hedef-tarih" className={LABEL_CLASS}>
                    Hedef tarih
                  </label>
                  <input
                    id="manuel-hedef-tarih"
                    type="date"
                    value={manuelHedefTarih}
                    onChange={(event) =>
                      setManuelHedefTarih(event.target.value)
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="manuel-sorumlu-adi" className={LABEL_CLASS}>
                    Sorumlu adı
                  </label>
                  <input
                    id="manuel-sorumlu-adi"
                    value={manuelSorumluAdi}
                    onChange={(event) =>
                      setManuelSorumluAdi(event.target.value)
                    }
                    placeholder="Örn: Ayşe Demir"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="manuel-sorumlu-birim" className={LABEL_CLASS}>
                    Sorumlu birim
                  </label>
                  <input
                    id="manuel-sorumlu-birim"
                    value={manuelSorumluBirim}
                    onChange={(event) =>
                      setManuelSorumluBirim(event.target.value)
                    }
                    placeholder="Örn: Operasyon"
                    className={INPUT_CLASS}
                  />
                </div>

                <button
                  type="button"
                  disabled={islemYapiliyor || !isletme}
                  onClick={() => void manuelIslemOlustur()}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  İşlem Oluştur
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
