"use client"

import { useMemo, useState } from "react"
import {
  Timer,
  Plus,
  Search,
  Download,
  AlertTriangle,
  TrendingUp,
  Check,
  X,
  Clock,
  CalendarDays,
  FileText,
  Pencil,
  Trash2,
  ChevronDown,
  Users as UsersIcon,
  BadgeDollarSign,
  Filter,
} from "lucide-react"
import {
  employees,
  overtimeRecords as initialOvertimeRecords,
  calculateOvertimeHours,
  calculateOvertimeCost,
  formatTurkishCurrency,
  getIsoWeek,
  OVERTIME_STATUS_LABELS,
  WEEKLY_OVERTIME_LIMIT,
  YEARLY_OVERTIME_LIMIT,
  OVERTIME_MULTIPLIER,
  MONTHLY_WORK_HOURS,
  type OvertimeRecord,
  type OvertimeStatus,
  type Employee,
} from "@/lib/hr-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"

// -----------------------------
// Helpers
// -----------------------------

const STATUS_BADGE_CLASSES: Record<OvertimeStatus, string> = {
  bekliyor:
    "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20",
  onaylandi:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20",
  reddedildi:
    "border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/20",
}

const MONTH_NAMES = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
]

const WORK_DAYS_PER_MONTH = 21 // approx Turkish working days per month

function employeeById(id: string): Employee | undefined {
  return employees.find((e) => e.id === id)
}

function getEmployeeInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatDateTR(dateStr: string): string {
  if (!dateStr) return "-"
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatHours(h: number): string {
  if (h === 0) return "0 sa"
  // 1 decimal, drop trailing .0
  const rounded = Math.round(h * 10) / 10
  return `${rounded} sa`
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Aggregate helpers
interface EmployeeAggregate {
  employee: Employee
  monthlyHours: number
  monthlyCost: number
  yearlyHours: number
  monthlyCount: number
  pendingCount: number
  weekBreaches: { year: number; week: number; overtime: number }[]
  yearlyBreach: boolean
}

function aggregateByEmployee(
  records: OvertimeRecord[],
  filterYear: number,
  filterMonth: number | "all",
): EmployeeAggregate[] {
  const byEmp = new Map<string, OvertimeRecord[]>()
  for (const r of records) {
    if (r.status === "reddedildi") continue
    const list = byEmp.get(r.employeeId) ?? []
    list.push(r)
    byEmp.set(r.employeeId, list)
  }

  const out: EmployeeAggregate[] = []
  for (const emp of employees) {
    const list = byEmp.get(emp.id) ?? []
    let monthlyHours = 0
    let monthlyCount = 0
    let yearlyHours = 0
    let pendingCount = 0
    const weekMap = new Map<string, { year: number; week: number; overtime: number }>()

    for (const r of list) {
      const d = new Date(`${r.date}T00:00:00`)
      if (Number.isNaN(d.getTime())) continue
      const y = d.getFullYear()
      const m = d.getMonth()
      if (y !== filterYear) continue

      yearlyHours += r.overtimeHours
      if (filterMonth === "all" || m === filterMonth) {
        monthlyHours += r.overtimeHours
        monthlyCount++
        if (r.status === "bekliyor") pendingCount++
      }

      // Weekly aggregation (only counted overtime, on top of 45h regular)
      const { year: wy, week: ww } = getIsoWeek(r.date)
      const key = `${wy}-${ww}`
      const prev = weekMap.get(key) ?? { year: wy, week: ww, overtime: 0 }
      prev.overtime += r.overtimeHours
      weekMap.set(key, prev)
    }

    // Regular week is already 45h, so ANY approved overtime places the
    // employee above the 45h weekly ceiling - flag any week with >0 overtime.
    const weekBreaches = Array.from(weekMap.values()).filter(
      (w) => w.overtime > 0,
    )

    const monthlyCost = calculateOvertimeCost(emp.grossSalary, monthlyHours)

    out.push({
      employee: emp,
      monthlyHours,
      monthlyCost,
      yearlyHours,
      monthlyCount,
      pendingCount,
      weekBreaches,
      yearlyBreach: yearlyHours > YEARLY_OVERTIME_LIMIT,
    })
  }
  return out.sort((a, b) => b.monthlyHours - a.monthlyHours)
}

// -----------------------------
// Main component
// -----------------------------

interface FormState {
  id: string | null
  employeeId: string
  date: string
  plannedEndTime: string
  actualEndTime: string
  reason: string
  status: OvertimeStatus
}

const emptyForm: FormState = {
  id: null,
  employeeId: "",
  date: todayISO(),
  plannedEndTime: "18:00",
  actualEndTime: "20:00",
  reason: "",
  status: "bekliyor",
}

export function OvertimeTracking() {
  const [records, setRecords] = useState<OvertimeRecord[]>(initialOvertimeRecords)

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | "all">("all")
  const [empFilter, setEmpFilter] = useState<string>("all")
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const [year, setYear] = useState<number>(currentYear)
  const [month, setMonth] = useState<number | "all">(currentDate.getMonth())

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Rejection modal
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // Summary modal per employee (detail)
  const [detailEmpId, setDetailEmpId] = useState<string | null>(null)

  // Distinct years for selector
  const years = useMemo(() => {
    const s = new Set<number>([currentYear])
    for (const r of records) {
      const y = new Date(`${r.date}T00:00:00`).getFullYear()
      if (!Number.isNaN(y)) s.add(y)
    }
    return Array.from(s).sort((a, b) => b - a)
  }, [records, currentYear])

  // Auto-calculated OT hours for the form
  const formOvertime = useMemo(
    () => calculateOvertimeHours(form.plannedEndTime, form.actualEndTime),
    [form.plannedEndTime, form.actualEndTime],
  )

  // Filtered records for the list table
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records
      .filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false
        if (empFilter !== "all" && r.employeeId !== empFilter) return false
        const d = new Date(`${r.date}T00:00:00`)
        if (!Number.isNaN(d.getTime())) {
          if (d.getFullYear() !== year) return false
          if (month !== "all" && d.getMonth() !== month) return false
        }
        if (q) {
          const hay =
            `${r.employeeName} ${r.department} ${r.reason}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [records, search, statusFilter, empFilter, year, month])

  // Employee aggregates for current month/year
  const aggregates = useMemo(
    () => aggregateByEmployee(records, year, month),
    [records, year, month],
  )

  // KPIs
  const kpi = useMemo(() => {
    const relevant = records.filter((r) => {
      const d = new Date(`${r.date}T00:00:00`)
      if (Number.isNaN(d.getTime())) return false
      if (d.getFullYear() !== year) return false
      if (month !== "all" && d.getMonth() !== month) return false
      return r.status !== "reddedildi"
    })

    const totalHours = relevant.reduce((s, r) => s + r.overtimeHours, 0)
    const pending = records.filter((r) => {
      if (r.status !== "bekliyor") return false
      const d = new Date(`${r.date}T00:00:00`)
      if (Number.isNaN(d.getTime())) return false
      if (d.getFullYear() !== year) return false
      if (month !== "all" && d.getMonth() !== month) return false
      return true
    }).length

    // Total estimated cost across all employees for the filtered period
    let totalCost = 0
    for (const agg of aggregates) {
      totalCost += agg.monthlyCost
    }

    const warningCount = aggregates.filter(
      (a) => a.yearlyBreach || a.weekBreaches.some((w) => w.overtime > 10),
    ).length

    return {
      totalHours,
      recordCount: relevant.length,
      pending,
      totalCost,
      warningCount,
    }
  }, [records, aggregates, year, month])

  // Top 5 chart data
  const topChartData = useMemo(() => {
    return aggregates
      .filter((a) => a.monthlyHours > 0)
      .slice(0, 5)
      .map((a) => ({
        name: a.employee.name.split(" ").slice(-1)[0], // last name to keep labels short
        fullName: a.employee.name,
        hours: Math.round(a.monthlyHours * 10) / 10,
        isWarning:
          a.yearlyBreach || a.weekBreaches.some((w) => w.overtime > 10),
      }))
  }, [aggregates])

  // -----------------------------
  // Mutations
  // -----------------------------

  function openNewForm() {
    setForm({ ...emptyForm })
    setFormErrors({})
    setFormOpen(true)
  }

  function openEditForm(r: OvertimeRecord) {
    setForm({
      id: r.id,
      employeeId: r.employeeId,
      date: r.date,
      plannedEndTime: r.plannedEndTime,
      actualEndTime: r.actualEndTime,
      reason: r.reason,
      status: r.status,
    })
    setFormErrors({})
    setFormOpen(true)
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {}
    if (!form.employeeId) errs.employeeId = "Calisan seciniz."
    if (!form.date) errs.date = "Tarih seciniz."
    if (!form.plannedEndTime) errs.plannedEndTime = "Planli bitis saati gerekli."
    if (!form.actualEndTime) errs.actualEndTime = "Gercek cikis saati gerekli."
    if (formOvertime <= 0) {
      errs.actualEndTime =
        "Gercek cikis, planli bitisten sonra olmalidir."
    }
    if (!form.reason.trim()) errs.reason = "Fazla mesai nedeni gerekli."
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  function submitForm() {
    if (!validateForm()) return
    const emp = employeeById(form.employeeId)
    if (!emp) return

    const newOvertime = calculateOvertimeHours(
      form.plannedEndTime,
      form.actualEndTime,
    )

    if (form.id) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === form.id
            ? {
                ...r,
                employeeId: emp.id,
                employeeName: emp.name,
                employeeAvatar: emp.avatar,
                department: emp.department,
                date: form.date,
                plannedEndTime: form.plannedEndTime,
                actualEndTime: form.actualEndTime,
                overtimeHours: newOvertime,
                reason: form.reason.trim(),
                status: form.status,
              }
            : r,
        ),
      )
    } else {
      const next: OvertimeRecord = {
        id: `ot-${Date.now()}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeAvatar: emp.avatar,
        department: emp.department,
        date: form.date,
        plannedEndTime: form.plannedEndTime,
        actualEndTime: form.actualEndTime,
        overtimeHours: newOvertime,
        reason: form.reason.trim(),
        status: "bekliyor",
        submittedAt: todayISO(),
        reviewerId: null,
        reviewerName: null,
        reviewedAt: null,
        rejectionReason: null,
      }
      setRecords((prev) => [next, ...prev])
    }

    setFormOpen(false)
  }

  function approveRecord(id: string) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "onaylandi",
              reviewerId: "7",
              reviewerName: "Ahmet Yilmaz",
              reviewedAt: todayISO(),
              rejectionReason: null,
            }
          : r,
      ),
    )
  }

  function confirmReject() {
    if (!rejectId) return
    setRecords((prev) =>
      prev.map((r) =>
        r.id === rejectId
          ? {
              ...r,
              status: "reddedildi",
              reviewerId: "7",
              reviewerName: "Ahmet Yilmaz",
              reviewedAt: todayISO(),
              rejectionReason:
                rejectReason.trim() || "Talep yonetici tarafindan reddedildi.",
            }
          : r,
      ),
    )
    setRejectId(null)
    setRejectReason("")
  }

  function confirmDelete() {
    if (!deleteId) return
    setRecords((prev) => prev.filter((r) => r.id !== deleteId))
    setDeleteId(null)
  }

  // -----------------------------
  // Excel export (UTF-8 BOM CSV)
  // -----------------------------

  function exportCSV() {
    const rows: string[][] = [
      [
        "Tarih",
        "Calisan",
        "Departman",
        "Planli Bitis",
        "Gercek Cikis",
        "Fazla Mesai (saat)",
        "Neden",
        "Durum",
        "Onaylayan",
        "Tahmini Maliyet",
      ],
    ]
    for (const r of filteredRecords) {
      const emp = employeeById(r.employeeId)
      const cost = emp
        ? calculateOvertimeCost(emp.grossSalary, r.overtimeHours)
        : 0
      rows.push([
        r.date,
        r.employeeName,
        r.department,
        r.plannedEndTime,
        r.actualEndTime,
        r.overtimeHours.toFixed(2).replace(".", ","),
        r.reason.replace(/"/g, '""'),
        OVERTIME_STATUS_LABELS[r.status],
        r.reviewerName ?? "",
        Math.round(cost).toString(),
      ])
    }

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
              return `"${cell}"`
            }
            return cell
          })
          .join(","),
      )
      .join("\r\n")

    // UTF-8 BOM so Excel opens Turkish chars correctly
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const periodLabel =
      month === "all" ? `${year}` : `${MONTH_NAMES[month]}-${year}`
    a.download = `fazla-mesai-${periodLabel}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // -----------------------------
  // Detail data for selected employee
  // -----------------------------
  const detailData = useMemo(() => {
    if (!detailEmpId) return null
    const emp = employeeById(detailEmpId)
    if (!emp) return null
    const empRecords = records
      .filter((r) => r.employeeId === detailEmpId)
      .sort((a, b) => b.date.localeCompare(a.date))

    // Monthly history (this year)
    const monthly: { month: number; hours: number }[] = []
    for (let m = 0; m < 12; m++) {
      const total = empRecords
        .filter((r) => {
          const d = new Date(`${r.date}T00:00:00`)
          if (Number.isNaN(d.getTime())) return false
          return (
            d.getFullYear() === year &&
            d.getMonth() === m &&
            r.status !== "reddedildi"
          )
        })
        .reduce((s, r) => s + r.overtimeHours, 0)
      monthly.push({ month: m, hours: Math.round(total * 10) / 10 })
    }

    const yearlyTotal = empRecords
      .filter((r) => {
        const d = new Date(`${r.date}T00:00:00`)
        if (Number.isNaN(d.getTime())) return false
        return d.getFullYear() === year && r.status !== "reddedildi"
      })
      .reduce((s, r) => s + r.overtimeHours, 0)

    const yearlyCost = calculateOvertimeCost(emp.grossSalary, yearlyTotal)

    return {
      employee: emp,
      records: empRecords,
      monthly,
      yearlyTotal,
      yearlyCost,
    }
  }, [detailEmpId, records, year])

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Timer className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">
              Fazla Mesai Takibi
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Calisanlarin fazla mesai kayitlari, yonetici onayi, aylik ozet ve
            yasal limit takibi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
          <Button size="sm" onClick={openNewForm} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Fazla Mesai Talebi
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Toplam Fazla Mesai
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">
            {formatHours(kpi.totalHours)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {kpi.recordCount} kayit
          </p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Onay Bekleyen
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-amber-300">
            {kpi.pending}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Yonetici incelemesi bekliyor
          </p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BadgeDollarSign className="h-3.5 w-3.5" />
            Tahmini Maliyet
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">
            {formatTurkishCurrency(kpi.totalCost)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {OVERTIME_MULTIPLIER}x mesai carpani
          </p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UsersIcon className="h-3.5 w-3.5" />
            Calisan
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-foreground">
            {aggregates.filter((a) => a.monthlyHours > 0).length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Donem icinde mesai yapan
          </p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Limit Uyarisi
          </div>
          <p
            className={`mt-1.5 text-2xl font-semibold ${
              kpi.warningCount > 0 ? "text-rose-400" : "text-foreground"
            }`}
          >
            {kpi.warningCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Haftalik / yillik asim
          </p>
        </Card>
      </div>

      {/* Warning banner */}
      {aggregates.some(
        (a) => a.yearlyBreach || a.weekBreaches.some((w) => w.overtime > 10),
      ) && (
        <Card className="p-4 border-rose-500/40 bg-rose-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-rose-300">
                  Yasal Limit Uyarilari
                </p>
                <p className="text-xs text-muted-foreground">
                  Haftalik 45 saat toplam calisma suresi veya yillik{" "}
                  {YEARLY_OVERTIME_LIMIT} saat fazla mesai sinirini asan
                  calisanlar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {aggregates
                  .filter(
                    (a) =>
                      a.yearlyBreach ||
                      a.weekBreaches.some((w) => w.overtime > 10),
                  )
                  .map((a) => (
                    <button
                      key={a.employee.id}
                      type="button"
                      onClick={() => setDetailEmpId(a.employee.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 transition-colors"
                    >
                      <span className="font-medium">{a.employee.name}</span>
                      <span className="opacity-80">
                        {a.yearlyBreach
                          ? `yillik ${formatHours(a.yearlyHours)}`
                          : `haftalik asim`}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Kayitlar
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Aylik Ozet
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Grafik
          </TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filter bar */}
          <Card className="p-3 border-border">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Calisan, departman veya neden ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as OvertimeStatus | "all")}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Durumlar</SelectItem>
                  <SelectItem value="bekliyor">Bekliyor</SelectItem>
                  <SelectItem value="onaylandi">Onaylandi</SelectItem>
                  <SelectItem value="reddedildi">Reddedildi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={empFilter} onValueChange={setEmpFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Calisanlar</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={month === "all" ? "all" : month.toString()}
                onValueChange={(v) => setMonth(v === "all" ? "all" : Number(v))}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Aylar</SelectItem>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={i.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={year.toString()}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="h-9 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Records table */}
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2.5">Tarih</th>
                    <th className="text-left font-medium px-4 py-2.5">
                      Calisan
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">
                      Normal / Gercek
                    </th>
                    <th className="text-right font-medium px-4 py-2.5">
                      Fazla Mesai
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">Neden</th>
                    <th className="text-left font-medium px-4 py-2.5">Durum</th>
                    <th className="text-right font-medium px-4 py-2.5 w-[80px]">
                      Islem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground text-sm"
                      >
                        Bu filtrelerle eslesen kayit bulunamadi.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const emp = employeeById(r.employeeId)
                      const cost = emp
                        ? calculateOvertimeCost(
                            emp.grossSalary,
                            r.overtimeHours,
                          )
                        : 0
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-border/60 hover:bg-accent/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-foreground whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{formatDateTR(r.date)}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {r.date}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setDetailEmpId(r.employeeId)}
                              className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition-opacity"
                            >
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage
                                  src={r.employeeAvatar || "/placeholder.svg"}
                                  alt={r.employeeName}
                                />
                                <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
                                  {getEmployeeInitials(r.employeeName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-foreground font-medium truncate">
                                  {r.employeeName}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {r.department}
                                </p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                            <span className="text-muted-foreground">
                              {r.plannedEndTime}
                            </span>
                            <span className="mx-1.5 text-muted-foreground/60">
                              &rarr;
                            </span>
                            <span className="text-foreground">
                              {r.actualEndTime}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-foreground">
                                {formatHours(r.overtimeHours)}
                              </span>
                              {cost > 0 && (
                                <span className="text-[11px] text-muted-foreground">
                                  ~ {formatTurkishCurrency(cost)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-[260px]">
                            <p className="text-sm text-foreground truncate">
                              {r.reason}
                            </p>
                            {r.status === "reddedildi" &&
                              r.rejectionReason && (
                                <p className="text-[11px] text-rose-400 truncate">
                                  Red: {r.rejectionReason}
                                </p>
                              )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`${STATUS_BADGE_CLASSES[r.status]} h-5 px-2`}
                            >
                              {OVERTIME_STATUS_LABELS[r.status]}
                            </Badge>
                            {r.status !== "bekliyor" && r.reviewerName && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {r.reviewerName}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 gap-1"
                                >
                                  Islem
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {r.status === "bekliyor" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => approveRecord(r.id)}
                                      className="gap-2"
                                    >
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                      Onayla
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setRejectId(r.id)
                                        setRejectReason("")
                                      }}
                                      className="gap-2"
                                    >
                                      <X className="h-3.5 w-3.5 text-rose-400" />
                                      Reddet
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openEditForm(r)}
                                  className="gap-2"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Duzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(r.id)}
                                  className="gap-2 text-rose-400 focus:text-rose-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card className="border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Calisan Bazli Ozet
                </p>
                <p className="text-xs text-muted-foreground">
                  {month === "all"
                    ? `${year} yili toplami`
                    : `${MONTH_NAMES[month as number]} ${year}`}{" "}
                  &middot; Tahmini maliyet {OVERTIME_MULTIPLIER}x carpan ile
                  hesaplanmistir
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2.5">
                      Calisan
                    </th>
                    <th className="text-right font-medium px-4 py-2.5">
                      Donem Mesaisi
                    </th>
                    <th className="text-right font-medium px-4 py-2.5">
                      Kayit
                    </th>
                    <th className="text-right font-medium px-4 py-2.5">
                      Yillik
                    </th>
                    <th className="text-right font-medium px-4 py-2.5">
                      Tahmini Maliyet
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">
                      Yillik Limit
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">Uyari</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates
                    .filter((a) => a.monthlyHours > 0 || a.yearlyHours > 0)
                    .map((a) => {
                      const yearlyPct = Math.min(
                        100,
                        Math.round(
                          (a.yearlyHours / YEARLY_OVERTIME_LIMIT) * 100,
                        ),
                      )
                      const yearlyColor =
                        a.yearlyHours > YEARLY_OVERTIME_LIMIT
                          ? "bg-rose-500"
                          : a.yearlyHours > YEARLY_OVERTIME_LIMIT * 0.8
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      const weeklyBreachCount = a.weekBreaches.filter(
                        (w) => w.overtime > 10,
                      ).length
                      return (
                        <tr
                          key={a.employee.id}
                          className="border-b border-border/60 hover:bg-accent/30 transition-colors cursor-pointer"
                          onClick={() => setDetailEmpId(a.employee.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={a.employee.avatar || "/placeholder.svg"}
                                  alt={a.employee.name}
                                />
                                <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
                                  {getEmployeeInitials(a.employee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-foreground font-medium">
                                  {a.employee.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {a.employee.department}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-foreground font-semibold">
                            {formatHours(a.monthlyHours)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {a.monthlyCount}
                          </td>
                          <td className="px-4 py-3 text-right text-foreground">
                            {formatHours(a.yearlyHours)}
                          </td>
                          <td className="px-4 py-3 text-right text-foreground">
                            {formatTurkishCurrency(a.monthlyCost)}
                          </td>
                          <td className="px-4 py-3 min-w-[180px]">
                            <div className="space-y-1">
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full ${yearlyColor} transition-all`}
                                  style={{ width: `${yearlyPct}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {yearlyPct}% &middot; limit{" "}
                                {YEARLY_OVERTIME_LIMIT} sa
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {a.yearlyBreach && (
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 border-rose-500/40 bg-rose-500/10 text-rose-300 text-[10px]"
                                >
                                  Yillik Asim
                                </Badge>
                              )}
                              {weeklyBreachCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px]"
                                >
                                  {weeklyBreachCount} hafta &gt; 45sa
                                </Badge>
                              )}
                              {a.pendingCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 border-sky-500/40 bg-sky-500/10 text-sky-300 text-[10px]"
                                >
                                  {a.pendingCount} bekliyor
                                </Badge>
                              )}
                              {!a.yearlyBreach &&
                                weeklyBreachCount === 0 &&
                                a.pendingCount === 0 && (
                                  <span className="text-[11px] text-muted-foreground">
                                    &mdash;
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  {aggregates.every((a) => a.monthlyHours === 0 && a.yearlyHours === 0) && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground text-sm"
                      >
                        Bu donem icin kayit bulunamadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border-border">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary shrink-0">
                <BadgeDollarSign className="h-4 w-4" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p className="text-foreground text-sm font-semibold mb-1">
                  Maliyet Hesaplama
                </p>
                Saatlik ucret = Brut maas / {MONTHLY_WORK_HOURS} saat.
                Fazla mesai ucreti bu saatlik ucretin{" "}
                {OVERTIME_MULTIPLIER} katidir (4857 sayili Is Kanunu m.41).
                Yillik limit {YEARLY_OVERTIME_LIMIT} saat, haftalik toplam
                calisma sinir {WEEKLY_OVERTIME_LIMIT} saattir.
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Chart Tab */}
        <TabsContent value="chart" className="space-y-4">
          <Card className="p-4 border-border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  En Cok Fazla Mesai Yapan Calisanlar
                </p>
                <p className="text-xs text-muted-foreground">
                  {month === "all"
                    ? `${year} yili toplami`
                    : `${MONTH_NAMES[month as number]} ${year}`}{" "}
                  &middot; onayli ve bekleyen kayitlar
                </p>
              </div>
            </div>
            {topChartData.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Grafikte gosterilecek kayit bulunmuyor.
              </div>
            ) : (
              <ChartContainer
                config={{
                  hours: {
                    label: "Fazla Mesai (saat)",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[320px] w-full"
              >
                <BarChart data={topChartData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                    unit=" sa"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_label, payload) => {
                          const p = payload?.[0]?.payload as
                            | { fullName?: string }
                            | undefined
                          return p?.fullName ?? _label
                        }}
                        formatter={(value) => [`${value} sa`, "Fazla Mesai"]}
                      />
                    }
                  />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                    {topChartData.map((d, i) => (
                      <Cell
                        key={`cell-${i}`}
                        className={
                          d.isWarning
                            ? "fill-rose-500"
                            : "fill-primary"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </Card>

          <Card className="p-4 border-border">
            <p className="text-sm font-semibold text-foreground mb-3">
              Departman Dagilimi
            </p>
            <div className="space-y-2">
              {Object.entries(
                aggregates.reduce<Record<string, number>>((acc, a) => {
                  if (a.monthlyHours <= 0) return acc
                  acc[a.employee.department] =
                    (acc[a.employee.department] ?? 0) + a.monthlyHours
                  return acc
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([dept, hours]) => {
                  const total = aggregates.reduce(
                    (s, a) => s + a.monthlyHours,
                    0,
                  )
                  const pct = total > 0 ? Math.round((hours / total) * 100) : 0
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{dept}</span>
                        <span className="text-muted-foreground">
                          {formatHours(hours)} &middot; %{pct}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              {aggregates.every((a) => a.monthlyHours === 0) && (
                <p className="text-center text-muted-foreground text-sm py-6">
                  Departman verisi bulunmuyor.
                </p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================= Form Dialog ================= */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              {form.id ? "Fazla Mesai Duzenle" : "Yeni Fazla Mesai Talebi"}
            </DialogTitle>
            <DialogDescription>
              Fazla mesai talebi yonetici onayina gonderilir. Saatler
              otomatik olarak hesaplanir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ot-emp">Calisan</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
              >
                <SelectTrigger id="ot-emp" className="h-9">
                  <SelectValue placeholder="Calisan seciniz" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} &middot; {e.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.employeeId && (
                <p className="text-[11px] text-rose-400">
                  {formErrors.employeeId}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ot-date">Tarih</Label>
              <Input
                id="ot-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                className="h-9"
              />
              {formErrors.date && (
                <p className="text-[11px] text-rose-400">{formErrors.date}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ot-planned">Planli Bitis</Label>
                <Input
                  id="ot-planned"
                  type="time"
                  value={form.plannedEndTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, plannedEndTime: e.target.value }))
                  }
                  className="h-9 font-mono"
                />
                {formErrors.plannedEndTime && (
                  <p className="text-[11px] text-rose-400">
                    {formErrors.plannedEndTime}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ot-actual">Gercek Cikis</Label>
                <Input
                  id="ot-actual"
                  type="time"
                  value={form.actualEndTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, actualEndTime: e.target.value }))
                  }
                  className="h-9 font-mono"
                />
                {formErrors.actualEndTime && (
                  <p className="text-[11px] text-rose-400">
                    {formErrors.actualEndTime}
                  </p>
                )}
              </div>
            </div>

            {/* Auto-calculated overtime summary */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Otomatik Hesaplanan
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formatHours(formOvertime)}
                </p>
              </div>
              {form.employeeId && formOvertime > 0 && (
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Tahmini Maliyet
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatTurkishCurrency(
                      calculateOvertimeCost(
                        employeeById(form.employeeId)?.grossSalary ?? 0,
                        formOvertime,
                      ),
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ot-reason">Fazla Mesai Nedeni</Label>
              <Textarea
                id="ot-reason"
                placeholder="Ornek: Acil musteri projesi teslimatina destek..."
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
                rows={3}
                maxLength={400}
              />
              {formErrors.reason && (
                <p className="text-[11px] text-rose-400">
                  {formErrors.reason}
                </p>
              )}
            </div>

            {form.id && (
              <div className="space-y-1.5">
                <Label htmlFor="ot-status">Durum</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as OvertimeStatus }))
                  }
                >
                  <SelectTrigger id="ot-status" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bekliyor">Bekliyor</SelectItem>
                    <SelectItem value="onaylandi">Onaylandi</SelectItem>
                    <SelectItem value="reddedildi">Reddedildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-200 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Fazla mesai talebi, yonetici onayi icin kuyruga alinir. Yasal
                olarak yillik limit {YEARLY_OVERTIME_LIMIT} saat, haftalik
                toplam calisma {WEEKLY_OVERTIME_LIMIT} saattir.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={submitForm}>
              {form.id ? "Kaydet" : "Talep Gonder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= Reject Dialog ================= */}
      <Dialog
        open={rejectId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setRejectId(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-4 w-4 text-rose-400" />
              Talebi Reddet
            </DialogTitle>
            <DialogDescription>
              Calisana bildirilecek red nedenini belirtiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Red Nedeni</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ornek: Yogunluk mesai icinde tamamlanabilir durumda."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Vazgec
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= Delete Alert ================= */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu fazla mesai kaydini silmek istediginize emin misiniz? Bu
              islem geri alinamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================= Detail Dialog ================= */}
      <Dialog
        open={detailEmpId !== null}
        onOpenChange={(o) => !o && setDetailEmpId(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={detailData.employee.avatar || "/placeholder.svg"}
                      alt={detailData.employee.name}
                    />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getEmployeeInitials(detailData.employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base">{detailData.employee.name}</p>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      {detailData.employee.department} &middot;{" "}
                      {detailData.employee.position}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {year} Toplam
                  </p>
                  <p className="text-xl font-semibold text-foreground mt-1">
                    {formatHours(detailData.yearlyTotal)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Tahmini Maliyet
                  </p>
                  <p className="text-xl font-semibold text-foreground mt-1">
                    {formatTurkishCurrency(detailData.yearlyCost)}
                  </p>
                </div>
                <div
                  className={`rounded-lg border p-3 ${
                    detailData.yearlyTotal > YEARLY_OVERTIME_LIMIT
                      ? "border-rose-500/40 bg-rose-500/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Yillik Limit
                  </p>
                  <p
                    className={`text-xl font-semibold mt-1 ${
                      detailData.yearlyTotal > YEARLY_OVERTIME_LIMIT
                        ? "text-rose-400"
                        : "text-foreground"
                    }`}
                  >
                    %
                    {Math.round(
                      (detailData.yearlyTotal / YEARLY_OVERTIME_LIMIT) * 100,
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {YEARLY_OVERTIME_LIMIT} saat sinir
                  </p>
                </div>
              </div>

              {/* Monthly trend */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">
                  {year} Aylik Trend
                </p>
                <div className="rounded-lg border border-border bg-card p-3">
                  <ChartContainer
                    config={{
                      hours: {
                        label: "Saat",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-[200px] w-full"
                  >
                    <BarChart
                      data={detailData.monthly.map((m) => ({
                        name: MONTH_NAMES[m.month].slice(0, 3),
                        hours: m.hours,
                      }))}
                      margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        className="text-[10px]"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        className="text-[10px]"
                        unit=" sa"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="hours"
                        fill="hsl(var(--chart-1))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>

              {/* Recent records */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">
                  Son Kayitlar
                </p>
                <div className="rounded-lg border border-border divide-y divide-border max-h-[240px] overflow-y-auto">
                  {detailData.records.slice(0, 8).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {r.reason}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTR(r.date)} &middot; {r.plannedEndTime} -{" "}
                          {r.actualEndTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatHours(r.overtimeHours)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`${STATUS_BADGE_CLASSES[r.status]} h-4 px-1.5 text-[9px]`}
                        >
                          {OVERTIME_STATUS_LABELS[r.status]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {detailData.records.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-6">
                      Kayit bulunmuyor.
                    </p>
                  )}
                </div>
              </div>

              <Separator />
              <div className="text-[11px] text-muted-foreground">
                Ortalama aylik {WORK_DAYS_PER_MONTH} is gunu, {MONTHLY_WORK_HOURS}{" "}
                saat esas alinmistir. Saatlik fazla mesai carpani{" "}
                {OVERTIME_MULTIPLIER}x&apos;dir.
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
