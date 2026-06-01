"use client"

import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Upload,
  Calendar,
  X,
  AlertCircle,
} from "lucide-react"
import {
  documentRecords as initialDocuments,
  employees,
  type DocumentRecord,
  getDocumentTypeLabel,
} from "@/lib/hr-data"

const documentTypes: { value: DocumentRecord["documentType"]; label: string }[] = [
  { value: "sgk-belgesi", label: "SGK Belgesi" },
  { value: "saglik-raporu", label: "Saglik Raporu" },
  { value: "ehliyet", label: "Ehliyet" },
  { value: "src-belgesi", label: "SRC Belgesi" },
  { value: "isg-sertifikasi", label: "ISG Sertifikasi" },
  { value: "pasaport", label: "Pasaport" },
  { value: "diger", label: "Diger" },
]

const reminderOptions = [
  { value: 90, label: "90 gun once" },
  { value: 30, label: "30 gun once" },
  { value: 7, label: "7 gun once" },
]

function getDocumentStatus(expiryDate: string): "gecerli" | "yaklasan" | "dolmus" {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return "dolmus"
  if (diffDays <= 30) return "yaklasan"
  return "gecerli"
}

function getDaysRemaining(expiryDate: string): number {
  const today = new Date()
  const expiry = new Date(expiryDate)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function DocumentTracking() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [employeeFilter, setEmployeeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    documentType: "" as DocumentRecord["documentType"] | "",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    reminderDays: 30 as 90 | 30 | 7,
  })

  // Calculate status counts
  const statusCounts = useMemo(() => {
    let gecerli = 0
    let yaklasan = 0
    let dolmus = 0

    documents.forEach((doc) => {
      const status = getDocumentStatus(doc.expiryDate)
      if (status === "gecerli") gecerli++
      else if (status === "yaklasan") yaklasan++
      else dolmus++
    })

    return { gecerli, yaklasan, dolmus, total: documents.length }
  }, [documents])

  // Get critical documents (expiring within 7 days)
  const criticalDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const days = getDaysRemaining(doc.expiryDate)
      return days >= 0 && days <= 7
    })
  }, [documents])

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" || doc.documentType === typeFilter
      const matchesEmployee = employeeFilter === "all" || doc.employeeId === employeeFilter
      const docStatus = getDocumentStatus(doc.expiryDate)
      const matchesStatus = statusFilter === "all" || docStatus === statusFilter

      return matchesSearch && matchesType && matchesEmployee && matchesStatus
    })
  }, [documents, searchQuery, typeFilter, employeeFilter, statusFilter])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

  const handleUploadDocument = () => {
    if (!formData.employeeId || !formData.documentType || !formData.documentNumber || !formData.issueDate || !formData.expiryDate) {
      return
    }

    const selectedEmployee = employees.find((e) => e.id === formData.employeeId)
    if (!selectedEmployee) return

    const newDocument: DocumentRecord = {
      id: Date.now().toString(),
      employeeId: formData.employeeId,
      employeeName: selectedEmployee.name,
      documentType: formData.documentType as DocumentRecord["documentType"],
      documentNumber: formData.documentNumber,
      issueDate: formData.issueDate,
      expiryDate: formData.expiryDate,
      fileUrl: uploadedFile ? URL.createObjectURL(uploadedFile) : null,
      reminderDays: formData.reminderDays,
      createdAt: new Date().toISOString().split("T")[0],
    }

    setDocuments((prev) => [...prev, newDocument])
    setUploadDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      employeeId: "",
      documentType: "",
      documentNumber: "",
      issueDate: "",
      expiryDate: "",
      reminderDays: 30,
    })
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getStatusBadge = (expiryDate: string) => {
    const status = getDocumentStatus(expiryDate)

    if (status === "dolmus") {
      return (
        <Badge variant="destructive" className="gap-1">
          <X className="h-3 w-3" />
          Suresi Dolmus
        </Badge>
      )
    }
    if (status === "yaklasan") {
      return (
        <Badge className="bg-warning text-warning-foreground gap-1">
          <Clock className="h-3 w-3" />
          Suresi Yaklasan
        </Badge>
      )
    }
    return (
      <Badge className="bg-success text-success-foreground gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Gecerli
      </Badge>
    )
  }

  const getDaysRemainingText = (expiryDate: string) => {
    const days = getDaysRemaining(expiryDate)
    if (days < 0) return `${Math.abs(days)} gun gecti`
    if (days === 0) return "Bugun doluyor"
    return `${days} gun kaldi`
  }

  const uniqueEmployees = useMemo(() => {
    const employeeIds = new Set(documents.map((d) => d.employeeId))
    return employees.filter((e) => employeeIds.has(e.id))
  }, [documents])

  return (
    <div className="space-y-6">
      {/* Critical Warning Banner */}
      {criticalDocuments.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-2">
                  Acil Dikkat Gerektiren Belgeler ({criticalDocuments.length})
                </h3>
                <div className="space-y-1">
                  {criticalDocuments.map((doc) => (
                    <div key={doc.id} className="text-sm text-destructive/90">
                      <span className="font-medium">{doc.employeeName}</span> -{" "}
                      {getDocumentTypeLabel(doc.documentType)} -{" "}
                      <span className="font-semibold">{getDaysRemainingText(doc.expiryDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{statusCounts.total}</p>
                <p className="text-xs text-muted-foreground">Toplam Belge</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{statusCounts.gecerli}</p>
                <p className="text-xs text-muted-foreground">Gecerli</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{statusCounts.yaklasan}</p>
                <p className="text-xs text-muted-foreground">Suresi Yaklasan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{statusCounts.dolmus}</p>
                <p className="text-xs text-muted-foreground">Suresi Dolmus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Belge Listesi</CardTitle>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Belge Yukle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Calisan veya belge no ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Belge Turu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Turler</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Calisan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Calisanlar</SelectItem>
                  {uniqueEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs px-3">
                    Tumu
                  </TabsTrigger>
                  <TabsTrigger value="gecerli" className="text-xs px-3">
                    Gecerli
                  </TabsTrigger>
                  <TabsTrigger value="yaklasan" className="text-xs px-3">
                    Yaklasan
                  </TabsTrigger>
                  <TabsTrigger value="dolmus" className="text-xs px-3">
                    Dolmus
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Calisan</TableHead>
                  <TableHead className="font-semibold">Belge Turu</TableHead>
                  <TableHead className="font-semibold">Belge No</TableHead>
                  <TableHead className="font-semibold">Verilis Tarihi</TableHead>
                  <TableHead className="font-semibold">Bitis Tarihi</TableHead>
                  <TableHead className="font-semibold">Kalan Gun</TableHead>
                  <TableHead className="font-semibold">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Belge bulunamadi.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => {
                    const status = getDocumentStatus(doc.expiryDate)
                    return (
                      <TableRow
                        key={doc.id}
                        className={
                          status === "dolmus"
                            ? "bg-destructive/5"
                            : status === "yaklasan"
                            ? "bg-warning/5"
                            : ""
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {doc.employeeName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{doc.employeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {getDocumentTypeLabel(doc.documentType)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{doc.documentNumber}</TableCell>
                        <TableCell>{formatDate(doc.issueDate)}</TableCell>
                        <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              status === "dolmus"
                                ? "text-destructive"
                                : status === "yaklasan"
                                ? "text-warning"
                                : "text-success"
                            }`}
                          >
                            {getDaysRemainingText(doc.expiryDate)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.expiryDate)}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Belge Yukle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Calisan *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, employeeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Calisan secin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Belge Turu *</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    documentType: value as DocumentRecord["documentType"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Belge turu secin" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Belge Numarasi *</Label>
              <Input
                placeholder="ornek: B-12345678"
                value={formData.documentNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, documentNumber: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Verilis Tarihi *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, issueDate: e.target.value }))
                    }
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bitis Tarihi *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
                    }
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hatirlatma Suresi</Label>
              <Select
                value={formData.reminderDays.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, reminderDays: parseInt(value) as 90 | 30 | 7 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Belge Dosyasi</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground">{uploadedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Dosya secmek icin tiklayin
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG (Maks. 10MB)
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false)
                resetForm()
              }}
            >
              Iptal
            </Button>
            <Button
              onClick={handleUploadDocument}
              disabled={
                !formData.employeeId ||
                !formData.documentType ||
                !formData.documentNumber ||
                !formData.issueDate ||
                !formData.expiryDate
              }
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
