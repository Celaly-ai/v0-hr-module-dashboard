"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatTime, getStatusColor } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

type Rapor = {
  personel_id: string
  ad: string
  soyad: string
  departman: string
  tarih: string | null
  ilk_giris: string | null
  son_cikis: string | null
  giris_durumu: string | null
  gecikme_dakika: number | null
  toplam_calisma_dakika: number | null
}

export default function RaporlarPage() {
  const supabase = useMemo(() => createClient(), [])

  const [data, setData] = useState<Rapor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("v_gunluk_giris_cikis_raporu")
        .select("*")
        .order("tarih", { ascending: false })

      if (error) {
        setError(error.message)
        setData([])
      } else {
        setData(data ?? [])
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const stats = useMemo(() => {
    return {
      toplam: data.length,
      zamaninda: data.filter((x) => x.giris_durumu === "Zamanında").length,
      gec: data.filter((x) => x.giris_durumu === "Geç Geldi").length,
      gelmedi: data.filter((x) => x.giris_durumu === "Gelmedi").length,
    }
  }, [data])

  const gecKalanlar = useMemo(() => {
    return data
      .filter((x) => (x.gecikme_dakika ?? 0) > 0)
      .map((x) => ({
        name: `${x.ad} ${x.soyad}`,
        dakika: Math.round(x.gecikme_dakika ?? 0),
      }))
      .sort((a, b) => b.dakika - a.dakika)
      .slice(0, 10)
  }, [data])

  const durumDagilimi = useMemo(() => {
    return [
      { name: "Zamanında", value: stats.zamaninda, color: "#22c55e" },
      { name: "Geç Geldi", value: stats.gec, color: "#f59e0b" },
      { name: "Gelmedi", value: stats.gelmedi, color: "#ef4444" },
    ].filter((x) => x.value > 0)
  }, [stats])

  function dakikaFormat(value: number | null) {
    if (value === null || value === undefined) return "-"
    return `${Math.round(value)} dk`
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personel Raporları</h1>
        <p className="text-sm text-muted-foreground">
          Giriş/çıkış, geç kalma ve günlük çalışma raporu
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Toplam Kayıt" value={stats.toplam} tone="default" />
        <KpiCard title="Zamanında" value={stats.zamaninda} tone="success" />
        <KpiCard title="Geç Gelen" value={stats.gec} tone="warning" />
        <KpiCard title="Gelmeyen" value={stats.gelmedi} tone="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold mb-4">En Çok Geç Kalanlar</h2>

          <div className="h-[280px]">
            {gecKalanlar.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Geç kalan personel kaydı bulunamadı.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gecKalanlar}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="dakika" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold mb-4">Durum Dağılımı</h2>

          <div className="h-[280px]">
            {durumDagilimi.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Dağılım için kayıt bulunamadı.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={durumDagilimi}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={95}
                    label
                  >
                    {durumDagilimi.map((item, index) => (
                      <Cell key={index} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Detaylı Günlük Rapor</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-400">
            Rapor verisi alınamadı: {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="p-3 text-left">Personel</th>
                  <th className="p-3 text-left">Departman</th>
                  <th className="p-3 text-center">Tarih</th>
                  <th className="p-3 text-center">Giriş</th>
                  <th className="p-3 text-center">Çıkış</th>
                  <th className="p-3 text-center">Durum</th>
                  <th className="p-3 text-center">Geç Dk</th>
                  <th className="p-3 text-center">Çalışma Dk</th>
                </tr>
              </thead>

              <tbody>
                {data.map((r, index) => (
                  <tr
                    key={`${r.personel_id}-${r.tarih}-${index}`}
                    className="border-t"
                  >
                    <td className="p-3 font-medium">
                      {r.ad} {r.soyad}
                    </td>
                    <td className="p-3">{r.departman}</td>
                    <td className="p-3 text-center">{formatDate(r.tarih)}</td>
                    <td className="p-3 text-center">{formatTime(r.ilk_giris)}</td>
                    <td className="p-3 text-center">{formatTime(r.son_cikis)}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${getStatusColor(
                          r.giris_durumu ?? "",
                        )}`}
                      >
                        {r.giris_durumu ?? "-"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {dakikaFormat(r.gecikme_dakika)}
                    </td>
                    <td className="p-3 text-center">
                      {dakikaFormat(r.toplam_calisma_dakika)}
                    </td>
                  </tr>
                ))}

                {data.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-muted-foreground"
                    >
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  tone,
}: {
  title: string
  value: number
  tone: "default" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "text-green-400"
      : tone === "warning"
        ? "text-yellow-400"
        : tone === "danger"
          ? "text-red-400"
          : "text-foreground"

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${toneClass}`}>{value}</p>
    </div>
  )
}
