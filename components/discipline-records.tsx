"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  Plus,
  Search,
  User,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  X,
  Pencil,
  ShieldAlert,
} from "lucide-react"
import {
  disciplineRecords as initialRecords,
  employees,
  type DefenseRequest,
  type DisciplineRecord,
  getViolationTypeLabel,
  getSeverityLabel,
} from "@/lib/hr-data"
import { useSettingsStore } from "@/lib/settings-store"
import { useNotifications } from "@/lib/notifications-context"
import { DefenseRequestsPanel } from "@/components/defense-requests"

function getSignatureStatusBadge(status: DisciplineRecord["signatureStatus"]) {
  if (status === "imzaladi") {
    return (
      <Badge variant="outline" className="bg-success/20 text-success border-success/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Personel Imzaladi
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">
      <Clock className="h-3 w-3 mr-1" />
      Imza Bekliyor
    </Badge>
  )
}

export function DisciplineRecords() {
  const settings = useSettingsStore()
  const { addNotification } = useNotifications()
  const [records, setRecords] = useState<DisciplineRecord[]>(initialRecords)
  const [defenses, setDefenses] = useState<DefenseRequest[]>([])
  const [outerTab, setOuterTab] = useState<"kayitlar" | "savunmalar">("kayitlar")
  const [searchQuery, setSearchQuery] = useState("")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<DisciplineRecord | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Ayarlardan gelen etiket/renk karsiliklari
  const violationTypes = settings.violationTypes.map((v) => ({
    value: v.value,
    label: v.label,
  }))
  const severityLevels = [...settings.severities]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ value: s.value, label: s.label, color: s.colorClass }))

  function getSeverityBadgeClass(severity: string): string {
    const s = settings.severities.find((x) => x.value === severity)
    if (s) return s.colorClass
    if (severity === "beraat")
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
    return "bg-muted text-muted-foreground"
  }

  function getViolationLabel(r: { violationType: string; violationTypeLabel?: string }): string {
    if (r.violationTypeLabel) return r.violationTypeLabel
    const v = settings.violationTypes.find((x) => x.value === r.violationType)
    if (v) return v.label
    return getViolationTypeLabel(r.violationType)
  }

  function getSeverityDisplayLabel(severity: string): string {
    const s = settings.severities.find((x) => x.value === severity)
    if (s) return s.label
    return getSeverityLabel(severity)
  }

  // Savunma akisi otomatik durum guncellemesi (2 is gunu gecti mi?)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setDefenses((prev) => {
        let changed = false
        const next = prev.map((d) => {
          if (
            d.status === "bekliyor" &&
            new Date(d.deadlineAt).getTime() <= now
          ) {
            changed = true
            addNotification({
              type: "savunma-suresi-doldu",
              title: "Savunma suresi doldu",
              description: `${d.employeeName} icin 2 is gunu icinde savunma alinamadi. Yonetici karari bekleniyor.`,
              relatedSection: "Disiplin Kayitlari",
            })
            return { ...d, status: "savunma-yapilmadi" as const }
          }
          return d
        })
        return changed ? next : prev
      })
    }, 60_000)
    return () => clearInterval(interval)
  }, [addNotification])

  // --- Savunma akisi handlerlari ---
  function handleRequestDefense(req: DefenseRequest) {
    setDefenses((prev) => [req, ...prev])
    addNotification({
      type: "savunma-talebi",
      title: "Yeni savunma talebi",
      description: `${req.employeeName} icin ${
        req.violationTypeLabel ?? req.violationType
      } ihlali hakkinda savunma istendi. Son tarih: ${new Date(
        req.deadlineAt,
      ).toLocaleString("tr-TR")}`,
      relatedSection: "Disiplin Kayitlari",
    })
  }

  function handleSubmitEmployeeDefense(
    id: string,
    text: string,
    documentUrl: string | null,
    signature: string | null,
  ) {
    setDefenses((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "savunma-yapildi" as const,
              employeeDefenseText: text,
              employeeDefenseDocumentUrl: documentUrl,
              employeeDefenseSignature: signature,
              defenseSubmittedAt: new Date().toISOString(),
            }
          : d,
      ),
    )
    const d = defenses.find((x) => x.id === id)
    if (d) {
      addNotification({
        type: "savunma-alindi",
        title: "Savunma alindi",
        description: `${d.employeeName} savunmasini sundu. Yonetici karari bekleniyor.`,
        relatedSection: "Disiplin Kayitlari",
      })
    }
  }

  function handleManagerDecision(
    id: string,
    decision: string,
    decisionLabel: string,
    notes: string,
  ): DisciplineRecord | null {
    const defense = defenses.find((d) => d.id === id)
    if (!defense) return null

    let createdRecord: DisciplineRecord | null = null
    const now = new Date().toISOString()

    if (decision !== "beraat") {
      // Beraat disinda bir karar -> otomatik disiplin kaydi olustur
      createdRecord = {
        id: `rec-${Date.now()}`,
        employeeId: defense.employeeId,
        employeeName: defense.employeeName,
        violationType: defense.violationType,
        violationTypeLabel: defense.violationTypeLabel,
        date: defense.violationDate,
        description: `[Savunma sonrasi] ${defense.hrDescription}${
          defense.employeeDefenseText
            ? `\n\nPersonel savunmasi:\n${defense.employeeDefenseText}`
            : "\n\nPersonel savunma sunmadi."
        }${notes ? `\n\nYonetici notu:\n${notes}` : ""}`,
        severity: decision,
        witnessName: defense.witnessName,
        documentUrl: defense.hrDocumentUrl ?? defense.employeeDefenseDocumentUrl ?? null,
        employeeSignature: defense.employeeDefenseSignature ?? null,
        signatureStatus: defense.employeeDefenseSignature ? "imzaladi" : "bekliyor",
        createdAt: now.split("T")[0],
        defenseRequestId: defense.id,
      }
      setRecords((prev) => [createdRecord as DisciplineRecord, ...prev])
    }

    setDefenses((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "tamamlandi" as const,
              managerDecision: decision,
              managerDecisionLabel: decisionLabel,
              managerNotes: notes,
              managerDecidedAt: now,
              resultingRecordId: createdRecord?.id ?? null,
            }
          : d,
      ),
    )

    addNotification({
      type: "disiplin-karari",
      title:
        decision === "beraat"
          ? "Beraat karari verildi"
          : `${decisionLabel} karari verildi`,
      description: `${defense.employeeName} hakkinda ${decisionLabel} karari verildi.${
        decision !== "beraat" ? " Disiplin kaydi olusturuldu." : " Disiplin kaydi acilmadi."
      }`,
      relatedSection: "Disiplin Kayitlari",
    })

    return createdRecord
  }

  // New record form state
  const [newRecord, setNewRecord] = useState({
    employeeId: "",
    violationType: "" as DisciplineRecord["violationType"] | "",
    date: "",
    description: "",
    severity: "" as DisciplineRecord["severity"] | "",
    witnessName: "",
    documentUrl: "",
  })
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Digital signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    if (addDialogOpen && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#1a1a2e"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = "#22c55e"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
      }
    }
  }, [addDialogOpen])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ("touches" in e) {
      e.preventDefault()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFileName(file.name)
      setNewRecord({ ...newRecord, documentUrl: URL.createObjectURL(file) })
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!newRecord.employeeId) errors.employeeId = "Calisan secimi zorunludur"
    if (!newRecord.violationType) errors.violationType = "Ihlal turu zorunludur"
    if (!newRecord.date) errors.date = "Tarih zorunludur"
    if (!newRecord.description) errors.description = "Aciklama zorunludur"
    if (!newRecord.severity) errors.severity = "Derece secimi zorunludur"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddRecord = () => {
    if (!validateForm()) return

    const selectedEmployee = employees.find((e) => e.id === newRecord.employeeId)
    if (!selectedEmployee) return

    const violationLabel =
      settings.violationTypes.find((v) => v.value === newRecord.violationType)?.label

    const record: DisciplineRecord = {
      id: Date.now().toString(),
      employeeId: newRecord.employeeId,
      employeeName: selectedEmployee.name,
      violationType: newRecord.violationType as DisciplineRecord["violationType"],
      violationTypeLabel: violationLabel,
      date: newRecord.date,
      description: newRecord.description,
      severity: newRecord.severity as DisciplineRecord["severity"],
      witnessName: newRecord.witnessName || null,
      documentUrl: newRecord.documentUrl || null,
      employeeSignature: hasSignature ? `imza_${selectedEmployee.name.toLowerCase().replace(" ", "_")}_${Date.now()}` : null,
      signatureStatus: hasSignature ? "imzaladi" : "bekliyor",
      createdAt: new Date().toISOString().split("T")[0],
    }

    addNotification({
      type: "disiplin-kaydi",
      title: "Yeni disiplin kaydi",
      description: `${selectedEmployee.name} icin ${violationLabel ?? newRecord.violationType} kaydi olusturuldu.`,
      relatedSection: "Disiplin Kayitlari",
    })

    setRecords([record, ...records])
    setAddDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setNewRecord({
      employeeId: "",
      violationType: "",
      date: "",
      description: "",
      severity: "",
      witnessName: "",
      documentUrl: "",
    })
    setUploadedFileName("")
    setFormErrors({})
    setHasSignature(false)
  }

  // Filter records
  const filteredRecords = records.filter((record) => {
    // Search filter
    if (searchQuery && !record.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Employee filter
    if (employeeFilter !== "all" && record.employeeId !== employeeFilter) {
      return false
    }

    // Severity filter / tab filter
    if (activeTab !== "all" && record.severity !== activeTab) {
      return false
    }
    if (severityFilter !== "all" && record.severity !== severityFilter) {
      return false
    }

    // Date range filter
    if (dateFrom && record.date < dateFrom) {
      return false
    }
    if (dateTo && record.date > dateTo) {
      return false
    }

    return true
  })

  // Stats
  const stats = {
    total: records.length,
    uyari: records.filter((r) => r.severity === "uyari").length,
    ihtar: records.filter((r) => r.severity === "ihtar").length,
    fesih: records.filter((r) => r.severity === "fesih").length,
    bekliyor: records.filter((r) => r.signatureStatus === "bekliyor").length,
  }

  const activeDefenseCount = defenses.filter(
    (d) => d.status === "bekliyor" || d.status === "savunma-yapildi" || d.status === "savunma-yapilmadi",
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disiplin Kayitlari</h1>
          <p className="text-muted-foreground">
            Personel disiplin islemlerini ve savunma sureclerini yonetin
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {outerTab === "kayitlar" && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kayit
            </Button>
          )}
        </div>
      </div>

      {/* Outer Tabs: Kayitlar vs Savunmalar */}
      <Tabs
        value={outerTab}
        onValueChange={(v) => setOuterTab(v as "kayitlar" | "savunmalar")}
      >
        <TabsList className="bg-secondary">
          <TabsTrigger value="kayitlar" className="gap-2">
            <FileText className="h-3.5 w-3.5" />
            Disiplin Kayitlari
            <Badge
              variant="outline"
              className="ml-1 h-5 px-1.5 text-[10px] border-border"
            >
              {records.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="savunmalar" className="gap-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            Savunma Talepleri
            {activeDefenseCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                {activeDefenseCount} aktif
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="savunmalar" className="mt-6">
          <DefenseRequestsPanel
            employees={employees}
            defenses={defenses}
            onRequestDefense={handleRequestDefense}
            onSubmitEmployeeDefense={handleSubmitEmployeeDefense}
            onManagerDecision={handleManagerDecision}
          />
        </TabsContent>

        <TabsContent value="kayitlar" className="mt-6 space-y-6">

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Toplam Kayit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.uyari}</p>
                <p className="text-xs text-muted-foreground">Uyari</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                <Pencil className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.ihtar}</p>
                <p className="text-xs text-muted-foreground">Ihtar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.fesih}</p>
                <p className="text-xs text-muted-foreground">Fesih</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.bekliyor}</p>
                <p className="text-xs text-muted-foreground">Imza Bekliyor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Tabs - dinamik dereceler */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-secondary flex-wrap h-auto">
                <TabsTrigger value="all">Tumu ({records.length})</TabsTrigger>
                {severityLevels.map((lvl) => (
                  <TabsTrigger key={lvl.value} value={lvl.value}>
                    {lvl.label} (
                    {records.filter((r) => r.severity === lvl.value).length}
                    )
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Calisan adi ile ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="bg-secondary border-border">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Calisan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum Calisanlar</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-44">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Derece" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum Dereceler</SelectItem>
                    {severityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <Input
                  type="date"
                  placeholder="Baslangic"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="w-full sm:w-40">
                <Input
                  type="date"
                  placeholder="Bitis"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              {(searchQuery || employeeFilter !== "all" || severityFilter !== "all" || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setEmployeeFilter("all")
                    setSeverityFilter("all")
                    setDateFrom("")
                    setDateTo("")
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Temizle
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Kayit Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Kayit Bulunamadi</h3>
              <p className="text-sm text-muted-foreground">Arama kriterlerinize uygun disiplin kaydi yok.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Calisan</TableHead>
                    <TableHead className="text-muted-foreground">Ihlal Turu</TableHead>
                    <TableHead className="text-muted-foreground">Tarih</TableHead>
                    <TableHead className="text-muted-foreground">Derece</TableHead>
                    <TableHead className="text-muted-foreground">Imza Durumu</TableHead>
                    <TableHead className="text-muted-foreground text-right">Islem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} className="border-border hover:bg-accent/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {record.employeeName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{record.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {getViolationLabel(record)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(record.date).toLocaleDateString("tr-TR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSeverityBadgeClass(record.severity)}>
                          {getSeverityDisplayLabel(record.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getSignatureStatusBadge(record.signatureStatus)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record)
                            setDetailDialogOpen(true)
                          }}
                        >
                          Detay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>
      </Tabs>

      {/* Add New Record Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Yeni Disiplin Kaydi</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Calisan *</Label>
              <Select
                value={newRecord.employeeId}
                onValueChange={(value) => setNewRecord({ ...newRecord, employeeId: value })}
              >
                <SelectTrigger className={`bg-secondary border-border ${formErrors.employeeId ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Calisan secin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {emp.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        {emp.name} - {emp.department}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.employeeId && (
                <p className="text-xs text-destructive">{formErrors.employeeId}</p>
              )}
            </div>

            {/* Violation Type and Severity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Ihlal Turu *</Label>
                <Select
                  value={newRecord.violationType}
                  onValueChange={(value) =>
                    setNewRecord({
                      ...newRecord,
                      violationType: value as DisciplineRecord["violationType"],
                    })
                  }
                >
                  <SelectTrigger className={`bg-secondary border-border ${formErrors.violationType ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Tur secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {violationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Ayarlar &gt; Ihlal Turleri&apos;nden duzenlenir.
                </p>
                {formErrors.violationType && (
                  <p className="text-xs text-destructive">{formErrors.violationType}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Derece *</Label>
                <Select
                  value={newRecord.severity}
                  onValueChange={(value) =>
                    setNewRecord({
                      ...newRecord,
                      severity: value as DisciplineRecord["severity"],
                    })
                  }
                >
                  <SelectTrigger className={`bg-secondary border-border ${formErrors.severity ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Derece secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <Badge variant="outline" className={level.color}>
                          {level.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Ayarlar &gt; Disiplin Dereceleri&apos;nden duzenlenir.
                </p>
                {formErrors.severity && (
                  <p className="text-xs text-destructive">{formErrors.severity}</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-foreground">Ihlal Tarihi *</Label>
              <Input
                type="date"
                value={newRecord.date}
                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                className={`bg-secondary border-border ${formErrors.date ? "border-destructive" : ""}`}
              />
              {formErrors.date && (
                <p className="text-xs text-destructive">{formErrors.date}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-foreground">Aciklama *</Label>
              <Textarea
                placeholder="Olayin detaylarini yazin..."
                value={newRecord.description}
                onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                className={`bg-secondary border-border min-h-[100px] ${formErrors.description ? "border-destructive" : ""}`}
              />
              {formErrors.description && (
                <p className="text-xs text-destructive">{formErrors.description}</p>
              )}
            </div>

            {/* Witness */}
            <div className="space-y-2">
              <Label className="text-foreground">Tanik Adi (Opsiyonel)</Label>
              <Input
                placeholder="Tanik adi soyadi"
                value={newRecord.witnessName}
                onChange={(e) => setNewRecord({ ...newRecord, witnessName: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label className="text-foreground">Belge Yukle (Opsiyonel)</Label>
              <div className="flex items-center gap-3">
                <label className="flex-1">
                  <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploadedFileName || "Dosya secin veya surukleyin"}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={handleFileUpload}
                  />
                </label>
                {uploadedFileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setUploadedFileName("")
                      setNewRecord({ ...newRecord, documentUrl: "" })
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Digital Signature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Personel Imzasi (Opsiyonel)</Label>
                {hasSignature && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
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
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Imza atmak icin yukaridaki alana cizin veya parmaginizi kullanin.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Iptal
            </Button>
            <Button onClick={handleAddRecord}>
              <Plus className="h-4 w-4 mr-2" />
              Kayit Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Disiplin Kaydi Detayi</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedRecord.employeeName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{selectedRecord.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {employees.find((e) => e.id === selectedRecord.employeeId)?.department}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Ihlal Turu</span>
                  <span className="text-foreground font-medium">
                    {getViolationLabel(selectedRecord)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Tarih</span>
                  <span className="text-foreground">
                    {new Date(selectedRecord.date).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Derece</span>
                  <Badge variant="outline" className={getSeverityBadgeClass(selectedRecord.severity)}>
                    {getSeverityDisplayLabel(selectedRecord.severity)}
                  </Badge>
                </div>
                {selectedRecord.defenseRequestId && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Kaynak</span>
                    <Badge
                      variant="outline"
                      className="bg-indigo-500/15 text-indigo-300 border-indigo-500/40"
                    >
                      Savunma Sonrasi
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Imza Durumu</span>
                  {getSignatureStatusBadge(selectedRecord.signatureStatus)}
                </div>
                {selectedRecord.witnessName && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Tanik</span>
                    <span className="text-foreground">{selectedRecord.witnessName}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Kayit Tarihi</span>
                  <span className="text-foreground">
                    {new Date(selectedRecord.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Aciklama</Label>
                <p className="text-sm text-foreground bg-secondary p-3 rounded-lg">
                  {selectedRecord.description}
                </p>
              </div>

              {selectedRecord.documentUrl && (
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground">Ekli belge mevcut</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
