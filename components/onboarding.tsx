"use client"

import { useMemo, useState } from "react"
import {
  onboardingProcesses as initialOnboardings,
  offboardingProcesses as initialOffboardings,
  onboardingStepTemplates,
  offboardingStepTemplates,
  employees,
  type OnboardingProcess,
  type OffboardingProcess,
  type ChecklistStep,
  getOnboardingStatusLabel,
  getOffboardingReasonLabel,
  calculateProgress,
  computeProcessStatus,
} from "@/lib/hr-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Plus,
  UserPlus2,
  UserMinus2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  FileText,
  ListChecks,
  TrendingUp,
} from "lucide-react"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatDate(dateString: string) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getStatusBadge(status: OnboardingProcess["status"]) {
  switch (status) {
    case "tamamlandi":
      return "bg-success/15 text-success border-success/30"
    case "gecikti":
      return "bg-destructive/15 text-destructive border-destructive/30"
    default:
      return "bg-primary/15 text-primary border-primary/30"
  }
}

function getStatusIcon(status: OnboardingProcess["status"]) {
  switch (status) {
    case "tamamlandi":
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case "gecikti":
      return <AlertCircle className="h-3.5 w-3.5" />
    default:
      return <Clock className="h-3.5 w-3.5" />
  }
}

function isStepOverdue(step: ChecklistStep): boolean {
  if (step.completed) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(step.dueDate) < today
}

function addDays(dateString: string, days: number) {
  const d = new Date(dateString)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

export function Onboarding() {
  const [activeTab, setActiveTab] = useState<"ise-giris" | "isten-cikis">("ise-giris")
  const [onboardings, setOnboardings] = useState<OnboardingProcess[]>(initialOnboardings)
  const [offboardings, setOffboardings] = useState<OffboardingProcess[]>(initialOffboardings)
  const [newOnboardingOpen, setNewOnboardingOpen] = useState(false)
  const [newOffboardingOpen, setNewOffboardingOpen] = useState(false)

  // Summary counters
  const onboardSummary = useMemo(() => ({
    total: onboardings.length,
    active: onboardings.filter((o) => o.status === "devam-ediyor").length,
    overdue: onboardings.filter((o) => o.status === "gecikti").length,
    completed: onboardings.filter((o) => o.status === "tamamlandi").length,
  }), [onboardings])

  const offboardSummary = useMemo(() => ({
    total: offboardings.length,
    active: offboardings.filter((o) => o.status === "devam-ediyor").length,
    overdue: offboardings.filter((o) => o.status === "gecikti").length,
    completed: offboardings.filter((o) => o.status === "tamamlandi").length,
  }), [offboardings])

  const toggleOnboardingStep = (processId: string, stepId: string, completed: boolean) => {
    setOnboardings((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p
        const steps = p.steps.map((s) =>
          s.id === stepId
            ? { ...s, completed, completedAt: completed ? new Date().toISOString().split("T")[0] : null }
            : s,
        )
        return { ...p, steps, status: computeProcessStatus(steps, p.targetCompletionDate) }
      }),
    )
  }

  const updateOnboardingNote = (processId: string, stepId: string, notes: string) => {
    setOnboardings((prev) =>
      prev.map((p) =>
        p.id === processId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, notes } : s)) }
          : p,
      ),
    )
  }

  const toggleOffboardingStep = (processId: string, stepId: string, completed: boolean) => {
    setOffboardings((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p
        const steps = p.steps.map((s) =>
          s.id === stepId
            ? { ...s, completed, completedAt: completed ? new Date().toISOString().split("T")[0] : null }
            : s,
        )
        return { ...p, steps, status: computeProcessStatus(steps, p.targetCompletionDate) }
      }),
    )
  }

  const updateOffboardingNote = (processId: string, stepId: string, notes: string) => {
    setOffboardings((prev) =>
      prev.map((p) =>
        p.id === processId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, notes } : s)) }
          : p,
      ),
    )
  }

  const createOnboarding = (data: NewOnboardingData) => {
    const emp = employees.find((e) => e.id === data.employeeId)
    if (!emp) return
    const startDate = data.startDate
    const steps: ChecklistStep[] = onboardingStepTemplates.map((tpl, i) => ({
      id: tpl.id,
      title: tpl.title,
      responsiblePerson: tpl.defaultResponsible,
      dueDate: addDays(startDate, (i + 1) * 2),
      completed: false,
      completedAt: null,
      notes: "",
    }))
    const newProcess: OnboardingProcess = {
      id: `ob-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeAvatar: emp.avatar,
      department: emp.department,
      position: emp.position,
      startDate,
      targetCompletionDate: data.targetCompletionDate,
      status: "devam-ediyor",
      steps,
      createdAt: new Date().toISOString().split("T")[0],
    }
    setOnboardings((prev) => [newProcess, ...prev])
  }

  const createOffboarding = (data: NewOffboardingData) => {
    const emp = employees.find((e) => e.id === data.employeeId)
    if (!emp) return
    const termDate = data.terminationDate
    const steps: ChecklistStep[] = offboardingStepTemplates.map((tpl, i) => ({
      id: tpl.id,
      title: tpl.title,
      responsiblePerson: tpl.defaultResponsible,
      dueDate: addDays(termDate, i),
      completed: false,
      completedAt: null,
      notes: "",
    }))
    const newProcess: OffboardingProcess = {
      id: `off-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeAvatar: emp.avatar,
      department: emp.department,
      position: emp.position,
      terminationDate: termDate,
      targetCompletionDate: data.targetCompletionDate,
      reason: data.reason,
      status: "devam-ediyor",
      steps,
      createdAt: new Date().toISOString().split("T")[0],
    }
    setOffboardings((prev) => [newProcess, ...prev])
  }

  const summary = activeTab === "ise-giris" ? onboardSummary : offboardSummary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ise Giris Yonetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Yeni calisan onboarding ve isten cikis sureclerini takip edin
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "ise-giris" ? (
            <Button onClick={() => setNewOnboardingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Ise Giris Sureci
            </Button>
          ) : (
            <Button onClick={() => setNewOffboardingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Cikis Sureci
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Toplam Surec"
          value={summary.total}
          icon={<ListChecks className="h-4 w-4" />}
          variant="default"
        />
        <SummaryCard
          label="Devam Ediyor"
          value={summary.active}
          icon={<Clock className="h-4 w-4" />}
          variant="primary"
        />
        <SummaryCard
          label="Tamamlandi"
          value={summary.completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="success"
        />
        <SummaryCard
          label="Gecikti"
          value={summary.overdue}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="destructive"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="ise-giris" className="gap-2">
            <UserPlus2 className="h-4 w-4" />
            Ise Giris
            <Badge variant="secondary" className="ml-1 text-xs h-5">
              {onboardings.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="isten-cikis" className="gap-2">
            <UserMinus2 className="h-4 w-4" />
            Isten Cikis
            <Badge variant="secondary" className="ml-1 text-xs h-5">
              {offboardings.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ise-giris" className="mt-6 space-y-4">
          {onboardings.length === 0 ? (
            <EmptyState
              icon={<UserPlus2 className="h-10 w-10" />}
              title="Aktif ise giris sureci yok"
              description="Yeni bir calisan icin ise giris sureci baslatmak icin yukaridaki butonu kullanin."
            />
          ) : (
            onboardings.map((process) => (
              <OnboardingCard
                key={process.id}
                process={process}
                onToggleStep={toggleOnboardingStep}
                onUpdateNote={updateOnboardingNote}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="isten-cikis" className="mt-6 space-y-4">
          {offboardings.length === 0 ? (
            <EmptyState
              icon={<UserMinus2 className="h-10 w-10" />}
              title="Aktif cikis sureci yok"
              description="Bir calisan icin cikis sureci baslatmak icin yukaridaki butonu kullanin."
            />
          ) : (
            offboardings.map((process) => (
              <OffboardingCard
                key={process.id}
                process={process}
                onToggleStep={toggleOffboardingStep}
                onUpdateNote={updateOffboardingNote}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <NewOnboardingDialog
        open={newOnboardingOpen}
        onOpenChange={setNewOnboardingOpen}
        onCreate={createOnboarding}
      />
      <NewOffboardingDialog
        open={newOffboardingOpen}
        onOpenChange={setNewOffboardingOpen}
        onCreate={createOffboarding}
      />
    </div>
  )
}

/* ------------------ Summary Card ------------------ */

function SummaryCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string
  value: number
  icon: React.ReactNode
  variant: "default" | "primary" | "success" | "destructive"
}) {
  const styles = {
    default: "bg-muted/50 text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  }[variant]

  return (
    <Card className="p-5 border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1.5">{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${styles}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

/* ------------------ Onboarding Card ------------------ */

function OnboardingCard({
  process,
  onToggleStep,
  onUpdateNote,
}: {
  process: OnboardingProcess
  onToggleStep: (processId: string, stepId: string, completed: boolean) => void
  onUpdateNote: (processId: string, stepId: string, notes: string) => void
}) {
  const progress = calculateProgress(process.steps)
  const completedCount = process.steps.filter((s) => s.completed).length

  return (
    <Card className="border-border overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={process.employeeAvatar} alt={process.employeeName} />
              <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                {getInitials(process.employeeName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{process.employeeName}</h3>
                <Badge variant="outline" className={`gap-1 ${getStatusBadge(process.status)}`}>
                  {getStatusIcon(process.status)}
                  {getOnboardingStatusLabel(process.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {process.position} - {process.department}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Baslangic: {formatDate(process.startDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Hedef: {formatDate(process.targetCompletionDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="md:w-72 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Tamamlanma</span>
              <span className="text-sm font-semibold text-foreground">
                {completedCount}/{process.steps.length} - {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <Accordion type="single" collapsible>
          <AccordionItem value="steps" className="border-0">
            <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-accent/50 text-sm font-medium">
              <span className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Kontrol Listesi ({process.steps.length} adim)
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="divide-y divide-border border-t border-border">
                {process.steps.map((step, idx) => (
                  <ChecklistStepRow
                    key={step.id}
                    step={step}
                    index={idx}
                    onToggle={(completed) => onToggleStep(process.id, step.id, completed)}
                    onNoteChange={(notes) => onUpdateNote(process.id, step.id, notes)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  )
}

/* ------------------ Offboarding Card ------------------ */

function OffboardingCard({
  process,
  onToggleStep,
  onUpdateNote,
}: {
  process: OffboardingProcess
  onToggleStep: (processId: string, stepId: string, completed: boolean) => void
  onUpdateNote: (processId: string, stepId: string, notes: string) => void
}) {
  const progress = calculateProgress(process.steps)
  const completedCount = process.steps.filter((s) => s.completed).length

  return (
    <Card className="border-border overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={process.employeeAvatar} alt={process.employeeName} />
              <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                {getInitials(process.employeeName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{process.employeeName}</h3>
                <Badge variant="outline" className={`gap-1 ${getStatusBadge(process.status)}`}>
                  {getStatusIcon(process.status)}
                  {getOnboardingStatusLabel(process.status)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getOffboardingReasonLabel(process.reason)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {process.position} - {process.department}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Cikis: {formatDate(process.terminationDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Hedef: {formatDate(process.targetCompletionDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="md:w-72 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Tamamlanma</span>
              <span className="text-sm font-semibold text-foreground">
                {completedCount}/{process.steps.length} - {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <Accordion type="single" collapsible>
          <AccordionItem value="steps" className="border-0">
            <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-accent/50 text-sm font-medium">
              <span className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Kontrol Listesi ({process.steps.length} adim)
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="divide-y divide-border border-t border-border">
                {process.steps.map((step, idx) => (
                  <ChecklistStepRow
                    key={step.id}
                    step={step}
                    index={idx}
                    onToggle={(completed) => onToggleStep(process.id, step.id, completed)}
                    onNoteChange={(notes) => onUpdateNote(process.id, step.id, notes)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  )
}

/* ------------------ Checklist Step Row ------------------ */

function ChecklistStepRow({
  step,
  index,
  onToggle,
  onNoteChange,
}: {
  step: ChecklistStep
  index: number
  onToggle: (completed: boolean) => void
  onNoteChange: (notes: string) => void
}) {
  const [noteValue, setNoteValue] = useState(step.notes)
  const [noteEditing, setNoteEditing] = useState(false)
  const overdue = isStepOverdue(step)

  const handleSaveNote = () => {
    onNoteChange(noteValue)
    setNoteEditing(false)
  }

  return (
    <div className={`p-4 ${step.completed ? "bg-success/5" : overdue ? "bg-destructive/5" : ""}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={`step-${step.id}-${index}`}
          checked={step.completed}
          onCheckedChange={(v) => onToggle(v === true)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
                  {index + 1}
                </span>
                <label
                  htmlFor={`step-${step.id}-${index}`}
                  className={`text-sm font-medium cursor-pointer ${
                    step.completed ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {step.title}
                </label>
                {overdue && (
                  <Badge variant="outline" className="text-xs bg-destructive/15 text-destructive border-destructive/30">
                    Gecikti
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {step.responsiblePerson}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Son tarih: {formatDate(step.dueDate)}
                </span>
                {step.completed && step.completedAt && (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Tamamlandi: {formatDate(step.completedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-3">
            {noteEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="Notlar..."
                  className="min-h-[60px] text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNote}>
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNoteValue(step.notes)
                      setNoteEditing(false)
                    }}
                  >
                    Iptal
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setNoteEditing(true)}
                className="w-full text-left text-xs text-muted-foreground hover:bg-accent/40 rounded-md px-2.5 py-1.5 border border-dashed border-border transition-colors flex items-start gap-2"
              >
                <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="flex-1">
                  {step.notes ? step.notes : <span className="italic">Not ekle...</span>}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------ Empty State ------------------ */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="p-12 text-center border-border border-dashed">
      <div className="flex justify-center text-muted-foreground mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">{description}</p>
    </Card>
  )
}

/* ------------------ New Onboarding Dialog ------------------ */

interface NewOnboardingData {
  employeeId: string
  startDate: string
  targetCompletionDate: string
}

function NewOnboardingDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: NewOnboardingData) => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const defaultTarget = addDays(today, 14)
  const [employeeId, setEmployeeId] = useState<string>("")
  const [startDate, setStartDate] = useState(today)
  const [targetCompletionDate, setTargetCompletionDate] = useState(defaultTarget)
  const [error, setError] = useState<string | null>(null)

  // Only show employees without an active onboarding
  const eligibleEmployees = useMemo(() => {
    const existingIds = new Set(initialOnboardings.map((o) => o.employeeId))
    return employees.filter((e) => !existingIds.has(e.id))
  }, [])

  const handleSubmit = () => {
    if (!employeeId) {
      setError("Lutfen bir calisan secin.")
      return
    }
    if (!startDate) {
      setError("Baslangic tarihi zorunludur.")
      return
    }
    if (!targetCompletionDate) {
      setError("Hedef tamamlanma tarihi zorunludur.")
      return
    }
    if (new Date(targetCompletionDate) < new Date(startDate)) {
      setError("Hedef tarih baslangic tarihinden sonra olmalidir.")
      return
    }
    onCreate({ employeeId, startDate, targetCompletionDate })
    setEmployeeId("")
    setStartDate(today)
    setTargetCompletionDate(defaultTarget)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Ise Giris Sureci</DialogTitle>
          <DialogDescription>
            Yeni bir calisan icin onboarding sureci baslatin. 8 adimli standart kontrol listesi
            otomatik olusturulur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ob-employee">Calisan</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="ob-employee">
                <SelectValue placeholder="Calisan secin" />
              </SelectTrigger>
              <SelectContent>
                {eligibleEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{emp.name}</span>
                      <span className="text-xs text-muted-foreground">- {emp.department}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ob-start">Ise Giris Tarihi</Label>
              <Input
                id="ob-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-target">Hedef Tamamlanma</Label>
              <Input
                id="ob-target"
                type="date"
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground mb-2">Otomatik olusturulacak adimlar:</p>
            <ol className="space-y-1 text-xs text-muted-foreground">
              {onboardingStepTemplates.map((step, i) => (
                <li key={step.id} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  {step.title}
                </li>
              ))}
            </ol>
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Iptal
          </Button>
          <Button onClick={handleSubmit}>Sureci Baslat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------ New Offboarding Dialog ------------------ */

interface NewOffboardingData {
  employeeId: string
  terminationDate: string
  targetCompletionDate: string
  reason: OffboardingProcess["reason"]
}

function NewOffboardingDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: NewOffboardingData) => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const defaultTarget = addDays(today, 7)
  const [employeeId, setEmployeeId] = useState<string>("")
  const [terminationDate, setTerminationDate] = useState(today)
  const [targetCompletionDate, setTargetCompletionDate] = useState(defaultTarget)
  const [reason, setReason] = useState<OffboardingProcess["reason"]>("istifa")
  const [error, setError] = useState<string | null>(null)

  const eligibleEmployees = useMemo(() => {
    const existingIds = new Set(initialOffboardings.map((o) => o.employeeId))
    return employees.filter((e) => !existingIds.has(e.id))
  }, [])

  const handleSubmit = () => {
    if (!employeeId) {
      setError("Lutfen bir calisan secin.")
      return
    }
    if (!terminationDate || !targetCompletionDate) {
      setError("Tum tarih alanlari zorunludur.")
      return
    }
    if (new Date(targetCompletionDate) < new Date(terminationDate)) {
      setError("Hedef tarih cikis tarihinden sonra olmalidir.")
      return
    }
    onCreate({ employeeId, terminationDate, targetCompletionDate, reason })
    setEmployeeId("")
    setTerminationDate(today)
    setTargetCompletionDate(defaultTarget)
    setReason("istifa")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Cikis Sureci</DialogTitle>
          <DialogDescription>
            Ayrilan bir calisan icin offboarding sureci baslatin. 5 adimli standart kontrol listesi
            otomatik olusturulur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="off-employee">Calisan</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="off-employee">
                <SelectValue placeholder="Calisan secin" />
              </SelectTrigger>
              <SelectContent>
                {eligibleEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{emp.name}</span>
                      <span className="text-xs text-muted-foreground">- {emp.department}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="off-reason">Cikis Sebebi</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as OffboardingProcess["reason"])}
            >
              <SelectTrigger id="off-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="istifa">Istifa</SelectItem>
                <SelectItem value="fesih">Fesih</SelectItem>
                <SelectItem value="emeklilik">Emeklilik</SelectItem>
                <SelectItem value="sozlesme-bitimi">Sozlesme Bitimi</SelectItem>
                <SelectItem value="diger">Diger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="off-term">Cikis Tarihi</Label>
              <Input
                id="off-term"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="off-target">Hedef Tamamlanma</Label>
              <Input
                id="off-target"
                type="date"
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground mb-2">Otomatik olusturulacak adimlar:</p>
            <ol className="space-y-1 text-xs text-muted-foreground">
              {offboardingStepTemplates.map((step, i) => (
                <li key={step.id} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  {step.title}
                </li>
              ))}
            </ol>
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Iptal
          </Button>
          <Button onClick={handleSubmit}>Sureci Baslat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
