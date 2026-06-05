"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle2, Loader2, RefreshCw } from "lucide-react"

type Kayit = Record<string, any>

function metin(value: any) {
  return String(value || "").trim()
}

function tarih(value: any) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("tr-TR")
}

function riskRenk(value: any) {
  const v = metin(value).toLocaleLowerCase("tr-TR")
  if (v.includes("kritik")) return "border-red-400 bg-red-50 text-red-900"
  if (v.includes("risk") || v.includes("yüksek")) return "border-orange-400 bg-orange-50 text-orange-900"
  return "border-yellow-400 bg-yellow-50 text-yellow-900"
}

export default function YoneticiBildirimleriPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [islemId, setIslemId] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [kayitlar, setKayitlar] = useState<Kayit[]>([])

  const aciklar = useMemo(
    () => kayitlar.filter((k) => !["tamamlandi", "kapandi", "arsivlendi"].includes(metin(k.durum))),
    [kayitlar],
  )

  const tamamlananlar = useMemo(
    () => kayitlar.filter((k) => ["tamamlandi", "kapandi", "arsivlendi"].includes(metin(k.durum))),
    [kayitlar],
  )

  const verileriGetir = useCallback(async () => {
    setLoading(true)
    setHata(null)

    const { data, error } = await supabase
      .from("yonetici_bildirimleri")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80)

    if (error) {
      setHata(error.message)
      setKayitlar([])
    } else {
      setKayitlar(data || [])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void verileriGetir()
  }, [verileriGetir])

  async function aiGorevOlustur(id: string) {
    setIslemId(id)
    setHata(null)
    setBilgi(null)

    const { data, error } = await supabase.rpc("yonetici_bildiriminden_ai_gorev_olustur", {
      p_bildirim_id: id,
    })

    if (error || data?.success === false) {
      setHata(error?.message || data?.error || "AI görev oluşturulamadı.")
      setIslemId(null)
      return
    }

    setBilgi(`AI görev oluşturuldu: ${data?.gorev_kodu || ""}`)
    await verileriGetir()
    setIslemId(null)
  }

  async function durumGuncelle(id: string, durum: string) {
    setIslemId(id)
    setHata(null)
    setBilgi(null)

    const updateData: Kayit = {
      durum,
      updated_at: new Date().toISOString(),
    }

    if (durum === "tamamlandi" || durum === "kapandi") {
      updateData.kapatildi_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from("yonetici_bildirimleri")
      .update(updateData)
      .eq("id", id)

    if (error) {
      setHata(error.message)
      setIslemId(null)
      return
    }

    setBilgi("Bildirim durumu güncellendi.")
    await verileriGetir()
    setIslemId(null)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Yönetici Bildirimleri</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Anket, AI ve operasyon modüllerinden yönetime iletilen açık takip kayıtları burada izlenir.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void verileriGetir()}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Yenile
        </button>
      </div>

      {hata && <Card className="border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">{hata}</Card>}
      {bilgi && <Card className="border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{bilgi}</Card>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Toplam Bildirim</p>
          <p className="mt-2 text-3xl font-black">{kayitlar.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Açık Takip</p>
          <p className="mt-2 text-3xl font-black text-orange-900">{aciklar.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Tamamlanan</p>
          <p className="mt-2 text-3xl font-black text-emerald-900">{tamamlananlar.length}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-black">Açık Yönetici Takipleri</h2>
          <Badge variant="outline" className="ml-auto">{aciklar.length} açık</Badge>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm font-bold text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Bildirimler okunuyor...
          </div>
        ) : aciklar.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Açık yönetici bildirimi yok.
          </div>
        ) : (
          <div className="space-y-3">
            {aciklar.map((b) => (
              <div key={b.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{b.bildirim_kodu || "-"}</Badge>
                  <Badge variant="outline">{b.kaynak_modul || b.kaynak || "-"}</Badge>
                  <Badge variant="outline" className={riskRenk(b.risk_seviyesi || b.oncelik || b.seviye)}>
                    {b.risk_seviyesi || b.oncelik || b.seviye || "-"}
                  </Badge>
                  <Badge variant="outline">{b.durum || "-"}</Badge>
                </div>

                <h3 className="mt-3 text-base font-black">{b.baslik || "-"}</h3>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {b.musteri_adi || "-"} • {b.telefon || "-"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Oluşturulma: {tarih(b.created_at)}
                </p>

                {b.mesaj && (
                  <p className="mt-3 whitespace-pre-line rounded-xl border bg-background p-3 text-xs font-semibold leading-5 text-foreground">
                    {b.mesaj}
                  </p>
                )}

                {b.ai_oneri || b.onerilen_aksiyon ? (
                  <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-black text-amber-950">
                    Önerilen Aksiyon: {b.ai_oneri || b.onerilen_aksiyon}
                  </p>
                ) : null}

                {b.yonetici_notu && (
                  <p className="mt-3 rounded-xl border bg-white p-3 text-xs font-semibold">
                    Yönetici Notu: {b.yonetici_notu}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={islemId === b.id || Boolean(b.bagli_gorev_kodu)}
                    onClick={() => void aiGorevOlustur(b.id)}
                    className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                  >
                    {b.bagli_gorev_kodu ? `AI Görev: ${b.bagli_gorev_kodu}` : "AI Görev Oluştur"}
                  </button>

                  <button
                    type="button"
                    disabled={islemId === b.id}
                    onClick={() => void durumGuncelle(b.id, "inceleniyor")}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                  >
                    İncelemeye Al
                  </button>
                  <button
                    type="button"
                    disabled={islemId === b.id}
                    onClick={() => void durumGuncelle(b.id, "tamamlandi")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                  >
                    Tamamlandı
                  </button>
                  <button
                    type="button"
                    disabled={islemId === b.id}
                    onClick={() => void durumGuncelle(b.id, "kapandi")}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h2 className="font-black">Son Tamamlanan Bildirimler</h2>
        </div>

        {tamamlananlar.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Tamamlanan bildirim yok.
          </div>
        ) : (
          <div className="space-y-2">
            {tamamlananlar.slice(0, 10).map((b) => (
              <div key={b.id} className="rounded-xl border p-3 text-sm">
                <span className="font-black">{b.baslik || "-"}</span>
                <span className="ml-2 text-xs text-muted-foreground">{tarih(b.updated_at || b.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
