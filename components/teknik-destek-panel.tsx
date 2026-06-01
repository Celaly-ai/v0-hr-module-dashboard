"use client"

import { useRef, useState, type RefObject, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { Upload, Package, AlertTriangle, Clock, CheckCircle, Loader2 } from "lucide-react"

type GS = {
  tablo: string
  sayi: number
  zaman: string
  durum: "basarili" | "hata"
}

export function TeknikDestekPanel() {
  const [sek, setSek] = useState("urunler")
  const [yukl, setYukl] = useState(false)
  const [sonuc, setSonuc] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [gecmis, setGecmis] = useState<GS[]>([])

  const r1 = useRef<HTMLInputElement>(null)
  const r2 = useRef<HTMLInputElement>(null)
  const r3 = useRef<HTMLInputElement>(null)
  const r4 = useRef<HTMLInputElement>(null)

  const son = gecmis.find((g) => g.tablo === sek)

  const oku = async (file: File): Promise<any[]> => {
    const XLSX = await import("xlsx")

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: "array" })
          const sheetName = wb.SheetNames[0]
          const sheet = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(sheet)
          resolve(rows)
        } catch {
          reject(new Error("Excel okunamadı"))
        }
      }

      reader.onerror = () => reject(new Error("Dosya okunamadı"))
      reader.readAsArrayBuffer(file)
    })
  }

  const yukle = async (file: File, tip: string) => {
    setYukl(true)
    setSonuc(null)
    setHata(null)

    const supabase = createClient()

    try {
      const rows = await oku(file)

      let kayit: any[] = []
      let tablo = ""

      if (tip === "urun") {
        tablo = "urunler"
        kayit = rows
          .map((r: any) => ({
            marka: r["Marka"] || "",
            model: r["Model"] || "",
            model_kodu: r["Model Kodu"] || "",
            barkod: r["Barkod"] || "",
            urun_tipi: r["Ürün Tipi"] || "",
          }))
          .filter((r: any) => r.marka)

        const { error } = await supabase.from(tablo).upsert(kayit, {
          onConflict: "model_kodu",
        })

        if (error) throw error
      }

      if (tip === "komp") {
        tablo = "komponentler"
        kayit = rows
          .map((r: any) => ({
            parca_adi: r["Parça Adı"] || "",
            stok_no: r["Stok No"] || "",
            marka: r["Marka"] || "",
            stok_miktari: Number.parseInt(r["Stok"] || "0"),
            birim_fiyat: Number.parseFloat(r["Fiyat"] || "0"),
            depo_yeri: r["Depo"] || "",
          }))
          .filter((r: any) => r.stok_no)

        const { error } = await supabase.from(tablo).upsert(kayit, {
          onConflict: "stok_no",
        })

        if (error) throw error
      }

      if (tip === "ariza") {
        tablo = "ariza_bilgisi"
        kayit = rows
          .map((r: any) => ({
            marka: r["Marka"] || "",
            model_kodu: r["Model Kodu"] || "",
            ariza_tanimi: r["Arıza"] || "",
            cozum: r["Çözüm"] || "",
          }))
          .filter((r: any) => r.ariza_tanimi)

        const { error } = await supabase.from(tablo).insert(kayit)

        if (error) throw error
      }

      await supabase.from("veri_guncelleme_gecmisi").insert([
        {
          tablo_adi: tablo,
          kayit_sayisi: kayit.length,
          yukleyen: "admin",
        },
      ])

      setSonuc(`${kayit.length} kayıt yüklendi.`)
      setGecmis((p) => [
        {
          tablo: sek,
          sayi: kayit.length,
          zaman: new Date().toLocaleTimeString("tr-TR"),
          durum: "basarili",
        },
        ...p,
      ])
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Yükleme sırasında hata oluştu.")
      setGecmis((p) => [
        {
          tablo: sek,
          sayi: 0,
          zaman: new Date().toLocaleTimeString("tr-TR"),
          durum: "hata",
        },
        ...p,
      ])
    } finally {
      setYukl(false)
    }
  }

  const yukleB = async (file: File) => {
    setYukl(true)
    setSonuc(null)
    setHata(null)

    const supabase = createClient()

    try {
      const path = `bultenler/${Date.now()}_${file.name}`

      const { error } = await supabase.storage.from("teknik-destek").upload(path, file)

      if (error) throw error

      const { data } = supabase.storage.from("teknik-destek").getPublicUrl(path)

      const { error: insertError } = await supabase.from("teknik_bultenler").insert([
        {
          baslik: file.name,
          dosya_url: data.publicUrl,
          dosya_turu: file.name.split(".").pop(),
          yukleyen: "admin",
        },
      ])

      if (insertError) throw insertError

      setSonuc("Bülten yüklendi.")
      setGecmis((p) => [
        {
          tablo: "bultenler",
          sayi: 1,
          zaman: new Date().toLocaleTimeString("tr-TR"),
          durum: "basarili",
        },
        ...p,
      ])
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Bülten yüklenemedi.")
    } finally {
      setYukl(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Teknik Destek — Veri Yönetimi</h2>
          <p className="text-sm text-muted-foreground">
            Her gün sonu ARON verilerini bu alandan yükleyin.
          </p>
        </div>

        {son && (
          <div className="inline-flex items-center rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Son: {son.zaman}
          </div>
        )}
      </div>

      {sonuc && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500 flex gap-2">
          <CheckCircle className="h-4 w-4" />
          {sonuc}
        </div>
      )}

      {hata && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 flex gap-2">
          <AlertTriangle className="h-4 w-4" />
          {hata}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-card p-2">
        <TabButton active={sek === "urunler"} onClick={() => setSek("urunler")}>
          📦 Ürünler
        </TabButton>
        <TabButton active={sek === "komponentler"} onClick={() => setSek("komponentler")}>
          🔩 Stok
        </TabButton>
        <TabButton active={sek === "arizalar"} onClick={() => setSek("arizalar")}>
          ⚠️ Arızalar
        </TabButton>
        <TabButton active={sek === "bultenler"} onClick={() => setSek("bultenler")}>
          📄 Bültenler
        </TabButton>
      </div>

      {sek === "urunler" && (
        <UploadBox
          title="Ürün Listesi"
          label="Excel seçin"
          sub="Marka | Model | Model Kodu | Barkod | Ürün Tipi"
          inputRef={r1}
          accept=".xlsx,.xls"
          loading={yukl}
          onFile={(f) => yukle(f, "urun")}
        />
      )}

      {sek === "komponentler" && (
        <UploadBox
          title="Stok Listesi"
          label="Excel seçin"
          sub="Parça Adı | Stok No | Marka | Stok | Fiyat | Depo"
          inputRef={r2}
          accept=".xlsx,.xls"
          loading={yukl}
          onFile={(f) => yukle(f, "komp")}
        />
      )}

      {sek === "arizalar" && (
        <UploadBox
          title="Arıza Bilgi Bankası"
          label="Excel seçin"
          sub="Marka | Model Kodu | Arıza | Çözüm"
          inputRef={r3}
          accept=".xlsx,.xls"
          loading={yukl}
          onFile={(f) => yukle(f, "ariza")}
        />
      )}

      {sek === "bultenler" && (
        <UploadBox
          title="Teknik Bülten"
          label="PDF veya görsel seçin"
          sub="Kılavuz, bülten, şema"
          inputRef={r4}
          accept=".pdf,.jpg,.jpeg,.png"
          loading={yukl}
          onFile={yukleB}
        />
      )}

      {gecmis.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h3 className="text-base font-semibold text-foreground">Geçmiş</h3>
          </div>

          <div className="p-4 space-y-2">
            {gecmis.map((g, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div className="flex gap-2 items-center">
                  {g.durum === "basarili" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span>{g.tablo}</span>
                  {g.sayi > 0 && (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                      {g.sayi}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">{g.zaman}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  )
}

function UploadBox({
  title,
  label,
  sub,
  inputRef,
  accept,
  loading,
  onFile,
}: {
  title: string
  label: string
  sub: string
  inputRef: RefObject<HTMLInputElement | null>
  accept: string
  loading: boolean
  onFile: (file: File) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>

      <div className="p-6">
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
          <Package className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
              e.target.value = ""
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Yükle
          </button>
        </div>
      </div>
    </div>
  )
}
