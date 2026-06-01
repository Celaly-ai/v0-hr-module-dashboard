"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Personel = {
  id: string
  ad: string
  soyad: string
  email: string | null
  rol: string | null
}

const ROLES = [
  { value: "admin", label: "Yonetici" },
  { value: "servis_yoneticisi", label: "Servis Yoneticisi" },
  { value: "ik_yoneticisi", label: "IK Yoneticisi" },
  { value: "urun_sorumlusu", label: "Urun Sorumlusu" },
  { value: "calisan", label: "Calisan" },
]

export function UserPermissionsSection() {
  const [personeller, setPersoneller] = useState<Personel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [changes, setChanges] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("personeller")
        .select("id, ad, soyad, email, rol")
        .order("ad")
      if (data) setPersoneller(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleRoleChange = (id: string, role: string) => {
    setChanges(prev => ({ ...prev, [id]: role }))
  }

  const handleSave = async (id: string) => {
    const newRole = changes[id]
    if (!newRole) return
    setSaving(id)
    const supabase = createClient()
    await supabase.from("personeller").update({ rol: newRole }).eq("id", id)
    setPersoneller(prev => prev.map(p => p.id === id ? { ...p, rol: newRole } : p))
    setChanges(prev => { const c = { ...prev }; delete c[id]; return c })
    setSaving(null)
  }

  if (loading) return <div className="p-6">Yukleniyor...</div>

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Yetki Yonetimi</h2>
      <p className="text-muted-foreground text-sm">Personelin sistem yetkilerini buradan duzenleyebilirsiniz.</p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Mevcut Rol</TableHead>
              <TableHead>Yeni Rol</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personeller.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.ad} {p.soyad}</TableCell>
                <TableCell className="text-muted-foreground">{p.email ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={p.rol === "admin" ? "default" : "secondary"}>
                    {ROLES.find(r => r.value === p.rol)?.label ?? p.rol ?? "Calisan"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <select
                    className="border rounded-md px-3 py-1.5 text-sm bg-background"
                    value={changes[p.id] ?? p.rol ?? "calisan"}
                    onChange={e => handleRoleChange(p.id, e.target.value)}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  {changes[p.id] && changes[p.id] !== p.rol && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(p.id)}
                      disabled={saving === p.id}
                    >
                      {saving === p.id ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
