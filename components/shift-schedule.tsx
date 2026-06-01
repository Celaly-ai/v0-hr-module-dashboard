"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  employees,
  SHIFT_DEFINITIONS as DEFAULT_SHIFT_DEFINITIONS,
  defaultShiftTemplates,
  calculateNetHours,
  WEEKDAY_SHORT_LABELS,
  WEEKDAY_LONG_LABELS,
  getWeekStart,
  addDays,
  formatISODate,
  formatDayMonth,
  formatWeekRangeLabel,
  type ShiftType,
  type ShiftAssignment,
  type ShiftTemplate,
  type ShiftDefinition,
} from "@/lib/hr-data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
import { Textarea } from "@/components/ui/textarea"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Download,
  AlertTriangle,
  Sun,
  Moon,
  Sunset,
  Coffee,
  Palmtree,
  Calendar as CalendarIcon,
  Check,
  Settings,
  Pencil,
  Clock,
  Utensils,
  RotateCcw,
  Type,
  Paintbrush,
} from "lucide-react"

// ---------- helpers ----------

const SHIFT_ORDER: ShiftType[] = ["sabah", "ogleden-sonra", "gece", "serbest", "izin"]

const SHIFT_ICONS: Record<ShiftType, React.ComponentType<{ className?: string }>> = {
  sabah: Sun,
  "ogleden-sonra": Sunset,
  gece: Moon,
  serbest: Coffee,
  izin: Palmtree,
}

// Available color presets for the shift-type editor. Tailwind classes are
// enumerated literally so they survive the JIT compiler. Keep in sync if
// new colors are added here.
type ColorPresetKey =
  | "emerald"
  | "sky"
  | "purple"
  | "amber"
  | "rose"
  | "orange"
  | "teal"
  | "indigo"

interface ColorPreset {
  label: string
  colorClass: string
  dotClass: string
  swatchClass: string
}

const COLOR_PRESETS: Record<ColorPresetKey, ColorPreset> = {
  emerald: {
    label: "Yesil",
    colorClass:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25",
    dotClass: "bg-emerald-500",
    swatchClass: "bg-emerald-500",
  },
  sky: {
    label: "Mavi",
    colorClass:
      "bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/25",
    dotClass: "bg-sky-500",
    swatchClass: "bg-sky-500",
  },
  purple: {
    label: "Mor",
    colorClass:
      "bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/25",
    dotClass: "bg-purple-500",
    swatchClass: "bg-purple-500",
  },
  amber: {
    label: "Sari",
    colorClass:
      "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25",
    dotClass: "bg-amber-500",
    swatchClass: "bg-amber-500",
  },
  rose: {
    label: "Pembe",
    colorClass:
      "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25",
    dotClass: "bg-rose-500",
    swatchClass: "bg-rose-500",
  },
  orange: {
    label: "Turuncu",
    colorClass:
      "bg-orange-500/15 text-orange-300 border-orange-500/40 hover:bg-orange-500/25",
    dotClass: "bg-orange-500",
    swatchClass: "bg-orange-500",
  },
  teal: {
    label: "Turkuaz",
    colorClass:
      "bg-teal-500/15 text-teal-300 border-teal-500/40 hover:bg-teal-500/25",
    dotClass: "bg-teal-500",
    swatchClass: "bg-teal-500",
  },
  indigo: {
    label: "Lacivert",
    colorClass:
      "bg-indigo-500/15 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/25",
    dotClass: "bg-indigo-500",
    swatchClass: "bg-indigo-500",
  },
}

const COLOR_KEYS: ColorPresetKey[] = [
  "emerald",
  "sky",
  "purple",
  "amber",
  "rose",
  "orange",
  "teal",
  "indigo",
]

// Reverse-detect the preset key from the stored colorClass string so the
// picker opens with the currently-applied color pre-selected.
function detectColorKey(colorClass: string): ColorPresetKey {
  for (const k of COLOR_KEYS) {
    if (colorClass.includes(`${k}-500`)) return k
  }
  return "emerald"
}

interface ShiftDraft {
  label: string
  startTime: string
  endTime: string
  breakMinutes: number
  color: ColorPresetKey
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function buildDefaultAssignments(weekStart: Date): ShiftAssignment[] {
  // Default distribution so the page feels populated on first load:
  // technicians do shift work, remote/leave roles mostly serbest/izin.
  const list: ShiftAssignment[] = []
  for (const emp of employees) {
    for (let i = 0; i < 7; i++) {
      const date = formatISODate(addDays(weekStart, i))
      const isWeekend = i >= 5
      let shift: ShiftType

      if (emp.status === "on-leave") {
        shift = "izin"
      } else if (emp.workType === "uzaktan") {
        shift = isWeekend ? "serbest" : "sabah"
      } else if (emp.workType === "vardiyali") {
        const cycle = [
          "sabah",
          "ogleden-sonra",
          "sabah",
          "gece",
          "ogleden-sonra",
          "serbest",
          "serbest",
        ] as ShiftType[]
        shift = cycle[i]
      } else if (emp.workType === "saha") {
        shift = isWeekend ? "serbest" : i === 2 ? "gece" : "sabah"
      } else {
        // tam-zamanli office
        shift = isWeekend ? "serbest" : "sabah"
      }
      list.push({ employeeId: emp.id, date, shift })
    }
  }
  return list
}

function weeklyStatsFor(
  employeeId: string,
  weekStart: Date,
  assignments: ShiftAssignment[],
  defs: Record<ShiftType, ShiftDefinition>,
) {
  let totalHours = 0
  let shiftCount = 0
  let nightCount = 0
  let consecutiveNights = 0
  let maxConsecutiveNights = 0

  for (let i = 0; i < 7; i++) {
    const date = formatISODate(addDays(weekStart, i))
    const a = assignments.find(
      (x) => x.employeeId === employeeId && x.date === date,
    )
    const shift = a?.shift ?? "serbest"
    const def = defs[shift]
    totalHours += def.hours
    if (def.hours > 0) shiftCount++
    if (shift === "gece") {
      nightCount++
      consecutiveNights++
      if (consecutiveNights > maxConsecutiveNights) {
        maxConsecutiveNights = consecutiveNights
      }
    } else {
      consecutiveNights = 0
    }
  }
  return { totalHours, shiftCount, nightCount, maxConsecutiveNights }
}

// ---------- component ----------

export function ShiftSchedule() {
  // Anchor the demo to the "today" the rest of the app uses.
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(new Date("2026-04-16")),
  )
  const [assignments, setAssignments] = useState<ShiftAssignment[]>(() =>
    buildDefaultAssignments(getWeekStart(new Date("2026-04-16"))),
  )
  const [templates, setTemplates] = useState<ShiftTemplate[]>(defaultShiftTemplates)
  const [openCellKey, setOpenCellKey] = useState<string | null>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  // Shift type definitions live in state so the editor can mutate them.
  const [shiftDefs, setShiftDefs] = useState<Record<ShiftType, ShiftDefinition>>(
    () => ({ ...DEFAULT_SHIFT_DEFINITIONS }),
  )
  const [typeEditorOpen, setTypeEditorOpen] = useState(false)
  // Drafts while editing - only committed on save.
  const [editorDrafts, setEditorDrafts] = useState<Record<ShiftType, ShiftDraft>>(
    () => {
      const out = {} as Record<ShiftType, ShiftDraft>
      for (const t of Object.keys(DEFAULT_SHIFT_DEFINITIONS) as ShiftType[]) {
        const d = DEFAULT_SHIFT_DEFINITIONS[t]
        out[t] = {
          label: d.label,
          startTime: d.startTime,
          endTime: d.endTime,
          breakMinutes: d.breakMinutes,
          color: detectColorKey(d.colorClass),
        }
      }
      return out
    },
  )

  function openTypeEditor() {
    // Seed drafts from current live definitions every time.
    const next = {} as Record<ShiftType, ShiftDraft>
    for (const t of Object.keys(shiftDefs) as ShiftType[]) {
      const d = shiftDefs[t]
      next[t] = {
        label: d.label,
        startTime: d.startTime,
        endTime: d.endTime,
        breakMinutes: d.breakMinutes,
        color: detectColorKey(d.colorClass),
      }
    }
    setEditorDrafts(next)
    setTypeEditorOpen(true)
  }

  function updateDraft(type: ShiftType, patch: Partial<ShiftDraft>) {
    setEditorDrafts((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }))
  }

  function resetDraftsToDefault() {
    const next = {} as Record<ShiftType, ShiftDraft>
    for (const t of Object.keys(DEFAULT_SHIFT_DEFINITIONS) as ShiftType[]) {
      const d = DEFAULT_SHIFT_DEFINITIONS[t]
      next[t] = {
        label: d.label,
        startTime: d.startTime,
        endTime: d.endTime,
        breakMinutes: d.breakMinutes,
        color: detectColorKey(d.colorClass),
      }
    }
    setEditorDrafts(next)
  }

  function saveTypeEditor() {
    setShiftDefs((prev) => {
      const next = { ...prev }
      for (const t of Object.keys(next) as ShiftType[]) {
        if (!next[t].editable) continue
        const draft = editorDrafts[t]
        const netHours = calculateNetHours(
          draft.startTime,
          draft.endTime,
          draft.breakMinutes,
        )
        const preset = COLOR_PRESETS[draft.color]
        const trimmed = draft.label.trim()
        next[t] = {
          ...next[t],
          label: trimmed || next[t].label,
          startTime: draft.startTime,
          endTime: draft.endTime,
          breakMinutes: Math.max(0, Math.min(480, draft.breakMinutes || 0)),
          hours: netHours,
          colorClass: preset.colorClass,
          dotClass: preset.dotClass,
        }
      }
      return next
    })
    setTypeEditorOpen(false)
  }

  // Template form state
  const [newTplName, setNewTplName] = useState("")
  const [newTplDesc, setNewTplDesc] = useState("")
  const [newTplPattern, setNewTplPattern] = useState<ShiftType[]>([
    "sabah",
    "sabah",
    "sabah",
    "sabah",
    "sabah",
    "serbest",
    "serbest",
  ])

  // Ensure every employee has 7 entries for the active week.
  useEffect(() => {
    setAssignments((prev) => {
      const next = [...prev]
      const byKey = new Map(next.map((a) => [`${a.employeeId}|${a.date}`, a]))
      for (const emp of employees) {
        for (let i = 0; i < 7; i++) {
          const date = formatISODate(addDays(weekStart, i))
          const stableKey = `${emp.id}|${date}`
          if (!byKey.has(stableKey)) {
            next.push({ employeeId: emp.id, date, shift: "serbest" })
          }
        }
      }
      return next
    })
  }, [weekStart])

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const weekRangeLabel = useMemo(
    () => formatWeekRangeLabel(weekStart),
    [weekStart],
  )

  const getAssignment = useCallback((employeeId: string, date: string): ShiftType => {
    const a = assignments.find(
      (x) => x.employeeId === employeeId && x.date === date,
    )
    return a?.shift ?? "serbest"
  }, [assignments])

  function setShift(employeeId: string, date: string, shift: ShiftType) {
    setAssignments((prev) => {
      const idx = prev.findIndex(
        (x) => x.employeeId === employeeId && x.date === date,
      )
      if (idx === -1) {
        return [...prev, { employeeId, date, shift }]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], shift }
      return next
    })
  }

  function goPrevWeek() {
    setWeekStart((d) => addDays(d, -7))
  }
  function goNextWeek() {
    setWeekStart((d) => addDays(d, 7))
  }
  function goThisWeek() {
    setWeekStart(getWeekStart(new Date("2026-04-16")))
  }

  function copyPreviousWeek() {
    const prevStart = addDays(weekStart, -7)
    setAssignments((prev) => {
      const next = [...prev]
      for (const emp of employees) {
        for (let i = 0; i < 7; i++) {
          const srcDate = formatISODate(addDays(prevStart, i))
          const dstDate = formatISODate(addDays(weekStart, i))
          const src = prev.find(
            (x) => x.employeeId === emp.id && x.date === srcDate,
          )
          const srcShift = src?.shift ?? "serbest"
          const idx = next.findIndex(
            (x) => x.employeeId === emp.id && x.date === dstDate,
          )
          if (idx === -1) {
            next.push({ employeeId: emp.id, date: dstDate, shift: srcShift })
          } else {
            next[idx] = { ...next[idx], shift: srcShift }
          }
        }
      }
      return next
    })
  }

  function applyTemplateToAll(tpl: ShiftTemplate) {
    setAssignments((prev) => {
      const next = [...prev]
      for (const emp of employees) {
        for (let i = 0; i < 7; i++) {
          const dstDate = formatISODate(addDays(weekStart, i))
          const idx = next.findIndex(
            (x) => x.employeeId === emp.id && x.date === dstDate,
          )
          const shift = tpl.pattern[i]
          if (idx === -1) {
            next.push({ employeeId: emp.id, date: dstDate, shift })
          } else {
            next[idx] = { ...next[idx], shift }
          }
        }
      }
      return next
    })
  }

  function exportCSV() {
    const headers = [
      "Calisan",
      "Departman",
      ...weekDates.map(
        (d, i) => `${WEEKDAY_LONG_LABELS[i]} ${formatDayMonth(d)}`,
      ),
      "Toplam Saat",
      "Vardiya Sayisi",
    ]
    const lines = [headers.join(";")]
    for (const emp of employees) {
      const row: string[] = [emp.name, emp.department]
      for (let i = 0; i < 7; i++) {
        const date = formatISODate(addDays(weekStart, i))
        const s = getAssignment(emp.id, date)
        const def = shiftDefs[s]
        row.push(
          def.hours > 0
            ? `${def.label} ${def.startTime}-${def.endTime}`
            : def.label,
        )
      }
      const stats = weeklyStatsFor(emp.id, weekStart, assignments, shiftDefs)
      row.push(stats.totalHours.toString())
      row.push(stats.shiftCount.toString())
      lines.push(row.join(";"))
    }
    const csv = "\uFEFF" + lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vardiya-plani-${formatISODate(weekStart)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function createTemplate() {
    if (!newTplName.trim()) return
    const tpl: ShiftTemplate = {
      id: `tpl-${Date.now()}`,
      name: newTplName.trim(),
      description: newTplDesc.trim() || "Ozel sablon",
      pattern: newTplPattern,
    }
    setTemplates((p) => [...p, tpl])
    setTemplateDialogOpen(false)
    setNewTplName("")
    setNewTplDesc("")
    setNewTplPattern([
      "sabah",
      "sabah",
      "sabah",
      "sabah",
      "sabah",
      "serbest",
      "serbest",
    ])
  }

  // Summary counts across the week for the footer badges.
  const summary = useMemo(() => {
    const counts: Record<ShiftType, number> = {
      sabah: 0,
      "ogleden-sonra": 0,
      gece: 0,
      serbest: 0,
      izin: 0,
    }
    for (const emp of employees) {
      for (let i = 0; i < 7; i++) {
        const date = formatISODate(addDays(weekStart, i))
        const s = getAssignment(emp.id, date)
        counts[s]++
      }
    }
    return counts
  }, [weekStart, getAssignment])

  const warnings = useMemo(() => {
    const list: { employeeId: string; name: string; reason: string }[] = []
    for (const emp of employees) {
      const { totalHours, maxConsecutiveNights } = weeklyStatsFor(
        emp.id,
        weekStart,
        assignments,
        shiftDefs,
      )
      if (totalHours > 45) {
        list.push({
          employeeId: emp.id,
          name: emp.name,
          reason: `Haftalik ${totalHours} saat (45 saat limitinin uzerinde)`,
        })
      }
      if (maxConsecutiveNights >= 3) {
        list.push({
          employeeId: emp.id,
          name: emp.name,
          reason: `${maxConsecutiveNights} gun ust uste gece vardiyasi`,
        })
      }
    }
    return list
  }, [assignments, weekStart, shiftDefs])

  // ---------- render ----------

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
            <CalendarIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Vardiya Plani
            </h1>
            <p className="text-xs text-muted-foreground">
              Haftalik vardiya atamasi ve saat takibi
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrevWeek}
              className="h-9 rounded-r-none px-2"
              aria-label="Onceki hafta"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-sm font-medium text-foreground min-w-[140px] text-center">
              {weekRangeLabel}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goNextWeek}
              className="h-9 rounded-l-none px-2"
              aria-label="Sonraki hafta"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goThisWeek}>
            Bu Hafta
          </Button>
          <Button variant="outline" size="sm" onClick={copyPreviousWeek}>
            <Copy className="h-4 w-4 mr-1.5" />
            Onceki Haftayi Kopyala
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openTypeEditor}
            className="gap-1.5"
          >
            <Settings className="h-4 w-4" />
            Vardiya Turleri
          </Button>
          <Button
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Vardiya Olustur
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="p-3 border-border">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Vardiya Turleri
          </span>
          {SHIFT_ORDER.map((s) => {
            const def = shiftDefs[s]
            const Icon = SHIFT_ICONS[s]
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${def.dotClass}`} />
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground">
                  {def.label}
                  {def.editable && (
                    <span className="text-muted-foreground ml-1 font-mono">
                      {def.startTime}-{def.endTime}
                    </span>
                  )}
                  {def.editable && (
                    <span className="text-muted-foreground/80 ml-1.5">
                      ({def.breakMinutes}dk mola, net {def.hours} sa)
                    </span>
                  )}
                </span>
              </div>
            )
          })}
          <button
            type="button"
            onClick={openTypeEditor}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Duzenle
          </button>
        </div>
      </Card>

      {/* Templates strip */}
      {templates.length > 0 && (
        <Card className="p-3 border-border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
              Sablonlar
            </span>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplateToAll(tpl)}
                className="group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                title={`Tum calisanlara uygula - ${tpl.description}`}
              >
                <span className="font-medium">{tpl.name}</span>
                <span className="flex gap-0.5">
                  {tpl.pattern.map((p, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-3 rounded-sm ${shiftDefs[p].dotClass}`}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-200">
                Uyari: {warnings.length} calisanin vardiya plani dikkat gerektiriyor
              </p>
              <ul className="mt-1.5 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-100/90">
                    <span className="font-medium">{w.name}:</span> {w.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Grid */}
      <Card className="border-border overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="sticky left-0 z-10 bg-muted/30 text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[220px]">
                  Calisan
                </th>
                {weekDates.map((d, i) => {
                  const isWeekend = i >= 5
                  return (
                    <th
                      key={i}
                      className={`px-2 py-3 text-xs font-semibold uppercase tracking-wider text-center min-w-[120px] ${
                        isWeekend
                          ? "text-muted-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div>{WEEKDAY_SHORT_LABELS[i]}</div>
                      <div className="text-[10px] font-normal text-muted-foreground/80 mt-0.5">
                        {formatDayMonth(d)}
                      </div>
                    </th>
                  )
                })}
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right min-w-[120px]">
                  Haftalik
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const stats = weeklyStatsFor(
                  emp.id,
                  weekStart,
                  assignments,
                  shiftDefs,
                )
                const isOverLimit = stats.totalHours > 45
                const hasNightChain = stats.maxConsecutiveNights >= 3
                return (
                  <tr
                    key={emp.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="sticky left-0 z-[1] bg-background px-4 py-3 border-r border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0 border border-border">
                          <AvatarImage src={emp.avatar} alt={emp.name} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {getInitials(emp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {emp.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {emp.position}
                          </p>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((d, i) => {
                      const date = formatISODate(d)
                      const shift = getAssignment(emp.id, date)
                      const def = shiftDefs[shift]
                      const Icon = SHIFT_ICONS[shift]
                      const cellKey = `${emp.id}|${date}`
                      return (
                        <td key={i} className="p-1.5 align-middle">
                          <Popover
                            open={openCellKey === cellKey}
                            onOpenChange={(o) =>
                              setOpenCellKey(o ? cellKey : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={`w-full rounded-md border px-2 py-2 text-left transition-colors ${def.colorClass}`}
                                aria-label={`${emp.name} - ${WEEKDAY_LONG_LABELS[i]} - ${def.label}`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Icon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-xs font-medium truncate">
                                    {def.label}
                                  </span>
                                </div>
                                <div className="mt-1 text-[10px] font-mono opacity-80">
                                  {def.hours > 0
                                    ? `${def.startTime}-${def.endTime}`
                                    : "--"}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-64 p-2"
                              align="start"
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pt-1 pb-2">
                                Vardiya Sec
                              </div>
                              <div className="space-y-1">
                                {SHIFT_ORDER.map((s) => {
                                  const sdef = shiftDefs[s]
                                  const SIcon = SHIFT_ICONS[s]
                                  const isSelected = s === shift
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => {
                                        setShift(emp.id, date, s)
                                        setOpenCellKey(null)
                                      }}
                                      className={`w-full flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                                        isSelected
                                          ? sdef.colorClass
                                          : "border-transparent hover:bg-accent text-foreground"
                                      }`}
                                    >
                                      <span
                                        className={`mt-1 h-2 w-2 rounded-full shrink-0 ${sdef.dotClass}`}
                                      />
                                      <SIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                      <span className="flex-1 min-w-0 text-left">
                                        <span className="flex items-center gap-1">
                                          <span className="font-medium">
                                            {sdef.label}
                                          </span>
                                          {isSelected && (
                                            <Check className="h-3 w-3" />
                                          )}
                                        </span>
                                        {sdef.editable && (
                                          <span className="block mt-0.5 font-mono text-[10px] opacity-80">
                                            {sdef.startTime}-{sdef.endTime}
                                            <span className="ml-1 opacity-70">
                                              ({sdef.breakMinutes}dk / net{" "}
                                              {sdef.hours}sa)
                                            </span>
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                              <Separator className="my-2" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCellKey(null)
                                  openTypeEditor()
                                }}
                                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                                Vardiya turlerini duzenle
                              </button>
                            </PopoverContent>
                          </Popover>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 border-l border-border">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-sm font-semibold ${
                            isOverLimit ? "text-amber-300" : "text-foreground"
                          }`}
                        >
                          {stats.totalHours} sa
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {stats.shiftCount} vardiya
                        </span>
                        {(isOverLimit || hasNightChain) && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px]"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {isOverLimit ? "45+" : "Gece x3"}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/20 border-t border-border">
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Haftalik Ozet
                </td>
                <td
                  colSpan={7}
                  className="px-2 py-3"
                >
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    {SHIFT_ORDER.map((s) => {
                      const def = shiftDefs[s]
                      return (
                        <div key={s} className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${def.dotClass}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {def.label}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {summary[s]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="text-xs text-muted-foreground">
                    Toplam atama
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {Object.values(summary).reduce((a, b) => a + b, 0)}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Create Template dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Vardiya Sablonu</DialogTitle>
            <DialogDescription>
              7 gunluk haftalik desen olustur ve tum calisanlara tek tikla uygula.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Sablon Adi</Label>
              <Input
                id="tpl-name"
                placeholder="Ornegin: 5+2 Sabah"
                value={newTplName}
                onChange={(e) => setNewTplName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">Aciklama</Label>
              <Textarea
                id="tpl-desc"
                placeholder="Kisa aciklama"
                value={newTplDesc}
                onChange={(e) => setNewTplDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Haftalik Desen</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_SHORT_LABELS.map((lbl, i) => {
                  const current = newTplPattern[i]
                  const def = shiftDefs[current]
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="text-[10px] font-medium text-muted-foreground text-center">
                        {lbl}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`w-full rounded-md border px-1.5 py-2 text-[11px] font-medium transition-colors ${def.colorClass}`}
                          >
                            {def.shortCode}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5" align="center">
                          <div className="space-y-0.5">
                            {SHIFT_ORDER.map((s) => {
                              const sdef = shiftDefs[s]
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => {
                                    const next = [...newTplPattern]
                                    next[i] = s
                                    setNewTplPattern(next)
                                  }}
                                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent text-foreground"
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${sdef.dotClass}`}
                                  />
                                  <span className="flex-1 text-left">
                                    {sdef.label}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Her gune dokunarak vardiya turunu degistir.
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tahmini haftalik saat</span>
              <span className="font-semibold text-foreground">
                {newTplPattern.reduce(
                  (acc, s) => acc + shiftDefs[s].hours,
                  0,
                )}{" "}
                saat
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
            >
              Vazgec
            </Button>
            <Button onClick={createTemplate} disabled={!newTplName.trim()}>
              Sablonu Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Type Editor dialog */}
      <Dialog open={typeEditorOpen} onOpenChange={setTypeEditorOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Vardiya Turleri Editoru
            </DialogTitle>
            <DialogDescription>
              Her vardiya turunun adi, baslangic/bitis saatleri, mola suresi
              ve rengi. Net calisma saati mola suresi dusulerek otomatik
              hesaplanir. Kaydet tuslanmadan degisiklikler uygulanmaz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {SHIFT_ORDER.filter((s) => shiftDefs[s].editable).map((s) => {
              const def = shiftDefs[s]
              const draft = editorDrafts[s]
              const Icon = SHIFT_ICONS[s]
              const liveNet = calculateNetHours(
                draft.startTime,
                draft.endTime,
                draft.breakMinutes,
              )
              const draftPreset = COLOR_PRESETS[draft.color]
              const changed =
                draft.label !== def.label ||
                draft.startTime !== def.startTime ||
                draft.endTime !== def.endTime ||
                draft.breakMinutes !== def.breakMinutes ||
                draft.color !== detectColorKey(def.colorClass)
              return (
                <div
                  key={s}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  {/* Header: live preview driven by the draft */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-md border ${draftPreset.colorClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {draft.label || def.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {draft.startTime}-{draft.endTime} &middot;{" "}
                        {draft.breakMinutes}dk mola &middot; net {liveNet} sa
                      </p>
                    </div>
                    {changed && (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px]"
                      >
                        Degisti
                      </Badge>
                    )}
                  </div>

                  {/* Name + color row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`name-${s}`}
                        className="text-[11px] flex items-center gap-1"
                      >
                        <Type className="h-3 w-3" />
                        Vardiya Adi
                      </Label>
                      <Input
                        id={`name-${s}`}
                        type="text"
                        value={draft.label}
                        onChange={(e) =>
                          updateDraft(s, { label: e.target.value })
                        }
                        placeholder={def.label}
                        maxLength={40}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] flex items-center gap-1">
                        <Paintbrush className="h-3 w-3" />
                        Renk
                      </Label>
                      <div
                        role="radiogroup"
                        aria-label={`${draft.label || def.label} rengi`}
                        className="flex flex-wrap items-center gap-1.5 h-9"
                      >
                        {COLOR_KEYS.map((k) => {
                          const p = COLOR_PRESETS[k]
                          const isActive = draft.color === k
                          return (
                            <button
                              key={k}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              aria-label={p.label}
                              title={p.label}
                              onClick={() => updateDraft(s, { color: k })}
                              className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                                p.swatchClass
                              } ${
                                isActive
                                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110"
                                  : "hover:scale-110 ring-1 ring-border/40"
                              }`}
                            >
                              {isActive && (
                                <Check className="h-3.5 w-3.5 text-background" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Time + break + net hours row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`start-${s}`}
                        className="text-[11px] flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        Baslangic
                      </Label>
                      <Input
                        id={`start-${s}`}
                        type="time"
                        value={draft.startTime}
                        onChange={(e) =>
                          updateDraft(s, { startTime: e.target.value })
                        }
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`end-${s}`}
                        className="text-[11px] flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        Bitis
                      </Label>
                      <Input
                        id={`end-${s}`}
                        type="time"
                        value={draft.endTime}
                        onChange={(e) =>
                          updateDraft(s, { endTime: e.target.value })
                        }
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`break-${s}`}
                        className="text-[11px] flex items-center gap-1"
                      >
                        <Utensils className="h-3 w-3" />
                        Mola (dk)
                      </Label>
                      <Input
                        id={`break-${s}`}
                        type="number"
                        min={0}
                        max={480}
                        step={5}
                        value={draft.breakMinutes}
                        onChange={(e) =>
                          updateDraft(s, {
                            breakMinutes: Number(e.target.value) || 0,
                          })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        Net Saat
                      </Label>
                      <div
                        className={`flex h-9 items-center justify-center rounded-md border px-3 ${draftPreset.colorClass}`}
                      >
                        <span className="text-sm font-semibold">
                          {liveNet}
                        </span>
                        <span className="ml-1 text-xs opacity-80">sa</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Not:</span> Net
              saat, (bitis - baslangic) - mola formuluyle hesaplanir. Gece
              vardiyasinda gun donumu otomatik olarak dikkate alinir. Serbest
              ve Izin vardiyalari saatsizdir ve duzenlenemez. Kaydettiginizde
              ad ve renk degisiklikleri takvim, lejant ve sablonlar dahil tum
              planlamada anlik olarak guncellenir.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetDraftsToDefault}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Varsayilanlara Don
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setTypeEditorOpen(false)}
              >
                Vazgec
              </Button>
              <Button onClick={saveTypeEditor}>Kaydet</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
