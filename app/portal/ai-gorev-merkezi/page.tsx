"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import { useAiLiveOperations } from "@/components/ai-live-operations/use-ai-live-operations"
import type { AiCanliOperasyonKayit } from "@/lib/types/ai-live-operations"

type GuncellemeDurumu = "acik" | "inceleniyor" | "tamamlandi" | "arsivlendi"

type GorevFiltresi =
  | "tum"
  | "acik"
  | "inceleniyor"
  | "tamamlandi"
  | "atanmamis"
  | "kritik"
  | "riskli"

const DURUM_BUTONLARI: { label: string; value: GuncellemeDurumu }[] = [
  { label: "Açık", value: "acik" },
  { label: "İnceleniyor", value: "inceleniyor" },
  { label: "Tamamlandı", value: "tamamlandi" },
  { label: "Arşivlendi", value: "arsivlendi" },
]

const FILTRELER: { label: string; value: GorevFiltresi }[] = [
  { label: "Tümü", value: "tum" },
  { label: "Açık", value: "acik" },
  { label: "İnceleniyor", value: "inceleniyor" },
  { label: "Tamamlandı", value: "tamamlandi" },
  { label: "Atanmamış", value: "atanmamis" },
  { label: "Kritik", value: "kritik" },
  { label: "Riskli", value: "riskli" },
]

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

function durumEtiketi(value: string) {
  if (value === "acik") return "Açık"
  if (value === "inceleniyor") return "İnceleniyor"
  if (value === "tamamlandi") return "Tamamlandı"
  if (value === "arsivlendi") return "Arşivlendi"
  if (value === "devam_ediyor") return "Devam Ediyor"
  if (value === "gecikti") return "Gecikti"
  if (value === "iptal") return "İptal"
  if (value === "bekliyor") return "Bekliyor"
  return value
}

function seviyeEtiketi(value: string) {
  if (value === "kritik") return "Kritik"
  if (value === "riskli") return "Riskli"
  if (value === "uyari") return "Uyarı"
  if (value === "normal") return "Normal"
  return value
}

function islemEtiketi(value: string) {
  if (value === "PERSONEL_ATAMA") return "Personel Atama"
  if (value === "DURUM_GUNCELLEME") return "Durum Güncelleme"
  if (value === "GOREV_OLUSTURMA") return "Görev Oluşturma"
  return value
}

function tarihSirala(value: string | null) {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function gorevEslesir(gorev: AiCanliOperasyonKayit, filtre: GorevFiltresi, arama: string) {
  const aramaMetni = arama.toLocaleLowerCase("tr-TR").trim()
  const metin = [
    gorev.id,
    gorev.baslik,
    gorev.aciklama,
    gorev.personel_adi,
    gorev.personel_kodu,
    gorev.durum,
    gorev.seviye,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR")

  const aramaUyar = !aramaMetni || metin.includes(aramaMetni)

  if (!aramaUyar) return false
  if (filtre === "tum") return true
  if (filtre === "atanmamis") return !gorev.personel_kodu
  if (filtre === "kritik") return gorev.seviye === "kritik"
  if (filtre === "riskli") return gorev.seviye === "riskli"
  return gorev.durum === filtre
}

export default function AiGorevMerkeziPage() {
  const {
    veri,
    loading,
    error,
    guncellenenKayitId,
    atanabilirPersoneller,
    atanabilirPersonellerLoading,
    onerilenPersoneller,
    onerilenPersonellerLoading,
    gorevGecmisleri,
    gorevGecmisiLoadingId,
    verileriYenile,
    gorevGecmisiGetir,
    gorevDurumuGuncelle,
    gorevPersonelAta,
  } = useAiLiveOperations()

  const [seciliPersoneller, setSeciliPersoneller] = useState<Record<string, string>>({})
  const [acikGecmisler, setAcikGecmisler] = useState<Record<string, boolean>>({})
  const [aktifFiltre, setAktifFiltre] = useState<GorevFiltresi>("tum")
  const [arama, setArama] = useState("")
  const [lokalBilgi, setLokalBilgi] = useState<string | null>(null)
  const [lokalHata, setLokalHata] = useState<string | null>(null)
  const [takipNotlari, setTakipNotlari] = useState<Record<string, string>>({})

  const gorevler = useMemo<AiCanliOperasyonKayit[]>(() => {
    return veri.kayitlar
      .filter((kayit: AiCanliOperasyonKayit) => kayit.kayit_tipi === "AI Görev Merkezi")
      .sort((a: AiCanliOperasyonKayit, b: AiCanliOperasyonKayit) => {
        return tarihSirala(b.created_at) - tarihSirala(a.created_at)
      })
  }, [veri.kayitlar])

  const filtreliGorevler = useMemo(() => {
    return gorevler.filter((gorev) => gorevEslesir(gorev, aktifFiltre, arama))
  }, [gorevler, aktifFiltre, arama])

  const toplamGorevSayisi = gorevler.length
  const acikGorevSayisi = gorevler.filter(
    (gorev) => gorev.durum !== "tamamlandi" && gorev.durum !== "arsivlendi",
  ).length
  const tamamlananGorevSayisi = gorevler.filter((gorev) => gorev.durum === "tamamlandi").length
  const kritikGorevSayisi = gorevler.filter((gorev) => gorev.seviye === "kritik").length
  const atanmamisGorevSayisi = gorevler.filter((gorev) => !gorev.personel_kodu).length
  const kritiklikOrani =
    toplamGorevSayisi > 0 ? Math.round((kritikGorevSayisi / toplamGorevSayisi) * 100) : 0

  async function durumDegistir(kayitId: string, yeniDurum: GuncellemeDurumu) {
    setLokalBilgi(null)
    setLokalHata(null)

    const not = takipNotlari[kayitId] || ""
    const basarili = await gorevDurumuGuncelle(kayitId, yeniDurum, not)

    if (!basarili) {
      setLokalHata("Görev durumu güncellenemedi. Üstte sistem hatası varsa kontrol edin.")
      return
    }

    setTakipNotlari((onceki) => ({
      ...onceki,
      [kayitId]: "",
    }))
    setLokalBilgi(`Görev durumu güncellendi: ${durumEtiketi(yeniDurum)}`)
  }

  async function personelAta(kayitId: string) {
    const personelKodu = seciliPersoneller[kayitId] || ""
    const basarili = await gorevPersonelAta(kayitId, personelKodu)

    if (basarili) {
      setSeciliPersoneller((onceki) => ({
        ...onceki,
        [kayitId]: "",
      }))
    }
  }

  async function gecmisiAcKapat(kayitId: string) {
    const acikMi = Boolean(acikGecmisler[kayitId])

    setAcikGecmisler((onceki) => ({
      ...onceki,
      [kayitId]: !acikMi,
    }))

    if (!acikMi && !gorevGecmisleri[kayitId]) {
      await gorevGecmisiGetir(kayitId)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            AI Görev Merkezi
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            AI tarafından oluşturulan görevler burada izlenir, güncellenir,
            personele atanır, filtrelenir ve görev geçmişiyle takip edilir.
          </p>
        </div>

        <button
          type="button"
          onClick={verileriYenile}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Yenile
        </button>
      </div>

      {error && (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          {error}
        </Card>
      )}

      {lokalHata && (
        <Card className="border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
          {lokalHata}
        </Card>
      )}

      {lokalBilgi && (
        <Card className="border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          {lokalBilgi}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Toplam Görev</p>
          <p className="mt-2 text-3xl font-black">{toplamGorevSayisi}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Açık Görev</p>
          <p className="mt-2 text-3xl font-black">{acikGorevSayisi}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Kritik Görev</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-black">
            {kritikGorevSayisi}
            {kritikGorevSayisi > 0 && <AlertTriangle className="h-5 w-5 text-red-600" />}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Atanmamış</p>
          <p className="mt-2 text-3xl font-black">{atanmamisGorevSayisi}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Kritiklik Oranı</p>
          <p className="mt-2 text-3xl font-black">%{kritiklikOrani}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-black">Görev Listesi</h2>
          <Badge variant="outline" className="ml-auto">
            {filtreliGorevler.length} / {gorevler.length} kayıt
          </Badge>
        </div>

        <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_2fr]">
          <div className="flex flex-wrap gap-2">
            {FILTRELER.map((filtre) => {
              const aktif = aktifFiltre === filtre.value

              return (
                <button
                  key={filtre.value}
                  type="button"
                  onClick={() => setAktifFiltre(filtre.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    aktif
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {filtre.label}
                </button>
              )
            })}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={arama}
              onChange={(event) => setArama(event.target.value)}
              placeholder="Görev, personel, kod, açıklama veya durum ara..."
              className="min-h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs font-semibold outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm font-bold text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Görevler okunuyor...
          </div>
        ) : filtreliGorevler.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Bu filtre veya arama için görev kaydı bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            {filtreliGorevler.map((gorev: AiCanliOperasyonKayit) => {
              const isUpdating = guncellenenKayitId === gorev.id
              const seciliPersonel = seciliPersoneller[gorev.id] || ""
              const atanmis = Boolean(gorev.personel_kodu)
              const gecmisAcik = Boolean(acikGecmisler[gorev.id])
              const gecmis = gorevGecmisleri[gorev.id] || []
              const gecmisLoading = gorevGecmisiLoadingId === gorev.id

              return (
                <div key={gorev.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">AI Görev Merkezi</Badge>
                    <Badge variant="outline">{durumEtiketi(gorev.durum)}</Badge>

                    {gorev.seviye === "kritik" ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                        Kritik Görev
                      </span>
                    ) : gorev.seviye === "riskli" ? (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">
                        Riskli Görev
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                        Normal Görev
                      </span>
                    )}
                    {atanmis ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                        Atandı: {gorev.personel_kodu}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                        Atama Bekliyor
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-sm font-black">{gorev.baslik}</h3>


                  {gorev.aciklama && (
                    <p className="mt-2 whitespace-pre-line text-xs leading-5 text-muted-foreground">
                      {gorev.aciklama}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-[11px] font-bold text-muted-foreground">
                        Sorumlu Personel
                      </p>

                      {atanmis ? (
                        <>
                          <div className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                            Atandı
                          </div>
                          <p className="mt-2 text-xs font-semibold">
                            {gorev.personel_adi || "-"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {gorev.personel_kodu || "-"}
                          </p>
                        </>
                      ) : (
                        <div className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                          Atama Bekliyor
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-[11px] font-bold text-muted-foreground">Planlanan</p>
                      <p className="mt-1 text-xs font-semibold">{tarih(gorev.planlanan_baslangic)}</p>
                    </div>

                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-[11px] font-bold text-muted-foreground">Oluşturulma</p>
                      <p className="mt-1 text-xs font-semibold">{tarih(gorev.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5" />
                      AI Önerilen Personeller
                    </p>

                    {onerilenPersonellerLoading ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        AI personel önerileri okunuyor...
                      </div>
                    ) : onerilenPersoneller.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                        AI önerilen personel bulunamadı.
                      </div>
                    ) : (
                      <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {onerilenPersoneller.map((personel, index) => (
                          <div
                            key={`${gorev.id}-${personel.personel_kodu}`}
                            className="rounded-lg border border-border bg-background p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black">
                                {index + 1}. {personel.personel_adi}
                              </p>
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">
                                {personel.ai_oncelik ?? "-"}
                              </span>
                            </div>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {personel.personel_kodu}
                            </p>

                            <div className="mt-2">
                              {String(personel.ai_aciklama || "").toLocaleLowerCase("tr-TR").includes("önerilir") ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">
                                  Güçlü Aday
                                </span>
                              ) : String(personel.ai_aciklama || "").toLocaleLowerCase("tr-TR").includes("dikkatli") ? (
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">
                                  Dikkatli Ata
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                                  Standart Aday
                                </span>
                              )}
                            </div>

                            {personel.ai_aciklama && (
                              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                                {personel.ai_aciklama}
                              </p>
                            )}

                            <button
                              type="button"
                              disabled={isUpdating || !personel.atanabilir}
                              onClick={() => void gorevPersonelAta(gorev.id, personel.personel_kodu)}
                              className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
                            >
                              {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Bu Personeli Ata
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mb-2 mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5" />
                      Manuel Personel Ata
                    </p>

                    <div className="flex flex-col gap-2 md:flex-row">
                      <select
                        value={seciliPersonel}
                        disabled={isUpdating || atanabilirPersonellerLoading}
                        onChange={(event) =>
                          setSeciliPersoneller((onceki) => ({
                            ...onceki,
                            [gorev.id]: event.target.value,
                          }))
                        }
                        className="min-h-9 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none disabled:opacity-60"
                      >
                        <option value="">
                          {atanabilirPersonellerLoading
                            ? "Personeller yükleniyor..."
                            : "Personel seçin"}
                        </option>

                        {atanabilirPersoneller.map((personel) => (
                          <option key={personel.personel_kodu} value={personel.personel_kodu}>
                            {personel.personel_kodu} - {personel.ad_soyad}
                            {personel.rol ? ` (${personel.rol})` : ""}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={isUpdating || !seciliPersonel}
                        onClick={() => void personelAta(gorev.id)}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-60"
                      >
                        {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Ata
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Görev Durumu ve Takip Notu
                    </p>

                    <textarea
                      value={takipNotlari[gorev.id] || ""}
                      onChange={(event) =>
                        setTakipNotlari((onceki) => ({
                          ...onceki,
                          [gorev.id]: event.target.value,
                        }))
                      }
                      placeholder="Takip notu yazın. Örn: Müşteri arandı, tekrar servis planlanacak, sorun çözüldü..."
                      className="mb-3 min-h-20 w-full rounded-lg border border-border bg-background p-3 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                    />

                    <div className="flex flex-wrap gap-2">
                      {DURUM_BUTONLARI.map((buton) => (
                        <button
                          key={buton.value}
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void durumDegistir(gorev.id, buton.value)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
                        >
                          {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {buton.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                        <History className="h-3.5 w-3.5" />
                        Görev Geçmişi
                      </p>

                      <button
                        type="button"
                        onClick={() => void gecmisiAcKapat(gorev.id)}
                        disabled={gecmisLoading}
                        className="inline-flex min-h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
                      >
                        {gecmisLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {gecmisAcik ? "Geçmişi Gizle" : "Geçmişi Göster"}
                      </button>
                    </div>

                    {gecmisAcik && (
                      <div className="mt-3 space-y-2">
                        {gecmisLoading ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Görev geçmişi okunuyor...
                          </div>
                        ) : gecmis.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                            Bu görev için geçmiş kaydı bulunamadı.
                          </div>
                        ) : (
                          gecmis.map((item) => (
                            <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-800">
                                  {islemEtiketi(item.islem_tipi)}
                                </span>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                  {tarih(item.created_at)}
                                </span>
                              </div>

                              <p className="mt-2 text-xs font-semibold">
                                {item.eski_deger || "-"} → {item.yeni_deger || "-"}
                              </p>

                              {item.aciklama && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.aciklama}
                                </p>
                              )}

                              {(item.yapan_personel_adi || item.yapan_personel_kodu) && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  İşlem yapan: {item.yapan_personel_adi || "-"}{" "}
                                  {item.yapan_personel_kodu ? `(${item.yapan_personel_kodu})` : ""}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
