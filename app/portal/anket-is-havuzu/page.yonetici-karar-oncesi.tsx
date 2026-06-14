"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react"

type Kayit = Record<string, any>

const BOS_FORM = {
  musteri_adi: "",
  fis_numarasi: "",
  telefon: "",
  basvuru_nedeni: "",
  teknisyen_kodu: "",
  teknisyen_adi: "",
  marka: "",
  urun_grubu: "",
  model: "",
  yapilan_hizmet_kodu: "",
  hizmet_aciklama: "",
  anketor_notu: "",
}

function metin(value: any) {
  return String(value || "").trim()
}

function tarih(value: any) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function durumEtiket(value: any) {
  const d = metin(value) || "bekliyor"
  if (d === "tamamlandi") return "Tamamlandı"
  if (d === "devam_ediyor") return "Devam Ediyor"
  if (d === "ulasilamadi") return "Ulaşılamadı"
  if (d === "iptal") return "İptal"
  return "Bekliyor"
}

function durumClass(value: any) {
  const d = metin(value)
  if (d === "tamamlandi") return "border-emerald-300 bg-emerald-50 text-emerald-900"
  if (d === "devam_ediyor") return "border-blue-300 bg-blue-50 text-blue-900"
  if (d === "ulasilamadi") return "border-slate-300 bg-slate-50 text-slate-900"
  if (d === "iptal") return "border-red-300 bg-red-50 text-red-900"
  return "border-amber-300 bg-amber-50 text-amber-900"
}

function riskClass(value: any) {
  const r = metin(value).toLocaleLowerCase("tr-TR")
  if (r === "kritik") return "border-red-300 bg-red-50 text-red-900"
  if (r === "riskli") return "border-orange-300 bg-orange-50 text-orange-900"
  if (r === "izleme") return "border-amber-300 bg-amber-50 text-amber-900"
  return "border-emerald-300 bg-emerald-50 text-emerald-900"
}

export default function AnketIsHavuzuPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [form, setForm] = useState(BOS_FORM)
  const [isler, setIsler] = useState<Kayit[]>([])
  const [anketler, setAnketler] = useState<Kayit[]>([])
  const [arama, setArama] = useState("")
  const [durumFiltre, setDurumFiltre] = useState("")

  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [hata, setHata] = useState("")
  const [bilgi, setBilgi] = useState("")

  const verileriGetir = useCallback(async () => {
    setLoading(true)
    setHata("")
    setBilgi("")

    const [isSonuc, anketSonuc] = await Promise.all([
      supabase
        .from("ai_anket_is_havuzu")
        .select("*")
        .order("id", { ascending: false })
        .limit(200),
      supabase
        .from("ai_anket_kayitlari")
        .select("*")
        .order("id", { ascending: false })
        .limit(100),
    ])

    if (isSonuc.error) {
      setHata("Anket iş havuzu okunamadı: " + isSonuc.error.message)
      setIsler([])
    } else {
      setIsler(isSonuc.data || [])
    }

    if (anketSonuc.error) {
      setAnketler([])
    } else {
      setAnketler(anketSonuc.data || [])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void verileriGetir()
  }, [verileriGetir])

  const ozet = useMemo(() => {
    const bekleyen = isler.filter((i) => ["", "bekliyor"].includes(metin(i.anket_durumu))).length
    const devam = isler.filter((i) => metin(i.anket_durumu) === "devam_ediyor").length
    const tamamlanan = isler.filter((i) => metin(i.anket_durumu) === "tamamlandi").length
    const ulasilamadi = isler.filter((i) => metin(i.anket_durumu) === "ulasilamadi").length
    const kritik = anketler.filter((a) => metin(a.ai_risk_seviyesi).toLocaleLowerCase("tr-TR") === "kritik").length
    const riskli = anketler.filter((a) => metin(a.ai_risk_seviyesi).toLocaleLowerCase("tr-TR") === "riskli").length

    return { bekleyen, devam, tamamlanan, ulasilamadi, kritik, riskli }
  }, [isler, anketler])

  const tekrarAranacaklar = useMemo(() => {
    return anketler.filter((a) => {
      const risk = metin(a.ai_risk_seviyesi).toLocaleLowerCase("tr-TR")
      const sonuc = metin(a.ai_sonuc).toLocaleLowerCase("tr-TR")
      const tekrarDurum = metin(a.tekrar_arama_durumu)

      if (["kapandi", "arandi_sonuc_alindi"].includes(tekrarDurum)) return false

      return (
        a.ai_tekrar_iletisim_gerekli === true ||
        a.ai_tekrar_servis_gerekli === true ||
        ["kritik", "riskli", "izleme"].includes(risk) ||
        ["kritik", "riskli", "izleme"].includes(sonuc)
      )
    })
  }, [anketler])

  const filtreliIsler = useMemo(() => {
    const q = arama.toLocaleLowerCase("tr-TR")

    return isler.filter((i) => {
      const metinAlan = [
        i.is_kodu,
        i.musteri_adi,
        i.fis_numarasi,
        i.telefon,
        i.basvuru_nedeni,
        i.marka,
        i.urun_grubu,
        i.model,
        i.teknisyen_adi,
      ]
        .map((v) => metin(v).toLocaleLowerCase("tr-TR"))
        .join(" ")

      if (q && !metinAlan.includes(q)) return false
      if (durumFiltre && metin(i.anket_durumu) !== durumFiltre) return false

      return true
    })
  }, [isler, arama, durumFiltre])

  function formGuncelle(key: keyof typeof BOS_FORM, value: string) {
    setForm((onceki) => ({ ...onceki, [key]: value }))
  }

  async function isEkle() {
    setHata("")
    setBilgi("")

    if (!form.musteri_adi.trim()) {
      setHata("Müşteri adı zorunludur.")
      return
    }

    if (!form.telefon.trim()) {
      setHata("Telefon zorunludur.")
      return
    }

    setKaydediliyor(true)

    const { data, error } = await supabase.rpc("ai_anket_is_havuzuna_ekle", {
      p_musteri_adi: form.musteri_adi,
      p_fis_numarasi: form.fis_numarasi,
      p_telefon: form.telefon,
      p_basvuru_nedeni: form.basvuru_nedeni,
      p_ilce: "",
      p_mahalle: "",
      p_teknisyen_kodu: form.teknisyen_kodu,
      p_teknisyen_adi: form.teknisyen_adi,
      p_marka: form.marka,
      p_urun_grubu: form.urun_grubu,
      p_model: form.model,
      p_yapilan_hizmet_kodu: form.yapilan_hizmet_kodu,
      p_kullanilan_malzeme_aciklama: "",
      p_teknisyen_notu: form.hizmet_aciklama || form.anketor_notu,
      p_kaynak_tipi: "manuel",
    })

    if (error || data?.success === false) {
      setHata(error?.message || data?.error || "İş havuzuna eklenemedi.")
      setKaydediliyor(false)
      return
    }

    setBilgi("İş anket havuzuna eklendi.")
    setForm(BOS_FORM)
    await verileriGetir()
    setKaydediliyor(false)
  }

  async function excelYukle(file: File | null) {
    if (!file) return

    setExcelYukleniyor(true)
    setHata("")
    setBilgi("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/anket/is-havuzu-excel-yukle", {
        method: "POST",
        body: formData,
      })

      const json = await response.json().catch(() => null)

      if (!response.ok || json?.success === false) {
        setHata(json?.error || "Excel yükleme başarısız oldu.")
        setExcelYukleniyor(false)
        return
      }

      setBilgi(`Excel işlendi. Eklenen kayıt: ${json?.eklenen ?? 0}`)
      await verileriGetir()
    } catch (error: any) {
      setHata(error?.message || "Excel yükleme sırasında hata oluştu.")
    }

    setExcelYukleniyor(false)
  }

  function anketeGit(isKaydi: Kayit) {
    const id = isKaydi?.id
    if (!id) return
    router.push(`/portal/anket?is_havuzu_id=${id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                FeyRoute Anket
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Anket İş Havuzu
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
                Tamamlanan hizmet kayıtlarını anket havuzuna alır. Anketör buradan müşteriyi seçer, anket ekranına geçer ve AI analiz süreci başlar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void verileriGetir()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-black text-slate-900 shadow-sm disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Yenile
            </button>
          </div>
        </div>

        {hata && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-black text-red-900">
            {hata}
          </div>
        )}

        {bilgi && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-black text-emerald-900">
            {bilgi}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi title="Bekleyen" value={ozet.bekleyen} />
          <Kpi title="Devam Eden" value={ozet.devam} />
          <Kpi title="Tamamlanan" value={ozet.tamamlanan} />
          <Kpi title="Ulaşılamadı" value={ozet.ulasilamadi} />
          <Kpi title="Riskli" value={ozet.riskli} tone="orange" />
          <Kpi title="Kritik" value={ozet.kritik} tone="red" />
        </div>

        <div className="rounded-3xl border border-orange-300 bg-orange-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-orange-950">Tekrar Aranacaklar</h2>
              <p className="mt-1 text-xs font-semibold text-orange-900">
                Kritik, riskli, izleme veya tekrar iletişim gerektiren müşteriler.
              </p>
            </div>

            <span className="rounded-full border border-orange-400 bg-white px-4 py-2 text-sm font-black text-orange-950">
              {tekrarAranacaklar.length} kayıt
            </span>
          </div>

          {tekrarAranacaklar.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-orange-300 bg-white/70 p-5 text-center text-sm font-bold text-orange-900">
              Şu an tekrar aranacak müşteri yok.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tekrarAranacaklar.slice(0, 6).map((a) => (
                <div key={a.id} className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    <BadgeText>{a.anket_kodu || "ANKET"}</BadgeText>
                    <BadgeText className={riskClass(a.ai_risk_seviyesi)}>
                      {a.ai_sonuc || a.ai_risk_seviyesi || "Takip"}
                    </BadgeText>
                  </div>

                  <p className="mt-3 text-sm font-black">{a.musteri_adi || "-"}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{a.musteri_telefon || "-"}</p>
                  <p className="mt-2 text-xs font-semibold text-orange-950">
                    {a.ai_onerilen_aksiyon || "Müşteri tekrar aranmalı."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-1">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-700" />
                <h2 className="text-lg font-black">Excel ile İş Havuzu Yükle</h2>
              </div>

              <p className="text-xs font-semibold text-slate-600">
                Tamamlanan servis kayıtlarını Excel veya CSV ile toplu şekilde havuza aktar.
              </p>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={excelYukleniyor}
                onChange={(event) => void excelYukle(event.target.files?.[0] || null)}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold"
              />

              {excelYukleniyor && (
                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excel yükleniyor...
                </div>
              )}
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-black">Tekil İş Ekle</h2>
              </div>

              <div className="space-y-3">
                <input className="field" placeholder="Müşteri adı *" value={form.musteri_adi} onChange={(e) => formGuncelle("musteri_adi", e.target.value)} />
                <input className="field" placeholder="Telefon *" value={form.telefon} onChange={(e) => formGuncelle("telefon", e.target.value)} />
                <input className="field" placeholder="Fiş / Hizmet numarası" value={form.fis_numarasi} onChange={(e) => formGuncelle("fis_numarasi", e.target.value)} />
                <input className="field" placeholder="Başvuru nedeni" value={form.basvuru_nedeni} onChange={(e) => formGuncelle("basvuru_nedeni", e.target.value)} />
                <input className="field" placeholder="Marka" value={form.marka} onChange={(e) => formGuncelle("marka", e.target.value)} />
                <input className="field" placeholder="Ürün grubu" value={form.urun_grubu} onChange={(e) => formGuncelle("urun_grubu", e.target.value)} />
                <input className="field" placeholder="Model" value={form.model} onChange={(e) => formGuncelle("model", e.target.value)} />
                <input className="field" placeholder="Yapılan hizmet kodu" value={form.yapilan_hizmet_kodu} onChange={(e) => formGuncelle("yapilan_hizmet_kodu", e.target.value)} />
                <input className="field" placeholder="Teknisyen kodu" value={form.teknisyen_kodu} onChange={(e) => formGuncelle("teknisyen_kodu", e.target.value)} />
                <input className="field" placeholder="Teknisyen adı" value={form.teknisyen_adi} onChange={(e) => formGuncelle("teknisyen_adi", e.target.value)} />

                <textarea
                  className="field min-h-24"
                  placeholder="Hizmet açıklaması / teknisyen notu"
                  value={form.hizmet_aciklama}
                  onChange={(e) => formGuncelle("hizmet_aciklama", e.target.value)}
                />

                <textarea
                  className="field min-h-24"
                  placeholder="Anketör ön notu"
                  value={form.anketor_notu}
                  onChange={(e) => formGuncelle("anketor_notu", e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => void isEkle()}
                disabled={kaydediliyor}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white disabled:opacity-60"
              >
                {kaydediliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                İş Havuzuna Ekle
              </button>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">Havuz Kayıtları</h2>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Gösterilen: {filtreliIsler.length} / Toplam: {isler.length}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    className="min-h-10 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-bold"
                    placeholder="Ara..."
                    value={arama}
                    onChange={(e) => setArama(e.target.value)}
                  />
                </div>

                <select
                  className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
                  value={durumFiltre}
                  onChange={(e) => setDurumFiltre(e.target.value)}
                >
                  <option value="">Tüm durumlar</option>
                  <option value="bekliyor">Bekliyor</option>
                  <option value="devam_ediyor">Devam ediyor</option>
                  <option value="tamamlandi">Tamamlandı</option>
                  <option value="ulasilamadi">Ulaşılamadı</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center text-sm font-black text-slate-600">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                İş havuzu yükleniyor...
              </div>
            ) : filtreliIsler.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm font-bold text-slate-500">
                Kayıt bulunamadı.
              </div>
            ) : (
              <div className="space-y-3">
                {filtreliIsler.map((i) => (
                  <div key={i.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <BadgeText>{i.is_kodu || `ID-${i.id}`}</BadgeText>
                          <BadgeText className={durumClass(i.anket_durumu)}>
                            {durumEtiket(i.anket_durumu)}
                          </BadgeText>
                          {i.anket_id && <BadgeText>Anket ID: {i.anket_id}</BadgeText>}
                        </div>

                        <p className="mt-3 text-base font-black">{i.musteri_adi || "-"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Tel: {i.telefon || "-"} · Fiş: {i.fis_numarasi || "-"} · {tarih(i.created_at)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          {i.marka || "-"} / {i.urun_grubu || "-"} / {i.model || "-"}
                        </p>
                        {(i.basvuru_nedeni || i.teknisyen_notu) && (
                          <p className="mt-2 text-xs font-semibold text-slate-700">
                            {i.basvuru_nedeni || i.teknisyen_notu}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => anketeGit(i)}
                        className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
                      >
                        Ankete Git
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.75rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: rgb(15 23 42);
        }
      `}</style>
    </div>
  )
}

function Kpi({
  title,
  value,
  tone = "slate",
}: {
  title: string
  value: number
  tone?: "slate" | "orange" | "red"
}) {
  const color =
    tone === "red"
      ? "text-red-900"
      : tone === "orange"
        ? "text-orange-900"
        : "text-slate-950"

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </div>
  )
}

function BadgeText({
  children,
  className = "border-slate-300 bg-slate-50 text-slate-900",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {children}
    </span>
  )
}
