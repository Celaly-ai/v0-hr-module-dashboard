"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { useAiLiveOperations } from "@/components/ai-live-operations/use-ai-live-operations"

const DURUM_BUTONLARI = [
  { label: "Açık", value: "acik" },
  { label: "İnceleniyor", value: "inceleniyor" },
  { label: "Tamamlandı", value: "tamamlandi" },
  { label: "Arşivlendi", value: "arsivlendi" },
] as const

function tarih(value: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("tr-TR", {
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
  return value
}

export default function AiGorevMerkeziPage() {
  const {
    veri,
    loading,
    error,
    guncellenenKayitId,
    verileriYenile,
    gorevDurumuGuncelle,
  } = useAiLiveOperations()

  const gorevler = useMemo(() => {
    return veri.kayitlar
      .filter((kayit) => kayit.kayit_tipi === "AI Görev Merkezi")
      .sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0
        return bt - at
      })
  }, [veri.kayitlar])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            AI Görev Merkezi
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            AI tarafından oluşturulan görevler burada izlenir ve durumları güncellenir.
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Toplam Görev</p>
          <p className="mt-2 text-3xl font-black">{gorevler.length}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Açık / İnceleniyor</p>
          <p className="mt-2 text-3xl font-black">
            {gorevler.filter((g) => g.durum !== "tamamlandi" && g.durum !== "arsivlendi").length}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Tamamlanan</p>
          <p className="mt-2 text-3xl font-black">
            {gorevler.filter((g) => g.durum === "tamamlandi").length}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-black">Görev Listesi</h2>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm font-bold text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Görevler okunuyor...
          </div>
        ) : gorevler.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            AI görev kaydı bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            {gorevler.map((gorev) => {
              const isUpdating = guncellenenKayitId === gorev.id

              return (
                <div key={gorev.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">AI Görev Merkezi</Badge>
                    <Badge variant="outline">{durumEtiketi(gorev.durum)}</Badge>
                    <Badge variant="outline">{gorev.seviye}</Badge>
                  </div>

                  <h3 className="mt-3 text-sm font-black">{gorev.baslik}</h3>

                  {gorev.aciklama && (
                    <p className="mt-2 whitespace-pre-line text-xs leading-5 text-muted-foreground">
                      {gorev.aciklama}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-[11px] font-bold text-muted-foreground">Personel</p>
                      <p className="mt-1 text-xs font-semibold">{gorev.personel_adi || "-"}</p>
                      <p className="text-[11px] text-muted-foreground">{gorev.personel_kodu || "-"}</p>
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
                      <Clock className="h-3.5 w-3.5" />
                      Görev Durumu
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {DURUM_BUTONLARI.map((buton) => (
                        <button
                          key={buton.value}
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void gorevDurumuGuncelle(gorev.id, buton.value)}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-60"
                        >
                          {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {buton.label}
                        </button>
                      ))}
                    </div>
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