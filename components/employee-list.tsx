"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  User,
  Briefcase,
  Banknote,
  FileText,
  Heart,
  GraduationCap,
  Shield,
  Clock,
  CreditCard,
  AlertCircle,
  Loader2,
  UsersRound,
  FileBarChart,
} from "lucide-react"
import {
  departments,
  statuses,
  type Employee,
  getEducationLabel,
  getMilitaryLabel,
  getContractTypeLabel,
  getWorkTypeLabel,
} from "@/lib/hr-data"
import {
  listPersonnel,
  createPersonnel,
  uploadAvatar,
  type NewEmployeeInput,
} from "@/lib/personnel-repo"
import { useAuth } from "@/lib/auth-context"
import { AddEmployeeWizard } from "./add-employee-wizard"
import { EmployeeReport } from "./employee-report"

function safeText(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback
  return String(value)
}

function getInitials(name?: string | null) {
  const cleanName = safeText(name, "Kullanıcı")
  return cleanName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getStatusColor(status?: Employee["status"]) {
  switch (status) {
    case "active":
      return "bg-success/20 text-success border-success/30"
    case "on-leave":
      return "bg-warning/20 text-warning border-warning/30"
    case "remote":
      return "bg-primary/20 text-primary border-primary/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getStatusLabel(status?: Employee["status"]) {
  switch (status) {
    case "active":
      return "Aktif"
    case "on-leave":
      return "İzinli"
    case "remote":
      return "Uzaktan"
    default:
      return safeText(status, "Bilinmiyor")
  }
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0))
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | React.ReactNode
  icon?: React.ElementType
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  )
}

function EmployeeCard({
  employee,
  onClick,
  onGenerateReport,
}: {
  employee: Employee
  onClick: () => void
  onGenerateReport: () => void
}) {
  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors border-border flex flex-col">
      <div
        className="flex items-start gap-4 cursor-pointer"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <Avatar className="h-12 w-12 border border-border">
          <AvatarImage src={employee.avatar || ""} alt={safeText(employee.name, "Çalışan")} />
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-foreground truncate">
              {safeText(employee.name, "İsimsiz Çalışan")}
            </h3>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${getStatusColor(employee.status)}`}
            >
              {getStatusLabel(employee.status)}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground truncate">
            {safeText(employee.position)}
          </p>

          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 min-w-0">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{safeText(employee.department)}</span>
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{safeText(employee.location)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          Profili Gör
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            onGenerateReport()
          }}
        >
          <FileBarChart className="h-3.5 w-3.5 mr-1" />
          Rapor Al
        </Button>
      </div>
    </Card>
  )
}

function EmployeeDetailDialog({
  employee,
  open,
  onOpenChange,
  isHR = true,
  onEditClick,
}: {
  employee: Employee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isHR?: boolean
  onEditClick?: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    setAvatarUrl(employee?.avatar || "")
  }, [employee?.avatar, employee?.id])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !employee) return

    setUploading(true)
    try {
      const url = await uploadAvatar(employee.id, file)
      setAvatarUrl(url)
    } finally {
      setUploading(false)
    }
  }

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="w-[calc(100vw-24px)] sm:max-w-2xl lg:max-w-3xl max-h-[88svh] bg-card border-border p-0 overflow-hidden flex flex-col"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-foreground">Çalışan Profili</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="flex flex-col items-center gap-1">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={avatarUrl} alt={safeText(employee.name, "Çalışan")} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xl font-medium">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="text-xs text-center text-muted-foreground hover:text-primary cursor-pointer">
                  {uploading ? "Yükleniyor..." : "Foto değiştir"}
                </div>
              </label>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-semibold text-foreground truncate">
                  {safeText(employee.name, "İsimsiz Çalışan")}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${getStatusColor(employee.status)}`}
                >
                  {getStatusLabel(employee.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground">{safeText(employee.position)}</p>
              <p className="text-sm text-muted-foreground">
                {safeText(employee.department)} - {safeText(employee.location)}
              </p>
            </div>
          </div>

          <Tabs defaultValue="kisisel" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-4 bg-secondary">
              <TabsTrigger value="kisisel" className="text-xs">
                Kişisel
              </TabsTrigger>
              <TabsTrigger value="gorev" className="text-xs">
                Görev
              </TabsTrigger>
              <TabsTrigger value="mali" className="text-xs">
                Mali
              </TabsTrigger>
              <TabsTrigger value="belgeler" className="text-xs">
                Belgeler
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kisisel" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <InfoRow label="TC Kimlik No" value={safeText(employee.tcKimlikNo)} icon={CreditCard} />
                <InfoRow label="Doğum Tarihi" value={formatDate(employee.birthDate)} icon={Calendar} />
                <InfoRow label="Kan Grubu" value={safeText(employee.bloodType)} icon={Heart} />
                <InfoRow label="Eğitim Durumu" value={getEducationLabel(employee.educationLevel)} icon={GraduationCap} />
                <InfoRow label="Askerlik Durumu" value={getMilitaryLabel(employee.militaryStatus)} icon={Shield} />
              </div>

              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Acil Durum İletişim
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <InfoRow label="İletişim Kişi" value={safeText(employee.emergencyContactName)} icon={User} />
                  <InfoRow label="İletişim Telefon" value={safeText(employee.emergencyContactPhone)} icon={Phone} />
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">
                  İletişim Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <InfoRow label="E-posta" value={safeText(employee.email)} icon={Mail} />
                  <InfoRow label="Telefon" value={safeText(employee.phone)} icon={Phone} />
                  <InfoRow label="Konum" value={safeText(employee.location)} icon={MapPin} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gorev" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <InfoRow label="Departman" value={safeText(employee.department)} icon={Building2} />
                <InfoRow label="Pozisyon" value={safeText(employee.position)} icon={Briefcase} />
                <InfoRow label="Sözleşme Türü" value={getContractTypeLabel(employee.contractType)} icon={FileText} />
                <InfoRow label="Sözleşme Bitiş Tarihi" value={employee.contractEndDate ? formatDate(employee.contractEndDate) : "Belirsiz Süreli"} icon={Calendar} />
                <InfoRow label="Çalışma Şekli" value={getWorkTypeLabel(employee.workType)} icon={Clock} />
              </div>

              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Önemli Tarihler
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <InfoRow label="İşe Başlama Tarihi" value={formatDate(employee.startDate)} icon={Calendar} />
                  <InfoRow label="SGK Başlangıç Tarihi" value={formatDate(employee.sgkStartDate)} icon={Calendar} />
                  <InfoRow label="Deneme Süresi Bitiş" value={employee.probationEndDate ? formatDate(employee.probationEndDate) : "Tamamlandı"} icon={Clock} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mali" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <InfoRow
                  label="IBAN"
                  value={<span className="font-mono text-xs">{safeText(employee.iban)}</span>}
                  icon={CreditCard}
                />
              </div>

              {isHR && (
                <div className="pt-3 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary" />
                    Maaş Bilgileri
                  </h4>
                  <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Brüt Maaş
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatCurrency(employee.grossSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Net Maaş Tahmini
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatCurrency((employee.grossSalary ?? 0) * 0.7)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="belgeler" className="mt-4">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h4 className="text-sm font-medium text-foreground mb-1">Belgeler</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Bu alanda çalışanın belgeleri görüntülenecektir.
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Belge Yükle
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="shrink-0 flex gap-2 px-5 py-4 border-t border-border bg-card">
          <Button className="flex-1" variant="default">
            <Mail className="h-4 w-4 mr-2" />
            E-posta Gönder
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onEditClick}>
            Profili Düzenle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function EmployeeList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("Tum Departmanlar")
  const [statusFilter, setStatusFilter] = useState("Tum Durumlar")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addWizardOpen, setAddWizardOpen] = useState(false)
  const [editWizardOpen, setEditWizardOpen] = useState(false)

  const { profile } = useAuth()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [reportEmployeeId, setReportEmployeeId] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        const data = await listPersonnel()
        if (!cancelled) {
          setEmployees(data)
          setLoadError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Veri yüklenemedi.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const managers = useMemo(
    () =>
      employees.filter((e) => {
        const position = safeText(e.position, "").toLowerCase()
        return position.includes("mudur") || position.includes("müdür") || position.includes("yonetici") || position.includes("yönetici")
      }),
    [employees],
  )

  const visibleEmployees = useMemo(() => {
    if (profile?.role === "calisan") {
      return employees.filter((e) => e.email === profile.email)
    }
    return employees
  }, [employees, profile])

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return visibleEmployees.filter((employee) => {
      const matchesSearch =
        safeText(employee.name, "").toLowerCase().includes(q) ||
        safeText(employee.email, "").toLowerCase().includes(q) ||
        safeText(employee.position, "").toLowerCase().includes(q)

      const matchesDepartment =
        departmentFilter === "Tum Departmanlar" || employee.department === departmentFilter

      const matchesStatus =
        statusFilter === "Tum Durumlar" || employee.status === statusFilter

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [visibleEmployees, searchQuery, departmentFilter, statusFilter])

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDialogOpen(true)
  }

  const handleGenerateReport = (employee: Employee) => {
    setReportEmployeeId(employee.id)
    setReportOpen(true)
  }

  const handleAddEmployee = async (newEmployee: NewEmployeeInput) => {
    try {
      const saved = await createPersonnel(newEmployee)
      setEmployees((prev) => [saved, ...prev])
      setCreateError(null)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Çalışan kaydedilemedi.")
    }
  }

  const handleUpdateEmployee = async (data: NewEmployeeInput) => {
    if (!selectedEmployee) return
    const { updatePersonnel } = await import("@/lib/personnel-repo")
    const updated = await updatePersonnel(selectedEmployee.id, data)
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setSelectedEmployee(updated)
    setEditWizardOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Çalışan ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
              <SelectValue placeholder="Departman" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px] bg-secondary border-border">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {statuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status === "Tum Durumlar"
                    ? status
                    : getStatusLabel(status as Employee["status"])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="default" onClick={() => setAddWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Çalışan Ekle
          </Button>
        </div>
      </div>

      {createError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {createError}
        </div>
      )}

      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Personel listesi yüklenirken bir hata oluştu: {loadError}
        </div>
      )}

      {!loading && !loadError && employees.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {employees.length} çalışandan {filteredEmployees.length} tanesi gösteriliyor
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-3" />
          <p className="text-sm">Personel listesi yükleniyor...</p>
        </div>
      ) : employees.length === 0 ? (
        <Card className="border-dashed border-border bg-card/50 py-16">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <UsersRound className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">
              Henüz çalışan eklenmemiş
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Personel kayıtlarınız burada listelenecek. Başlamak için ilk çalışanı ekleyin.
            </p>
            <Button className="mt-5" onClick={() => setAddWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Çalışanı Ekle
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onClick={() => handleEmployeeClick(employee)}
                onGenerateReport={() => handleGenerateReport(employee)}
              />
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Filtrelerinize uyan çalışan bulunamadı.
              </p>
            </div>
          )}
        </>
      )}

      <EmployeeDetailDialog
        employee={selectedEmployee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isHR={true}
        onEditClick={() => {
          setDialogOpen(false)
          setEditWizardOpen(true)
        }}
      />

      <AddEmployeeWizard
        open={addWizardOpen}
        onOpenChange={setAddWizardOpen}
        onAddEmployee={handleAddEmployee}
        managers={managers}
      />

      <EmployeeReport
        employeeId={reportEmployeeId}
        employee={employees.find((e) => e.id === reportEmployeeId) ?? null}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />

      <AddEmployeeWizard
        open={editWizardOpen}
        onOpenChange={setEditWizardOpen}
        onAddEmployee={handleUpdateEmployee}
        managers={managers}
        editMode={true}
        initialData={selectedEmployee ?? undefined}
      />
    </div>
  )
}
