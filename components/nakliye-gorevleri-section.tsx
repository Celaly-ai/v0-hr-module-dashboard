"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type NakliyeGorevi = {
  id: string
  gorev_no: string
  arac_plaka: string | null
  sofor: string | null
  kalkis_noktasi: string | null
  varis_noktasi: string | null
  durum: string
  planlanan_tarih: string | null
}

export function NakliyeGorevleriSection() {
  const [gorevler, setGorevler] = useState<NakliyeGorevi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("nakliye_gorevleri")
        .select("*")
        .order("planlanan_tarih", { ascending: true })
      if (!error && data) setGorevler(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-6">Yukleniyor...</div>

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Nakliye Gorevleri</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gorev No</TableHead>
              <TableHead>Arac Plaka</TableHead>
              <TableHead>Sofor</TableHead>
              <TableHead>Kalkis</TableHead>
              <TableHead>Varis</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Planlanan Tarih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gorevler.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Henuz nakliye gorevi bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              gorevler.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.gorev_no}</TableCell>
                  <TableCell>{item.arac_plaka ?? "-"}</TableCell>
                  <TableCell>{item.sofor ?? "-"}</TableCell>
                  <TableCell>{item.kalkis_noktasi ?? "-"}</TableCell>
                  <TableCell>{item.varis_noktasi ?? "-"}</TableCell>
                  <TableCell><Badge variant="secondary">{item.durum}</Badge></TableCell>
                  <TableCell>{item.planlanan_tarih ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
