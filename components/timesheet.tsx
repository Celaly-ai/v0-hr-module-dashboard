"use client"

import { useMemo, useState } from "react"
import {
  employees,
  generateMonthlyTimesheet,
  daysInMonth,
  pad2,
  countWorkingDaysInMonth,
  getTimesheetStatusLabel,
  getTimesheetStatusShort,
  isHolidayDate,
  type TimesheetStatus,
  type TimesheetEntry,
  type MonthlyTimesheet,
  type Employee,
} from "@/lib/hr-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Unlock,
  CalendarCheck,
  TrendingDown,
  Users,
  Clock,
  Percent,
  Plus,
  Minus,
} from "lucide-react"

const monthNames = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
]

const dayShortNames = ["Pz", "Pt", "Sa", "Ca", "Pe", "Cu", "Ct"]

const statusOptions: TimesheetStatus[] = [
  "calisti",
  "izin",
  "rapor",
  "devamsiz",
  "resmi-tatil",
  "hafta-sonu",
]

// Cell styles: bg + text + border for each status.
function getStatusCellClasses(status: TimesheetStatus): string {
  switch (status) {
    case "calisti":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
    case "izin":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25"
    case "rapor":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
    case "devamsiz":
      return "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
    case "resmi-tatil":
      return "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
    case "hafta-sonu":
      return "bg-background text-muted-foreground/60 border-border/70 hover:bg-accent/40"
    default:
      return ""
  }
}

function getStatusDotClass(status: TimesheetStatus): string {
  switch (status) {
    case "calisti":
      return "bg-emerald-500"
    case "izin":
      return "bg-sky-500"
    case "rapor":
      return "bg-amber-500"
    case "devamsiz":
      return "bg-red-500"
    case "resmi-tatil":
      return "bg-muted-foreground"
    case "hafta-sonu":
      return "bg-muted-foreground/40"
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

interface EmployeeSummary {
  employeeId: string
  workedDays: number
  leaveDays: number
  sickDays: number
  absentDays: number
  overtime: number
}

export function Timesheet() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-12

  // We cache timesheets per year-month key so edits persist while navigating.
  const [timesheetsByKey, setTimesheetsByKey] = useState<Record<string, MonthlyTimesheet>>(() => {
    const key = `${today.getFullYear()}-${today.getMonth() + 1}`
    return {
      [key]: generateMonthlyTimesheet(today.getFullYear(), today.getMonth() + 1, employees),
    }
  })

  const currentKey = `${year}-${month}`
  const currentTimesheet =
    timesheetsByKey[currentKey] ||
    generateMonthlyTimesheet(year, month, employees)

  // Ensure cache has current key
  if (!timesheetsByKey[currentKey]) {
    // lazy-fill without triggering re-render loop
    // (safe: only hits when key missing)
    queueMicrotask(() => {
      setTimesheetsByKey((prev) =>
        prev[currentKey] ? prev : { ...prev, [currentKey]: currentTimesheet },
      )
    })
  }

  const totalDays = daysInMonth(year, month)
  const workingDaysInMonth = useMemo(
    () => countWorkingDaysInMonth(year, month),
    [year, month],
  )

  // Build lookup: employeeId -> dateStr -> entry
  const entriesByEmp = useMemo(() => {
    const map = new Map<string, Map<string, TimesheetEntry>>()
    for (const e of currentTimesheet.entries) {
      if (!map.has(e.employeeId)) map.set(e.employeeId, new Map())
      map.get(e.employeeId)!.set(e.date, e)
    }
    return map
  }, [currentTimesheet])

  // Per-employee summaries
  const summaries: EmployeeSummary[] = useMemo(() => {
    return employees.map((emp) => {
      const entries = currentTimesheet.entries.filter((e) => e.employeeId === emp.id)
      let worked = 0
      let leave = 0
      let sick = 0
      let absent = 0
      let ot = 0
      for (const e of entries) {
        if (e.status === "calisti") {
          worked++
          ot += e.overtimeHours
        } else if (e.status === "izin") leave++
        else if (e.status === "rapor") sick++
        else if (e.status === "devamsiz") absent++
      }
      return {
        employeeId: emp.id,
        workedDays: worked,
        leaveDays: leave,
        sickDays: sick,
        absentDays: absent,
        overtime: ot,
      }
    })
  }, [currentTimesheet])

  // Aggregate stats for right panel
  const avgAttendance = useMemo(() => {
    if (workingDaysInMonth === 0 || employees.length === 0) return 0
    const totalWorked = summaries.reduce((sum, s) => sum + s.workedDays, 0)
    const expected = employees.length * workingDaysInMonth
    if (expected === 0) return 0
    return Math.round((totalWorked / expected) * 100)
  }, [summaries, workingDaysInMonth])

  const mostAbsent = useMemo(() => {
    return [...summaries]
      .filter((s) => s.absentDays > 0 || s.sickDays > 0)
      .sort(
        (a, b) =>
          b.absentDays + b.sickDays - (a.absentDays + a.sickDays),
      )
      .slice(0, 3)
  }, [summaries])

  const totalOvertime = useMemo(
    () => summaries.reduce((sum, s) => sum + s.overtime, 0),
    [summaries],
  )

  // Month navigation
  const goPrev = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }
  const goNext = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  // Mutations
  const updateEntry = (
    employeeId: string,
    date: string,
    patch: Partial<TimesheetEntry>,
  ) => {
    if (currentTimesheet.locked) return
    setTimesheetsByKey((prev) => {
      const ts = prev[currentKey] ?? currentTimesheet
      const nextEntries = ts.entries.map((e) =>
        e.employeeId === employeeId && e.date === date ? { ...e, ...patch } : e,
      )
      return {
        ...prev,
        [currentKey]: { ...ts, entries: nextEntries },
      }
    })
  }

  const setLocked = (locked: boolean) => {
    setTimesheetsByKey((prev) => {
      const ts = prev[currentKey] ?? currentTimesheet
      return {
        ...prev,
        [currentKey]: {
          ...ts,
          locked,
          lockedBy: locked ? "Ahmet Yilmaz" : null,
          lockedAt: locked ? new Date().toISOString() : null,
        },
      }
    })
  }

  const [confirmLockOpen, setConfirmLockOpen] = useState(false)

  // CSV Export
  const handleExport = () => {
    const bom = "\uFEFF"
    const header = ["Calisan", "Departman"]
    for (let d = 1; d <= totalDays; d++) header.push(`${pad2(d)}`)
    header.push("Toplam Calisma", "Izin", "Rapor", "Devamsiz", "Fazla Mesai (saat)")

    const rows: string[][] = [header]
    for (const emp of employees) {
      const row: string[] = [emp.name, emp.department]
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${pad2(month)}-${pad2(d)}`
        const entry = entriesByEmp.get(emp.id)?.get(dateStr)
        if (!entry) {
          row.push("")
        } else {
          const short = getTimesheetStatusShort(entry.status)
          row.push(entry.overtimeHours > 0 ? `${short}+${entry.overtimeHours}` : short)
        }
      }
      const s = summaries.find((x) => x.employeeId === emp.id)!
      row.push(
        String(s.workedDays),
        String(s.leaveDays),
        String(s.sickDays),
        String(s.absentDays),
        String(s.overtime),
      )
      rows.push(row)
    }

    const csv =
      bom +
      rows
        .map((r) =>
          r
            .map((c) => {
              const val = String(c ?? "")
              if (val.includes(";") || val.includes(",") || val.includes('"') || val.includes("\n")) {
                return `"${val.replace(/"/g, '""')}"`
              }
              return val
            })
            .join(";"),
        )
        .join("\r\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `puantaj-${year}-${pad2(month)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <Card className="p-4 border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Aylik Puantaj</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calisan devam ve mesai takibi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={goPrev}
                aria-label="Onceki ay"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-1">
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(parseInt(v, 10))}
                >
                  <SelectTrigger className="h-8 border-0 shadow-none bg-transparent px-2 w-[110px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(parseInt(v, 10))}
                >
                  <SelectTrigger className="h-8 border-0 shadow-none bg-transparent px-2 w-[85px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={goNext}
                aria-label="Sonraki ay"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Excel Indir
            </Button>

            {currentTimesheet.locked ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setLocked(false)}
              >
                <Unlock className="h-4 w-4" />
                Kilidi Ac
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setConfirmLockOpen(true)}
              >
                <Lock className="h-4 w-4" />
                Puantaji Kilitle
              </Button>
            )}
          </div>
        </div>

        {currentTimesheet.locked && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <Lock className="h-4 w-4 text-emerald-400" />
            <p className="text-sm text-emerald-300">
              Bu ay kilitlendi.{" "}
              <span className="text-muted-foreground">
                {currentTimesheet.lockedBy} tarafindan{" "}
                {currentTimesheet.lockedAt
                  ? new Date(currentTimesheet.lockedAt).toLocaleString("tr-TR")
                  : ""}
                .
              </span>
            </p>
          </div>
        )}
      </Card>

      {/* Status legend */}
      <Card className="p-3 border-border">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="text-muted-foreground font-medium">Durum:</span>
          {statusOptions.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${getStatusDotClass(s)}`} />
              <span className="text-foreground">
                {getTimesheetStatusLabel(s)}{" "}
                <span className="text-muted-foreground">
                  ({getTimesheetStatusShort(s)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Main layout: grid + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Grid card */}
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-card">
                  <th
                    className="sticky left-0 z-20 bg-card border-b border-r border-border text-left font-medium text-muted-foreground px-3 py-2.5 min-w-[220px]"
                    scope="col"
                  >
                    Calisan
                  </th>
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const day = i + 1
                    const dow = new Date(year, month - 1, day).getDay()
                    const isWeekend = dow === 0 || dow === 6
                    const holiday = isHolidayDate(year, month, day)
                    return (
                      <th
                        key={day}
                        className={`border-b border-border px-1 py-2 font-medium min-w-[34px] text-center ${
                          isWeekend || holiday
                            ? "text-muted-foreground/70 bg-muted/30"
                            : "text-foreground"
                        }`}
                        scope="col"
                        title={holiday ?? undefined}
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <span>{pad2(day)}</span>
                          <span className="text-[10px] text-muted-foreground/70 font-normal">
                            {dayShortNames[dow]}
                          </span>
                        </div>
                      </th>
                    )
                  })}
                  <th
                    className="sticky right-0 z-20 bg-card border-b border-l border-border text-center font-medium text-muted-foreground px-2 py-2.5 min-w-[60px]"
                    scope="col"
                  >
                    Calisma
                  </th>
                  <th className="border-b border-border text-center font-medium text-muted-foreground px-2 py-2.5 min-w-[50px]">
                    Izin
                  </th>
                  <th className="border-b border-border text-center font-medium text-muted-foreground px-2 py-2.5 min-w-[50px]">
                    Rapor
                  </th>
                  <th className="border-b border-border text-center font-medium text-muted-foreground px-2 py-2.5 min-w-[60px]">
                    Devamsiz
                  </th>
                  <th className="border-b border-border text-center font-medium text-muted-foreground px-2 py-2.5 min-w-[50px]">
                    Mesai
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const summary = summaries.find((s) => s.employeeId === emp.id)!
                  return (
                    <tr
                      key={emp.id}
                      className="border-b border-border last:border-b-0 hover:bg-accent/20"
                    >
                      <td className="sticky left-0 z-10 bg-card group-hover:bg-accent/20 border-r border-border px-3 py-2 align-middle">
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <Avatar className="h-7 w-7 border border-border shrink-0">
                            <AvatarImage src={emp.avatar} alt={emp.name} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px] font-medium">
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {emp.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {emp.department}
                            </p>
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: totalDays }).map((_, i) => {
                        const day = i + 1
                        const dateStr = `${year}-${pad2(month)}-${pad2(day)}`
                        const entry = entriesByEmp.get(emp.id)?.get(dateStr)
                        if (!entry) {
                          return <td key={day} className="p-1" />
                        }
                        return (
                          <td key={day} className="p-0.5 align-middle">
                            <CellPopover
                              employee={emp}
                              entry={entry}
                              locked={currentTimesheet.locked}
                              onChange={(patch) =>
                                updateEntry(emp.id, dateStr, patch)
                              }
                            />
                          </td>
                        )
                      })}
                      <td className="sticky right-0 z-10 bg-card border-l border-border text-center font-medium text-sm text-emerald-400 px-2 py-2">
                        {summary.workedDays}
                      </td>
                      <td className="text-center font-medium text-sm text-sky-400 px-2 py-2">
                        {summary.leaveDays}
                      </td>
                      <td className="text-center font-medium text-sm text-amber-400 px-2 py-2">
                        {summary.sickDays}
                      </td>
                      <td className="text-center font-medium text-sm text-red-400 px-2 py-2">
                        {summary.absentDays}
                      </td>
                      <td className="text-center text-sm text-foreground px-2 py-2">
                        {summary.overtime > 0 ? (
                          <span className="font-medium">{summary.overtime}s</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right summary panel */}
        <div className="space-y-4">
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Percent className="h-4 w-4 text-primary" />
              Ay Ozeti
            </h3>

            <div className="space-y-3">
              <StatRow
                icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
                label="Is Gunu"
                value={`${workingDaysInMonth} gun`}
              />
              <StatRow
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                label="Toplam Calisan"
                value={`${employees.length} kisi`}
              />
              <StatRow
                icon={<Percent className="h-4 w-4 text-emerald-400" />}
                label="Ort. Devam"
                value={`% ${avgAttendance}`}
                highlight
              />
              <StatRow
                icon={<Clock className="h-4 w-4 text-sky-400" />}
                label="Toplam Mesai"
                value={`${totalOvertime} saat`}
              />
            </div>
          </Card>

          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-red-400" />
              En Cok Devamsiz
            </h3>

            {mostAbsent.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Bu ay devamsizlik veya rapor kaydi bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2">
                {mostAbsent.map((s, idx) => {
                  const emp = employees.find((e) => e.id === s.employeeId)!
                  const total = s.absentDays + s.sickDays
                  return (
                    <div
                      key={s.employeeId}
                      className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15 text-red-400 text-[11px] font-semibold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {emp.department}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-semibold text-red-400">
                          {total}g
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.absentDays}D / {s.sickDays}R
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-400" />
              Fazla Mesai
            </h3>
            {(() => {
              const overtimeList = [...summaries]
                .filter((s) => s.overtime > 0)
                .sort((a, b) => b.overtime - a.overtime)
                .slice(0, 5)
              if (overtimeList.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground py-2">
                    Bu ay fazla mesai kaydi yok.
                  </p>
                )
              }
              return (
                <div className="space-y-2">
                  {overtimeList.map((s) => {
                    const emp = employees.find((e) => e.id === s.employeeId)!
                    return (
                      <div
                        key={s.employeeId}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 border border-border">
                            <AvatarFallback className="bg-secondary text-[10px]">
                              {getInitials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground truncate">
                            {emp.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium shrink-0"
                        >
                          {s.overtime}s
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Card>
        </div>
      </div>

      {/* Confirm lock dialog */}
      <Dialog open={confirmLockOpen} onOpenChange={setConfirmLockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Puantaji Kilitle</DialogTitle>
            <DialogDescription>
              {monthNames[month - 1]} {year} puantajini kesinlestirmek istedigize
              emin misiniz? Kilitlendikten sonra hucreler duzenlenemez. Bordro
              hesaplamalari bu veriyi kullanacaktir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmLockOpen(false)}
            >
              Vazgec
            </Button>
            <Button
              onClick={() => {
                setLocked(true)
                setConfirmLockOpen(false)
              }}
            >
              <Lock className="h-4 w-4 mr-2" />
              Kilitle ve Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span
        className={`text-sm font-semibold ${
          highlight ? "text-emerald-400" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function CellPopover({
  employee,
  entry,
  locked,
  onChange,
}: {
  employee: Employee
  entry: TimesheetEntry & { holidayName?: string | null }
  locked: boolean
  onChange: (patch: Partial<TimesheetEntry>) => void
}) {
  const [open, setOpen] = useState(false)
  const cellClass = getStatusCellClasses(entry.status)
  const short = getTimesheetStatusShort(entry.status)
  const dateLabel = new Date(entry.date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  })

  const trigger = (
    <button
      type="button"
      disabled={locked}
      className={`relative w-full h-10 rounded border text-[11px] font-semibold transition-colors ${cellClass} ${
        locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      }`}
      aria-label={`${employee.name} - ${dateLabel} - ${getTimesheetStatusLabel(
        entry.status,
      )}`}
      title={`${getTimesheetStatusLabel(entry.status)}${
        entry.overtimeHours > 0 ? ` +${entry.overtimeHours}s mesai` : ""
      }${entry.note ? ` - ${entry.note}` : ""}`}
    >
      <span>{short}</span>
      {entry.overtimeHours > 0 && (
        <span className="absolute bottom-0.5 right-1 text-[9px] text-foreground/90 font-bold">
          +{entry.overtimeHours}
        </span>
      )}
    </button>
  )

  if (locked) return trigger

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="center">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {employee.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {dateLabel}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Durum
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ status: s })}
                  className={`rounded border px-2 py-1.5 text-[11px] font-medium transition-colors ${getStatusCellClasses(
                    s,
                  )} ${
                    entry.status === s
                      ? "ring-2 ring-ring ring-offset-1 ring-offset-background"
                      : ""
                  }`}
                >
                  {getTimesheetStatusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {entry.status === "calisti" && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Fazla Mesai (saat)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({
                      overtimeHours: Math.max(0, entry.overtimeHours - 1),
                    })
                  }
                  disabled={entry.overtimeHours <= 0}
                  aria-label="Azalt"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={8}
                  value={entry.overtimeHours}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(8, Number(e.target.value) || 0))
                    onChange({ overtimeHours: v })
                  }}
                  className="h-8 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({
                      overtimeHours: Math.min(8, entry.overtimeHours + 1),
                    })
                  }
                  disabled={entry.overtimeHours >= 8}
                  aria-label="Arttir"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label
              htmlFor={`note-${entry.employeeId}-${entry.date}`}
              className="text-xs text-muted-foreground mb-1.5 block"
            >
              Not
            </Label>
            <Input
              id={`note-${entry.employeeId}-${entry.date}`}
              value={entry.note}
              onChange={(e) => onChange({ note: e.target.value })}
              placeholder="Opsiyonel aciklama"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>
              Kapat
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
