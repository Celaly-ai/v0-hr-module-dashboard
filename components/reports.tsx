"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  Users,
  Calendar,
  Package,
  FolderOpen,
  AlertTriangle,
  Download,
  TrendingDown,
  UserPlus,
  UserMinus,
  UserCog,
  FileBarChart,
} from "lucide-react"
import { EmployeeReportView } from "./employee-report"
import {
  employees,
  leaveRequests,
  assets,
  documentRecords,
  disciplineRecords,
  getAssetCategoryLabel,
  getViolationTypeLabel,
  getDocumentTypeLabel,
} from "@/lib/hr-data"

type DateRange = "bu-ay" | "son-3-ay" | "bu-yil"

const CHART_COLORS = [
  "oklch(0.65 0.18 165)",
  "oklch(0.7 0.15 200)",
  "oklch(0.65 0.2 40)",
  "oklch(0.75 0.12 80)",
  "oklch(0.6 0.15 280)",
  "oklch(0.65 0.18 145)",
  "oklch(0.55 0.18 230)",
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-lg">
        {label && <p className="text-xs font-medium text-foreground mb-1">{label}</p>}
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.payload?.fill }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {typeof entry.value === "number" ? entry.value.toLocaleString("tr-TR") : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date("2026-04-16")
  const expiry = new Date(expiryDate)
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getMonthLabel(monthIndex: number): string {
  const months = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"]
  return months[monthIndex]
}

export function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>("bu-yil")
  const [activeTab, setActiveTab] = useState("personel")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id ?? "")

  // ============ PERSONEL OZETI ============
  const departmentData = useMemo(() => {
    const counts = employees.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
  }, [])

  const workTypeData = useMemo(() => {
    const labels: Record<string, string> = {
      "tam-zamanli": "Tam Zamanli",
      vardiyali: "Vardiyali",
      saha: "Saha",
      uzaktan: "Uzaktan",
    }
    const counts = employees.reduce((acc, emp) => {
      acc[emp.workType] = (acc[emp.workType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] || key,
      value,
    }))
  }, [])

  const hiringTrendData = useMemo(() => {
    // Last 12 months
    const now = new Date("2026-04-16")
    const months: { month: string; hires: number; terminations: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const hires = employees.filter((e) => e.startDate.startsWith(monthKey)).length
      // Simulated terminations based on contract end dates
      const terminations = employees.filter(
        (e) => e.contractEndDate && e.contractEndDate.startsWith(monthKey),
      ).length
      months.push({
        month: getMonthLabel(d.getMonth()),
        hires,
        terminations,
      })
    }
    return months
  }, [])

  const totalHires = hiringTrendData.reduce((sum, m) => sum + m.hires, 0)
  const totalTerminations = hiringTrendData.reduce((sum, m) => sum + m.terminations, 0)

  // ============ IZIN ANALIZI ============
  const leaveTypeData = useMemo(() => {
    const labels: Record<string, string> = {
      vacation: "Yillik Izin",
      sick: "Hastalik",
      excuse: "Mazeret",
      unpaid: "Ucretsiz",
    }
    const counts = leaveRequests.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts).map(([key, value]) => ({
      type: labels[key] || key,
      count: value,
    }))
  }, [])

  const leaveMonthlyTrend = useMemo(() => {
    const now = new Date("2026-04-16")
    const months: { month: string; approved: number; pending: number; rejected: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const monthRequests = leaveRequests.filter((r) => r.submittedAt.startsWith(monthKey))
      months.push({
        month: getMonthLabel(d.getMonth()),
        approved: monthRequests.filter((r) => r.status === "approved").length,
        pending: monthRequests.filter((r) => r.status === "pending").length,
        rejected: monthRequests.filter((r) => r.status === "rejected").length,
      })
    }
    return months
  }, [])

  const topLeaveEmployees = useMemo(() => {
    const tally = new Map<string, { name: string; days: number }>()
    for (const req of leaveRequests) {
      if (req.status === "rejected") continue
      const days =
        Math.ceil(
          (new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      const prev = tally.get(req.employeeId) ?? { name: req.employeeName, days: 0 }
      prev.days += days
      tally.set(req.employeeId, prev)
    }
    return Array.from(tally.values())
      .sort((a, b) => b.days - a.days)
      .slice(0, 5)
  }, [])

  // ============ ZIMMET RAPORU ============
  const assetCategoryData = useMemo(() => {
    const counts = assets.reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts).map(([key, value]) => ({
      name: getAssetCategoryLabel(key as any),
      value,
    }))
  }, [])

  const assetValueByDepartment = useMemo(() => {
    const employeeMap = new Map(employees.map((e) => [e.id, e]))
    const tally: Record<string, number> = {}
    for (const asset of assets) {
      if (!asset.assignedTo) continue
      const emp = employeeMap.get(asset.assignedTo)
      if (!emp) continue
      tally[emp.department] = (tally[emp.department] || 0) + asset.value
    }
    return Object.entries(tally)
      .map(([department, value]) => ({ department, value }))
      .sort((a, b) => b.value - a.value)
  }, [])

  const totalAssetValue = assets.reduce((sum, a) => sum + a.value, 0)
  const assignedAssets = assets.filter((a) => a.status === "zimmetli").length

  // ============ BELGE DURUMU ============
  const documentStatusData = useMemo(() => {
    let valid = 0
    let expiring = 0
    let expired = 0
    for (const doc of documentRecords) {
      const days = getDaysUntilExpiry(doc.expiryDate)
      if (days < 0) expired++
      else if (days <= 30) expiring++
      else valid++
    }
    return { valid, expiring, expired }
  }, [])

  const expiringDocuments = useMemo(() => {
    return documentRecords
      .map((d) => ({ ...d, daysRemaining: getDaysUntilExpiry(d.expiryDate) }))
      .filter((d) => d.daysRemaining <= 60)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 8)
  }, [])

  // ============ DISIPLIN OZETI ============
  const violationTypeData = useMemo(() => {
    const counts = disciplineRecords.reduce((acc, rec) => {
      acc[rec.violationType] = (acc[rec.violationType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts).map(([key, value]) => ({
      type: getViolationTypeLabel(key as any),
      count: value,
    }))
  }, [])

  const disciplineMonthlyTrend = useMemo(() => {
    const now = new Date("2026-04-16")
    const months: { month: string; uyari: number; ihtar: number; fesih: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const monthRecords = disciplineRecords.filter((r) => r.date.startsWith(monthKey))
      months.push({
        month: getMonthLabel(d.getMonth()),
        uyari: monthRecords.filter((r) => r.severity === "uyari").length,
        ihtar: monthRecords.filter((r) => r.severity === "ihtar").length,
        fesih: monthRecords.filter((r) => r.severity === "fesih").length,
      })
    }
    return months
  }, [])

  const handleExportExcel = () => {
    // Build CSV with BOM for Excel Turkish char support
    const rows: string[][] = []
    rows.push(["FeyRoute IK Raporu"])
    rows.push([`Tarih Araligi: ${dateRangeLabel(dateRange)}`])
    rows.push([`Olusturulma: ${new Date().toLocaleString("tr-TR")}`])
    rows.push([])

    rows.push(["PERSONEL OZETI"])
    rows.push(["Departman", "Calisan Sayisi"])
    departmentData.forEach((d) => rows.push([d.department, String(d.count)]))
    rows.push([])
    rows.push(["Calisma Tipi", "Adet"])
    workTypeData.forEach((w) => rows.push([w.name, String(w.value)]))
    rows.push([])

    rows.push(["IZIN ANALIZI"])
    rows.push(["Izin Turu", "Talep Sayisi"])
    leaveTypeData.forEach((l) => rows.push([l.type, String(l.count)]))
    rows.push([])
    rows.push(["En Cok Izin Kullanan 5 Calisan"])
    rows.push(["Calisan", "Gun"])
    topLeaveEmployees.forEach((e) => rows.push([e.name, String(e.days)]))
    rows.push([])

    rows.push(["ZIMMET RAPORU"])
    rows.push(["Kategori", "Adet"])
    assetCategoryData.forEach((a) => rows.push([a.name, String(a.value)]))
    rows.push([])
    rows.push(["Departman", "Toplam Deger (TL)"])
    assetValueByDepartment.forEach((a) =>
      rows.push([a.department, a.value.toLocaleString("tr-TR")]),
    )
    rows.push([])

    rows.push(["BELGE DURUMU"])
    rows.push(["Gecerli", "Suresi Yaklasan", "Suresi Dolmus"])
    rows.push([
      String(documentStatusData.valid),
      String(documentStatusData.expiring),
      String(documentStatusData.expired),
    ])
    rows.push([])

    rows.push(["DISIPLIN OZETI"])
    rows.push(["Ihlal Turu", "Adet"])
    violationTypeData.forEach((v) => rows.push([v.type, String(v.count)]))

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ik-raporu-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Raporlar ve Analizler</h2>
          <p className="text-sm text-muted-foreground mt-1">
            IK verilerinin kapsamli analizi ve gorsellestirmesi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bu-ay">Bu Ay</SelectItem>
              <SelectItem value="son-3-ay">Son 3 Ay</SelectItem>
              <SelectItem value="bu-yil">Bu Yil</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel Indir
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Toplam Calisan</p>
              <p className="text-xl font-semibold text-foreground">{employees.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <Calendar className="h-4 w-4 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Izin Talepleri</p>
              <p className="text-xl font-semibold text-foreground">{leaveRequests.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Package className="h-4 w-4 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Zimmetli Varlik</p>
              <p className="text-xl font-semibold text-foreground">{assignedAssets}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-2/20">
              <FolderOpen className="h-4 w-4" style={{ color: "oklch(0.7 0.15 200)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Belgeler</p>
              <p className="text-xl font-semibold text-foreground">{documentRecords.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Disiplin Kaydi</p>
              <p className="text-xl font-semibold text-foreground">{disciplineRecords.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full md:w-auto h-auto p-1">
          <TabsTrigger value="personel" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Personel Ozeti</span>
            <span className="sm:hidden">Personel</span>
          </TabsTrigger>
          <TabsTrigger value="izin" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Izin Analizi</span>
            <span className="sm:hidden">Izin</span>
          </TabsTrigger>
          <TabsTrigger value="zimmet" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Zimmet Raporu</span>
            <span className="sm:hidden">Zimmet</span>
          </TabsTrigger>
          <TabsTrigger value="belge" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Belge Durumu</span>
            <span className="sm:hidden">Belge</span>
          </TabsTrigger>
          <TabsTrigger value="disiplin" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Disiplin Ozeti</span>
            <span className="sm:hidden">Disiplin</span>
          </TabsTrigger>
          <TabsTrigger value="calisan-raporu" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Calisan Raporu</span>
            <span className="sm:hidden">Calisan</span>
          </TabsTrigger>
        </TabsList>

        {/* ============ PERSONEL OZETI ============ */}
        <TabsContent value="personel" className="space-y-6 mt-0">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="p-5 border-border lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Departmana Gore Calisan Sayisi</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toplam {employees.length} calisan
                  </p>
                </div>
                <Badge variant="outline" className="bg-secondary border-border">
                  {departmentData.length} Departman
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.28 0.01 260)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="department"
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.22 0.01 260)" }} />
                  <Bar
                    dataKey="count"
                    name="Calisan"
                    fill="oklch(0.65 0.18 165)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Calisma Tipi Dagilimi</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={workTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {workTypeData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        stroke="oklch(0.17 0.01 260)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {workTypeData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Ise Girisler ve Cikislar</h3>
                <p className="text-xs text-muted-foreground mt-1">Son 12 ay trendi</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-success/20">
                    <UserPlus className="h-3.5 w-3.5 text-success" />
                  </div>
                  <div className="text-xs">
                    <p className="text-muted-foreground">Giris</p>
                    <p className="font-semibold text-foreground">{totalHires}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-destructive/20">
                    <UserMinus className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="text-xs">
                    <p className="text-muted-foreground">Cikis</p>
                    <p className="font-semibold text-foreground">{totalTerminations}</p>
                  </div>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={hiringTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.01 260)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                />
                <YAxis
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", color: "oklch(0.6 0 0)" }}
                />
                <Line
                  type="monotone"
                  dataKey="hires"
                  name="Ise Girenler"
                  stroke="oklch(0.65 0.18 145)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.18 145)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="terminations"
                  name="Ayrilanlar"
                  stroke="oklch(0.6 0.2 25)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.6 0.2 25)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* ============ IZIN ANALIZI ============ */}
        <TabsContent value="izin" className="space-y-6 mt-0">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Izin Turune Gore Kullanim</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toplam {leaveRequests.length} talep
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leaveTypeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.28 0.01 260)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="type"
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.22 0.01 260)" }} />
                  <Bar
                    dataKey="count"
                    name="Talep"
                    fill="oklch(0.7 0.15 200)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">En Cok Izin Kullananlar</h3>
                  <p className="text-xs text-muted-foreground mt-1">Top 5 Calisan</p>
                </div>
              </div>
              {topLeaveEmployees.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Izin kaydi bulunamadi
                </div>
              ) : (
                <div className="space-y-3">
                  {topLeaveEmployees.map((emp, idx) => {
                    const max = topLeaveEmployees[0].days
                    const pct = max > 0 ? (emp.days / max) * 100 : 0
                    return (
                      <div key={emp.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                              {idx + 1}
                            </div>
                            <span className="text-foreground font-medium">{emp.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {emp.days} gun
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-5 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Aylik Izin Trendi</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Onay durumuna gore son 12 ay
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={leaveMonthlyTrend}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.01 260)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                />
                <YAxis
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", color: "oklch(0.6 0 0)" }}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  name="Onaylandi"
                  stroke="oklch(0.65 0.18 145)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.18 145)", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Beklemede"
                  stroke="oklch(0.75 0.15 80)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.75 0.15 80)", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  name="Reddedildi"
                  stroke="oklch(0.6 0.2 25)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.6 0.2 25)", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* ============ ZIMMET RAPORU ============ */}
        <TabsContent value="zimmet" className="space-y-6 mt-0">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Kategoriye Gore Varliklar</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toplam {assets.length} varlik
                  </p>
                </div>
                <Badge variant="outline" className="bg-secondary border-border">
                  {(totalAssetValue / 1000).toLocaleString("tr-TR")}k TL
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={assetCategoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {assetCategoryData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        stroke="oklch(0.17 0.01 260)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {assetCategoryData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Departmana Gore Toplam Deger</h3>
                  <p className="text-xs text-muted-foreground mt-1">Zimmetli varlik degeri (TL)</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={assetValueByDepartment}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.28 0.01 260)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                    width={110}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "oklch(0.22 0.01 260)" }}
                  />
                  <Bar
                    dataKey="value"
                    name="Deger (TL)"
                    fill="oklch(0.65 0.18 165)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        {/* ============ BELGE DURUMU ============ */}
        <TabsContent value="belge" className="space-y-6 mt-0">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-5 border-border border-l-4 border-l-success">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gecerli Belgeler</p>
                  <p className="text-3xl font-semibold text-foreground mt-1">
                    {documentStatusData.valid}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">30 gunden fazla</p>
                </div>
                <div className="p-3 rounded-xl bg-success/20">
                  <FolderOpen className="h-6 w-6 text-success" />
                </div>
              </div>
            </Card>
            <Card className="p-5 border-border border-l-4 border-l-warning">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suresi Yaklasan</p>
                  <p className="text-3xl font-semibold text-foreground mt-1">
                    {documentStatusData.expiring}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">30 gun icinde</p>
                </div>
                <div className="p-3 rounded-xl bg-warning/20">
                  <TrendingDown className="h-6 w-6 text-warning" />
                </div>
              </div>
            </Card>
            <Card className="p-5 border-border border-l-4 border-l-destructive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suresi Dolmus</p>
                  <p className="text-3xl font-semibold text-foreground mt-1">
                    {documentStatusData.expired}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Yenileme gerekli</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/20">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Suresi Yaklasan Belgeler</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  60 gun icinde yenilenmesi gereken belgeler
                </p>
              </div>
              <Badge variant="outline" className="bg-secondary border-border">
                {expiringDocuments.length} belge
              </Badge>
            </div>
            {expiringDocuments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Suresi yaklasan belge yok
              </div>
            ) : (
              <div className="space-y-2">
                {expiringDocuments.map((doc) => {
                  const expired = doc.daysRemaining < 0
                  const urgent = doc.daysRemaining >= 0 && doc.daysRemaining <= 7
                  const statusLabel = expired
                    ? `${Math.abs(doc.daysRemaining)} gun gecmis`
                    : doc.daysRemaining === 0
                      ? "Bugun doluyor"
                      : `${doc.daysRemaining} gun kaldi`

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                            expired
                              ? "bg-destructive/20"
                              : urgent
                                ? "bg-destructive/20"
                                : "bg-warning/20"
                          }`}
                        >
                          <FolderOpen
                            className={`h-4 w-4 ${
                              expired || urgent ? "text-destructive" : "text-warning"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {doc.employeeName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getDocumentTypeLabel(doc.documentType)} - {doc.documentNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.expiryDate).toLocaleDateString("tr-TR")}
                          </p>
                          <p
                            className={`text-xs font-semibold ${
                              expired || urgent ? "text-destructive" : "text-warning"
                            }`}
                          >
                            {statusLabel}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            expired
                              ? "bg-destructive/20 text-destructive border-destructive/30"
                              : urgent
                                ? "bg-destructive/20 text-destructive border-destructive/30"
                                : "bg-warning/20 text-warning border-warning/30"
                          }
                        >
                          {expired ? "Suresi Dolmus" : urgent ? "Kritik" : "Yaklasan"}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ============ DISIPLIN OZETI ============ */}
        <TabsContent value="disiplin" className="space-y-6 mt-0">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Ihlal Turune Gore Dagilim</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toplam {disciplineRecords.length} kayit
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={violationTypeData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.28 0.01 260)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="type"
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.22 0.01 260)" }} />
                  <Bar
                    dataKey="count"
                    name="Kayit"
                    fill="oklch(0.6 0.2 25)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Siddet Seviyesi Ozeti</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kayitlarin ciddiyet dagilimi
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {(["uyari", "ihtar", "fesih"] as const).map((sev) => {
                  const count = disciplineRecords.filter((r) => r.severity === sev).length
                  const pct =
                    disciplineRecords.length > 0
                      ? (count / disciplineRecords.length) * 100
                      : 0
                  const severityLabels: Record<typeof sev, string> = {
                    uyari: "Uyari",
                    ihtar: "Ihtar",
                    fesih: "Fesih",
                  }
                  const colors: Record<typeof sev, string> = {
                    uyari: "oklch(0.75 0.15 80)",
                    ihtar: "oklch(0.65 0.2 40)",
                    fesih: "oklch(0.6 0.2 25)",
                  }
                  return (
                    <div key={sev} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: colors[sev] }}
                          />
                          <span className="text-foreground font-medium">
                            {severityLabels[sev]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-semibold">{count}</span>
                          <span className="text-muted-foreground text-xs">
                            (%{pct.toFixed(0)})
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: colors[sev],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">Son Kayitlar</h4>
                <div className="space-y-2">
                  {disciplineRecords.slice(0, 3).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between text-sm p-2 rounded-md bg-secondary/50"
                    >
                      <div>
                        <p className="text-foreground font-medium">{rec.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {getViolationTypeLabel(rec.violationType)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          rec.severity === "fesih"
                            ? "bg-destructive/20 text-destructive border-destructive/30"
                            : rec.severity === "ihtar"
                              ? "bg-chart-3/20 text-chart-3 border-chart-3/30"
                              : "bg-warning/20 text-warning border-warning/30"
                        }
                        style={
                          rec.severity === "ihtar"
                            ? {
                                backgroundColor: "oklch(0.65 0.2 40 / 0.2)",
                                color: "oklch(0.75 0.2 40)",
                                borderColor: "oklch(0.65 0.2 40 / 0.3)",
                              }
                            : undefined
                        }
                      >
                        {rec.severity === "uyari"
                          ? "Uyari"
                          : rec.severity === "ihtar"
                            ? "Ihtar"
                            : "Fesih"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Aylik Disiplin Trendi</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Siddet seviyesine gore son 6 ay
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={disciplineMonthlyTrend}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.01 260)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                />
                <YAxis
                  tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(0.28 0.01 260)" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", color: "oklch(0.6 0 0)" }}
                />
                <Line
                  type="monotone"
                  dataKey="uyari"
                  name="Uyari"
                  stroke="oklch(0.75 0.15 80)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.75 0.15 80)", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="ihtar"
                  name="Ihtar"
                  stroke="oklch(0.65 0.2 40)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.2 40)", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="fesih"
                  name="Fesih"
                  stroke="oklch(0.6 0.2 25)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.6 0.2 25)", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* ============ CALISAN RAPORU ============ */}
        <TabsContent value="calisan-raporu" className="space-y-5 mt-0">
          <Card className="p-5 border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Kisiye Ozel Calisan Raporu</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bir calisan secerek tum bilgilerini tek sayfada goruntuleyin ve yazdirin
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Calisan secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{emp.name}</span>
                          <span className="text-xs text-muted-foreground">
                            - {emp.department}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {selectedEmployeeId ? (
            <EmployeeReportView employeeId={selectedEmployeeId} variant="inline" />
          ) : (
            <Card className="p-12 text-center border-border">
              <FileBarChart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Rapor goruntulemek icin bir calisan secin.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function dateRangeLabel(range: DateRange): string {
  switch (range) {
    case "bu-ay":
      return "Bu Ay"
    case "son-3-ay":
      return "Son 3 Ay"
    case "bu-yil":
      return "Bu Yil"
  }
}
