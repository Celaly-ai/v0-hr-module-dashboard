"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const MODULLER = [
  { kod: "Panel", ad: "Genel Bakış Paneli" },
  { kod: "Calisanlar", ad: "Çalışanlar" },
  { kod: "Izin Talepleri", ad: "İzin Talepleri" },
  { kod: "Varliklar", ad: "Varlıklar" },
  { kod: "Satislar", ad: "Satışlar" },
  { kod: "Disiplin Kayitlari", ad: "Disiplin Kayıtları" },
  { kod: "Belge Takibi", ad: "Belge Takibi" },
  { kod: "Ise Giris", ad: "İşe Giriş" },
  { kod: "Puantaj", ad: "Puantaj" },
  { kod: "Vardiya Plani", ad: "Vardiya Planı" },
  { kod: "Giris Cikis", ad: "Giriş Çıkış" },
  { kod: "Performans Degerlendirme", ad: "Performans Değerlendirme" },
  { kod: "Fazla Mesai", ad: "Fazla Mesai" },
  { kod: "Bildirimler", ad: "Bildirimler" },
  { kod: "Departmanlar", ad: "Departmanlar" },
  { kod: "Raporlar", ad: "Raporlar" },
  { kod: "Ayarlar", ad: "Ayarlar" },
  { kod: "Araclar", ad: "Araçlar" },
  { kod: "Belge Arsivi", ad: "Belge Arşivi" },
]

export function RolYonetimi() {
  const { reloadPermissions } = useAuth()
  const [aktifSekme, setAktifSekme] = useState<"roller" | "kisiler">("roller")
  const [roller, setRoller] = useState<{id: string, ad: string, label: string}[]>([])
  const [yeniAd, setYeniAd] = useState("")
  const [yeniLabel, setYeniLabel] = useState("")
  const [yukleniyor, setYukleniyor] = useState(false)
  const [acikRol, setAcikRol] = useState<string | null>(null)
  const [yetkiler, setYetkiler] = useState<Record<string, string[]>>({})
  const [degisiklikler, setDegisiklikler] = useState<Record<string, string[]>>({})
  const [kaydediliyor, setKaydediliyor] = useState<string | null>(null)
  const [personeller, setPersoneller] = useState<{id: string, ad: string, soyad: string, rol: string}[]>([])
  const [seciliPersonel, setSeciliPersonel] = useState("")
  const [kisiYetkiler, setKisiYetkiler] = useState<{modul: string, aktif: boolean}[]>([])
  const [rolModulleri, setRolModulleri] = useState<string[]>([])
  const [kisiKaydediliyor, setKisiKaydediliyor] = useState(false)

  const fetchRoller = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("roller")
      .select("id, ad, label")
      .order("created_at")
    if (data) setRoller(data)
  }

  const fetchYetkiler = async (rolKodu: string) => {
    const supabase = createClient()
    const { data } = await supabase.from("role_permissions").select("modules").eq("role", rolKodu).maybeSingle()
    const moduller = data?.modules || []
    setYetkiler(prev => ({ ...prev, [rolKodu]: moduller }))
    setDegisiklikler(prev => ({ ...prev, [rolKodu]: moduller }))
  }

  const fetchPersoneller = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("personeller")
      .select("id, ad, soyad, rol")
      .in("durum", ["aktif", "active", "izinli", "izınli"])
      .order("ad")
    setPersoneller(data || [])
  }

  const fetchKisiYetkiler = async (personelId: string, personelRol: string) => {
    const supabase = createClient()
    const { data: kisiData } = await supabase.from("personel_yetkiler").select("modul, aktif").eq("personel_id", personelId)
    setKisiYetkiler(kisiData || [])
    const { data: rolData } = await supabase.from("role_permissions").select("modules").eq("role", personelRol).maybeSingle()
    setRolModulleri(rolData?.modules || [])
  }

  useEffect(() => { fetchRoller(); fetchPersoneller() }, [])

  const rolAc = async (rolKodu: string) => {
    if (acikRol === rolKodu) { setAcikRol(null); return }
    setAcikRol(rolKodu)
    await fetchYetkiler(rolKodu)
  }

  const toggleModul = (rolKodu: string, modulKod: string, aktif: boolean) => {
    setDegisiklikler(prev => {
      const mevcut = prev[rolKodu] || []
      const yeni = aktif ? [...mevcut, modulKod] : mevcut.filter(m => m !== modulKod)
      return { ...prev, [rolKodu]: yeni }
    })
  }

  const kaydet = async (rolKodu: string) => {
    setKaydediliyor(rolKodu)
    const supabase = createClient()
    const yeniModuller = degisiklikler[rolKodu] || []
    const { error } = await supabase.from("role_permissions").upsert({ role: rolKodu, modules: yeniModuller }, { onConflict: "role" })
    if (error) { alert("HATA: " + error.message); setKaydediliyor(null); return }
    setYetkiler(prev => ({ ...prev, [rolKodu]: yeniModuller }))
    await reloadPermissions()
    setKaydediliyor(null)
  }

  const degisiklikVarMi = (rolKodu: string) => {
    const eski = JSON.stringify([...(yetkiler[rolKodu] || [])].sort())
    const yeni = JSON.stringify([...(degisiklikler[rolKodu] || [])].sort())
    return eski !== yeni
  }

  const ekle = async () => {
    if (!yeniAd.trim() || !yeniLabel.trim()) return
    setYukleniyor(true)
    const supabase = createClient()
    await supabase.from("roller").insert([{ ad: yeniAd.trim(), label: yeniLabel.trim() }])
    await supabase.from("role_permissions").upsert({ role: yeniAd.trim(), modules: [] }, { onConflict: "role" })
    setYeniAd(""); setYeniLabel("")
    await fetchRoller()
    setYukleniyor(false)
  }

  const sil = async (id: string) => {
    const supabase = createClient()
    await supabase.from("roller").delete().eq("id", id)
    await fetchRoller()
  }

  const personelSec = async (personelId: string) => {
    setSeciliPersonel(personelId)
    const p = personeller.find(p => p.id === personelId)
    if (p) await fetchKisiYetkiler(personelId, p.rol)
  }

  const toggleKisiModul = (modulKod: string, aktif: boolean) => {
    setKisiYetkiler(prev => {
      const mevcut = prev.find(k => k.modul === modulKod)
      if (mevcut) return prev.map(k => k.modul === modulKod ? { ...k, aktif } : k)
      return [...prev, { modul: modulKod, aktif }]
    })
  }

  const kisiKaydet = async () => {
    if (!seciliPersonel) return
    setKisiKaydediliyor(true)
    const supabase = createClient()
    for (const yetki of kisiYetkiler) {
      await supabase.from("personel_yetkiler").upsert({ personel_id: seciliPersonel, modul: yetki.modul, aktif: yetki.aktif }, { onConflict: "personel_id,modul" })
    }
    await reloadPermissions()
    setKisiKaydediliyor(false)
    alert("Kişi yetkileri kaydedildi!")
  }

  const getModulDurumu = (modulKod: string) => {
    const kisiYetki = kisiYetkiler.find(k => k.modul === modulKod)
    if (kisiYetki) return kisiYetki.aktif
    return rolModulleri.includes(modulKod)
  }

  const getModulEtiketi = (modulKod: string) => {
    const kisiYetki = kisiYetkiler.find(k => k.modul === modulKod)
    if (!kisiYetki) return rolModulleri.includes(modulKod) ? "rol" : "yok"
    return kisiYetki.aktif ? "kisi-eklendi" : "kisi-cikarildi"
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setAktifSekme("roller")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${aktifSekme === "roller" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Rol Yetkileri
        </button>
        <button
          onClick={() => setAktifSekme("kisiler")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${aktifSekme === "kisiler" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Kişi Yetkileri
        </button>
      </div>

      {aktifSekme === "roller" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Rol kodu (örn: muhasebe)" value={yeniAd} onChange={e => setYeniAd(e.target.value)} />
            <Input placeholder="Rol adı (örn: Muhasebe)" value={yeniLabel} onChange={e => setYeniLabel(e.target.value)} />
          </div>
          <Button onClick={ekle} disabled={yukleniyor}>Rol Ekle</Button>
          <div className="space-y-2">
            {roller.map(r => (
              <div key={r.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.ad}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => rolAc(r.ad)}>
                      {acikRol === r.ad ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      Yetkiler
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => sil(r.id)}>Sil</Button>
                  </div>
                </div>
                {acikRol === r.ad && (
                  <div className="border-t p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Modül Yetkileri</p>
                      <Button size="sm" disabled={!degisiklikVarMi(r.ad) || kaydediliyor === r.ad} onClick={() => kaydet(r.ad)}>
                        {kaydediliyor === r.ad ? "Kaydediliyor..." : "💾 Kaydet"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {MODULLER.map(m => (
                        <div key={m.kod} className="flex items-center justify-between p-2 rounded border bg-background">
                          <span className="text-sm">{m.ad}</span>
                          <Switch checked={(degisiklikler[r.ad] || []).includes(m.kod)} onCheckedChange={checked => toggleModul(r.ad, m.kod, checked)} />
                        </div>
                      ))}
                    </div>
                    {degisiklikVarMi(r.ad) && <p className="text-xs text-amber-500 mt-2">⚠️ Kaydedilmemiş değişiklikler var</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {aktifSekme === "kisiler" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Kişiye özel yetki ekleyip çıkarabilirsiniz. Rol yetkisine ek olarak çalışır.</p>
          <Select value={seciliPersonel} onValueChange={personelSec}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Personel seçin" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {personeller.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.ad} {p.soyad} ({p.rol})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {seciliPersonel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Modül Yetkileri</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>🟢 Rol yetkisi</span>
                  <span>🔵 Kişiye eklendi</span>
                  <span>🔴 Kişiden çıkarıldı</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MODULLER.map(m => {
                  const etiket = getModulEtiketi(m.kod)
                  return (
                    <div key={m.kod} className={`flex items-center justify-between p-2 rounded border bg-background ${etiket === "kisi-eklendi" ? "border-blue-500/50" : etiket === "kisi-cikarildi" ? "border-red-500/50" : ""}`}>
                      <div>
                        <span className="text-sm">{m.ad}</span>
                        {etiket === "kisi-eklendi" && <span className="ml-1 text-xs text-blue-500">+kişi</span>}
                        {etiket === "kisi-cikarildi" && <span className="ml-1 text-xs text-red-500">-kişi</span>}
                      </div>
                      <Switch checked={getModulDurumu(m.kod)} onCheckedChange={checked => toggleKisiModul(m.kod, checked)} />
                    </div>
                  )
                })}
              </div>
              <Button onClick={kisiKaydet} disabled={kisiKaydediliyor} className="w-full">
                {kisiKaydediliyor ? "Kaydediliyor..." : "💾 Kişi Yetkilerini Kaydet"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
