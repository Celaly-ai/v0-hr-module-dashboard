"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Uyumsuzluk = {
  id: string
  uyumsuzluk_no: string
  aciklama: string | null
  kategori: string | null
  durum: string
  bildiren: string | null
  olusturma_tarihi: string | null
  kapanis_tarihi: string | null
  personel_id: string | null
}

export function ServisRaporlariSection() {
  const supabase = createClient()
  const { profile } = useAuth()

  const [raporlar, setRaporlar] = useState<Uyumsuzluk[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from("uyumsuzluklar")
      .select("*")
      .order("olusturma_tarihi", { ascending: false })

    const isYonetici = ["admin", "servis_yoneticisi", "ik_yoneticisi"].includes(
      profile?.role ?? ""
    )

    if (!isYonetici) {
      query = query.eq("personel_id", profile?.personel_id)
    }

    const { data } = await query

    setRaporlar(data ?? [])
    setLoading(false)
  }, [profile?.personel_id, profile?.role, supabase])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  function getDurumColor(durum: string) {
    if (durum === "Açık") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    if (durum === "Kapalı") return "bg-green-500/10 text-green-400 border-green-500/20"
    return "bg-gray-500/10 text-gray-400 border-gray-500/20"
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Servis Raporları</h2>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">Yükleniyor...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>Bildiren</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {raporlar.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.uyumsuzluk_no}</TableCell>
                <TableCell>{r.kategori ?? "-"}</TableCell>
                <TableCell>{r.aciklama ?? "-"}</TableCell>
                <TableCell>{r.bildiren ?? "-"}</TableCell>
                <TableCell>
                  {r.olusturma_tarihi
                    ? r.olusturma_tarihi.slice(0, 10)
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge className={getDurumColor(r.durum)}>
                    {r.durum}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}

            {raporlar.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-6">
                  Kayıt bulunamadı
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
