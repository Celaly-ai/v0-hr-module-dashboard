"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Loader2,
  MessageSquareText,
  PhoneCall,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Save,
  Send,
  Upload,
} from "lucide-react"

type Kayit = Record<string, any>

const BOS_IS_FORM = {
  musteri_adi: "",
  fis_numarasi: "",
  telefon: "",
  basvuru_nedeni: "",
  ilce: "",
  mahalle: "",
  teknisyen_kodu: "",
  teknisyen_adi: "",
  marka: "",
  urun_grubu: "",
  model: "",
  model_serbest: "",
  yapilan_hizmet_kodu: "",
  kullanilan_malzeme_aciklama: "",
  teknisyen_notu: "",
}

function metin(value: any) {
  return String(value || "").trim()
}

function tarih(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function durumRenk(value: string | null) {
  if (value === "tamamlandi") return "border-emerald-300 bg-emerald-50 text-emerald-800"
  if (value === "devam_ediyor") return "border-blue-300 bg-blue-50 text-blue-800"
  if (value === "bekliyor") return "border-amber-300 bg-amber-50 text-amber-800"
  if (value === "aksiyon_gerekli") return "border-orange-300 bg-orange-50 text-orange-800"
  return "border-slate-300 bg-slate-50 text-slate-800"
}

function riskRenk(value: string | null) {
  if (value === "kritik") return "border-red-300 bg-red-50 text-red-800"
  if (value === "riskli") return "border-orange-300 bg-orange-50 text-orange-800"
  return "border-emerald-300 bg-emerald-50 text-emerald-800"
}

function adAl(item: Kayit) {
  return metin(item.ad) || metin(item.ad_soyad) || metin(item.personel_adi) || metin(item.name)
}

function personelAdi(item: Kayit) {
  const tam = metin(item.ad_soyad) || metin(item.personel_adi)
  if (tam) return tam
  return `${metin(item.ad)} ${metin(item.soyad)}`.trim() || metin(item.personel_kodu)
}

export default function AnketPage() {
  const supabase = useMemo(() => createClient(), [])

  const [isForm, setIsForm] = useState(BOS_IS_FORM)
  const [isHavuzu, setIsHavuzu] = useState<Kayit[]>([])
  const [anketler, setAnketler] = useState<Kayit[]>([])
  const [cevaplar, setCevaplar] = useState<Kayit[]>([])

  const [ilceler, setIlceler] = useState<Kayit[]>([])
  const [mahalleler, setMahalleler] = useState<Kayit[]>([])
  const [markalar, setMarkalar] = useState<Kayit[]>([])
  const [urunGruplari, setUrunGruplari] = useState<Kayit[]>([])
  const [modeller, setModeller] = useState<Kayit[]>([])
  const [hizmetTipleri, setHizmetTipleri] = useState<Kayit[]>([])
  const [teknisyenler, setTeknisyenler] = useState<Kayit[]>([])

  const [aktifIs, setAktifIs] = useState<Kayit | null>(null)
  const [aktifSoru, setAktifSoru] = useState<Kayit | null>(null)
  const [musteriCevabi, setMusteriCevabi] = useState("")
  const [anketorNotu, setAnketorNotu] = useState("")

  const [loading, setLoading] = useState(true)
  const [isKaydediliyor, setIsKaydediliyor] = useState(false)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [anketBaslatiliyor, setAnketBaslatiliyor] = useState<number | null>(null)
  const [cevapKaydediliyor, setCevapKaydediliyor] = useState(false)

  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [sonAiSonuc, setSonAiSonuc] = useState<Kayit | null>(null)

  const bekleyenIsler = isHavuzu.filter((item) =>
    ["bekliyor", "devam_ediyor"].includes(metin(item.anket_durumu)),
  )
  const tamamlananIsler = isHavuzu.filter((item) => metin(item.anket_durumu) === "tamamlandi")
  const kritik = anketler.filter((item) => item.ai_risk_seviyesi === "kritik").length
  const riskli = anketler.filter((item) => item.ai_risk_seviyesi === "riskli").length
  const npsHazir = anketler.filter((item) => item.ai_sonuc === "NPS Hazır").length
  const tekrarAranacaklar = anketler.filter((item) =>
    item.ai_tekrar_iletisim_gerekli === true ||
    item.ai_tekrar_servis_gerekli === true ||
    ["kritik", "riskli", "izleme"].includes(metin(item.ai_risk_seviyesi)) ||
    ["Kritik", "Riskli", "İzleme"].includes(metin(item.ai_sonuc))
  )

  const seciliIlce = ilceler.find((item) => adAl(item) === isForm.ilce)
  const filtreliMahalleler = seciliIlce
    ? mahalleler.filter((item) => item.ilce_id === seciliIlce.id)
    : mahalleler

  const seciliMarka = markalar.find((item) => adAl(item) === isForm.marka)
  const seciliUrunGrubu = urunGruplari.find((item) => adAl(item) === isForm.urun_grubu)

  const filtreliModeller = modeller.filter((item) => {
    const markaUygun = seciliMarka ? item.marka_id === seciliMarka.id : true
    const urunUygun = seciliUrunGrubu ? item.urun_grubu_id === seciliUrunGrubu.id : true
    return markaUygun && urunUygun
  })

  async function verileriGetir() {
    setLoading(true)
    setHata(null)

    const [
      isSonuc,
      anketSonuc,
      ilceSonuc,
      mahalleSonuc,
      markaSonuc,
      urunSonuc,
      modelSonuc,
      hizmetSonuc,
      personelSonuc,
    ] = await Promise.all([
      supabase.from("ai_anket_is_havuzu").select("*").order("id", { ascending: false }).limit(80),
      supabase.from("ai_anket_kayitlari").select("*").order("id", { ascending: false }).limit(30),
      supabase.from("anket_ilceler").select("*").eq("aktif", true).order("ad"),
      supabase.from("anket_mahalleler").select("*").eq("aktif", true).order("ad"),
      supabase.from("anket_markalar").select("*").eq("aktif", true).order("ad"),
      supabase.from("anket_urun_gruplari").select("*").eq("aktif", true).order("ad"),
      supabase.from("anket_urun_modelleri").select("*").eq("aktif", true).order("ad"),
      supabase.from("anket_hizmet_tipleri").select("*").eq("aktif", true).order("ad"),
      supabase.from("personeller").select("*").order("personel_kodu"),
    ])

    const ilkHata =
      isSonuc.error ||
      anketSonuc.error ||
      ilceSonuc.error ||
      mahalleSonuc.error ||
      markaSonuc.error ||
      urunSonuc.error ||
      modelSonuc.error ||
      hizmetSonuc.error ||
      personelSonuc.error

    if (ilkHata) setHata(ilkHata.message)

    setIsHavuzu(isSonuc.data || [])
    setAnketler(anketSonuc.data || [])
    setIlceler(ilceSonuc.data || [])
    setMahalleler(mahalleSonuc.data || [])
    setMarkalar(markaSonuc.data || [])
    setUrunGruplari(urunSonuc.data || [])
    setModeller(modelSonuc.data || [])
    setHizmetTipleri(hizmetSonuc.data || [])

    const personelListe = personelSonuc.data || []
    const teknikListe = personelListe.filter((p: Kayit) => {
      const rol = metin(p.rol).toLocaleLowerCase("tr-TR")
      return (
        rol.includes("teknisyen") ||
        rol.includes("montaj") ||
        rol.includes("arıza") ||
        rol.includes("ariza") ||
        rol.includes("nakliye")
      )
    })
    setTeknisyenler(teknikListe.length > 0 ? teknikListe : personelListe)

    setLoading(false)
  }

  async function cevaplariGetir(anketId: number) {
    const { data, error } = await supabase
      .from("ai_anket_cevaplari")
      .select("*")
      .eq("anket_id", anketId)
      .order("soru_no", { ascending: true })

    if (error) {
      setHata(error.message)
      setCevaplar([])
      setAktifSoru(null)
      return
    }

    const liste = data || []
    setCevaplar(liste)
    setAktifSoru(liste.find((item) => !item.musteri_cevabi) || null)
    setMusteriCevabi("")
    setAnketorNotu("")
  }

  useEffect(() => {
    verileriGetir()
  }, [])

  function formGuncelle(key: keyof typeof BOS_IS_FORM, value: string) {
    setIsForm((onceki) => ({
      ...onceki,
      [key]: value,
      ...(key === "ilce" ? { mahalle: "" } : {}),
      ...(key === "marka" || key === "urun_grubu" ? { model: "", model_serbest: "" } : {}),
    }))
  }

  async function isEkle() {
    setIsKaydediliyor(true)
    setHata(null)
    setBilgi(null)

    const modelDegeri = isForm.model === "__serbest__" ? isForm.model_serbest : isForm.model

    const { data, error } = await supabase.rpc("ai_anket_is_havuzuna_ekle", {
      p_musteri_adi: isForm.musteri_adi,
      p_fis_numarasi: isForm.fis_numarasi,
      p_telefon: isForm.telefon,
      p_basvuru_nedeni: isForm.basvuru_nedeni,
      p_ilce: isForm.ilce,
      p_mahalle: isForm.mahalle,
      p_teknisyen_kodu: isForm.teknisyen_kodu,
      p_teknisyen_adi: isForm.teknisyen_adi,
      p_marka: isForm.marka,
      p_urun_grubu: isForm.urun_grubu,
      p_model: modelDegeri,
      p_yapilan_hizmet_kodu: isForm.yapilan_hizmet_kodu,
      p_kullanilan_malzeme_aciklama: isForm.kullanilan_malzeme_aciklama,
      p_teknisyen_notu: isForm.teknisyen_notu,
      p_kaynak_tipi: "manuel",
    })

    if (error || !data?.success) {
      setHata(error?.message || data?.error || "İş havuzuna eklenemedi.")
      setIsKaydediliyor(false)
      return
    }

    setBilgi(`Tamamlanmış iş havuza eklendi: ${data.is_kodu}`)
    setIsForm(BOS_IS_FORM)
    await verileriGetir()
    setIsKaydediliyor(false)
  }

  async function excelYukle(file: File | null) {
    if (!file) return

    setExcelYukleniyor(true)
    setHata(null)
    setBilgi(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/anket/is-havuzu-excel-yukle", {
        method: "POST",
        body: formData,
      })

      const json = await response.json()

      if (!response.ok || !json.success) {
        setHata(json.error || "Excel yükleme başarısız oldu.")
        return
      }

      setBilgi(`${json.eklenen} kayıt Excel’den anket iş havuzuna eklendi.`)
      await verileriGetir()
    } catch (err: any) {
      setHata(err?.message || "Excel yükleme sırasında hata oluştu.")
    } finally {
      setExcelYukleniyor(false)
    }
  }

  async function anketBaslat(isKaydi: Kayit) {
    setAnketBaslatiliyor(Number(isKaydi.id))
    setHata(null)
    setBilgi(null)
    setSonAiSonuc(null)

    const { data, error } = await supabase.rpc("ai_anket_baslat", {
      p_is_havuzu_id: Number(isKaydi.id),
    })

    if (error || !data?.success) {
      setHata(error?.message || data?.error || "Anket başlatılamadı.")
      setAnketBaslatiliyor(null)
      return
    }

    const guncelIs = {
      ...isKaydi,
      anket_id: data.anket_id || isKaydi.anket_id,
      anket_durumu: "devam_ediyor",
    }

    setAktifIs(guncelIs)
    setBilgi("Anket başlatıldı. AI ilk soruyu oluşturdu.")
    await verileriGetir()
    await cevaplariGetir(Number(guncelIs.anket_id))
    setAnketBaslatiliyor(null)
  }

  async function aktifIsiSec(isKaydi: Kayit) {
    setAktifIs(isKaydi)
    setBilgi(null)
    setHata(null)
    setSonAiSonuc(null)

    if (isKaydi.anket_id) {
      await cevaplariGetir(Number(isKaydi.anket_id))
    } else {
      setCevaplar([])
      setAktifSoru(null)
    }
  }

  async function cevapGonder() {
    if (!aktifSoru) return

    setCevapKaydediliyor(true)
    setHata(null)
    setBilgi(null)

    const { data, error } = await supabase.rpc("ai_anket_cevap_kaydet_ve_sonraki_soru_uret", {
      p_cevap_id: Number(aktifSoru.id),
      p_musteri_cevabi: musteriCevabi,
      p_anketor_notu: anketorNotu,
    })

    if (error || !data?.success) {
      setHata(error?.message || data?.error || "Cevap kaydedilemedi.")
      setCevapKaydediliyor(false)
      return
    }

    setSonAiSonuc(data)

    if (data.devam) {
      setBilgi(`AI sonraki soruyu oluşturdu: ${data.sonraki_soru_no}/6`)
    } else {
      setBilgi(`Anket tamamlandı. Sonuç: ${data.ai_sonuc} | Puan: ${data.ai_puan}`)
    }

    if (aktifIs?.anket_id) {
      await cevaplariGetir(Number(aktifIs.anket_id))
    }

    await verileriGetir()
    setCevapKaydediliyor(false)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Anket / Müşteri Temas Asistanı V2
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Anketör bekleyen işi seçer, AI bağlama göre soru üretir, müşteri cevabı ve anketör notuna göre sonuç oluşturur.
          </p>
        </div>

        <button
          type="button"
          onClick={verileriGetir}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Yenile
        </button>
      </div>

      {hata && <Card className="border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">{hata}</Card>}
      {bilgi && <Card className="border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{bilgi}</Card>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Bekleyen İş</p>
          <p className="mt-2 text-3xl font-black">{bekleyenIsler.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Tamamlanan İş</p>
          <p className="mt-2 text-3xl font-black">{tamamlananIsler.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Kritik</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black">
            {kritik}
            {kritik > 0 && <AlertTriangle className="h-5 w-5 text-red-600" />}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Riskli</p>
          <p className="mt-2 text-3xl font-black">{riskli}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">NPS Hazır</p>
          <p className="mt-2 text-3xl font-black">{npsHazir}</p>
        </Card>
      </div>

      <div className="rounded-2xl border border-orange-300 bg-orange-50 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-orange-950">Tekrar Aranacaklar</h2>
            <p className="mt-1 text-xs text-orange-900">
              Kritik, riskli, izleme veya tekrar iletişim gerektiren anketler burada görünür.
            </p>
          </div>
          <span className="rounded-full border border-orange-400 bg-white px-3 py-1 text-xs font-black text-orange-900">
            {tekrarAranacaklar.length} kayıt
          </span>
        </div>

        {tekrarAranacaklar.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orange-300 bg-white/60 p-4 text-center text-sm text-orange-900">
            Şu an tekrar aranacak müşteri yok.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tekrarAranacaklar.slice(0, 6).map((anket) => (
              <div key={anket.id} className="rounded-xl border border-orange-200 bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{anket.anket_kodu}</Badge>
                  <Badge variant="outline" className={riskRenk(anket.ai_risk_seviyesi)}>
                    {anket.ai_sonuc || "-"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-black">{anket.musteri_adi || "-"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{anket.musteri_telefon || "-"}</p>
                <p className="mt-2 text-xs text-orange-900">{anket.ai_onerilen_aksiyon || "Takip gerekli."}</p>
                {anket.anketor_notu && (
                  <p className="mt-2 rounded-lg bg-orange-50 p-2 text-xs font-semibold text-orange-950">
                    Anketör Notu: {anket.anketor_notu}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h2 className="font-black">Anket İş Havuzu</h2>
            <Badge variant="outline" className="ml-auto">{bekleyenIsler.length} bekleyen</Badge>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm font-bold text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              İş havuzu okunuyor...
            </div>
          ) : bekleyenIsler.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Bekleyen anket işi yok.
            </div>
          ) : (
            <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
              {bekleyenIsler.map((isKaydi) => (
                <button
                  key={isKaydi.id}
                  type="button"
                  onClick={() => void aktifIsiSec(isKaydi)}
                  className={`w-full rounded-2xl border p-4 text-left hover:bg-muted/40 ${
                    aktifIs?.id === isKaydi.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{isKaydi.is_kodu}</Badge>
                    <Badge variant="outline" className={durumRenk(isKaydi.anket_durumu)}>
                      {isKaydi.anket_durumu}
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm font-black">{isKaydi.musteri_adi || "-"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fiş: {isKaydi.fis_numarasi || "-"} • Tel: {isKaydi.telefon || "-"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isKaydi.marka || "-"} / {isKaydi.urun_grubu || "-"} / {isKaydi.model || "-"}
                  </p>

                  <div className="mt-3">
                    {isKaydi.anket_id ? (
                      <Badge variant="outline">Anket ID: {isKaydi.anket_id}</Badge>
                    ) : (
                      <span
                        onClick={(event) => {
                          event.stopPropagation()
                          void anketBaslat(isKaydi)
                        }}
                        className="inline-flex min-h-8 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground"
                      >
                        {anketBaslatiliyor === Number(isKaydi.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                        Anket Başlat
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-black">AI Dinamik Anket Ekranı</h2>
          </div>

          {!aktifIs ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <MessageSquareText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm font-bold">Anket yapmak için soldan bir iş seçin.</p>
            </div>
          ) : !aktifIs.anket_id ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="text-sm font-bold">{aktifIs.musteri_adi}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Bu iş için henüz anket başlatılmamış.
              </p>
              <button
                type="button"
                onClick={() => void anketBaslat(aktifIs)}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground"
              >
                <PlayCircle className="h-4 w-4" />
                Anket Başlat
              </button>
            </div>
          ) : !aktifSoru ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950">
              <CheckCircle2 className="mx-auto h-10 w-10" />
              <p className="mt-4 text-center text-xl font-black">Anket tamamlandı.</p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border bg-white/70 p-4 text-center">
                  <p className="text-xs font-bold text-muted-foreground">AI Sonuç</p>
                  <p className="mt-1 text-lg font-black">{sonAiSonuc?.ai_sonuc || aktifIs?.ai_sonuc || "-"}</p>
                </div>
                <div className="rounded-xl border bg-white/70 p-4 text-center">
                  <p className="text-xs font-bold text-muted-foreground">AI Puan</p>
                  <p className="mt-1 text-lg font-black">{sonAiSonuc?.ai_puan ?? aktifIs?.ai_puan ?? "-"}</p>
                </div>
                <div className="rounded-xl border bg-white/70 p-4 text-center">
                  <p className="text-xs font-bold text-muted-foreground">Risk</p>
                  <p className="mt-1 text-lg font-black">{sonAiSonuc?.ai_risk_seviyesi || aktifIs?.ai_risk_seviyesi || "-"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border bg-white/70 p-4">
                <p className="text-xs font-black">AI Analiz</p>
                <p className="mt-1 text-sm">{sonAiSonuc?.ai_analiz || aktifIs?.ai_analiz || "Sonuç bilgisi veritabanına işlendi. Sayfayı yenileyerek son anket sonuçlarında görebilirsiniz."}</p>
              </div>

              {(sonAiSonuc?.ai_onerilen_aksiyon || aktifIs?.ai_onerilen_aksiyon) && (
                <div className="mt-4 rounded-xl border bg-white/70 p-4">
                  <p className="text-xs font-black">Önerilen Aksiyon</p>
                  <p className="mt-1 text-sm">{sonAiSonuc?.ai_onerilen_aksiyon || aktifIs?.ai_onerilen_aksiyon}</p>
                </div>
              )}

              {(sonAiSonuc?.ai_musteri_kapanis_mesaji || aktifIs?.ai_musteri_kapanis_mesaji) && (
                <div className="mt-4 rounded-xl border bg-white/70 p-4">
                  <p className="text-xs font-black">Müşteriye Söylenecek Kapanış Mesajı</p>
                  <p className="mt-1 whitespace-pre-line text-sm">{sonAiSonuc?.ai_musteri_kapanis_mesaji || aktifIs?.ai_musteri_kapanis_mesaji}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge className="border-primary bg-primary text-primary-foreground">
                    AI SORUSU {aktifSoru.soru_no} / 6
                  </Badge>
                  <Badge variant="outline">{aktifIs.musteri_adi}</Badge>
                  <Badge variant="outline">{aktifIs.urun_grubu || "-"}</Badge>
                </div>

                <p className="text-2xl font-black leading-9 md:text-3xl md:leading-10">
                  {aktifSoru.ai_soru}
                </p>
              </div>

              <textarea
                className="min-h-40 w-full rounded-2xl border border-border bg-background p-4 text-lg font-semibold leading-7"
                placeholder="Müşteri cevabını buraya yazın..."
                value={musteriCevabi}
                onChange={(e) => setMusteriCevabi(e.target.value)}
              />

              <textarea
                className="min-h-28 w-full rounded-2xl border border-orange-300 bg-orange-50/40 p-4 text-base font-semibold leading-7"
                placeholder="Anketör notu: görüşmede dikkat çeken detay, müşterinin tonu, ek açıklama veya yöneticinin bilmesi gereken bilgi..."
                value={anketorNotu}
                onChange={(e) => setAnketorNotu(e.target.value)}
              />

              <button
                type="button"
                onClick={cevapGonder}
                disabled={cevapKaydediliyor || !musteriCevabi.trim()}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-black text-primary-foreground disabled:opacity-60"
              >
                {cevapKaydediliyor ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Cevabı Kaydet ve AI Sonraki Soruyu Üretsin
              </button>

              {sonAiSonuc && (
                <Card className="p-4">
                  <p className="text-sm font-black">Son AI İşlemi</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sonAiSonuc.devam
                      ? `Yeni soru oluşturuldu: ${sonAiSonuc.sonraki_soru_no}/6`
                      : `Anket tamamlandı. Sonuç: ${sonAiSonuc.ai_sonuc || "-"} | Puan: ${sonAiSonuc.ai_puan || "-"}`}
                  </p>
                </Card>
              )}

              <div className="rounded-2xl border p-4">
                <p className="mb-3 text-sm font-black">Anket Akışı</p>
                <div className="space-y-3">
                  {cevaplar.map((cevap) => (
                    <div key={cevap.id} className="rounded-xl bg-muted/30 p-3">
                      <p className="text-xs font-black">Soru {cevap.soru_no}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{cevap.ai_soru}</p>
                      {cevap.musteri_cevabi && (
                        <p className="mt-2 text-xs font-semibold">Cevap: {cevap.musteri_cevabi}</p>
                      )}
                      {cevap.ai_duygu && (
                        <div className="mt-2 flex gap-2">
                          <Badge variant="outline">{cevap.ai_duygu}</Badge>
                          <Badge variant="outline">{cevap.ai_risk_sinyali}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="font-black">Son Anket Sonuçları</h2>
        </div>

        {anketler.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Henüz anket sonucu yok.
          </div>
        ) : (
          <div className="space-y-3">
            {anketler.map((anket) => (
              <div key={anket.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{anket.anket_kodu}</Badge>
                  <Badge variant="outline" className={riskRenk(anket.ai_risk_seviyesi)}>
                    {anket.ai_sonuc || "-"}
                  </Badge>
                  <Badge variant="outline" className={durumRenk(anket.durum)}>
                    {anket.durum || "-"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-black">{anket.musteri_adi || "-"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {anket.musteri_telefon || "-"} • {anket.urun_grubu || "-"} • {tarih(anket.created_at)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{anket.ai_analiz || "-"}</p>
                {anket.gorev_kodu && (
                  <p className="mt-2 text-xs font-bold">Oluşan Görev: {anket.gorev_kodu}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
