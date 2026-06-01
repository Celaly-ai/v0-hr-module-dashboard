"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  Package,
  Smartphone,
  Laptop,
  Car,
  Wrench,
  Shirt,
  Tablet,
  Monitor,
  HelpCircle,
  User,
  Calendar,
  Hash,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Undo2,
  Pen,
  ScanLine,
  Sparkles,
} from "lucide-react"
import {
  assets as initialAssets,
  employees,
  type Asset,
  getAssetCategoryLabel,
  getAssetStatusLabel,
  getAssetConditionLabel,
} from "@/lib/hr-data"
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog"

const categoryIcons: Record<Asset["category"], React.ReactNode> = {
  telefon: <Smartphone className="h-4 w-4" />,
  laptop: <Laptop className="h-4 w-4" />,
  arac: <Car className="h-4 w-4" />,
  ekipman: <Wrench className="h-4 w-4" />,
  forma: <Shirt className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  monitor: <Monitor className="h-4 w-4" />,
  diger: <HelpCircle className="h-4 w-4" />,
}

const statusConfig: Record<Asset["status"], { color: string; icon: React.ReactNode }> = {
  zimmetli: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <User className="h-3 w-3" /> },
  musait: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  bakimda: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Clock className="h-3 w-3" /> },
  kayip: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
}

const conditionConfig: Record<Asset["condition"], string> = {
  yeni: "bg-emerald-500/20 text-emerald-400",
  iyi: "bg-sky-500/20 text-sky-400",
  orta: "bg-amber-500/20 text-amber-400",
  yipranmis: "bg-red-500/20 text-red-400",
}

export function AssetTracking() {
  const [assetList, setAssetList] = useState<Asset[]>(initialAssets)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [isNewAssetDialogOpen, setIsNewAssetDialogOpen] = useState(false)
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState<Asset | null>(null)

  // Yeni Varlik form state
  const [newAssetName, setNewAssetName] = useState("")
  const [newAssetModel, setNewAssetModel] = useState("")
  const [newAssetCategory, setNewAssetCategory] =
    useState<Asset["category"]>("laptop")
  const [newAssetSerial, setNewAssetSerial] = useState("")
  const [newAssetPurchaseDate, setNewAssetPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  )
  const [newAssetValue, setNewAssetValue] = useState("")
  const [newAssetStatus, setNewAssetStatus] =
    useState<Exclude<Asset["status"], "kayip">>("musait")
  const [newAssetNotes, setNewAssetNotes] = useState("")
  const [newAssetError, setNewAssetError] = useState<string | null>(null)

  // Barkod / QR tarayici state
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scanFeedback, setScanFeedback] = useState<{
    filled: string[]
    raw: string
    source: "camera" | "manual"
  } | null>(null)
  
  // Zimmet form state
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [selectedAsset, setSelectedAsset] = useState("")
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split("T")[0])
  const [conditionNotes, setConditionNotes] = useState("")
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Return form state
  const [returnCondition, setReturnCondition] = useState<Asset["condition"]>("iyi")
  const [returnNotes, setReturnNotes] = useState("")

  // Filter assets
  const filteredAssets = assetList.filter((asset) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      asset.name.toLowerCase().includes(q) ||
      asset.serialNumber.toLowerCase().includes(q) ||
      (asset.model?.toLowerCase().includes(q) ?? false) ||
      (asset.assignedToName?.toLowerCase().includes(q) ?? false)
    const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter
    const matchesStatus = statusFilter === "all" || asset.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Calculate stats
  const totalAssets = assetList.length
  const assignedAssets = assetList.filter((a) => a.status === "zimmetli").length
  const availableAssets = assetList.filter((a) => a.status === "musait").length
  const maintenanceAssets = assetList.filter((a) => a.status === "bakimda").length
  const lostAssets = assetList.filter((a) => a.status === "kayip").length
  const totalValue = assetList.reduce((sum, a) => sum + a.value, 0)

  // Get employee asset counts
  const getEmployeeAssetCount = (employeeId: string) => {
    return assetList.filter((a) => a.assignedTo === employeeId).length
  }

  // Available assets for assignment
  const availableAssetsForAssignment = assetList.filter((a) => a.status === "musait")

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
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
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }
    ctx.lineTo(x, y)
    ctx.strokeStyle = "#10b981"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getSignatureData = () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.toDataURL()
  }

  // Handle assignment
  const handleAssign = () => {
    if (!selectedEmployee || !selectedAsset) return
    
    const signatureData = getSignatureData()
    const employee = employees.find((e) => e.id === selectedEmployee)
    
    setAssetList((prev) =>
      prev.map((asset) =>
        asset.id === selectedAsset
          ? {
              ...asset,
              status: "zimmetli" as const,
              assignedTo: selectedEmployee,
              assignedToName: employee?.name ?? null,
              assignmentDate: assignmentDate,
              conditionNotes: conditionNotes || null,
              digitalSignature: signatureData,
            }
          : asset
      )
    )
    
    // Reset form
    setSelectedEmployee("")
    setSelectedAsset("")
    setAssignmentDate(new Date().toISOString().split("T")[0])
    setConditionNotes("")
    clearSignature()
    setIsAssignDialogOpen(false)
  }

  // Handle return
  const handleReturn = () => {
    if (!selectedAssetForReturn) return
    
    setAssetList((prev) =>
      prev.map((asset) =>
        asset.id === selectedAssetForReturn.id
          ? {
              ...asset,
              status: "musait" as const,
              assignedTo: null,
              assignedToName: null,
              assignmentDate: null,
              condition: returnCondition,
              conditionNotes: returnNotes || asset.conditionNotes,
              digitalSignature: null,
            }
          : asset
      )
    )
    
    setSelectedAssetForReturn(null)
    setReturnCondition("iyi")
    setReturnNotes("")
    setIsReturnDialogOpen(false)
  }

  // Reset new-asset form to defaults.
  const resetNewAssetForm = () => {
    setNewAssetName("")
    setNewAssetModel("")
    setNewAssetCategory("laptop")
    setNewAssetSerial("")
    setNewAssetPurchaseDate(new Date().toISOString().split("T")[0])
    setNewAssetValue("")
    setNewAssetStatus("musait")
    setNewAssetNotes("")
    setNewAssetError(null)
    setScanFeedback(null)
  }

  /**
   * Barkod / QR icinden urun adi, model ve seri no ayikla.
   * Desteklenen formatlar:
   *   1. JSON:  {"name":"...", "model":"...", "serial":"..."}  (tr anahtarlar da destekli)
   *   2. URL query: https://...?name=...&model=...&serial=...
   *   3. Ayracli: "MacBook Pro|M3 14 inch|C02XXXXX"  veya  "...;...;..."
   *   4. Prefix: "SN:C02XXXXX MODEL:M3 NAME:MacBook"
   *   5. Duz string (genellikle seri no): "C02ABCD1234" -> serial alanina yazilir
   */
  const parseBarcodePayload = (
    raw: string,
  ): { name?: string; model?: string; serial?: string } => {
    const text = raw.trim()
    if (!text) return {}

    // 1) JSON dene
    if (
      (text.startsWith("{") && text.endsWith("}")) ||
      (text.startsWith("[") && text.endsWith("]"))
    ) {
      try {
        const obj = JSON.parse(text) as Record<string, unknown>
        const pick = (...keys: string[]): string | undefined => {
          for (const k of keys) {
            const v = obj[k]
            if (typeof v === "string" && v.trim()) return v.trim()
          }
          return undefined
        }
        return {
          name: pick("name", "productName", "ad", "urunAdi", "product"),
          model: pick("model", "modelCode", "modelNo", "modelKodu"),
          serial: pick(
            "serial",
            "serialNumber",
            "sn",
            "seri",
            "seriNo",
          ),
        }
      } catch {
        // JSON degil, diger parser'lara devam
      }
    }

    // 2) URL query
    if (/^https?:\/\//i.test(text) || text.includes("?")) {
      try {
        const url = text.startsWith("http")
          ? new URL(text)
          : new URL("https://x/" + text.replace(/^\/+/, ""))
        const sp = url.searchParams
        const name =
          sp.get("name") ?? sp.get("productName") ?? sp.get("ad") ?? undefined
        const model = sp.get("model") ?? sp.get("modelNo") ?? undefined
        const serial =
          sp.get("serial") ?? sp.get("sn") ?? sp.get("seri") ?? undefined
        if (name || model || serial) {
          return {
            name: name?.trim() || undefined,
            model: model?.trim() || undefined,
            serial: serial?.trim() || undefined,
          }
        }
      } catch {
        // URL parse edilmezse diger yontemlere dus
      }
    }

    // 3) Prefix-based (NAME:... MODEL:... SN:...)
    const prefixRegex =
      /\b(name|ad|product|urun|model|serial|sn|seri)\s*[:=]\s*([^\s|;,]+(?:\s+[^\s|;,]+)*?)(?=\s+(?:name|ad|product|urun|model|serial|sn|seri)\s*[:=]|$)/gi
    const prefixed: { name?: string; model?: string; serial?: string } = {}
    let prefixHit = false
    for (const m of text.matchAll(prefixRegex)) {
      prefixHit = true
      const key = m[1].toLowerCase()
      const val = m[2].trim()
      if (["name", "ad", "product", "urun"].includes(key)) prefixed.name = val
      else if (key === "model") prefixed.model = val
      else if (["serial", "sn", "seri"].includes(key)) prefixed.serial = val
    }
    if (prefixHit) return prefixed

    // 4) Ayracli: | veya ; ile 2-3 parca
    const parts = text.split(/[|;]/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      return {
        name: parts[0],
        model: parts[1],
        serial: parts[2] ?? undefined,
      }
    }

    // 5) Duz string -> muhtemelen seri no
    return { serial: text }
  }

  /** Scanner'dan gelen degeri forma uygula. */
  const handleBarcodeDetected = (raw: string, source: "camera" | "manual") => {
    const parsed = parseBarcodePayload(raw)
    const filled: string[] = []

    if (parsed.name && !newAssetName) {
      setNewAssetName(parsed.name)
      filled.push("Varlik Adi")
    } else if (parsed.name) {
      // Isim zaten dolu ise uzerine yazmayi secmiyoruz; ancak bos ise yaziyoruz.
    }
    if (parsed.model && !newAssetModel) {
      setNewAssetModel(parsed.model)
      filled.push("Model")
    }
    if (parsed.serial) {
      // Seri numarasini barkoddan okuyorsak her zaman guncelle (amacin tam kendisi).
      setNewAssetSerial(parsed.serial)
      filled.push("Seri No")
    } else if (!parsed.name && !parsed.model) {
      // Hic bir alan anlasilamadi -> ham degeri seri no olarak koy.
      setNewAssetSerial(raw.trim())
      filled.push("Seri No")
    }

    setNewAssetError(null)
    setScanFeedback({ filled, raw, source })
    setIsScannerOpen(false)
  }

  // Create and append a new asset to the list.
  const handleCreateAsset = () => {
    const name = newAssetName.trim()
    const serial = newAssetSerial.trim()
    const parsedValue = Number(newAssetValue)

    if (!name) {
      setNewAssetError("Varlik adi zorunludur.")
      return
    }
    if (!serial) {
      setNewAssetError("Seri numarasi zorunludur.")
      return
    }
    const serialExists = assetList.some(
      (a) => a.serialNumber.toLowerCase() === serial.toLowerCase(),
    )
    if (serialExists) {
      setNewAssetError("Bu seri numarasi zaten kayitli.")
      return
    }
    if (!newAssetPurchaseDate) {
      setNewAssetError("Satin alma tarihi zorunludur.")
      return
    }
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setNewAssetError("Gecerli bir deger girin.")
      return
    }

    // Generate a unique id from the existing max numeric id.
    const nextIdNumber =
      assetList.reduce((max, a) => {
        const n = Number(a.id)
        return Number.isFinite(n) && n > max ? n : max
      }, 0) + 1

    const newAsset: Asset = {
      id: String(nextIdNumber),
      name,
      model: newAssetModel.trim() || undefined,
      category: newAssetCategory,
      serialNumber: serial,
      assignedTo: null,
      assignedToName: null,
      assignmentDate: null,
      condition: "yeni",
      conditionNotes: newAssetNotes.trim() ? newAssetNotes.trim() : null,
      status: newAssetStatus,
      purchaseDate: newAssetPurchaseDate,
      value: parsedValue,
      digitalSignature: null,
    }

    setAssetList((prev) => [newAsset, ...prev])
    resetNewAssetForm()
    setIsNewAssetDialogOpen(false)
  }

  const openReturnDialog = (asset: Asset) => {
    setSelectedAssetForReturn(asset)
    setReturnCondition(asset.condition)
    setReturnNotes("")
    setIsReturnDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Varlik Yonetimi</h1>
          <p className="text-muted-foreground">Sirket varliklarini ve zimmetlerini yonetin</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsAssignDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Zimmet Ver
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetNewAssetForm()
              setIsNewAssetDialogOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Yeni Varlik
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalAssets}</p>
                <p className="text-xs text-muted-foreground">Toplam Varlik</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{assignedAssets}</p>
                <p className="text-xs text-muted-foreground">Zimmetli</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{availableAssets}</p>
                <p className="text-xs text-muted-foreground">Musait</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{maintenanceAssets}</p>
                <p className="text-xs text-muted-foreground">Bakimda</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{lostAssets}</p>
                <p className="text-xs text-muted-foreground">Kayip</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {totalValue.toLocaleString("tr-TR")} TL
                </p>
                <p className="text-xs text-muted-foreground">Toplam Deger</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Asset Summary */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Calisan Zimmet Ozeti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {employees.map((employee) => {
              const count = getEmployeeAssetCount(employee.id)
              if (count === 0) return null
              return (
                <div
                  key={employee.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">
                      {employee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{employee.name}</span>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    {count} varlik
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Varlik, seri no veya calisan ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tum Kategoriler</SelectItem>
            <SelectItem value="telefon">Telefon</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="arac">Arac</SelectItem>
            <SelectItem value="ekipman">Ekipman</SelectItem>
            <SelectItem value="forma">Forma</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="monitor">Monitor</SelectItem>
            <SelectItem value="diger">Diger</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-5 sm:w-auto">
            <TabsTrigger value="all" className="text-xs">Tumu</TabsTrigger>
            <TabsTrigger value="zimmetli" className="text-xs">Zimmetli</TabsTrigger>
            <TabsTrigger value="musait" className="text-xs">Musait</TabsTrigger>
            <TabsTrigger value="bakimda" className="text-xs">Bakimda</TabsTrigger>
            <TabsTrigger value="kayip" className="text-xs">Kayip</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Asset Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAssets.map((asset) => (
          <Card key={asset.id} className="border-border bg-card transition-colors hover:border-primary/30">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-secondary p-2">
                    {categoryIcons[asset.category]}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground line-clamp-1">{asset.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {getAssetCategoryLabel(asset.category)}
                      {asset.model && (
                        <>
                          <span className="mx-1">&middot;</span>
                          <span className="font-mono">{asset.model}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Seri No:</span>
                  <span className="font-mono text-foreground">{asset.serialNumber}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`${statusConfig[asset.status].color} gap-1 border`}>
                    {statusConfig[asset.status].icon}
                    {getAssetStatusLabel(asset.status)}
                  </Badge>
                  <Badge className={conditionConfig[asset.condition]}>
                    {getAssetConditionLabel(asset.condition)}
                  </Badge>
                </div>

                {asset.assignedToName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Zimmetli:</span>
                    <span className="text-foreground">{asset.assignedToName}</span>
                  </div>
                )}

                {asset.assignmentDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Tarih:</span>
                    <span className="text-foreground">
                      {new Date(asset.assignmentDate).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                )}

                {asset.conditionNotes && (
                  <p className="text-xs text-muted-foreground italic">
                    Not: {asset.conditionNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-primary">
                  {asset.value.toLocaleString("tr-TR")} TL
                </span>
                {asset.status === "zimmetli" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={() => openReturnDialog(asset)}
                  >
                    <Undo2 className="h-3 w-3" />
                    Iade Al
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 font-medium text-foreground">Varlik Bulunamadi</h3>
          <p className="text-sm text-muted-foreground">Arama kriterlerinize uygun varlik yok</p>
        </div>
      )}

      {/* Zimmet Ver Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Zimmet</DialogTitle>
            <DialogDescription>Bir calisana varlik zimmeti verin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Calisan Sec</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Calisan secin..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <span>{employee.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({getEmployeeAssetCount(employee.id)} zimmetli varlik)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Varlik Sec</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Varlik secin..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAssetsForAssignment.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Musait varlik bulunmuyor
                    </div>
                  ) : (
                    availableAssetsForAssignment.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex items-center gap-2">
                          {categoryIcons[asset.category]}
                          <span>{asset.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({asset.serialNumber})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zimmet Tarihi</Label>
              <Input
                type="date"
                value={assignmentDate}
                onChange={(e) => setAssignmentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Durum Notlari (Opsiyonel)</Label>
              <Textarea
                placeholder="Varligin mevcut durumu hakkinda notlar..."
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Dijital Imza</Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
                  Temizle
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-secondary/50 p-1">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  className="w-full cursor-crosshair rounded bg-background touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Pen className="h-3 w-3" />
                Imza atmak icin yukaridaki alana cizin
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Iptal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedEmployee || !selectedAsset}
            >
              Zimmeti Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Iade Al Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Varlik Iadesi</DialogTitle>
            <DialogDescription>
              {selectedAssetForReturn && (
                <>
                  <span className="font-medium text-foreground">{selectedAssetForReturn.name}</span>
                  {" "}varligini{" "}
                  <span className="font-medium text-foreground">{selectedAssetForReturn.assignedToName}</span>
                  {" "}adli calisandan iade alin
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Iade Durumu</Label>
              <Select value={returnCondition} onValueChange={(v) => setReturnCondition(v as Asset["condition"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yeni">Yeni</SelectItem>
                  <SelectItem value="iyi">Iyi</SelectItem>
                  <SelectItem value="orta">Orta</SelectItem>
                  <SelectItem value="yipranmis">Yipranmis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Iade Notlari (Opsiyonel)</Label>
              <Textarea
                placeholder="Iade sirasindaki durum notlari..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
              Iptal
            </Button>
            <Button onClick={handleReturn}>
              Iadeyi Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Varlik Dialog */}
      <Dialog
        open={isNewAssetDialogOpen}
        onOpenChange={(open) => {
          setIsNewAssetDialogOpen(open)
          if (!open) resetNewAssetForm()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Varlik</DialogTitle>
            <DialogDescription>
              Envantere yeni bir sirket varligi ekleyin.
            </DialogDescription>
          </DialogHeader>

          {/* Prominent Barkod Tara action - dialog basligindan hemen sonra,
              form alanlarinin oncesine konumlandirilmistir. */}
          <div className="pt-2">
            <Button
              type="button"
              size="lg"
              onClick={() => setIsScannerOpen(true)}
              className="w-full gap-2 bg-emerald-600 text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 focus-visible:ring-emerald-400"
              aria-label="Kamera ile barkod veya QR kod tara"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {"\uD83D\uDCF7"}
              </span>
              <ScanLine className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold tracking-wide">Barkod Tara</span>
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Barkod veya QR kod taradiginizda Varlik Adi, Model ve Seri No
              alanlari otomatik doldurulur.
            </p>
          </div>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-asset-name">
                Varlik Adi <span className="text-red-400">*</span>
              </Label>
              <Input
                id="new-asset-name"
                placeholder="Ornek: MacBook Pro 14 M3"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-asset-model">Model</Label>
              <Input
                id="new-asset-model"
                placeholder="Ornek: A2918 / M3 14"
                value={newAssetModel}
                onChange={(e) => setNewAssetModel(e.target.value)}
              />
            </div>

            {scanFeedback && (
              <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {scanFeedback.source === "camera"
                      ? "Barkod okundu"
                      : "Manuel kod kullanildi"}
                  </p>
                  {scanFeedback.filled.length > 0 ? (
                    <p className="text-xs text-emerald-300/90">
                      Dolduruldu: {scanFeedback.filled.join(", ")}
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-300/90">
                      Alanlar uzerine yazilmadi (mevcut degerler korundu).
                      Gerekirse elle duzenleyin.
                    </p>
                  )}
                  <p className="mt-0.5 break-all font-mono text-[10px] text-emerald-200/70">
                    {scanFeedback.raw}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Kategori <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={newAssetCategory}
                  onValueChange={(v) =>
                    setNewAssetCategory(v as Asset["category"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4" />
                        <span>Laptop</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="telefon">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>Telefon</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tablet">
                      <div className="flex items-center gap-2">
                        <Tablet className="h-4 w-4" />
                        <span>Tablet</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="monitor">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>Monitor</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="diger">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        <span>Diger</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-asset-serial">
                  Seri No <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="new-asset-serial"
                  placeholder="SN-XXXXXX"
                  value={newAssetSerial}
                  onChange={(e) => setNewAssetSerial(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-asset-date">
                  Satin Alma Tarihi <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="new-asset-date"
                  type="date"
                  value={newAssetPurchaseDate}
                  onChange={(e) => setNewAssetPurchaseDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-asset-value">
                  Deger (TL) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="new-asset-value"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="0"
                  value={newAssetValue}
                  onChange={(e) => setNewAssetValue(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Durum <span className="text-red-400">*</span>
              </Label>
              <Select
                value={newAssetStatus}
                onValueChange={(v) =>
                  setNewAssetStatus(v as Exclude<Asset["status"], "kayip">)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="musait">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>Musait</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="zimmetli">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-400" />
                      <span>Zimmetli</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bakimda">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span>Bakimda</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {newAssetStatus === "zimmetli" && (
                <p className="text-xs text-muted-foreground">
                  Not: Zimmetli olarak eklenen varliklar daha sonra &quot;Zimmet
                  Ver&quot; akisi ile bir calisana atanabilir.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-asset-notes">Notlar (Opsiyonel)</Label>
              <Textarea
                id="new-asset-notes"
                placeholder="Varlik hakkinda ek bilgiler..."
                value={newAssetNotes}
                onChange={(e) => setNewAssetNotes(e.target.value)}
                rows={3}
              />
            </div>

            {newAssetError && (
              <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{newAssetError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewAssetDialogOpen(false)
                resetNewAssetForm()
              }}
            >
              Iptal
            </Button>
            <Button onClick={handleCreateAsset}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barkod / QR tarayici dialog */}
      <BarcodeScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onDetected={handleBarcodeDetected}
      />
    </div>
  )
}
