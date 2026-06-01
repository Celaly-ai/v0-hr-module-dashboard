"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type TeslimKayit = {
  id: string
  kayit_no: string
  urun_adi: string | null
  miktar: number | null
  birim: string | null
  teslim_alan: string | null
  teslim_tarihi: string | null
  notlar: string | null
}

export function DepoTeslimSection() {
  const [kayitlar, setKayitlar] = useState<TeslimKayit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("teslim_kayitlari")
        .select("*")
        .order("teslim_tarihi", { ascending: false })
      if (!error && data) setKayitlar(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-6">Yukleniyor...</div>

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Depo Teslim</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kayit No</TableHead>
              <TableHead>Urun</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead>Teslim Alan</TableHead>
              <TableHead>Teslim Tarihi</TableHead>
              <TableHead>Notlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kayitlar.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Henuz teslim kaydi bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              kayitlar.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.kayit_no}</TableCell>
                  <TableCell>{item.urun_adi ?? "-"}</TableCell>
                  <TableCell>{item.miktar ?? "-"}</TableCell>
                  <TableCell>{item.birim ?? "-"}</TableCell>
                  <TableCell>{item.teslim_alan ?? "-"}</TableCell>
                  <TableCell>{item.teslim_tarihi ?? "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.notlar ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
