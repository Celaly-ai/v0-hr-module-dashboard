"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BelgeKategoriYonetimi } from "@/components/belge-kategori-yonetimi"


type Belge = {
  id: string
  ad: string
  kategori: string
  dosya_url: string
  dosya_turu: string
  aciklama: string
  yukleme_tarihi: string
  yukleyen: string
}


export function BelgeArsiviSection() {
  const [belgeler, setBelgeler] = useState<Belge[]>([])
  const [kategoriler, setKategoriler] = useState<string[]>(["Tümü"])
  const [loading, setLoading] = useState(true)
  const [aktifKategori, setAktifKategori] = useState("Tümü")
  const [showForm, setShowForm] = useState(false)
  const [showKategori, setShowKategori] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [onizleme, setOnizleme] = useState<Belge | null>(null)
  const dosyaRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    ad: "",
    kategori: "Dekontlar",
    aciklama: "",
    dosya: null as File | null,
  })

  const fetchBelgeler = async () => {
    const supabase = createClient()
    const { data } = await supabase!
      .from("belgeler")
      .select("*")
      .order("yukleme_tarihi", { ascending: false })
    if (data) setBelgeler(data)
  }
    const fetchKategoriler = async () => {
      const supabase = createClient()
      const { data } = await supabase!.from("belge_kategorileri").select("ad").order("created_at")
      if (data) setKategoriler(["Tümü", ...data.map((k: any) => k.ad)])
    }

  useEffect(() => {
    const load = async () => {
      await fetchBelgeler()
            await fetchKategoriler()

      setLoading(false)
    }
    load()
  }, [])

  const handleYukle = async () => {
    if (!form.ad || !form.dosya) {
      setHata("Belge adı ve dosya zorunludur.")
      return
    }
    setYukleniyor(true)
    setHata(null)
    try {
      const supabase = createClient()
      const dosyaAdi = `${Date.now()}_${form.dosya.name}`
      const { error: storageError } = await supabase!.storage
        .from("belgeler")
        .upload(dosyaAdi, form.dosya)
      if (storageError) throw storageError

      const { data: urlData } = supabase!.storage
        .from("belgeler")
        .getPublicUrl(dosyaAdi)

     await supabase!.from("belgeler").insert([{
  ad: form.ad,
  kategori: form.kategori,
  aciklama: form.aciklama,
  dosya_url: urlData.publicUrl,
  dosya_turu: form.dosya.type,
  yukleyen: "Yönetici",
}])
.then(({ error }) => { if (error) { setHata("DB Hatası: " + error.message); setYukleniyor(false); return; } })

      setForm({ ad: "", kategori: "Dekontlar", aciklama: "", dosya: null })
      setShowForm(false)
      await fetchBelgeler()
    } catch {
      setHata("Yükleme başarısız, tekrar deneyin.")
    } finally {
      setYukleniyor(false)
    }
  }

  const handleSil = async (id: string, dosya_url: string) => {
    const supabase = createClient()
    const dosyaAdi = dosya_url.split("/").pop()!
    await supabase!.storage.from("belgeler").remove([dosyaAdi])
    await supabase!.from("belgeler").delete().eq("id", id)
    await fetchBelgeler()
  }

  const filtrelenmis = aktifKategori === "Tümü"
    ? belgeler
    : belgeler.filter((b) => b.kategori === aktifKategori)

  if (loading) return <div className="p-6">Yükleniyor...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Belge Arşivi</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Vazgeç" : "+ Belge Ekle"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowKategori(!showKategori)}>Kategoriler</Button>
      </div>
        {showKategori && <BelgeKategoriYonetimi />}

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Yeni Belge Yükle</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Belge Adı *</label>
              <Input
                placeholder="örn: 2024 Sigorta Poliçesi"
                value={form.ad}
                onChange={(e) => setForm({ ...form, ad: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              >
                {kategoriler.filter((k) => k !== "Tümü").map((k) => (

                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Açıklama</label>
            <Input
              placeholder="Opsiyonel açıklama"
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Dosya *</label>
            <input
              ref={dosyaRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={(e) => setForm({ ...form, dosya: e.target.files?.[0] || null })}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => dosyaRef.current?.click()}
            >
              {form.dosya ? form.dosya.name : "Dosya Seç"}
            </Button>
          </div>
          {hata && <p className="text-sm text-red-500">{hata}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Vazgeç</Button>
            <Button onClick={handleYukle} disabled={yukleniyor}>
              {yukleniyor ? "Yükleniyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {kategoriler.map((k) => (
          <button
            key={k}
            onClick={() => setAktifKategori(k)}
            className={`px-3 py-1 rounded-full text-sm border ${
              aktifKategori === k
                ? "bg-primary text-primary-foreground"
                : "bg-background"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtrelenmis.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Henüz belge yok.</p>
        ) : (
          filtrelenmis.map((b) => (
            <div key={b.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {b.dosya_turu?.includes("pdf") ? "📄" : "🖼️"}
                </div>
                <div>
                  <p className="font-medium">{b.ad}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.kategori} · {new Date(b.yukleme_tarihi).toLocaleDateString("tr-TR")}
                  </p>
                  {b.aciklama && <p className="text-xs text-muted-foreground">{b.aciklama}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setOnizleme(b)}>
                  Önizle
                </Button>
                <a href={b.dosya_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">İndir</Button>
                </a>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleSil(b.id, b.dosya_url)}
                >
                  Sil
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {onizleme && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setOnizleme(null)}
        >
          <div className="bg-background rounded-lg p-4 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">{onizleme.ad}</h3>
              <Button size="sm" variant="outline" onClick={() => setOnizleme(null)}>Kapat</Button>
            </div>
            {onizleme.dosya_turu?.includes("pdf") ? (
              <iframe src={onizleme.dosya_url} className="w-full h-96 rounded" />
            ) : (
              <img src={onizleme.dosya_url} alt={onizleme.ad} className="w-full rounded object-contain max-h-96" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
