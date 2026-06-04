"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  PlusCircle,
  Radio,
  RefreshCw,
  Route,
  Users,
} from "lucide-react"
import { useAiLiveOperations } from "@/components/ai-live-operations/use-ai-live-operations"
import type {
  AiCanliOperasyonDurum,
  AiCanliOperasyonKayit,
  AiCanliOperasyonSeviye,
} from "@/lib/types/ai-live-operations"

const FILTRELER = [
  "Tümü",
  "AI Görev Merkezi",
  "AI Aksiyon Görevi",
  "Yönetici Kararı",
  "Operasyon Riski",
  "Aktif Operasyon",
  "Gecikme Alarmı",
] as const

type FiltreTipi = (typeof FILTRELER)[number]
type GuncellemeDurumu = "acik" | "inceleniyor" | "tamamlandi" | "arsivlendi"

const DURUM_BUTONLARI: { label: string; value: GuncellemeDurumu }[] = [
  { label: "Açık", value: "acik" },
  { label: "İnceleniyor", value: "inceleniyor" },
  { label: "Tamamlandı", value: "tamamlandi" },
  { label: "Arşivlendi", value: "arsivlendi" },
]

function durumEtiketi(durum: AiCanliOperasyonDurum) {
  if (durum === "acik") return "Açık"
  if (durum === "inceleniyor") return "İnceleniyor"
  if (durum === "devam_ediyor") return "Devam Ediyor"
  if (durum === "tamamlandi") return "Tamamlandı"
  if (durum === "gecikti") return "Gecikti"
  if (durum === "arsivlendi") return "Arşivlendi"
  if (durum === "iptal") return "Kapandı / Arşivlendi"
  return "Bekliyor"
}

function durumRenk(durum: AiCanliOperasyonDurum) {
  if (durum === "tamamlandi") return "border-emerald-300 bg-emerald-50 text-emerald-800"
  if (durum === "gecikti") return "border-orange-300 bg-orange-50 text-orange-800"
  if (durum === "inceleniyor") return "border-cyan-300 bg-cyan-50 text-cyan-800"
  if (durum === "arsivlendi" || durum === "iptal") return "border-slate-300 bg-slate-50 text-slate-700"
  if (durum === "acik" || durum === "devam_ediyor") return "border-blue-300 bg-blue-50 text-blue-800"
  return "border-amber-300 bg-amber-50 text-amber-800"
}

function seviyeEtiketi(seviye: AiCanliOperasyonSeviye) {
  if (seviye === "kritik") return "Kritik"
  if (seviye === "riskli") return "Riskli"
  if (seviye === "uyari") return "Uyarı"
  return "Normal"
}

function seviyeRenk(seviye: AiCanliOperasyonSeviye) {
  if (seviye === "kritik") return "border-red-300 bg-red-50 text-red-800"
  if (seviye === "riskli") return "border-orange-300 bg-orange-50 text-orange-800"
  if (seviye === "uyari") return "border-amber-300 bg-amber-50 text-amber-800"
  return "border-emerald-300 bg-emerald-50 text-emerald-800"
}

function kayitTipiRenk(kayitTipi: string) {
  const text = kayitTipi.toLocaleLowerCase("tr-TR")
  if (text.includes("görev") || text.includes("gorev")) return "border-indigo-200 bg-indigo-50 text-indigo-800"
  if (text.includes("aksiyon")) return "border-cyan-200 bg-cyan-50 text-cyan-800"
  if (text.includes("risk")) return "border-red-200 bg-red-50 text-red-800"
  if (text.includes("gecikme")) return "border-orange-200 bg-orange-50 text-orange-800"
  if (text.includes("karar")) return "border-purple-200 bg-purple-50 text-purple-800"
  if (text.includes("aktif")) return "border-blue-200 bg-blue-50 text-blue-800"
  return "border-border bg-muted text-muted-foreground"
}

function formatDateTime(value: string | null) {
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

function seviyeSirasi(seviye: AiCanliOperasyonSeviye) {
  if (seviye === "kritik") return 1
  if (seviye === "riskli") return 2
  if (seviye === "uyari") return 3
  return 4
}

function tarihDegeri(value: string | null) {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function kayitlariSirala(kayitlar: AiCanliOperasyonKayit[]) {
  return [...kayitlar].sort((a, b) => {
    const seviyeFarki = seviyeSirasi(a.seviye) - seviyeSirasi(b.seviye)
    if (seviyeFarki !== 0) return seviyeFarki
    return tarihDegeri(b.created_at) - tarihDegeri(a.created_at)
  })
}

function filtreSayisi(kayitlar: AiCanliOperasyonKayit[], filtre: FiltreTipi) {
  if (filtre === "Tümü") return kayitlar.length
  return kayitlar.filter((kayit) => kayit.kayit_tipi === filtre).length
}

function kayitlariFiltrele(kayitlar: AiCanliOperasyonKayit[], filtre: FiltreTipi) {
  if (filtre === "Tümü") return kayitlar
  return kayitlar.filter((kayit) => kayit.kayit_tipi === filtre)
}

export default function AiCanliOperasyonMerkeziPage() {
  const {
    veri,
    loading,
    error,
    sonGuncelleme,
    guncellenenKayitId,
    gorevOlusturulanKayitId,
    sonIslemMesaji,
    verileriYenile,
    gorevDurumuGuncelle,
    canliOperasyondanGorevOlustur,
  } = useAiLiveOperations()

  const [aktifFiltre, setAktifFiltre] = useState<FiltreTipi>("Tümü")

  const siraliKayitlar = useMemo(() => kayitlariSirala(veri.kayitlar), [veri.kayitlar])

  const gosterilecekKayitlar = useMemo(() => {
    return kayitlariFiltrele(siraliKayitlar, aktifFiltre)
  }, [siraliKayitlar, aktifFiltre])

  const kpiListesi = [
    {
      baslik: "Aktif Görev",
      deger: veri.kpi.aktifGorev,
      aciklama: "Tamamlanmamış açık operasyon kayıtları",
      icon: Activity,
    },
    {
      baslik: "Sahadaki Ekip",
      deger: veri.kpi.sahadakiEkip,
      aciklama: "Devam eden işlerde görünen ekip/personel",
      icon: Users,
    },
    {
      baslik: "Riskli İş",
      deger: veri.kpi.riskliIs,
      aciklama: "Riskli veya kritik seviyedeki kayıtlar",
      icon: AlertTriangle,
    },
    {
      baslik: "Tamamlanan",
      deger: veri.kpi.tamamlanan,
      aciklama: "Tamamlandı/çözüldü durumundaki kayıtlar",
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            AI Canlı Operasyon Merkezi
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Canlı saha operasyonları, riskler, gecikmeler ve AI yönetici kararları
            bu merkezden takip edilir. Riskli kayıtlar tek tuşla AI Görev Merkezi’ne
            görev olarak aktarılabilir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="w-fit border-emerald-300 bg-emerald-50 text-emerald-800">
            Gerçek Veri Bağlandı
          </Badge>

          <button
            type="button"
            onClick={verileriYenile}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Yenile
          </button>
        </div>
      </div>

      {sonIslemMesaji && (
        <Card className="border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          {sonIslemMesaji}
        </Card>
      )}

      {(error || veri.uyarilar.length > 0) && (
        <Card className="border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-black text-amber-900">
                Bazı AI canlı operasyon verileri okunamadı
              </p>

              {error && <p className="mt-1 text-xs text-amber-800">{error}</p>}

              {veri.uyarilar.map((uyari, index) => (
                <p key={`${uyari}-${index}`} className="mt-1 text-xs text-amber-800">
                  {uyari}
                </p>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiListesi.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.baslik} className="border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {item.baslik}
                  </p>
                  <p className="mt-2 text-3xl font-black text-foreground">
                    {item.deger}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.aciklama}
                  </p>
                </div>

                <div className="rounded-2xl bg-primary/10 p-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border p-5 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-black text-foreground">
                Canlı Operasyon Akışı
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Kritik ve riskli kayıtlar otomatik olarak üstte listelenir. Son
                güncelleme:{" "}
                {sonGuncelleme ? sonGuncelleme.toLocaleTimeString("tr-TR") : "-"}
              </p>
            </div>

            <Badge variant="outline" className="w-fit border-border">
              {loading ? "Veri Okunuyor" : `${gosterilecekKayitlar.length} kayıt`}
            </Badge>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {FILTRELER.map((filtre) => {
              const aktif = aktifFiltre === filtre
              const adet = filtreSayisi(siraliKayitlar, filtre)

              return (
                <button
                  key={filtre}
                  type="button"
                  onClick={() => setAktifFiltre(filtre)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    aktif
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {filtre} ({adet})
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Veriler okunuyor...
              </div>
            </div>
          ) : gosterilecekKayitlar.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Radio className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-bold text-foreground">
                Bu filtrede kayıt yok
              </p>
              <p className="mx-auto mt-1 max-w-xl text-xs text-muted-foreground">
                Farklı bir filtre seçebilir veya Yenile butonuyla verileri tekrar
                okuyabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gosterilecekKayitlar.map((kayit) => {
                const isGorevKaydi = kayit.kayit_tipi === "AI Görev Merkezi"
                const isUpdating = guncellenenKayitId === kayit.id
                const isGorevOlusturuluyor = gorevOlusturulanKayitId === kayit.id
                const gorevOlusturulabilir = !isGorevKaydi

                return (
                  <div
                    key={kayit.id}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={kayitTipiRenk(kayit.kayit_tipi)}
                          >
                            {kayit.kayit_tipi}
                          </Badge>

                          <Badge variant="outline" className={durumRenk(kayit.durum)}>
                            {durumEtiketi(kayit.durum)}
                          </Badge>

                          <Badge variant="outline" className={seviyeRenk(kayit.seviye)}>
                            {seviyeEtiketi(kayit.seviye)}
                          </Badge>
                        </div>

                        <h3 className="mt-3 text-sm font-black text-foreground">
                          {kayit.baslik}
                        </h3>

                        {kayit.aciklama && (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {kayit.aciklama}
                          </p>
                        )}
                      </div>

                      {gorevOlusturulabilir && (
                        <button
                          type="button"
                          disabled={isGorevOlusturuluyor}
                          onClick={() => void canliOperasyondanGorevOlustur(kayit)}
                          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isGorevOlusturuluyor ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PlusCircle className="h-3.5 w-3.5" />
                          )}
                          AI Görevi Oluştur
                        </button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-muted/30 p-3">
                        <p className="text-[11px] font-bold text-muted-foreground">
                          Personel
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {kayit.personel_adi || "-"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {kayit.personel_kodu || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/30 p-3">
                        <p className="text-[11px] font-bold text-muted-foreground">
                          Adres / Bölge
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-foreground">
                          {kayit.gorev_adresi || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/30 p-3">
                        <p className="text-[11px] font-bold text-muted-foreground">
                          Planlanan Başlangıç
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {formatDateTime(kayit.planlanan_baslangic)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/30 p-3">
                        <p className="text-[11px] font-bold text-muted-foreground">
                          Oluşturulma
                        </p>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {formatDateTime(kayit.created_at)}
                        </p>
                      </div>
                    </div>

                    {isGorevKaydi && (
                      <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                          Görev Durumu Güncelle
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {DURUM_BUTONLARI.map((buton) => (
                            <button
                              key={buton.value}
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                void gorevDurumuGuncelle(kayit.id, buton.value)
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              {buton.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="border-border p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-base font-black text-foreground">
              Mimari Kontrol
            </h2>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Page → Hook → Service → Type yapısı aktif.</p>
            <p>Veri kaynağı: v_ai_canli_operasyon_merkezi.</p>
            <p>AI Görev Merkezi kayıtlarında durum güncelleme aktif.</p>
            <p>Canlı operasyon kayıtlarından tek tuşla AI görevi oluşturma aktif.</p>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <Route className="h-4 w-4 text-primary" />
              <span>Risk, rota ve gecikme motorları sonraki fazda bağlanacak.</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <Clock className="h-4 w-4 text-primary" />
              <span>Görev süresi aşımı ve SLA kontrolü sıradaki çekirdek iş.</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
