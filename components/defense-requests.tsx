"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  MessageSquare,
  Plus,
  ShieldAlert,
  Timer,
  Upload,
  User,
  X,
} from "lucide-react"
import {
  type DefenseRequest,
  type DisciplineRecord,
  type Employee,
} from "@/lib/hr-data"
import { useSettingsStore } from "@/lib/settings-store"
import {
  DEFENSE_BUSINESS_DAYS,
  addBusinessDays,
  businessDaysUntil,
  formatRemaining,
  isDeadlinePassed,
} from "@/lib/discipline-utils"

interface Props {
  employees: Employee[]
  defenses: DefenseRequest[]
  onRequestDefense: (req: DefenseRequest) => void
  onSubmitEmployeeDefense: (
    id: string,
    text: string,
    documentUrl: string | null,
    signature: string | null,
  ) => void
  onManagerDecision: (
    id: string,
    decision: string,
    decisionLabel: string,
    notes: string,
  ) => DisciplineRecord | null
}

type StatusKey = DefenseRequest["status"]

const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; icon: typeof Clock }
> = {
  bekliyor: {
    label: "Savunma Bekleniyor",
    color: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    icon: Clock,
  },
  "savunma-yapildi": {
    label: "Karar Bekliyor",
    color: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    icon: MessageSquare,
  },
  "savunma-yapilmadi": {
    label: "Sure Doldu",
    color: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    icon: AlertTriangle,
  },
  tamamlandi: {
    label: "Tamamlandi",
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    icon: CheckCircle2,
  },
}

export function DefenseRequestsPanel({
  employees,
  defenses,
  onRequestDefense,
  onSubmitEmployeeDefense,
  onManagerDecision,
}: Props) {
  const settings = useSettingsStore()
  const [requestDialog, setRequestDialog] = useState(false)
  const [submitDialog, setSubmitDialog] = useState<DefenseRequest | null>(null)
  const [decisionDialog, setDecisionDialog] = useState<DefenseRequest | null>(null)
  const [detailDialog, setDetailDialog] = useState<DefenseRequest | null>(null)

  // Saniye bazinda geri sayim icin tick
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    return {
      bekliyor: defenses.filter((d) => d.status === "bekliyor").length,
      karar: defenses.filter(
        (d) =>
          d.status === "savunma-yapildi" || d.status === "savunma-yapilmadi",
      ).length,
      tamamlandi: defenses.filter((d) => d.status === "tamamlandi").length,
      toplam: defenses.length,
    }
  }, [defenses])

  const sorted = useMemo(() => {
    return [...defenses].sort((a, b) => {
      const rank = (d: DefenseRequest) => {
        if (d.status === "savunma-yapildi" || d.status === "savunma-yapilmadi")
          return 0
        if (d.status === "bekliyor") return 1
        return 2
      }
      const diff = rank(a) - rank(b)
      if (diff !== 0) return diff
      return (
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      )
    })
  }, [defenses])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Savunma Talepleri
          </h3>
          <p className="text-sm text-muted-foreground">
            Personele savunma hakki taniyin, {DEFENSE_BUSINESS_DAYS} is gunu
            icinde karar verilir.
          </p>
        </div>
        <Button onClick={() => setRequestDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Savunma Talep Et
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-5 w-5 text-primary" />}
          bg="bg-primary/10"
          count={stats.toplam}
          label="Toplam Talep"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-300" />}
          bg="bg-amber-500/10"
          count={stats.bekliyor}
          label="Savunma Bekliyor"
        />
        <StatCard
          icon={<Gavel className="h-5 w-5 text-sky-300" />}
          bg="bg-sky-500/10"
          count={stats.karar}
          label="Yonetici Karari Bekliyor"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-300" />}
          bg="bg-emerald-500/10"
          count={stats.tamamlandi}
          label="Tamamlandi"
        />
      </div>

      {/* List */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Talep Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-foreground">
                Henuz savunma talebi yok.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                &quot;Savunma Talep Et&quot; butonuna basarak yeni talep
                olusturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((d) => (
                <DefenseRow
                  key={d.id}
                  defense={d}
                  onOpenDetail={() => setDetailDialog(d)}
                  onOpenSubmit={() => setSubmitDialog(d)}
                  onOpenDecision={() => setDecisionDialog(d)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RequestDefenseDialog
        open={requestDialog}
        onOpenChange={setRequestDialog}
        employees={employees}
        violationTypes={settings.violationTypes}
        onCreate={onRequestDefense}
      />
      <SubmitDefenseDialog
        defense={submitDialog}
        onClose={() => setSubmitDialog(null)}
        onSubmit={onSubmitEmployeeDefense}
      />
      <ManagerDecisionDialog
        defense={decisionDialog}
        onClose={() => setDecisionDialog(null)}
        onDecide={onManagerDecision}
      />
      <DefenseDetailDialog
        defense={detailDialog}
        onClose={() => setDetailDialog(null)}
      />
    </div>
  )
}

// -----------------------------
// Kart gorseli
// -----------------------------

function StatCard({
  icon,
  bg,
  count,
  label,
}: {
  icon: React.ReactNode
  bg: string
  count: number
  label: string
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DefenseRow({
  defense,
  onOpenDetail,
  onOpenSubmit,
  onOpenDecision,
}: {
  defense: DefenseRequest
  onOpenDetail: () => void
  onOpenSubmit: () => void
  onOpenDecision: () => void
}) {
  const meta = STATUS_META[defense.status]
  const Icon = meta.icon
  const passed = isDeadlinePassed(defense.deadlineAt)
  const remaining = formatRemaining(defense.deadlineAt)
  const daysLeft = businessDaysUntil(defense.deadlineAt)

  // Elapsed progress 0-100
  const progress = useMemo(() => {
    const start = new Date(defense.requestedAt).getTime()
    const end = new Date(defense.deadlineAt).getTime()
    const now = Date.now()
    if (now >= end) return 100
    if (now <= start) return 0
    return Math.min(100, ((now - start) / (end - start)) * 100)
  }, [defense.requestedAt, defense.deadlineAt])

  const violationLabel =
    defense.violationTypeLabel ?? defense.violationType ?? "-"

  return (
    <div className="rounded-lg border border-border bg-muted/5 p-4 hover:bg-muted/10 transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              {defense.employeeName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                {defense.employeeName}
              </span>
              <Badge
                variant="outline"
                className="border-border text-muted-foreground text-[10px]"
              >
                {violationLabel}
              </Badge>
              <Badge variant="outline" className={`${meta.color} text-[10px]`}>
                <Icon className="h-3 w-3 mr-1" />
                {meta.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {defense.hrDescription}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Ihlal:{" "}
                {new Date(defense.violationDate).toLocaleDateString("tr-TR")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Son Tarih:{" "}
                {new Date(defense.deadlineAt).toLocaleString("tr-TR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {defense.status === "bekliyor" && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    passed
                      ? "text-rose-300"
                      : daysLeft < 1
                        ? "text-amber-300"
                        : "text-emerald-300"
                  }`}
                >
                  <Timer className="h-3 w-3" />
                  {passed ? "Sure doldu" : `Kalan: ${remaining}`}
                </span>
              )}
            </div>
            {defense.status === "bekliyor" && (
              <Progress value={progress} className="h-1 mt-2" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenDetail}
            className="h-8"
          >
            Detay
          </Button>
          {defense.status === "bekliyor" && (
            <Button size="sm" onClick={onOpenSubmit} className="h-8 gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Savunma Gonder
            </Button>
          )}
          {(defense.status === "savunma-yapildi" ||
            defense.status === "savunma-yapilmadi") && (
            <Button
              size="sm"
              onClick={onOpenDecision}
              className="h-8 gap-1 bg-primary text-primary-foreground"
            >
              <Gavel className="h-3.5 w-3.5" />
              Karar Ver
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// -----------------------------
// Dialog: Yeni savunma talebi
// -----------------------------

function RequestDefenseDialog({
  open,
  onOpenChange,
  employees,
  violationTypes,
  onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  employees: Employee[]
  violationTypes: ReturnType<typeof useSettingsStore>["violationTypes"]
  onCreate: (r: DefenseRequest) => void
}) {
  const [employeeId, setEmployeeId] = useState("")
  const [violation, setViolation] = useState("")
  const [violationDate, setViolationDate] = useState("")
  const [description, setDescription] = useState("")
  const [witness, setWitness] = useState("")
  const [docName, setDocName] = useState("")
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function reset() {
    setEmployeeId("")
    setViolation("")
    setViolationDate("")
    setDescription("")
    setWitness("")
    setDocName("")
    setDocUrl(null)
    setErrors({})
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setDocName(file.name)
      setDocUrl(URL.createObjectURL(file))
    }
  }

  function handleCreate() {
    const errs: Record<string, string> = {}
    if (!employeeId) errs.employeeId = "Calisan secimi zorunludur"
    if (!violation) errs.violation = "Ihlal turu zorunludur"
    if (!violationDate) errs.violationDate = "Ihlal tarihi zorunludur"
    if (!description.trim())
      errs.description = "Aciklama zorunludur"
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const emp = employees.find((e) => e.id === employeeId)
    if (!emp) return
    const vt = violationTypes.find((v) => v.value === violation)
    const now = new Date().toISOString()
    const deadline = addBusinessDays(now, DEFENSE_BUSINESS_DAYS)

    const req: DefenseRequest = {
      id: `def-${Date.now()}`,
      employeeId,
      employeeName: emp.name,
      violationType: violation,
      violationTypeLabel: vt?.label ?? violation,
      violationDate,
      hrDescription: description.trim(),
      witnessName: witness.trim() || null,
      hrDocumentUrl: docUrl,
      requestedAt: now,
      deadlineAt: deadline,
      status: "bekliyor",
    }
    onCreate(req)
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Yeni Savunma Talebi
          </DialogTitle>
          <DialogDescription>
            Personelin {DEFENSE_BUSINESS_DAYS} is gunu icinde yazili savunma
            vermesi istenir. Sure doldugunda yonetici savunmasiz karar
            verebilir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Calisan *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger
                className={`bg-secondary border-border ${
                  errors.employeeId ? "border-destructive" : ""
                }`}
              >
                <SelectValue placeholder="Calisan secin" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {e.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {e.name} - {e.department}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && (
              <p className="text-xs text-destructive">{errors.employeeId}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ihlal Turu *</Label>
              <Select value={violation} onValueChange={setViolation}>
                <SelectTrigger
                  className={`bg-secondary border-border ${
                    errors.violation ? "border-destructive" : ""
                  }`}
                >
                  <SelectValue placeholder="Tur secin" />
                </SelectTrigger>
                <SelectContent>
                  {violationTypes.map((v) => (
                    <SelectItem key={v.id} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.violation && (
                <p className="text-xs text-destructive">{errors.violation}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Ihlal Tarihi *</Label>
              <Input
                type="date"
                value={violationDate}
                onChange={(e) => setViolationDate(e.target.value)}
                className={`bg-secondary border-border ${
                  errors.violationDate ? "border-destructive" : ""
                }`}
              />
              {errors.violationDate && (
                <p className="text-xs text-destructive">
                  {errors.violationDate}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>IK Aciklamasi *</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Olayin detayini ve personelden beklenen savunmayi aciklayin..."
              className={`bg-secondary border-border ${
                errors.description ? "border-destructive" : ""
              }`}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tanik (Opsiyonel)</Label>
              <Input
                value={witness}
                onChange={(e) => setWitness(e.target.value)}
                placeholder="Tanik adi soyadi"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Ek Belge (Opsiyonel)</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <div className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span className="truncate">
                      {docName || "Dosya secin"}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={handleUpload}
                  />
                </label>
                {docName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDocName("")
                      setDocUrl(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/10 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Timer className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p>
              Talep olusturulduktan sonra personelin {DEFENSE_BUSINESS_DAYS} is
              gunu savunma hakki vardir. Sure bitiminde sistem otomatik olarak
              &quot;Sure Doldu&quot; durumuna gecer.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgec
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Talebi Olustur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------
// Dialog: Personelin savunmasini kaydet
// -----------------------------

function SubmitDefenseDialog({
  defense,
  onClose,
  onSubmit,
}: {
  defense: DefenseRequest | null
  onClose: () => void
  onSubmit: (
    id: string,
    text: string,
    docUrl: string | null,
    signature: string | null,
  ) => void
}) {
  const [text, setText] = useState("")
  const [docName, setDocName] = useState("")
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)

  useEffect(() => {
    if (defense && canvasRef.current) {
      const c = canvasRef.current
      const ctx = c.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#1a1a2e"
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.strokeStyle = "#22c55e"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      setText("")
      setDocName("")
      setDocUrl(null)
      setHasSig(false)
      setError("")
    }
  }, [defense])

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setDocName(f.name)
      setDocUrl(URL.createObjectURL(f))
    }
  }

  function pos(e: React.MouseEvent | React.TouchEvent) {
    const c = canvasRef.current
    if (!c) return { x: 0, y: 0 }
    const rect = c.getBoundingClientRect()
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    const me = e as React.MouseEvent
    return { x: me.clientX - rect.left, y: me.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    setDrawing(true)
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    if ("touches" in e) e.preventDefault()
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSig(true)
  }

  function stopDraw() {
    setDrawing(false)
  }

  function clear() {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, c.width, c.height)
    setHasSig(false)
  }

  function save() {
    if (!defense) return
    if (!text.trim()) {
      setError("Savunma metni zorunludur.")
      return
    }
    const sig = hasSig
      ? `imza_${defense.employeeName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`
      : null
    onSubmit(defense.id, text.trim(), docUrl, sig)
    onClose()
  }

  return (
    <Dialog open={defense !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Personel Savunmasini Kaydet
          </DialogTitle>
          <DialogDescription>
            {defense?.employeeName} adli personelin yazili savunmasini buraya
            girin.
          </DialogDescription>
        </DialogHeader>

        {defense && (
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/10 border border-border p-3 text-xs space-y-1">
              <p className="text-muted-foreground">Ihlal:</p>
              <p className="text-foreground">
                {defense.violationTypeLabel ?? defense.violationType} -{" "}
                {new Date(defense.violationDate).toLocaleDateString("tr-TR")}
              </p>
              <p className="text-muted-foreground mt-2">IK Aciklamasi:</p>
              <p className="text-foreground">{defense.hrDescription}</p>
            </div>

            <div className="space-y-2">
              <Label>Savunma Metni *</Label>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (error) setError("")
                }}
                placeholder="Personelin savunmasini yazin..."
                className={`bg-secondary border-border ${
                  error ? "border-destructive" : ""
                }`}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label>Ek Belge (Opsiyonel)</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <div className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span className="truncate">
                      {docName || "Dosya secin"}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={handleUpload}
                  />
                </label>
                {docName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDocName("")
                      setDocUrl(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Personel Imzasi (Opsiyonel)</Label>
                {hasSig && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={clear}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Temizle
                  </Button>
                )}
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Iptal
          </Button>
          <Button onClick={save} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Savunmayi Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------
// Dialog: Yonetici karari
// -----------------------------

function ManagerDecisionDialog({
  defense,
  onClose,
  onDecide,
}: {
  defense: DefenseRequest | null
  onClose: () => void
  onDecide: (
    id: string,
    decision: string,
    decisionLabel: string,
    notes: string,
  ) => DisciplineRecord | null
}) {
  const settings = useSettingsStore()
  const [decision, setDecision] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setDecision("")
    setNotes("")
    setError("")
  }, [defense?.id])

  // Karar secenekleri: tum dereceler + Beraat
  const options = useMemo(() => {
    const list = [...settings.severities]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ value: s.value, label: s.label, colorClass: s.colorClass }))
    list.push({
      value: "beraat",
      label: "Beraat (Kayit acilmaz)",
      colorClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    })
    return list
  }, [settings.severities])

  function save() {
    if (!defense) return
    if (!decision) {
      setError("Lutfen bir karar secin.")
      return
    }
    const opt = options.find((o) => o.value === decision)
    onDecide(defense.id, decision, opt?.label ?? decision, notes.trim())
    onClose()
  }

  if (!defense) return null

  const lateDefense = defense.status === "savunma-yapilmadi"

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Yonetici Karari
          </DialogTitle>
          <DialogDescription>
            {defense.employeeName} hakkinda savunma sureci degerlendirmesi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 text-sm">
            <div className="rounded-md bg-muted/10 border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">Ihlal</div>
                <div className="text-sm text-foreground text-right">
                  {defense.violationTypeLabel ?? defense.violationType}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {new Date(defense.violationDate).toLocaleDateString(
                      "tr-TR",
                    )}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                IK Aciklamasi:
              </div>
              <p className="text-sm text-foreground">
                {defense.hrDescription}
              </p>
            </div>

            {lateDefense ? (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3">
                <div className="flex items-center gap-2 text-rose-300 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Personel sure icinde savunma sunmadi
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {DEFENSE_BUSINESS_DAYS} is gunu icinde savunma alinamadi.
                  Kararinizi savunmasiz olarak verebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-muted/10 border border-border p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Personel Savunmasi
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {defense.employeeDefenseText}
                </p>
                {defense.employeeDefenseDocumentUrl && (
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Ek belge eklenmis
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Karar *</Label>
            <div className="grid grid-cols-2 gap-2">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setDecision(o.value)
                    setError("")
                  }}
                  className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-all text-left ${
                    o.colorClass
                  } ${
                    decision === o.value
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label>Gerekce / Notlar</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kararinizin gerekcesini yaziniz..."
              className="bg-secondary border-border"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/10 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p>
              &quot;Beraat&quot; disinda bir karar secerseniz, sistem otomatik
              olarak ilgili Disiplin Kaydini olusturur ve personele bildirim
              gonderir.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgec
          </Button>
          <Button onClick={save} className="gap-2">
            <Gavel className="h-4 w-4" />
            Karari Uygula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------
// Dialog: Detay gorunumu
// -----------------------------

function DefenseDetailDialog({
  defense,
  onClose,
}: {
  defense: DefenseRequest | null
  onClose: () => void
}) {
  if (!defense) return null
  const meta = STATUS_META[defense.status]
  const Icon = meta.icon
  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Savunma Talebi Detayi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {defense.employeeName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {defense.employeeName}
              </p>
              <Badge
                variant="outline"
                className={`${meta.color} text-[10px] mt-1`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {meta.label}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <DetailRow
              label="Ihlal Turu"
              value={defense.violationTypeLabel ?? defense.violationType}
            />
            <DetailRow
              label="Ihlal Tarihi"
              value={new Date(defense.violationDate).toLocaleDateString(
                "tr-TR",
              )}
            />
            <DetailRow
              label="Talep Tarihi"
              value={new Date(defense.requestedAt).toLocaleString("tr-TR")}
            />
            <DetailRow
              label="Son Tarih"
              value={new Date(defense.deadlineAt).toLocaleString("tr-TR")}
            />
            {defense.witnessName && (
              <DetailRow label="Tanik" value={defense.witnessName} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              IK Aciklamasi
            </Label>
            <p className="text-sm text-foreground bg-secondary p-3 rounded-md">
              {defense.hrDescription}
            </p>
          </div>

          {defense.employeeDefenseText && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Personel Savunmasi{" "}
                {defense.defenseSubmittedAt && (
                  <span className="text-[10px]">
                    (
                    {new Date(defense.defenseSubmittedAt).toLocaleString(
                      "tr-TR",
                    )}
                    )
                  </span>
                )}
              </Label>
              <p className="text-sm text-foreground bg-secondary p-3 rounded-md whitespace-pre-wrap">
                {defense.employeeDefenseText}
              </p>
              {defense.employeeDefenseSignature && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                  Dijital imza: {defense.employeeDefenseSignature}
                </p>
              )}
            </div>
          )}

          {defense.managerDecision && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Yonetici Karari{" "}
                {defense.managerDecidedAt && (
                  <span className="text-[10px]">
                    (
                    {new Date(defense.managerDecidedAt).toLocaleString("tr-TR")}
                    )
                  </span>
                )}
              </Label>
              <div className="rounded-md bg-secondary p-3 space-y-1.5">
                <Badge
                  variant="outline"
                  className={
                    defense.managerDecision === "beraat"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                  }
                >
                  {defense.managerDecisionLabel ?? defense.managerDecision}
                </Badge>
                {defense.managerNotes && (
                  <p className="text-sm text-foreground">
                    {defense.managerNotes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-none">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <User className="h-3 w-3" />
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}
