"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Printer, Download, X, Building2, Calendar, Mail, Phone, MapPin } from "lucide-react"
import {
  employees,
  leaveRequests,
  leaveBalances,
  assets,
  documentRecords,
  disciplineRecords,
  getEducationLabel,
  getMilitaryLabel,
  getContractTypeLabel,
  getWorkTypeLabel,
  getAssetCategoryLabel,
  getAssetStatusLabel,
  getAssetConditionLabel,
  getDocumentTypeLabel,
  getViolationTypeLabel,
  getSeverityLabel,
  type Employee,
} from "@/lib/hr-data"

interface EmployeeReportProps {
  employeeId: string | null
  employee?: Employee | null

  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EmployeeReportViewProps {
  employeeId: string | null
  employee?: Employee | null
  onClose?: () => void
  variant?: "dialog" | "inline"
}


function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(amount)
}

function getStatusLabel(status: Employee["status"]) {
  const labels = {
    active: "Aktif",
    "on-leave": "Izinli",
    remote: "Uzaktan",
  }
  return labels[status]
}

function getLeaveTypeLabel(type: "vacation" | "sick" | "excuse" | "unpaid") {
  const labels = {
    vacation: "Yillik Izin",
    sick: "Hastalik",
    excuse: "Mazeret",
    unpaid: "Ucretsiz",
  }
  return labels[type]
}

function getLeaveStatusLabel(status: "pending" | "approved" | "rejected") {
  const labels = {
    pending: "Beklemede",
    approved: "Onaylandi",
    rejected: "Reddedildi",
  }
  return labels[status]
}

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date("2026-04-16")
  const expiry = new Date(expiryDate)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getDocumentStatus(days: number) {
  if (days < 0) return { label: "Suresi Dolmus", color: "bg-destructive/20 text-destructive border-destructive/30" }
  if (days <= 30) return { label: "Suresi Yaklasan", color: "bg-warning/20 text-warning border-warning/30" }
  return { label: "Gecerli", color: "bg-success/20 text-success border-success/30" }
}

function calculateTenure(startDate: string): string {
  const start = new Date(startDate)
  const now = new Date("2026-04-16")
  const years = now.getFullYear() - start.getFullYear()
  const months = now.getMonth() - start.getMonth()
  const totalMonths = years * 12 + months
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  if (y === 0) return `${m} ay`
  if (m === 0) return `${y} yil`
  return `${y} yil ${m} ay`
}

// Reusable section wrapper with consistent print styling
function ReportSection({
  title,
  children,
  pageBreak = false,
}: {
  title: string
  children: React.ReactNode
  pageBreak?: boolean
}) {
  return (
    <section
      className={`border border-border rounded-lg bg-card print:bg-white print:border-gray-300 print:rounded-none ${
        pageBreak ? "print:break-before-page" : ""
      } print:break-inside-avoid`}
    >
      <div className="px-5 py-3 border-b border-border print:border-gray-300 bg-secondary/40 print:bg-gray-100 rounded-t-lg print:rounded-none">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-foreground print:text-black">
          {title}
        </h3>
      </div>
      <div className="p-5 print:p-4">{children}</div>
    </section>
  )
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 print:border-gray-200 last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground print:text-black text-right break-words">{value}</span>
    </div>
  )
}

export function EmployeeReportView({
  employeeId,
  employee: employeeProp,
  onClose,
  variant = "dialog",
}: EmployeeReportViewProps) {
  const employee = useMemo(
    () => employeeProp ?? (employeeId ? employees.find((e) => e.id === employeeId) : null),
    [employeeId, employeeProp],
  )


  const employeeLeaves = useMemo(
    () => (employeeId ? leaveRequests.filter((r) => r.employeeId === employeeId) : []),
    [employeeId],
  )
  const employeeBalance = useMemo(
    () => (employeeId ? leaveBalances.find((b) => b.employeeId === employeeId) : null),
    [employeeId],
  )
  const employeeAssets = useMemo(
    () => (employeeId ? assets.filter((a) => a.assignedTo === employeeId) : []),
    [employeeId],
  )
  const employeeDocuments = useMemo(
    () => (employeeId ? documentRecords.filter((d) => d.employeeId === employeeId) : []),
    [employeeId],
  )
  const employeeDiscipline = useMemo(
    () => (employeeId ? disciplineRecords.filter((d) => d.employeeId === employeeId) : []),
    [employeeId],
  )

  if (!employee) return null

  const tenure = calculateTenure(employee.startDate)
  const totalAssetValue = employeeAssets.reduce((sum, a) => sum + a.value, 0)
  const approvedLeaves = employeeLeaves.filter((l) => l.status === "approved")
  const totalLeaveDaysTaken = approvedLeaves.reduce((sum, l) => {
    const days =
      Math.ceil(
        (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1
    return sum + days
  }, 0)
  const expiredDocs = employeeDocuments.filter((d) => getDaysUntilExpiry(d.expiryDate) < 0).length
  const expiringDocs = employeeDocuments.filter((d) => {
    const days = getDaysUntilExpiry(d.expiryDate)
    return days >= 0 && days <= 30
  }).length

  const disciplineBySeverity = {
    uyari: employeeDiscipline.filter((d) => d.severity === "uyari").length,
    ihtar: employeeDiscipline.filter((d) => d.severity === "ihtar").length,
    fesih: employeeDiscipline.filter((d) => d.severity === "fesih").length,
  }

  const handlePrint = () => {
    window.print()
  }

  const generatedAt = new Date().toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const isDialog = variant === "dialog"

  const content = (
    <>
        {/* Global print styles: hide everything outside this report on print */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: A4;
                  margin: 12mm;
                }
                html, body {
                  background: white !important;
                  color: black !important;
                }
                body * {
                  visibility: hidden !important;
                }
                [data-employee-report],
                [data-employee-report] * {
                  visibility: visible !important;
                }
                [data-employee-report] {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: none !important;
                  max-height: none !important;
                  overflow: visible !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: 0 !important;
                  transform: none !important;
                }
                [data-employee-report] * {
                  background: transparent !important;
                  color: black !important;
                  border-color: #d1d5db !important;
                  box-shadow: none !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `,
          }}
        />

        <div data-employee-report className="bg-background print:bg-white">
          {/* Action bar - hidden on print */}
          <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6 py-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Personel Raporu</h2>
              <p className="text-xs text-muted-foreground">
                {employee.name} - {formatDate(new Date().toISOString())}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Yazdir
              </Button>
              <Button size="sm" onClick={handlePrint}>
                <Download className="h-4 w-4 mr-2" />
                PDF Indir
              </Button>
              {isDialog && onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Report content */}
          <div className="p-6 print:p-0 space-y-5 print:space-y-4">
            {/* Report Header */}
            <header className="border-b border-border print:border-gray-300 pb-5 print:pb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground print:text-gray-600 mb-1">
                    Fey Teknik - Lunapark Servis
                  </p>
                  <h1 className="text-2xl font-semibold text-foreground print:text-black">
                    Personel Raporu
                  </h1>
                  <p className="text-sm text-muted-foreground print:text-gray-600 mt-1">
                    Tum departman ve sube bilgilerini kapsar
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground print:text-gray-600">
                  <p>Rapor Tarihi</p>
                  <p className="text-foreground print:text-black font-medium mt-0.5">{generatedAt}</p>
                  <p className="mt-2">Rapor No</p>
                  <p className="text-foreground print:text-black font-mono font-medium mt-0.5">
                    FT-PR-{employee.id.padStart(4, "0")}-
                    {new Date().toISOString().slice(0, 10).replace(/-/g, "")}
                  </p>
                </div>
              </div>
            </header>

            {/* Employee Identity Header */}
            <section className="flex items-start gap-5 flex-wrap">
              <Avatar className="h-20 w-20 border border-border print:border-gray-300">
                <AvatarImage src={employee.avatar} alt={employee.name} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xl font-semibold print:bg-gray-100 print:text-black">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold text-foreground print:text-black">
                    {employee.name}
                  </h2>
                  <Badge variant="outline" className="print:border-gray-400">
                    {getStatusLabel(employee.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground print:text-gray-700 mt-1">
                  {employee.position}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground print:text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {employee.department}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {employee.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {employee.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {employee.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Kidem: {tenure}
                  </span>
                </div>
              </div>
            </section>

            {/* Performance Summary KPIs */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border border-border print:border-gray-300 rounded-lg p-3 bg-card print:bg-white">
                <p className="text-xs text-muted-foreground print:text-gray-600">Kidem</p>
                <p className="text-lg font-semibold text-foreground print:text-black mt-1">
                  {tenure}
                </p>
              </div>
              <div className="border border-border print:border-gray-300 rounded-lg p-3 bg-card print:bg-white">
                <p className="text-xs text-muted-foreground print:text-gray-600">Kullanilan Izin</p>
                <p className="text-lg font-semibold text-foreground print:text-black mt-1">
                  {totalLeaveDaysTaken} <span className="text-xs font-normal text-muted-foreground">gun</span>
                </p>
              </div>
              <div className="border border-border print:border-gray-300 rounded-lg p-3 bg-card print:bg-white">
                <p className="text-xs text-muted-foreground print:text-gray-600">Zimmetli Varlik</p>
                <p className="text-lg font-semibold text-foreground print:text-black mt-1">
                  {employeeAssets.length} <span className="text-xs font-normal text-muted-foreground">adet</span>
                </p>
              </div>
              <div className="border border-border print:border-gray-300 rounded-lg p-3 bg-card print:bg-white">
                <p className="text-xs text-muted-foreground print:text-gray-600">Disiplin Kaydi</p>
                <p className="text-lg font-semibold text-foreground print:text-black mt-1">
                  {employeeDiscipline.length}
                </p>
              </div>
            </section>

            {/* 1. Kisisel Bilgiler */}
            <ReportSection title="1. Kisisel Bilgiler">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-0">
                <DataRow label="Ad Soyad" value={employee.name} />
                <DataRow label="TC Kimlik No" value={employee.tcKimlikNo} />
                <DataRow label="Dogum Tarihi" value={formatDate(employee.birthDate)} />
                <DataRow label="Kan Grubu" value={employee.bloodType} />
                <DataRow label="Egitim Durumu" value={getEducationLabel(employee.educationLevel)} />
                <DataRow label="Askerlik Durumu" value={getMilitaryLabel(employee.militaryStatus)} />
                <DataRow label="E-posta" value={employee.email} />
                <DataRow label="Telefon" value={employee.phone} />
                <DataRow label="Adres / Sehir" value={employee.location} />
                <DataRow
                  label="Acil Durum"
                  value={`${employee.emergencyContactName} - ${employee.emergencyContactPhone}`}
                />
              </div>
            </ReportSection>

            {/* 2. Gorev Bilgileri */}
            <ReportSection title="2. Gorev Bilgileri">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-0">
                <DataRow label="Departman" value={employee.department} />
                <DataRow label="Pozisyon" value={employee.position} />
                <DataRow label="Lokasyon" value={employee.location} />
                <DataRow label="Calisma Sekli" value={getWorkTypeLabel(employee.workType)} />
                <DataRow label="Sozlesme Turu" value={getContractTypeLabel(employee.contractType)} />
                <DataRow
                  label="Sozlesme Bitis"
                  value={
                    employee.contractEndDate ? formatDate(employee.contractEndDate) : "Belirsiz Sureli"
                  }
                />
                <DataRow label="Ise Baslama" value={formatDate(employee.startDate)} />
                <DataRow label="SGK Baslangic" value={formatDate(employee.sgkStartDate)} />
                <DataRow
                  label="Deneme Suresi Bitis"
                  value={
                    employee.probationEndDate
                      ? formatDate(employee.probationEndDate)
                      : "Tamamlandi"
                  }
                />
                <DataRow label="Durum" value={getStatusLabel(employee.status)} />
              </div>
            </ReportSection>

            {/* 3. Izin Bilgileri */}
            <ReportSection title="3. Izin Bilgileri ve Gecmisi">
              {employeeBalance ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    {
                      key: "Yillik Izin",
                      total: employeeBalance.vacation,
                      used: employeeBalance.usedVacation,
                    },
                    {
                      key: "Hastalik",
                      total: employeeBalance.sick,
                      used: employeeBalance.usedSick,
                    },
                    {
                      key: "Mazeret",
                      total: employeeBalance.excuse,
                      used: employeeBalance.usedExcuse,
                    },
                    {
                      key: "Ucretsiz",
                      total: employeeBalance.unpaid,
                      used: employeeBalance.usedUnpaid,
                    },
                  ].map((b) => (
                    <div
                      key={b.key}
                      className="border border-border print:border-gray-300 rounded-md p-3"
                    >
                      <p className="text-xs text-muted-foreground print:text-gray-600">{b.key}</p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-lg font-semibold text-foreground print:text-black">
                          {b.total - b.used}
                        </span>
                        <span className="text-xs text-muted-foreground print:text-gray-600">
                          / {b.total} gun
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground print:text-gray-600 mt-1">
                        Kullanilan: {b.used}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-600 mb-2">
                Izin Gecmisi
              </h4>
              {employeeLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground print:text-gray-600 py-2">
                  Izin kaydi bulunmamaktadir.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border print:border-gray-300 rounded-md overflow-hidden">
                    <thead className="bg-secondary/40 print:bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Tur
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Baslangic
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Bitis
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Gun
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Durum
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Aciklama
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeLeaves.map((leave) => {
                        const days =
                          Math.ceil(
                            (new Date(leave.endDate).getTime() -
                              new Date(leave.startDate).getTime()) /
                              (1000 * 60 * 60 * 24),
                          ) + 1
                        return (
                          <tr
                            key={leave.id}
                            className="border-t border-border print:border-gray-300"
                          >
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {getLeaveTypeLabel(leave.type)}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {formatDate(leave.startDate)}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {formatDate(leave.endDate)}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">{days}</td>
                            <td className="px-3 py-2">
                              <Badge
                                variant="outline"
                                className={
                                  leave.status === "approved"
                                    ? "bg-success/20 text-success border-success/30 print:border-gray-400"
                                    : leave.status === "rejected"
                                      ? "bg-destructive/20 text-destructive border-destructive/30 print:border-gray-400"
                                      : "bg-warning/20 text-warning border-warning/30 print:border-gray-400"
                                }
                              >
                                {getLeaveStatusLabel(leave.status)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground print:text-gray-700">
                              {leave.reason}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>

            {/* 4. Zimmet Bilgileri */}
            <ReportSection title="4. Zimmetli Varliklar">
              {employeeAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground print:text-gray-600 py-2">
                  Zimmetli varlik bulunmamaktadir.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-border print:border-gray-300">
                    <p className="text-sm text-muted-foreground print:text-gray-700">
                      Toplam <span className="font-semibold text-foreground print:text-black">{employeeAssets.length}</span> zimmetli varlik
                    </p>
                    <p className="text-sm text-muted-foreground print:text-gray-700">
                      Toplam Deger:{" "}
                      <span className="font-semibold text-foreground print:text-black">
                        {formatCurrency(totalAssetValue)}
                      </span>
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border print:border-gray-300 rounded-md overflow-hidden">
                      <thead className="bg-secondary/40 print:bg-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                            Varlik
                          </th>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                            Kategori
                          </th>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                            Seri No
                          </th>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                            Zimmet Tarihi
                          </th>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                            Durum
                          </th>
                          <th className="text-right px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                            Deger
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeAssets.map((asset) => (
                          <tr
                            key={asset.id}
                            className="border-t border-border print:border-gray-300"
                          >
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {asset.name}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {getAssetCategoryLabel(asset.category)}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-muted-foreground print:text-gray-700">
                              {asset.serialNumber}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {formatDate(asset.assignmentDate)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs print:border-gray-400">
                                {getAssetConditionLabel(asset.condition)} -{" "}
                                {getAssetStatusLabel(asset.status)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right text-foreground print:text-black font-medium">
                              {formatCurrency(asset.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </ReportSection>

            {/* 5. Belge Durumu */}
            <ReportSection title="5. Belge Durumu">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-border print:border-gray-300 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground print:text-gray-600">Gecerli</p>
                  <p className="text-xl font-semibold text-success print:text-black mt-1">
                    {employeeDocuments.length - expiredDocs - expiringDocs}
                  </p>
                </div>
                <div className="border border-border print:border-gray-300 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground print:text-gray-600">Suresi Yaklasan</p>
                  <p className="text-xl font-semibold text-warning print:text-black mt-1">
                    {expiringDocs}
                  </p>
                </div>
                <div className="border border-border print:border-gray-300 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground print:text-gray-600">Suresi Dolmus</p>
                  <p className="text-xl font-semibold text-destructive print:text-black mt-1">
                    {expiredDocs}
                  </p>
                </div>
              </div>

              {employeeDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground print:text-gray-600 py-2">
                  Belge kaydi bulunmamaktadir.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border print:border-gray-300 rounded-md overflow-hidden">
                    <thead className="bg-secondary/40 print:bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Belge Turu
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Belge No
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Veriliş
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Bitiş
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Kalan
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Durum
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeDocuments.map((doc) => {
                        const days = getDaysUntilExpiry(doc.expiryDate)
                        const status = getDocumentStatus(days)
                        return (
                          <tr
                            key={doc.id}
                            className="border-t border-border print:border-gray-300"
                          >
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {getDocumentTypeLabel(doc.documentType)}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-muted-foreground print:text-gray-700">
                              {doc.documentNumber}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {formatDate(doc.issueDate)}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {formatDate(doc.expiryDate)}
                            </td>
                            <td className="px-3 py-2 text-foreground print:text-black">
                              {days < 0 ? `${Math.abs(days)} gun gecti` : `${days} gun`}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={`${status.color} print:border-gray-400`}>
                                {status.label}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>

            {/* 6. Disiplin Kayitlari */}
            <ReportSection title="6. Disiplin Kayitlari">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-border print:border-gray-300 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground print:text-gray-600">Uyari</p>
                  <p className="text-xl font-semibold text-warning print:text-black mt-1">
                    {disciplineBySeverity.uyari}
                  </p>
                </div>
                <div className="border border-border print:border-gray-300 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground print:text-gray-600">Ihtar</p>
                  <p className="text-xl font-semibold text-foreground print:text-black mt-1">
                    {disciplineBySeverity.ihtar}
                  </p>
                </div>
                <div className="border border-border print:border-gray-300 rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground print:text-gray-600">Fesih</p>
                  <p className="text-xl font-semibold text-destructive print:text-black mt-1">
                    {disciplineBySeverity.fesih}
                  </p>
                </div>
              </div>

              {employeeDiscipline.length === 0 ? (
                <p className="text-sm text-muted-foreground print:text-gray-600 py-2">
                  Disiplin kaydi bulunmamaktadir.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border print:border-gray-300 rounded-md overflow-hidden">
                    <thead className="bg-secondary/40 print:bg-gray-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Tarih
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Ihlal Turu
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Seviye
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Aciklama
                        </th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium">
                          Imza
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeDiscipline.map((rec) => (
                        <tr
                          key={rec.id}
                          className="border-t border-border print:border-gray-300"
                        >
                          <td className="px-3 py-2 text-foreground print:text-black whitespace-nowrap">
                            {formatDate(rec.date)}
                          </td>
                          <td className="px-3 py-2 text-foreground print:text-black">
                            {getViolationTypeLabel(rec.violationType)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={
                                rec.severity === "fesih"
                                  ? "bg-destructive/20 text-destructive border-destructive/30 print:border-gray-400"
                                  : rec.severity === "ihtar"
                                    ? "bg-warning/20 text-warning border-warning/30 print:border-gray-400"
                                    : "bg-secondary print:border-gray-400"
                              }
                            >
                              {getSeverityLabel(rec.severity)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground print:text-gray-700 max-w-xs">
                            {rec.description}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs print:border-gray-400">
                              {rec.signatureStatus === "imzaladi" ? "Imzaladi" : "Imza Bekliyor"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>

            {/* 7. Performans Ozeti */}
            <ReportSection title="7. Performans Ozeti">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-0">
                <DataRow label="Toplam Kidem" value={tenure} />
                <DataRow
                  label="Kullanilan Yillik Izin"
                  value={
                    employeeBalance
                      ? `${employeeBalance.usedVacation} / ${employeeBalance.vacation} gun`
                      : "-"
                  }
                />
                <DataRow
                  label="Kullanilan Toplam Izin"
                  value={`${totalLeaveDaysTaken} gun (onaylanmis)`}
                />
                <DataRow
                  label="Onay Bekleyen Izin"
                  value={`${employeeLeaves.filter((l) => l.status === "pending").length} talep`}
                />
                <DataRow
                  label="Zimmetli Varlik Degeri"
                  value={formatCurrency(totalAssetValue)}
                />
                <DataRow label="Toplam Belge" value={`${employeeDocuments.length} adet`} />
                <DataRow
                  label="Aktif Uyari Sayisi"
                  value={`${disciplineBySeverity.uyari} uyari, ${disciplineBySeverity.ihtar} ihtar`}
                />
                <DataRow
                  label="Deneme Suresi Durumu"
                  value={employee.probationEndDate ? "Devam Ediyor" : "Tamamlandi"}
                />
              </div>

              <div className="mt-5 pt-4 border-t border-border print:border-gray-300">
                <p className="text-xs text-muted-foreground print:text-gray-600 italic">
                  Bu rapor Fey Teknik - Lunapark Servis Insan Kaynaklari modulu tarafindan otomatik
                  olarak olusturulmustur. Rapordaki bilgiler {generatedAt} tarihi itibariyle
                  gecerlidir.
                </p>
              </div>
            </ReportSection>

            {/* Signature Area */}
            <section className="grid grid-cols-2 gap-8 pt-6 print:pt-8">
              <div>
                <div className="border-t border-border print:border-gray-400 pt-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600">
                    Hazirlayan
                  </p>
                  <p className="text-sm text-foreground print:text-black mt-1">Insan Kaynaklari</p>
                </div>
              </div>
              <div>
                <div className="border-t border-border print:border-gray-400 pt-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600">
                    Onaylayan
                  </p>
                  <p className="text-sm text-foreground print:text-black mt-1">IK Direktoru</p>
                </div>
              </div>
            </section>
          </div>
        </div>
    </>
  )

  if (isDialog) {
    return content
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {content}
    </div>
  )
}

export function EmployeeReport({ employeeId, employee: employeeProp, open, onOpenChange }: EmployeeReportProps) {

  const employee = employeeProp ?? (employeeId ? employees.find((e) => e.id === employeeId) : null)

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[92vh] overflow-y-auto bg-background border-border p-0 print:max-w-none print:max-h-none print:overflow-visible print:border-0 print:shadow-none print:bg-white"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {employee.name} - Personel Raporu
        </DialogTitle>
                <EmployeeReportView
          employeeId={employeeId}
          employee={employee}
          onClose={() => onOpenChange(false)}
          variant="dialog"
        />

      </DialogContent>
    </Dialog>
  )
}
