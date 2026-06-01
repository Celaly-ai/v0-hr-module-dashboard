"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Star,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  FileDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  UserCheck,
  FileText,
  CheckCircle2,
  FileSignature,
  NotebookPen,
  UserCog,
  Users,
  Award,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  employees,
  performanceReviews as seedReviews,
  KPI_CATEGORIES,
  REVIEW_STATUS_LABELS,
  calcOverallScore,
  periodLabel,
  periodSortValue,
  type PerformanceReview,
  type ReviewQuarter,
  type ReviewStatus,
  type KpiScores,
} from "@/lib/hr-data"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUARTERS: ReviewQuarter[] = ["Q1", "Q2", "Q3", "Q4"]
const STATUS_ORDER: ReviewStatus[] = ["taslak", "tamamlandi", "onaylandi"]

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function emptyKpi(): KpiScores {
  return {
    isKalitesi: 3,
    verimlilik: 3,
    takimCalismasi: 3,
    musteriMemnuniyeti: 3,
    devamDurumu: 3,
  }
}

function statusBadgeClass(s: ReviewStatus): string {
  switch (s) {
    case "onaylandi":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    case "tamamlandi":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30"
    case "taslak":
      return "bg-muted text-muted-foreground border-border"
  }
}

function scoreTone(score: number): string {
  if (score >= 4.5) return "text-emerald-400"
  if (score >= 3.5) return "text-sky-400"
  if (score >= 2.5) return "text-amber-400"
  return "text-rose-400"
}

function scoreBadgeClass(score: number): string {
  if (score >= 4.5) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
  if (score >= 3.5) return "bg-sky-500/15 text-sky-300 border-sky-500/30"
  if (score >= 2.5) return "bg-amber-500/15 text-amber-300 border-amber-500/30"
  return "bg-rose-500/15 text-rose-300 border-rose-500/30"
}

function generateId(): string {
  return `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`
}

// ---------------------------------------------------------------------------
// Star Rating primitive
// ---------------------------------------------------------------------------

interface StarsProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  showNumber?: boolean
}

function Stars({ value, max = 5, size = "md", showNumber = false }: StarsProps) {
  const sizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }
  // Round to nearest 0.5 for half-fill rendering.
  const rounded = Math.round(value * 2) / 2
  return (
    <div className="inline-flex items-center gap-1">
      <div className="inline-flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => {
          const idx = i + 1
          const filled = rounded >= idx
          const half = !filled && rounded >= idx - 0.5
          return (
            <span key={i} className="relative inline-block">
              <Star
                className={`${sizes[size]} ${
                  filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                }`}
              />
              {half && (
                <Star
                  className={`${sizes[size]} absolute inset-0 fill-amber-400 text-amber-400`}
                  style={{ clipPath: "inset(0 50% 0 0)" }}
                />
              )}
            </span>
          )
        })}
      </div>
      {showNumber && (
        <span className={`text-xs font-semibold tabular-nums ${scoreTone(value)}`}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}

interface StarInputProps {
  value: number
  onChange: (v: number) => void
  id?: string
}

function StarInput({ value, onChange, id }: StarInputProps) {
  return (
    <div id={id} className="inline-flex items-center gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} yildiz`}
            onClick={() => onChange(n)}
            className="rounded-sm p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40 hover:text-amber-400/60"
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

function exportReviewPdf(review: PerformanceReview) {
  const overall = calcOverallScore(review.kpiScores)
  const selfOverall = review.selfScores ? calcOverallScore(review.selfScores) : null
  const w = window.open("", "_blank", "width=900,height=1000")
  if (!w) return

  const kpiRows = KPI_CATEGORIES.map((c) => {
    const mgr = review.kpiScores[c.key]
    const self = review.selfScores ? review.selfScores[c.key] : "-"
    return `<tr>
      <td>${c.label}</td>
      <td class="center">${mgr} / 5</td>
      <td class="center">${self === "-" ? "-" : `${self} / 5`}</td>
    </tr>`
  }).join("")

  const statusLabel = REVIEW_STATUS_LABELS[review.status]

  w.document.write(`<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Performans Degerlendirme - ${review.employeeName} - ${periodLabel(review.period, review.year)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    color: #111; margin: 0; padding: 32px; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: .04em; color: #333; }
  .muted { color: #666; font-size: 12px; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; font-size: 13px; margin-top: 16px; }
  .meta div span:first-child { color: #666; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .score-box { border: 1px solid #111; border-radius: 8px; padding: 12px 16px; text-align: center; }
  .score-box .val { font-size: 30px; font-weight: 700; line-height: 1; }
  .score-box .lbl { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .04em; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th { background: #f4f4f5; font-weight: 600; }
  td.center { text-align: center; }
  .notes { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; font-size: 12px; white-space: pre-wrap; min-height: 40px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer { margin-top: 32px; display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 12px; font-size: 11px; color: #666; }
  .sign { border-top: 1px solid #111; padding-top: 6px; text-align: center; font-size: 11px; width: 200px; }
  .signs { display: flex; justify-content: space-between; margin-top: 48px; }
  @media print {
    body { padding: 18px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header-row">
    <div>
      <h1>Performans Degerlendirme Raporu</h1>
      <div class="muted">${periodLabel(review.period, review.year)} &middot; Durum: ${statusLabel}</div>
    </div>
    <div class="score-box">
      <div class="val">${overall.toFixed(1)}</div>
      <div class="lbl">Genel Skor / 5</div>
    </div>
  </div>

  <div class="meta">
    <div><span>Calisan</span>${review.employeeName}</div>
    <div><span>Departman</span>${review.department}</div>
    <div><span>Pozisyon</span>${review.position}</div>
    <div><span>Degerlendiren</span>${review.reviewerName}</div>
    <div><span>Olusturulma</span>${review.createdDate}</div>
    <div><span>Tamamlanma</span>${review.completedDate ?? "-"}</div>
    <div><span>Onaylanma</span>${review.approvedDate ?? "-"}</div>
    <div><span>Oz Degerlendirme Skoru</span>${selfOverall !== null ? selfOverall.toFixed(1) : "Yok"}</div>
  </div>

  <h2>KPI Puanlari</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50%">Kategori</th>
        <th class="center" style="width: 25%">Yonetici</th>
        <th class="center" style="width: 25%">Oz Degerlendirme</th>
      </tr>
    </thead>
    <tbody>${kpiRows}</tbody>
  </table>

  <div class="grid-2">
    <div>
      <h2>Yonetici Notlari</h2>
      <div class="notes">${(review.reviewerNotes || "-").replace(/</g, "&lt;")}</div>
    </div>
    <div>
      <h2>Calisan Notlari</h2>
      <div class="notes">${(review.selfNotes || "-").replace(/</g, "&lt;")}</div>
    </div>
  </div>

  <div class="signs">
    <div class="sign">Calisan Imzasi</div>
    <div class="sign">Degerlendiren Imzasi</div>
    <div class="sign">IK Onayi</div>
  </div>

  <div class="footer">
    <span>Fey Teknik - Lunapark Servis</span>
    <span>Basim: ${new Date().toLocaleString("tr-TR")}</span>
  </div>

  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 250); };
  </script>
</body>
</html>`)
  w.document.close()
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PerformanceReviews() {
  const [reviews, setReviews] = useState<PerformanceReview[]>(seedReviews)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all")
  const [employeeFilter, setEmployeeFilter] = useState<string>("all")

  const [createOpen, setCreateOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null)
  const [detailReview, setDetailReview] = useState<PerformanceReview | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PerformanceReview | null>(null)

  // -----------------------------
  // Derived
  // -----------------------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reviews
      .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
      .filter((r) => (employeeFilter === "all" ? true : r.employeeId === employeeFilter))
      .filter((r) => {
        if (!q) return true
        return (
          r.employeeName.toLowerCase().includes(q) ||
          r.reviewerName.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          periodLabel(r.period, r.year).toLowerCase().includes(q)
        )
      })
      .sort(
        (a, b) =>
          periodSortValue(b.period, b.year) - periodSortValue(a.period, a.year),
      )
  }, [reviews, search, statusFilter, employeeFilter])

  const stats = useMemo(() => {
    const completedOrApproved = reviews.filter(
      (r) => r.status !== "taslak",
    )
    const avg =
      completedOrApproved.length === 0
        ? 0
        : completedOrApproved.reduce(
            (acc, r) => acc + calcOverallScore(r.kpiScores),
            0,
          ) / completedOrApproved.length
    const byStatus: Record<ReviewStatus, number> = {
      taslak: 0,
      tamamlandi: 0,
      onaylandi: 0,
    }
    for (const r of reviews) byStatus[r.status]++
    return {
      total: reviews.length,
      avg: Math.round(avg * 10) / 10,
      byStatus,
    }
  }, [reviews])

  // -----------------------------
  // Actions
  // -----------------------------

  function saveReview(r: PerformanceReview) {
    setReviews((prev) => {
      const exists = prev.some((x) => x.id === r.id)
      if (exists) return prev.map((x) => (x.id === r.id ? r : x))
      return [r, ...prev]
    })
  }

  function removeReview(id: string) {
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }

  // -----------------------------
  // Render
  // -----------------------------

  return (
    <div className="space-y-6">
      {/* Page Heading + Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Performans Degerlendirme
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ceyreklik KPI puanlamalari, oz degerlendirme ve tarihsel trend analizi.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          Yeni Degerlendirme
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Toplam Degerlendirme"
          value={stats.total.toString()}
          icon={FileText}
          tone="neutral"
        />
        <StatCard
          label="Ortalama Genel Skor"
          value={stats.avg ? stats.avg.toFixed(1) : "-"}
          icon={Award}
          tone="primary"
          suffix="/ 5"
        />
        <StatCard
          label="Tamamlanan"
          value={stats.byStatus.tamamlandi.toString()}
          icon={CheckCircle2}
          tone="info"
        />
        <StatCard
          label="Onaylanan"
          value={stats.byStatus.onaylandi.toString()}
          icon={FileSignature}
          tone="success"
        />
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Calisan, departman, donem ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | ReviewStatus)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum Durumlar</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {REVIEW_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Calisan" />
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
          </div>
        </CardContent>
      </Card>

      {/* Review Table */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Degerlendirme Listesi</CardTitle>
          <CardDescription>
            {filtered.length} kayit gosteriliyor. En yeni donem en ustte.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Calisan</TableHead>
                  <TableHead>Donem</TableHead>
                  <TableHead>Degerlendiren</TableHead>
                  <TableHead>Genel Skor</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Islemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Filtrelere uygun degerlendirme bulunamadi.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const overall = calcOverallScore(r.kpiScores)
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setDetailReview(r)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={r.employeeAvatar || "/placeholder.svg"} alt={r.employeeName} />
                              <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                                {getInitials(r.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {r.employeeName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {r.department} &middot; {r.position}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {periodLabel(r.period, r.year)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {r.reviewerName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Stars value={overall} size="sm" />
                            <Badge
                              variant="outline"
                              className={`${scoreBadgeClass(overall)} text-[10px] h-5 px-1.5 tabular-nums`}
                            >
                              {overall.toFixed(1)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusBadgeClass(r.status)} text-[10px]`}
                          >
                            {REVIEW_STATUS_LABELS[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDetailReview(r)}
                              title="Detay"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingReview(r)}
                              title="Duzenle"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => exportReviewPdf(r)}
                              title="PDF Indir"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-400 hover:text-rose-400 hover:bg-rose-500/10"
                              onClick={() => setDeleteTarget(r)}
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <ReviewFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSave={saveReview}
      />

      {/* Edit Dialog */}
      <ReviewFormDialog
        open={!!editingReview}
        onOpenChange={(v) => !v && setEditingReview(null)}
        mode="edit"
        initial={editingReview ?? undefined}
        onSave={(r) => {
          saveReview(r)
          setEditingReview(null)
        }}
      />

      {/* Detail Dialog */}
      <ReviewDetailDialog
        review={detailReview}
        reviews={reviews}
        onClose={() => setDetailReview(null)}
        onEdit={(r) => {
          setDetailReview(null)
          setEditingReview(r)
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Degerlendirmeyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.employeeName} - ${periodLabel(deleteTarget.period, deleteTarget.year)} kaydi kalici olarak silinecek. Bu islem geri alinamaz.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              onClick={() => {
                if (deleteTarget) removeReview(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  suffix?: string
  icon: React.ComponentType<{ className?: string }>
  tone: "neutral" | "primary" | "info" | "success"
}

function StatCard({ label, value, suffix, icon: Icon, tone }: StatCardProps) {
  const toneMap = {
    neutral: "text-muted-foreground bg-muted/60",
    primary: "text-amber-400 bg-amber-500/15",
    info: "text-sky-400 bg-sky-500/15",
    success: "text-emerald-400 bg-emerald-500/15",
  }
  return (
    <Card className="border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneMap[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xl font-semibold text-foreground tabular-nums">
            {value}
            {suffix && (
              <span className="ml-1 text-xs text-muted-foreground font-normal">
                {suffix}
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Review Form Dialog (create + edit)
// ---------------------------------------------------------------------------

interface ReviewFormDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: "create" | "edit"
  initial?: PerformanceReview
  onSave: (r: PerformanceReview) => void
}

function ReviewFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSave,
}: ReviewFormDialogProps) {
  const defaultYear = new Date().getFullYear()

  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? "")
  const [reviewerId, setReviewerId] = useState(initial?.reviewerId ?? "7")
  const [period, setPeriod] = useState<ReviewQuarter>(initial?.period ?? "Q4")
  const [year, setYear] = useState<number>(initial?.year ?? defaultYear)
  const [status, setStatus] = useState<ReviewStatus>(initial?.status ?? "taslak")
  const [kpi, setKpi] = useState<KpiScores>(initial?.kpiScores ?? emptyKpi())
  const [includeSelf, setIncludeSelf] = useState<boolean>(
    initial?.selfScores !== null && initial?.selfScores !== undefined,
  )
  const [selfKpi, setSelfKpi] = useState<KpiScores>(
    initial?.selfScores ?? emptyKpi(),
  )
  const [reviewerNotes, setReviewerNotes] = useState(initial?.reviewerNotes ?? "")
  const [selfNotes, setSelfNotes] = useState(initial?.selfNotes ?? "")
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"manager" | "self">("manager")

  // Reset when dialog opens with a different initial.
  // Using the `open` flag transitioning to true is the simplest heuristic.
  const [lastOpen, setLastOpen] = useState(false)
  if (open && !lastOpen) {
    setEmployeeId(initial?.employeeId ?? "")
    setReviewerId(initial?.reviewerId ?? "7")
    setPeriod(initial?.period ?? "Q4")
    setYear(initial?.year ?? defaultYear)
    setStatus(initial?.status ?? "taslak")
    setKpi(initial?.kpiScores ?? emptyKpi())
    const hasSelf =
      initial?.selfScores !== null && initial?.selfScores !== undefined
    setIncludeSelf(hasSelf)
    setSelfKpi(initial?.selfScores ?? emptyKpi())
    setReviewerNotes(initial?.reviewerNotes ?? "")
    setSelfNotes(initial?.selfNotes ?? "")
    setError(null)
    setTab("manager")
    setLastOpen(true)
  } else if (!open && lastOpen) {
    setLastOpen(false)
  }

  const overall = calcOverallScore(kpi)
  const selfOverall = includeSelf ? calcOverallScore(selfKpi) : null

  function handleSave() {
    if (!employeeId) {
      setError("Lutfen bir calisan secin.")
      return
    }
    if (!reviewerId) {
      setError("Lutfen bir degerlendiren secin.")
      return
    }
    if (!year || year < 2000 || year > 2100) {
      setError("Gecerli bir yil girin.")
      return
    }

    const emp = employees.find((e) => e.id === employeeId)
    const reviewer = employees.find((e) => e.id === reviewerId)
    if (!emp || !reviewer) {
      setError("Calisan veya degerlendiren bulunamadi.")
      return
    }

    const now = today()
    const base: PerformanceReview = initial
      ? { ...initial }
      : {
          id: generateId(),
          employeeId,
          employeeName: emp.name,
          employeeAvatar: emp.avatar,
          department: emp.department,
          position: emp.position,
          period,
          year,
          reviewerId,
          reviewerName: reviewer.name,
          kpiScores: kpi,
          selfScores: includeSelf ? selfKpi : null,
          reviewerNotes,
          selfNotes,
          status,
          createdDate: now,
          completedDate: null,
          approvedDate: null,
        }

    // Merge updated fields (works for both create and edit)
    const next: PerformanceReview = {
      ...base,
      employeeId,
      employeeName: emp.name,
      employeeAvatar: emp.avatar,
      department: emp.department,
      position: emp.position,
      period,
      year,
      reviewerId,
      reviewerName: reviewer.name,
      kpiScores: kpi,
      selfScores: includeSelf ? selfKpi : null,
      reviewerNotes,
      selfNotes,
      status,
    }

    // Advance timestamps when status moves forward
    if (
      (status === "tamamlandi" || status === "onaylandi") &&
      !next.completedDate
    ) {
      next.completedDate = now
    }
    if (status === "onaylandi" && !next.approvedDate) {
      next.approvedDate = now
    }
    if (status === "taslak") {
      next.approvedDate = null
    }

    onSave(next)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-primary" />
            {mode === "create"
              ? "Yeni Performans Degerlendirmesi"
              : "Degerlendirmeyi Duzenle"}
          </DialogTitle>
          <DialogDescription>
            KPI puanlari 1 ile 5 arasindadir. Genel skor otomatik olarak
            hesaplanir.
          </DialogDescription>
        </DialogHeader>

        {/* Meta fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>
              <Users className="h-3 w-3 inline mr-1" />
              Calisan
            </Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Calisan sec" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} &middot; {e.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              <UserCog className="h-3 w-3 inline mr-1" />
              Degerlendiren
            </Label>
            <Select value={reviewerId} onValueChange={setReviewerId}>
              <SelectTrigger>
                <SelectValue placeholder="Degerlendiren sec" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} &middot; {e.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              <Calendar className="h-3 w-3 inline mr-1" />
              Donem
            </Label>
            <div className="flex gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as ReviewQuarter)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              <FileSignature className="h-3 w-3 inline mr-1" />
              Durum
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ReviewStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {REVIEW_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overall banner */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Genel Skor (Otomatik)
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-2xl font-semibold tabular-nums ${scoreTone(overall)}`}
              >
                {overall.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">/ 5</span>
              <Stars value={overall} size="md" />
            </div>
          </div>
          {includeSelf && selfOverall !== null && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Oz Degerlendirme
              </p>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span
                  className={`text-xl font-semibold tabular-nums ${scoreTone(selfOverall)}`}
                >
                  {selfOverall.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs: Manager / Self */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "manager" | "self")}>
          <TabsList>
            <TabsTrigger value="manager" className="gap-1.5">
              <UserCog className="h-3.5 w-3.5" />
              Yonetici Degerlendirmesi
            </TabsTrigger>
            <TabsTrigger value="self" className="gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              Oz Degerlendirme
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manager" className="space-y-4 mt-3">
            <KpiEditor value={kpi} onChange={setKpi} />
            <div className="space-y-1.5">
              <Label htmlFor="mgr-notes">Yonetici Notlari</Label>
              <Textarea
                id="mgr-notes"
                rows={4}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Gozlem, gelisim alanlari ve onerilen hedefler..."
              />
            </div>
          </TabsContent>

          <TabsContent value="self" className="space-y-4 mt-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Oz degerlendirme eklendi mi?
                </p>
                <p className="text-xs text-muted-foreground">
                  Calisanin kendi verdigi puanlar ve notlar.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={includeSelf ? "default" : "outline"}
                onClick={() => setIncludeSelf((v) => !v)}
              >
                {includeSelf ? "Kaldir" : "Ekle"}
              </Button>
            </div>

            {includeSelf && (
              <>
                <KpiEditor value={selfKpi} onChange={setSelfKpi} />
                <div className="space-y-1.5">
                  <Label htmlFor="self-notes">Calisan Notlari</Label>
                  <Textarea
                    id="self-notes"
                    rows={4}
                    value={selfNotes}
                    onChange={(e) => setSelfNotes(e.target.value)}
                    placeholder="Basarilar, ogrenmeler ve onerilen hedefler..."
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-xs text-rose-400 border border-rose-500/30 bg-rose-500/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgec
          </Button>
          <Button onClick={handleSave}>
            {mode === "create" ? "Olustur" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// KPI Editor (shared by manager and self tabs)
// ---------------------------------------------------------------------------

interface KpiEditorProps {
  value: KpiScores
  onChange: (v: KpiScores) => void
}

function KpiEditor({ value, onChange }: KpiEditorProps) {
  return (
    <div className="space-y-2">
      {KPI_CATEGORIES.map((c) => (
        <div
          key={c.key}
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{c.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {c.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StarInput
              value={value[c.key]}
              onChange={(n) => onChange({ ...value, [c.key]: n })}
            />
            <span
              className={`text-sm font-semibold tabular-nums w-6 text-right ${scoreTone(value[c.key])}`}
            >
              {value[c.key]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Review Detail Dialog
// ---------------------------------------------------------------------------

interface ReviewDetailDialogProps {
  review: PerformanceReview | null
  reviews: PerformanceReview[]
  onClose: () => void
  onEdit: (r: PerformanceReview) => void
}

function ReviewDetailDialog({
  review,
  reviews,
  onClose,
  onEdit,
}: ReviewDetailDialogProps) {
  const history = useMemo(() => {
    if (!review) return []
    return reviews
      .filter((r) => r.employeeId === review.employeeId)
      .sort(
        (a, b) =>
          periodSortValue(a.period, a.year) - periodSortValue(b.period, b.year),
      )
      .map((r) => {
        const overall = calcOverallScore(r.kpiScores)
        const self = r.selfScores ? calcOverallScore(r.selfScores) : null
        return {
          period: periodLabel(r.period, r.year),
          yonetici: overall,
          oz: self,
          raw: r,
        }
      })
  }, [review, reviews])

  if (!review) return null

  const overall = calcOverallScore(review.kpiScores)
  const selfOverall = review.selfScores
    ? calcOverallScore(review.selfScores)
    : null

  // Compute trend vs previous review for the same employee
  let trend: { delta: number; direction: "up" | "down" | "flat" } | null = null
  const idx = history.findIndex((h) => h.raw.id === review.id)
  if (idx > 0) {
    const prev = history[idx - 1].yonetici
    const delta = Math.round((overall - prev) * 10) / 10
    trend =
      delta > 0
        ? { delta, direction: "up" }
        : delta < 0
          ? { delta, direction: "down" }
          : { delta: 0, direction: "flat" }
  }

  return (
    <Dialog open={!!review} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Avatar className="h-12 w-12">
                <AvatarImage src={review.employeeAvatar || "/placeholder.svg"} alt={review.employeeName} />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {getInitials(review.employeeName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="text-lg">{review.employeeName}</DialogTitle>
                <DialogDescription className="mt-1">
                  {review.department} &middot; {review.position}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {periodLabel(review.period, review.year)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <UserCog className="h-3 w-3" />
                    {review.reviewerName}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={statusBadgeClass(review.status)}
                  >
                    {REVIEW_STATUS_LABELS[review.status]}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReviewPdf(review)}
                className="gap-1.5"
              >
                <FileDown className="h-3.5 w-3.5" />
                PDF
              </Button>
              <Button
                size="sm"
                onClick={() => onEdit(review)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Duzenle
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Score summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Genel Skor
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-3xl font-semibold tabular-nums ${scoreTone(overall)}`}>
                  {overall.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
              <div className="mt-1">
                <Stars value={overall} size="md" />
              </div>
              {trend && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs">
                  {trend.direction === "up" && (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium tabular-nums">
                        +{trend.delta.toFixed(1)}
                      </span>
                    </>
                  )}
                  {trend.direction === "down" && (
                    <>
                      <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-rose-400 font-medium tabular-nums">
                        {trend.delta.toFixed(1)}
                      </span>
                    </>
                  )}
                  {trend.direction === "flat" && (
                    <>
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Sabit</span>
                    </>
                  )}
                  <span className="text-muted-foreground">onceki donem</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Oz Degerlendirme
              </p>
              {selfOverall !== null ? (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-3xl font-semibold tabular-nums ${scoreTone(selfOverall)}`}
                    >
                      {selfOverall.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 5</span>
                  </div>
                  <div className="mt-1">
                    <Stars value={selfOverall} size="md" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Yonetici-Oz farki:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {(overall - selfOverall).toFixed(1)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Henuz oz degerlendirme eklenmedi.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Tarihce
              </p>
              <p className="text-sm text-foreground mt-1">
                <span className="font-semibold tabular-nums">{history.length}</span>{" "}
                degerlendirme
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Olusturulma:{" "}
                <span className="tabular-nums">{review.createdDate}</span>
              </p>
              {review.completedDate && (
                <p className="text-[11px] text-muted-foreground">
                  Tamamlanma:{" "}
                  <span className="tabular-nums">{review.completedDate}</span>
                </p>
              )}
              {review.approvedDate && (
                <p className="text-[11px] text-muted-foreground">
                  Onaylanma:{" "}
                  <span className="tabular-nums">{review.approvedDate}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KPI breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            KPI Kirilimi
          </h3>
          <div className="space-y-2">
            {KPI_CATEGORIES.map((c) => {
              const mgr = review.kpiScores[c.key]
              const self = review.selfScores ? review.selfScores[c.key] : null
              return (
                <div
                  key={c.key}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">
                      {c.label}
                    </p>
                    {self !== null && mgr !== self && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 ${
                          mgr > self
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        Fark: {mgr > self ? "+" : ""}
                        {mgr - self}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <KpiBar label="Yonetici" value={mgr} />
                    {self !== null && <KpiBar label="Oz" value={self} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                Yonetici Notlari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {review.reviewerNotes || (
                  <span className="text-muted-foreground italic">
                    Not eklenmedi.
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Calisan Notlari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {review.selfNotes || (
                  <span className="text-muted-foreground italic">
                    Not eklenmedi.
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Historical Trend */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tarihsel Trend
              </h3>
              <p className="text-xs text-muted-foreground">
                {review.employeeName} icin tum donemlerdeki genel skor.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {history.length} donem
            </Badge>
          </div>

          {history.length < 2 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Trend grafigi icin en az iki donem gereklidir.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card p-3">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={history}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="yonetici"
                    name="Yonetici"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 0, fill: "#38bdf8" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="oz"
                    name="Oz"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 4, strokeWidth: 0, fill: "#fbbf24" }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// KPI comparison bar
// ---------------------------------------------------------------------------

function KpiBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[11px] text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all ${
            value >= 4.5
              ? "bg-emerald-500"
              : value >= 3.5
                ? "bg-sky-500"
                : value >= 2.5
                  ? "bg-amber-500"
                  : "bg-rose-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-8 text-right ${scoreTone(value)}`}>
        {value}
      </span>
    </div>
  )
}
