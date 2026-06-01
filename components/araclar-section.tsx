"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Plus, Loader2, Car } from "lucide-react"

type Arac = {
  id: string
  plaka: string
  marka: string
  model: string
  yil: number | null
  renk: string
  sasi_no: string
  sorumlu_surucu: string
  departman: string
  guncel_km: number | null
  son_bakim_km: number | null
  sonraki_bakim_km: number | null
  son_bakim_tarihi: string
  muayene_tarihi: string
  sigorta_bitis_tarihi: string
  kasko_bitis_tarihi: string
  durum: string
  foto_on: string | null
  foto_arka: string | null
  foto_sol: string | null
  foto_sag: string | null
  foto_ic: string | null
  lastik_degisim_km: number | null
  lastik_degisim_tarihi: string | null
}

type Bakim = {
  id: string
  arac_id: string
  tarih: string
  km: number | null
  aciklama: string
  tutar: number | null
  bakim_turu: string
}

type Ceza = {
  id: string
  arac_id: string
  tarih: string
  tutar: number
  ceza_turu: string
  aciklama: string
  odendi: boolean
  odeme_tarihi: string | null
}

type Talep = {
  id: string
  arac_id: string
  talep_turu: string
  aciklama: string
  durum: string
  created_at: string
}

type YakitKayit = {
  id: string
  arac_id: string
  surucu: string
  tarih: string
  litre: number | null
  tutar: number | null
  km_degeri: number | null
  istasyon_adi: string
  notlar: string
}

const emptyAracForm = {
  plaka: "", marka: "", model: "", yil: "", renk: "", sasi_no: "",
  sorumlu_surucu: "", departman: "", guncel_km: "", son_bakim_km: "",
  sonraki_bakim_km: "", son_bakim_tarihi: "", muayene_tarihi: "",
  sigorta_bitis_tarihi: "", kasko_bitis_tarihi: "", durum: "Aktif",
}

const FOTO_ALANLARI = [
  { key: "foto_on", label: "Ön" },
  { key: "foto_arka", label: "Arka" },
  { key: "foto_sol", label: "Sol" },
  { key: "foto_sag", label: "Sağ" },
  { key: "foto_ic", label: "İç" },
] as const

const ARAC_SELECT =
  "id, plaka, marka, model, yil, renk, sasi_no, sorumlu_surucu, departman, guncel_km, son_bakim_km, sonraki_bakim_km, son_bakim_tarihi, muayene_tarihi, sigorta_bitis_tarihi, kasko_bitis_tarihi, durum, foto_on, foto_arka, foto_sol, foto_sag, foto_ic, lastik_degisim_km, lastik_degisim_tarihi"

export function AraclarSection() {
  const [aktifSekme, setAktifSekme] = useState<"araclar" | "yakit">("araclar")
  const [araclar, setAraclar] = useState<Arac[]>([])
  const [yakitlar, setYakitlar] = useState<YakitKayit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [aracForm, setAracForm] = useState(emptyAracForm)
  const [saving, setSaving] = useState(false) 
  const [isAdmin, setIsAdmin] = useState(false)


  // Detay dialog
  const [seciliArac, setSeciliArac] = useState<Arac | null>(null)
  const [detayAcik, setDetayAcik] = useState(false)
  const [detaySekme, setDetaySekme] = useState("foto")

  // Bakım
  const [bakimlar, setBakimlar] = useState<Bakim[]>([])
  const [bakimForm, setBakimForm] = useState({ tarih: "", km: "", aciklama: "", tutar: "", bakim_turu: "Bakım" })
  const [bakimEkle, setBakimEkle] = useState(false)

  // Ceza
  const [cezalar, setCezalar] = useState<Ceza[]>([])
  const [cezaForm, setCezaForm] = useState({ tarih: "", tutar: "", ceza_turu: "", aciklama: "" })
  const [cezaEkle, setCezaEkle] = useState(false)

  // Talep
  const [talepler, setTalepler] = useState<Talep[]>([])
  const [talepForm, setTalepForm] = useState({ talep_turu: "Lastik", aciklama: "" })
  const [talepEkle, setTalepEkle] = useState(false)

  // Lastik
  const [lastikForm, setLastikForm] = useState({ lastik_degisim_km: "", lastik_degisim_tarihi: "" })
  const [lastikEkle, setLastikEkle] = useState(false)

  // Fotoğraf yükleme
  const [fotoYukleniyor, setFotoYukleniyor] = useState<string | null>(null)

  // Yakıt
  const [yakitForm, setYakitForm] = useState({
    arac_id: "", surucu: "", tarih: "", litre: "", tutar: "", km_degeri: "", istasyon_adi: "", notlar: ""
  })
  const [yakitEkle, setYakitEkle] = useState(false)
  const dosyaInputRef = useRef<HTMLInputElement>(null)
  const [fisYukleniyor, setFisYukleniyor] = useState(false)
  const [fisOnizleme, setFisOnizleme] = useState<string | null>(null)
  const [fisHata, setFisHata] = useState<string | null>(null)

  const supabase = createClient()

 const fetchAraclar = useCallback(async (isAdmin: boolean, personelId?: string) => {
  let query = supabase!.from("araclar").select(ARAC_SELECT).order("created_at", { ascending: false })
  if (!isAdmin && personelId) {
    query = query.eq("personel_id", personelId)
  }
  const { data } = await query
  if (data) setAraclar(data)
}, [supabase])


  const fetchYakitlar = useCallback(async () => {
    const { data } = await supabase!
      .from("yakit_kayitlari")
      .select("id, arac_id, surucu, tarih, litre, tutar, km_degeri, istasyon_adi, notlar")
      .order("tarih", { ascending: false })
    if (data) setYakitlar(data)
  }, [supabase])

  const fetchDetay = async (aracId: string) => {
    const [b, c, t] = await Promise.all([
      supabase!.from("arac_bakimlari").select("id, arac_id, tarih, km, aciklama, tutar, bakim_turu").eq("arac_id", aracId).order("tarih", { ascending: false }),
      supabase!.from("trafik_cezalari").select("id, arac_id, tarih, tutar, ceza_turu, aciklama, odendi, odeme_tarihi").eq("arac_id", aracId).order("tarih", { ascending: false }),
      supabase!.from("arac_talepleri").select("id, arac_id, talep_turu, aciklama, durum, created_at").eq("arac_id", aracId).order("created_at", { ascending: false }),
    ])
    if (b.data) setBakimlar(b.data)
    if (c.data) setCezalar(c.data)
    if (t.data) setTalepler(t.data)
  }

 useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase!.auth.getUser()
      if (user) {
        const { data: personel } = await supabase!
          .from("personeller")
          .select("id, unvan")
          .eq("kullanici_id", user.id)
          .single()
        const admin = personel?.unvan === "Yonetici" || personel?.unvan === "Mudur"
        setIsAdmin(admin)
        await fetchAraclar(admin, personel?.id)
      }
      await fetchYakitlar()
      setLoading(false)
    }
    load()
  }, [fetchAraclar, fetchYakitlar, supabase])


  const aracDetayAc = async (arac: Arac) => {
    setSeciliArac(arac)
    setDetayAcik(true)
    setDetaySekme("foto")
    await fetchDetay(arac.id)
  }

  const handleAracSave = async () => {
    if (!aracForm.plaka) return
    setSaving(true)
    await supabase!.from("araclar").insert([{
      ...aracForm,
      yil: aracForm.yil ? parseInt(aracForm.yil) : null,
      guncel_km: aracForm.guncel_km ? parseInt(aracForm.guncel_km) : null,
      son_bakim_km: aracForm.son_bakim_km ? parseInt(aracForm.son_bakim_km) : null,
      sonraki_bakim_km: aracForm.sonraki_bakim_km ? parseInt(aracForm.sonraki_bakim_km) : null,
    }])
    setAracForm(emptyAracForm)
    setShowForm(false)
    await fetchAraclar(isAdmin)
    setSaving(false)
  }


  const handleFotoyukle = async (aracId: string, alan: string, file: File) => {
    setFotoYukleniyor(alan)
    const ext = file.name.split(".").pop()
    const path = `${aracId}/${alan}.${ext}`
    const { error } = await supabase!.storage.from("Avatars").upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase!.storage.from("Avatars").getPublicUrl(path)
      await supabase!.from("araclar").update({ [alan]: data.publicUrl }).eq("id", aracId)
      setSeciliArac((prev) => prev ? { ...prev, [alan]: data.publicUrl } : prev)
      await fetchAraclar(isAdmin)
    }
    setFotoYukleniyor(null)
  }

  const handleBakimSave = async () => {
    if (!seciliArac || !bakimForm.tarih) return
    await supabase!.from("arac_bakimlari").insert([{
      arac_id: seciliArac.id,
      tarih: bakimForm.tarih,
      km: bakimForm.km ? parseInt(bakimForm.km) : null,
      aciklama: bakimForm.aciklama,
      tutar: bakimForm.tutar ? parseFloat(bakimForm.tutar) : null,
      bakim_turu: bakimForm.bakim_turu,
    }])
    setBakimForm({ tarih: "", km: "", aciklama: "", tutar: "", bakim_turu: "Bakım" })
    setBakimEkle(false)
    await fetchDetay(seciliArac.id)
  }

  const handleCezaSave = async () => {
    if (!seciliArac || !cezaForm.tarih || !cezaForm.tutar) return
    await supabase!.from("trafik_cezalari").insert([{
      arac_id: seciliArac.id,
      tarih: cezaForm.tarih,
      tutar: parseFloat(cezaForm.tutar),
      ceza_turu: cezaForm.ceza_turu,
      aciklama: cezaForm.aciklama,
      odendi: false,
    }])
    setCezaForm({ tarih: "", tutar: "", ceza_turu: "", aciklama: "" })
    setCezaEkle(false)
    await fetchDetay(seciliArac.id)
  }

  const handleCezaOde = async (cezaId: string) => {
    await supabase!.from("trafik_cezalari").update({ odendi: true, odeme_tarihi: new Date().toISOString().split("T")[0] }).eq("id", cezaId)
    if (seciliArac) await fetchDetay(seciliArac.id)
  }

  const handleTalepSave = async () => {
    if (!seciliArac || !talepForm.aciklama) return
    await supabase!.from("arac_talepleri").insert([{
      arac_id: seciliArac.id,
      talep_turu: talepForm.talep_turu,
      aciklama: talepForm.aciklama,
      durum: "beklemede",
    }])
    setTalepForm({ talep_turu: "Lastik", aciklama: "" })
    setTalepEkle(false)
    await fetchDetay(seciliArac.id)
  }

  const handleLastikSave = async () => {
    if (!seciliArac) return
    await supabase!.from("araclar").update({
      lastik_degisim_km: lastikForm.lastik_degisim_km ? parseInt(lastikForm.lastik_degisim_km) : null,
      lastik_degisim_tarihi: lastikForm.lastik_degisim_tarihi || null,
    }).eq("id", seciliArac.id)
    setSeciliArac((prev) => prev ? {
      ...prev,
      lastik_degisim_km: lastikForm.lastik_degisim_km ? parseInt(lastikForm.lastik_degisim_km) : null,
      lastik_degisim_tarihi: lastikForm.lastik_degisim_tarihi || null,
    } : prev)
    setLastikEkle(false)
    await fetchAraclar(isAdmin)
  }

  const handleFisYukle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFisHata(null)
    setFisYukleniyor(true)
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Full = event.target?.result as string
      setFisOnizleme(base64Full)
      const base64Data = base64Full.split(",")[1]
      try {
        const response = await fetch("/api/analyze-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Data, mediaType: file.type }),
        })
        const result = await response.json()
        if (result.success && result.data?.plaka) {
          const normalize = (s: string) => s.replace(/\s+/g, "").toUpperCase()
          const bulunan = araclar.find((a) => normalize(a.plaka) === normalize(result.data.plaka))
          if (!bulunan) { setFisHata(`Plaka (${result.data.plaka}) sistemde kayıtlı değil.`); setFisYukleniyor(false); return }
          setYakitForm((prev) => ({ ...prev, arac_id: bulunan.id, surucu: bulunan.sorumlu_surucu || "", tarih: result.data.tarih || prev.tarih, tutar: result.data.tutar ? String(result.data.tutar) : prev.tutar, litre: result.data.litre ? String(result.data.litre) : prev.litre, istasyon_adi: result.data.istasyon_adi || prev.istasyon_adi }))
        } else { setFisHata("Fiş okunamadı, lütfen manuel girin.") }
      } catch { setFisHata("Bağlantı hatası.") }
      finally { setFisYukleniyor(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleYakitSave = async () => {
    if (!yakitForm.arac_id || !yakitForm.tarih) return
    setSaving(true)
    await supabase!.from("yakit_kayitlari").insert([{
      ...yakitForm,
      litre: yakitForm.litre ? parseFloat(yakitForm.litre) : null,
      tutar: yakitForm.tutar ? parseFloat(yakitForm.tutar) : null,
      km_degeri: yakitForm.km_degeri ? parseInt(yakitForm.km_degeri) : null,
    }])
    setYakitForm({ arac_id: "", surucu: "", tarih: "", litre: "", tutar: "", km_degeri: "", istasyon_adi: "", notlar: "" })
    setFisOnizleme(null)
    setYakitEkle(false)
    await fetchYakitlar()
    setSaving(false)
  }

  const durumRenk = (durum: string) => {
    if (durum === "Aktif") return "default"
    if (durum === "Bakimda") return "secondary"
    if (durum === "Arizali") return "destructive"
    return "outline"
  }

  if (loading) return <div className="p-6 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Yükleniyor...</div>

  return (
    <div className="p-6 space-y-4">
      {/* Sekmeler */}
      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setAktifSekme("araclar")} className={`px-4 py-2 text-sm font-medium rounded-t-md ${aktifSekme === "araclar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Araçlar</button>
        <button onClick={() => setAktifSekme("yakit")} className={`px-4 py-2 text-sm font-medium rounded-t-md ${aktifSekme === "yakit" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Yakıt Takibi</button>
      </div>

      {/* ARAÇLAR SEKMESİ */}
      {aktifSekme === "araclar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Araçlar</h2>
            {isAdmin && (
  <Button size="sm" onClick={() => setShowForm(!showForm)}>{showForm ? "Vazgeç" : "+ Yeni Araç"}</Button>
)}

          </div>

          {showForm && (
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Yeni Araç Ekle</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Plaka *", key: "plaka" }, { label: "Marka", key: "marka" },
                  { label: "Model", key: "model" }, { label: "Yıl", key: "yil", type: "number" },
                  { label: "Renk", key: "renk" }, { label: "Şasi No", key: "sasi_no" },
                  { label: "Sorumlu Sürücü", key: "sorumlu_surucu" }, { label: "Departman", key: "departman" },
                  { label: "Güncel KM", key: "guncel_km", type: "number" }, { label: "Son Bakım KM", key: "son_bakim_km", type: "number" },
                  { label: "Sonraki Bakım KM", key: "sonraki_bakim_km", type: "number" }, { label: "Son Bakım Tarihi", key: "son_bakim_tarihi", type: "date" },
                  { label: "Muayene Tarihi", key: "muayene_tarihi", type: "date" }, { label: "Sigorta Bitiş", key: "sigorta_bitis_tarihi", type: "date" },
                  { label: "Kasko Bitiş", key: "kasko_bitis_tarihi", type: "date" },
                ].map(({ label, key, type = "text" }) => (
                  <div key={key}>
                    <label className="text-sm font-medium">{label}</label>
                    <Input type={type} value={(aracForm as any)[key]} onChange={(e) => setAracForm({ ...aracForm, [key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium">Durum</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={aracForm.durum} onChange={(e) => setAracForm({ ...aracForm, durum: e.target.value })}>
                    <option value="Aktif">Aktif</option>
                    <option value="Bakimda">Bakımda</option>
                    <option value="Arizali">Arızalı</option>
                    <option value="Satildi">Satıldı</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>Vazgeç</Button>
                <Button onClick={handleAracSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plaka</TableHead>
                  <TableHead>Marka/Model</TableHead>
                  <TableHead>Sürücü</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Muayene</TableHead>
                  <TableHead>Sigorta</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {araclar.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Henüz araç bulunmuyor.</TableCell></TableRow>
                ) : (
                  araclar.map((arac) => (
                    <TableRow key={arac.id}>
                      <TableCell className="font-mono font-bold">{arac.plaka}</TableCell>
                      <TableCell>{arac.marka} {arac.model}</TableCell>
                      <TableCell>{arac.sorumlu_surucu ?? "-"}</TableCell>
                      <TableCell>{arac.guncel_km?.toLocaleString() ?? "-"}</TableCell>
                      <TableCell>{arac.muayene_tarihi ?? "-"}</TableCell>
                      <TableCell>{arac.sigorta_bitis_tarihi ?? "-"}</TableCell>
                      <TableCell><Badge variant={durumRenk(arac.durum) as any}>{arac.durum}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => aracDetayAc(arac)}>Detay</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* YAKIT SEKMESİ */}
      {aktifSekme === "yakit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Yakıt Takibi</h2>
            <Button size="sm" onClick={() => setYakitEkle(!yakitEkle)}>{yakitEkle ? "Vazgeç" : "+ Yakıt Girişi"}</Button>
          </div>

          {yakitEkle && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="border-2 border-dashed rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">📷 Kasa Fişi (Opsiyonel)</p>
                <input ref={dosyaInputRef} type="file" accept="image/*" className="hidden" onChange={handleFisYukle} />
                <Button type="button" variant="outline" size="sm" onClick={() => dosyaInputRef.current?.click()} disabled={fisYukleniyor}>
                  {fisYukleniyor ? "Okunuyor..." : "Fotoğraf Seç"}
                </Button>
                {fisHata && <p className="text-sm text-red-500">{fisHata}</p>}
                {fisOnizleme && !fisYukleniyor && <p className="text-xs text-green-600">✅ Fiş okundu</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Araç *</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={yakitForm.arac_id} onChange={(e) => { const s = araclar.find(a => a.id === e.target.value); setYakitForm({ ...yakitForm, arac_id: e.target.value, surucu: s?.sorumlu_surucu || "" }) }}>
                    <option value="">Araç Seçin</option>
                    {araclar.map((a) => <option key={a.id} value={a.id}>{a.plaka} - {a.marka} {a.model}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium">Sürücü</label><Input value={yakitForm.surucu} onChange={(e) => setYakitForm({ ...yakitForm, surucu: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Tarih *</label><Input type="date" value={yakitForm.tarih} onChange={(e) => setYakitForm({ ...yakitForm, tarih: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Litre</label><Input type="number" value={yakitForm.litre} onChange={(e) => setYakitForm({ ...yakitForm, litre: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Tutar (TL)</label><Input type="number" value={yakitForm.tutar} onChange={(e) => setYakitForm({ ...yakitForm, tutar: e.target.value })} /></div>
                <div><label className="text-sm font-medium">KM</label><Input type="number" value={yakitForm.km_degeri} onChange={(e) => setYakitForm({ ...yakitForm, km_degeri: e.target.value })} /></div>
                <div><label className="text-sm font-medium">İstasyon</label><Input value={yakitForm.istasyon_adi} onChange={(e) => setYakitForm({ ...yakitForm, istasyon_adi: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Notlar</label><Input value={yakitForm.notlar} onChange={(e) => setYakitForm({ ...yakitForm, notlar: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setYakitEkle(false)}>Vazgeç</Button>
                <Button onClick={handleYakitSave} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead><TableHead>Araç</TableHead><TableHead>Sürücü</TableHead>
                  <TableHead>Litre</TableHead><TableHead>Tutar</TableHead><TableHead>KM</TableHead><TableHead>İstasyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yakitlar.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Henüz yakıt kaydı yok.</TableCell></TableRow>
                ) : (
                  yakitlar.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>{k.tarih}</TableCell>
                      <TableCell>{araclar.find(a => a.id === k.arac_id)?.plaka ?? "-"}</TableCell>
                      <TableCell>{k.surucu ?? "-"}</TableCell>
                      <TableCell>{k.litre ?? "-"}</TableCell>
                      <TableCell>{k.tutar ? `${k.tutar} TL` : "-"}</TableCell>
                      <TableCell>{k.km_degeri?.toLocaleString() ?? "-"}</TableCell>
                      <TableCell>{k.istasyon_adi ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* DETAY DIALOG */}
      <Dialog open={detayAcik} onOpenChange={setDetayAcik}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {seciliArac?.plaka} — {seciliArac?.marka} {seciliArac?.model}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={detaySekme} onValueChange={setDetaySekme}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="foto">📷 Fotoğraf</TabsTrigger>
              <TabsTrigger value="bakim">🔧 Bakım</TabsTrigger>
              <TabsTrigger value="lastik">🔄 Lastik</TabsTrigger>
              <TabsTrigger value="ceza">🚨 Ceza</TabsTrigger>
              <TabsTrigger value="talep">📋 Talep</TabsTrigger>
            </TabsList>

            {/* FOTOĞRAF */}
            <TabsContent value="foto" className="space-y-3 mt-4">
              <div className="grid grid-cols-3 gap-3">
                {FOTO_ALANLARI.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <p className="text-sm font-medium text-center">{label}</p>
                    <div className="relative aspect-video rounded-lg border-2 border-dashed border-border overflow-hidden bg-secondary/30">
                      {seciliArac?.[key] ? (
                        <img src={seciliArac[key]!} alt={label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {fotoYukleniyor === key && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && seciliArac) handleFotoyukle(seciliArac.id, key, f) }} />
                      <Button size="sm" variant="outline" className="w-full text-xs" asChild>
                        <span>{seciliArac?.[key] ? "Değiştir" : "Yükle"}</span>
                      </Button>
                    </label>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* BAKIM */}
            <TabsContent value="bakim" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Bakım & Tamirat Kayıtları</h3>
                <Button size="sm" onClick={() => setBakimEkle(!bakimEkle)}><Plus className="h-4 w-4 mr-1" />Ekle</Button>
              </div>
              {bakimEkle && (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium">Tarih *</label><Input type="date" value={bakimForm.tarih} onChange={(e) => setBakimForm({ ...bakimForm, tarih: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">KM</label><Input type="number" value={bakimForm.km} onChange={(e) => setBakimForm({ ...bakimForm, km: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">Tür</label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={bakimForm.bakim_turu} onChange={(e) => setBakimForm({ ...bakimForm, bakim_turu: e.target.value })}>
                        <option>Bakım</option><option>Tamirat</option><option>Lastik</option><option>Elektrik</option><option>Diğer</option>
                      </select>
                    </div>
                    <div><label className="text-xs font-medium">Tutar (TL)</label><Input type="number" value={bakimForm.tutar} onChange={(e) => setBakimForm({ ...bakimForm, tutar: e.target.value })} /></div>
                    <div className="col-span-2"><label className="text-xs font-medium">Açıklama</label><Textarea value={bakimForm.aciklama} onChange={(e) => setBakimForm({ ...bakimForm, aciklama: e.target.value })} rows={2} /></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setBakimEkle(false)}>Vazgeç</Button>
                    <Button size="sm" onClick={handleBakimSave}>Kaydet</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {bakimlar.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Kayıt yok.</p> : bakimlar.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{b.bakim_turu} — {b.tarih}</p>
                          <p className="text-xs text-muted-foreground">{b.aciklama}</p>
                          {b.km && <p className="text-xs text-muted-foreground">KM: {b.km.toLocaleString()}</p>}
                        </div>
                        {b.tutar && <Badge variant="outline">{b.tutar.toLocaleString()} TL</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* LASTİK */}
            <TabsContent value="lastik" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Lastik Takibi</h3>
                <Button size="sm" onClick={() => { setLastikForm({ lastik_degisim_km: String(seciliArac?.lastik_degisim_km || ""), lastik_degisim_tarihi: seciliArac?.lastik_degisim_tarihi || "" }); setLastikEkle(!lastikEkle) }}>Güncelle</Button>
              </div>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Son Değişim KM</span>
                    <span className="font-medium">{seciliArac?.lastik_degisim_km?.toLocaleString() ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Son Değişim Tarihi</span>
                    <span className="font-medium">{seciliArac?.lastik_degisim_tarihi ?? "-"}</span>
                  </div>
                  {seciliArac?.lastik_degisim_km && seciliArac?.guncel_km && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Değişimden Bu Yana</span>
                      <span className="font-medium">{(seciliArac.guncel_km - seciliArac.lastik_degisim_km).toLocaleString()} KM</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              {lastikEkle && (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium">Değişim KM</label><Input type="number" value={lastikForm.lastik_degisim_km} onChange={(e) => setLastikForm({ ...lastikForm, lastik_degisim_km: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">Değişim Tarihi</label><Input type="date" value={lastikForm.lastik_degisim_tarihi} onChange={(e) => setLastikForm({ ...lastikForm, lastik_degisim_tarihi: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setLastikEkle(false)}>Vazgeç</Button>
                    <Button size="sm" onClick={handleLastikSave}>Kaydet</Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* CEZA */}
            <TabsContent value="ceza" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Trafik Cezaları</h3>
                <Button size="sm" onClick={() => setCezaEkle(!cezaEkle)}><Plus className="h-4 w-4 mr-1" />Ekle</Button>
              </div>
              {cezaEkle && (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-medium">Tarih *</label><Input type="date" value={cezaForm.tarih} onChange={(e) => setCezaForm({ ...cezaForm, tarih: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">Tutar (TL) *</label><Input type="number" value={cezaForm.tutar} onChange={(e) => setCezaForm({ ...cezaForm, tutar: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">Ceza Türü</label><Input value={cezaForm.ceza_turu} placeholder="Hız, Park, vb." onChange={(e) => setCezaForm({ ...cezaForm, ceza_turu: e.target.value })} /></div>
                    <div><label className="text-xs font-medium">Açıklama</label><Input value={cezaForm.aciklama} onChange={(e) => setCezaForm({ ...cezaForm, aciklama: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setCezaEkle(false)}>Vazgeç</Button>
                    <Button size="sm" onClick={handleCezaSave}>Kaydet</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {cezalar.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Ceza kaydı yok.</p> : cezalar.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{c.ceza_turu || "Trafik Cezası"} — {c.tarih}</p>
                          <p className="text-xs text-muted-foreground">{c.aciklama}</p>
                          {c.odendi && <p className="text-xs text-green-600">✅ Ödendi: {c.odeme_tarihi}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline">{c.tutar.toLocaleString()} TL</Badge>
                          {!c.odendi && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleCezaOde(c.id)}>Ödendi İşaretle</Button>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TALEP */}
            <TabsContent value="talep" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Sürücü Talepleri</h3>
                <Button size="sm" onClick={() => setTalepEkle(!talepEkle)}><Plus className="h-4 w-4 mr-1" />Talep Oluştur</Button>
              </div>
              {talepEkle && (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Talep Türü</label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={talepForm.talep_turu} onChange={(e) => setTalepForm({ ...talepForm, talep_turu: e.target.value })}>
                        <option>Lastik</option><option>Bakım</option><option>Tamirat</option><option>Yakıt</option><option>Diğer</option>
                      </select>
                    </div>
                    <div className="col-span-2"><label className="text-xs font-medium">Açıklama *</label><Textarea value={talepForm.aciklama} onChange={(e) => setTalepForm({ ...talepForm, aciklama: e.target.value })} rows={2} /></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setTalepEkle(false)}>Vazgeç</Button>
                    <Button size="sm" onClick={handleTalepSave}>Gönder</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {talepler.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Talep yok.</p> : talepler.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{t.talep_turu}</p>
                          <p className="text-xs text-muted-foreground">{t.aciklama}</p>
                          <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("tr-TR")}</p>
                        </div>
                        <Badge variant={t.durum === "tamamlandi" ? "default" : t.durum === "reddedildi" ? "destructive" : "secondary"}>{t.durum}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
