"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function BelgeKategoriYonetimi() {
  const [kategoriler, setKategoriler] = useState<{id: string, ad: string}[]>([])
  const [yeniKategori, setYeniKategori] = useState("")
  const [yukleniyor, setYukleniyor] = useState(false)

  const fetchKategoriler = async () => {
    const supabase = createClient()
    const { data } = await supabase!.from("belge_kategorileri").select("*").order("created_at")
    if (data) setKategoriler(data)
  }

  useEffect(() => { fetchKategoriler() }, [])

  const ekle = async () => {
    if (!yeniKategori.trim()) return
    setYukleniyor(true)
    const supabase = createClient()
    await supabase!.from("belge_kategorileri").insert([{ ad: yeniKategori.trim() }])
    setYeniKategori("")
    await fetchKategoriler()
    setYukleniyor(false)
  }

  const sil = async (id: string) => {
    const supabase = createClient()
    await supabase!.from("belge_kategorileri").delete().eq("id", id)
    await fetchKategoriler()
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-lg">Belge Kategorileri</h3>
      <div className="flex gap-2">
        <Input
          placeholder="Yeni kategori adı..."
          value={yeniKategori}
          onChange={(e) => setYeniKategori(e.target.value)}
        />
        <Button onClick={ekle} disabled={yukleniyor}>Ekle</Button>
      </div>
      <div className="space-y-2">
        {kategoriler.map((k) => (
          <div key={k.id} className="flex items-center justify-between border rounded p-2">
            <span>{k.ad}</span>
            <Button size="sm" variant="destructive" onClick={() => sil(k.id)}>Sil</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
