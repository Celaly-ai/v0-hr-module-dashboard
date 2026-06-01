"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type IsEmri = {
  id: string
  emri_no: string
  musteri_adi_soyadi: string | null
  satici_unvani: string | null
  alinacak_nokta: string | null
  urun_model_kodu: string | null
  durum: string
  teslim_eden_adi_soyadi: string | null
  teslim_eden_telefonu: string | null
  created_at: string
}

const emptyForm = {
  emri_no: "",
  musteri_adi_soyadi: "",
  satici_unvani: "",
  alinacak_nokta: "",
  urun_model_kodu: "",
  durum: "Alindi",
  teslim_eden_adi_soyadi: "",
  teslim_eden_telefonu: "",
}

export function IsEmirleriSection() {
  const [isEmirleri, setIsEmirleri] = useState<IsEmri[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("is_emirleri")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setIsEmirleri(data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!form.emri_no) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("is_emirleri").insert([form])
    setForm(emptyForm)
    setShowForm(false)
    await fetchData()
    setSaving(false)
  }

  if (loading) return <div className="p-6">Yukleniyor...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Is Emirleri</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Vazgec" : "+ Yeni Is Emri"}
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Is Emri No *</label>
              <Input value={form.emri_no} onChange={e => setForm({...form, emri_no: e.target.value})} placeholder="IE-001" />
            </div>
            <div>
              <label className="text-sm font-medium">Musteri Adi Soyadi</label>
              <Input value={form.musteri_adi_soyadi} onChange={e => setForm({...form, musteri_adi_soyadi: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">Satici Unvani</label>
              <Input value={form.satici_unvani} onChange={e => setForm({...form, satici_unvani: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">Alinacak Nokta</label>
              <Input value={form.alinacak_nokta} onChange={e => setForm({...form, alinacak_nokta: e.target.value})} placeholder="Magaza / Sube / Depo" />
            </div>
            <div>
              <label className="text-sm font-medium">Urun Model Kodu</label>
              <Input value={form.urun_model_kodu} onChange={e => setForm({...form, urun_model_kodu: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">Durum</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.durum}
                onChange={e => setForm({...form, durum: e.target.value})}
              >
                <option value="Alindi">Alindi</option>
                <option value="Iptal">Iptal</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Teslim Eden Adi Soyadi</label>
              <Input value={form.teslim_eden_adi_soyadi} onChange={e => setForm({...form, teslim_eden_adi_soyadi: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">Teslim Eden Telefonu</label>
              <Input value={form.teslim_eden_telefonu} onChange={e => setForm({...form, teslim_eden_telefonu: e.target.value})} placeholder="05xx xxx xx xx" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Vazgec</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emri No</TableHead>
              <TableHead>Musteri</TableHead>
              <TableHead>Satici</TableHead>
              <TableHead>Alinacak Nokta</TableHead>
              <TableHead>Urun Kodu</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Teslim Eden</TableHead>
              <TableHead>Telefon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmirleri.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Henuz is emri bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              isEmirleri.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.emri_no}</TableCell>
                  <TableCell>{item.musteri_adi_soyadi ?? "-"}</TableCell>
                  <TableCell>{item.satici_unvani ?? "-"}</TableCell>
                  <TableCell>{item.alinacak_nokta ?? "-"}</TableCell>
                  <TableCell>{item.urun_model_kodu ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.durum === "Iptal" ? "destructive" : "default"}>
                      {item.durum}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.teslim_eden_adi_soyadi ?? "-"}</TableCell>
                  <TableCell>{item.teslim_eden_telefonu ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
