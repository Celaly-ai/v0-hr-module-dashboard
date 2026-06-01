"use client"

import { useRef, useState } from "react"
import {
  Building,
  Clock,
  CalendarDays,
  MapPin,
  Briefcase,
  Upload,
  Phone,
  Mail,
  Globe,
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Save,
  FileCheck,
  Banknote,
  AlertCircle,
  Timer,
  ShieldAlert,
  Layers,
  GripVertical,
} from "lucide-react"
import { useSettingsStore } from "@/lib/settings-store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RolYonetimi } from "@/components/rol-yonetimi"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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

// -----------------------------
// Types and initial state
// -----------------------------

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  website: string
  logoDataUrl: string | null
}

interface WorkingHours {
  startTime: string // HH:MM
  endTime: string
  breakMinutes: number
  workDays: Record<WeekdayKey, boolean>
}

type WeekdayKey =
  | "pazartesi"
  | "sali"
  | "carsamba"
  | "persembe"
  | "cuma"
  | "cumartesi"
  | "pazar"

const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: "pazartesi", label: "Pazartesi", short: "Pzt" },
  { key: "sali", label: "Sali", short: "Sal" },
  { key: "carsamba", label: "Carsamba", short: "Car" },
  { key: "persembe", label: "Persembe", short: "Per" },
  { key: "cuma", label: "Cuma", short: "Cum" },
  { key: "cumartesi", label: "Cumartesi", short: "Cmt" },
  { key: "pazar", label: "Pazar", short: "Paz" },
]

interface LeaveType {
  id: string
  name: string
  annualDays: number
  requiresDocument: boolean
  paid: boolean
  description: string
}

interface OfficeLocation {
  id: string
  name: string
  address: string
  city: string
  phone: string
}

interface JobTitle {
  id: string
  title: string
  level: "junior" | "mid" | "senior" | "lead" | "manager"
  department: string
}

const initialCompany: CompanyInfo = {
  name: "Akropol Teknoloji A.S.",
  address: "Maslak Mahallesi, Buyukdere Cd. No:255, 34485 Sariyer / Istanbul",
  phone: "+90 212 555 00 00",
  email: "info@akropol.com.tr",
  website: "www.akropol.com.tr",
  logoDataUrl: null,
}

const initialHours: WorkingHours = {
  startTime: "09:00",
  endTime: "18:00",
  breakMinutes: 60,
  workDays: {
    pazartesi: true,
    sali: true,
    carsamba: true,
    persembe: true,
    cuma: true,
    cumartesi: false,
    pazar: false,
  },
}

const initialLeaveTypes: LeaveType[] = [
  {
    id: "lt-yillik",
    name: "Yillik Izin",
    annualDays: 14,
    requiresDocument: false,
    paid: true,
    description: "Yasal yillik ucretli izin",
  },
  {
    id: "lt-hastalik",
    name: "Hastalik Izni",
    annualDays: 10,
    requiresDocument: true,
    paid: true,
    description: "Saglik raporu ile alinan izin",
  },
  {
    id: "lt-mazeret",
    name: "Mazeret Izni",
    annualDays: 3,
    requiresDocument: false,
    paid: true,
    description: "Acil durumlar icin ucretli kisa izin",
  },
  {
    id: "lt-dogum",
    name: "Dogum Izni",
    annualDays: 112,
    requiresDocument: true,
    paid: true,
    description: "Analik izni (dogum oncesi ve sonrasi)",
  },
  {
    id: "lt-evlilik",
    name: "Evlilik Izni",
    annualDays: 3,
    requiresDocument: true,
    paid: true,
    description: "Evlilik nedeniyle izin",
  },
  {
    id: "lt-vefat",
    name: "Vefat Izni",
    annualDays: 3,
    requiresDocument: true,
    paid: true,
    description: "Birinci derece yakin vefati",
  },
  {
    id: "lt-ucretsiz",
    name: "Ucretsiz Izin",
    annualDays: 0,
    requiresDocument: false,
    paid: false,
    description: "Maas kesintili izin",
  },
]

const initialLocations: OfficeLocation[] = [
  {
    id: "loc-1",
    name: "Genel Merkez",
    address: "Maslak Mahallesi, Buyukdere Cd. No:255",
    city: "Istanbul",
    phone: "+90 212 555 00 00",
  },
  {
    id: "loc-2",
    name: "Besiktas Ofis",
    address: "Barbaros Bulvari No:125",
    city: "Istanbul",
    phone: "+90 212 555 11 11",
  },
  {
    id: "loc-3",
    name: "Ankara Sube",
    address: "Kizilirmak Mahallesi, Dumlupinar Bulvari",
    city: "Ankara",
    phone: "+90 312 555 22 22",
  },
  {
    id: "loc-4",
    name: "Kadikoy Saha",
    address: "Caddebostan Mahallesi, Bagdat Cd.",
    city: "Istanbul",
    phone: "+90 216 555 33 33",
  },
]

const initialJobTitles: JobTitle[] = [
  { id: "jt-1", title: "Teknisyen", level: "junior", department: "Teknik Servis" },
  { id: "jt-2", title: "Kidemli Teknisyen", level: "senior", department: "Teknik Servis" },
  { id: "jt-3", title: "Saha Sorumlusu", level: "lead", department: "Teknik Servis" },
  { id: "jt-4", title: "Satis Uzmani", level: "mid", department: "Satis" },
  { id: "jt-5", title: "Satis Muduru", level: "manager", department: "Satis" },
  { id: "jt-6", title: "Operasyon Uzmani", level: "mid", department: "Operasyon" },
  { id: "jt-7", title: "IK Uzmani", level: "mid", department: "IK" },
  { id: "jt-8", title: "IK Muduru", level: "manager", department: "IK" },
  { id: "jt-9", title: "Mali Musavir", level: "senior", department: "Finans" },
  { id: "jt-10", title: "Musteri Temsilcisi", level: "junior", department: "Musteri Hizmetleri" },
]

const LEVEL_LABELS: Record<JobTitle["level"], string> = {
  junior: "Junior",
  mid: "Mid-Level",
  senior: "Senior",
  lead: "Lead",
  manager: "Yonetici",
}

const LEVEL_COLORS: Record<JobTitle["level"], string> = {
  junior: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  mid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  senior: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  lead: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  manager: "bg-purple-500/15 text-purple-300 border-purple-500/40",
}

// -----------------------------
// Main page
// -----------------------------

export function SettingsPage() {
  const [tab, setTab] = useState("sirket")

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Building className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Sistem Ayarlari
          </h2>
          <p className="text-sm text-muted-foreground">
            Sirket bilgileri, calisma saatleri, izin turleri, lokasyon, unvan,
            calisma tipleri ile disiplin ihlal turleri ve derecelerini yonetin.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="sirket" className="gap-1.5">
            <Building className="h-3.5 w-3.5" />
            Sirket Bilgileri
          </TabsTrigger>
          <TabsTrigger value="saatler" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Calisma Saatleri
          </TabsTrigger>
          <TabsTrigger value="izin" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Izin Turleri
          </TabsTrigger>
          <TabsTrigger value="lokasyon" className="gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Lokasyonlar
          </TabsTrigger>
          <TabsTrigger value="unvan" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Gorev Unvanlari
          </TabsTrigger>
          <TabsTrigger value="calisma-tipi" className="gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Calisma Tipleri
          </TabsTrigger>
          <TabsTrigger value="ihlal" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Ihlal Turleri
          </TabsTrigger>
          <TabsTrigger value="rol-yonetimi" className="gap-1.5">
  Rol Yönetimi
</TabsTrigger>
<TabsTrigger value="derece" className="gap-1.5">
  <Layers className="h-3.5 w-3.5" />
  Disiplin Dereceleri
</TabsTrigger>

        </TabsList>

        <TabsContent value="sirket" className="mt-0">
          <CompanySection />
        </TabsContent>
        <TabsContent value="saatler" className="mt-0">
          <WorkingHoursSection />
        </TabsContent>
        <TabsContent value="izin" className="mt-0">
          <LeaveTypesSection />
        </TabsContent>
        <TabsContent value="lokasyon" className="mt-0">
          <LocationsSection />
        </TabsContent>
        <TabsContent value="unvan" className="mt-0">
          <JobTitlesSection />
        </TabsContent>
        <TabsContent value="calisma-tipi" className="mt-0">
          <WorkTypesSection />
        </TabsContent>
        <TabsContent value="rol-yonetimi" className="mt-0">
  <RolYonetimi />
</TabsContent>
        <TabsContent value="ihlal" className="mt-0">
          <ViolationTypesSection />
        </TabsContent>
        <TabsContent value="derece" className="mt-0">
          <SeveritiesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// -----------------------------
// 1) Company Info
// -----------------------------

function CompanySection() {
  const [company, setCompany] = useState<CompanyInfo>(initialCompany)
  const [draft, setDraft] = useState<CompanyInfo>(initialCompany)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty =
    draft.name !== company.name ||
    draft.address !== company.address ||
    draft.phone !== company.phone ||
    draft.email !== company.email ||
    draft.website !== company.website ||
    draft.logoDataUrl !== company.logoDataUrl

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((d) => ({ ...d, logoDataUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  function save() {
    setCompany(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function cancel() {
    setDraft(company)
  }

  return (
    <Card className="p-6 border-border">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo column */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Sirket Logosu
          </Label>
          <div className="aspect-square w-full max-w-xs rounded-lg border-2 border-dashed border-border bg-muted/10 flex items-center justify-center overflow-hidden">
            {draft.logoDataUrl ? (
              <img
                src={draft.logoDataUrl}
                alt={`${draft.name} logosu`}
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center">
                <ImageIcon className="h-10 w-10 opacity-40" />
                <p className="text-xs">
                  Henuz logo yuklenmedi. PNG, JPG veya SVG destekleniyor.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              aria-label="Logo yukle"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {draft.logoDataUrl ? "Degistir" : "Yukle"}
            </Button>
            {draft.logoDataUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                onClick={() => setDraft((d) => ({ ...d, logoDataUrl: null }))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Kaldir
              </Button>
            )}
          </div>
        </div>

        {/* Form column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="text-xs">
              Sirket Adi
            </Label>
            <Input
              id="company-name"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-address" className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Adres
            </Label>
            <Textarea
              id="company-address"
              value={draft.address}
              onChange={(e) =>
                setDraft((d) => ({ ...d, address: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company-phone" className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Telefon
              </Label>
              <Input
                id="company-phone"
                type="tel"
                value={draft.phone}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-email" className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" />
                E-posta
              </Label>
              <Input
                id="company-email"
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, email: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-web" className="text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Web Sitesi
            </Label>
            <Input
              id="company-web"
              value={draft.website}
              onChange={(e) =>
                setDraft((d) => ({ ...d, website: e.target.value }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-2">
            {saved ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                Degisiklikler kaydedildi.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {dirty
                  ? "Kaydedilmemis degisiklikleriniz var."
                  : "Bilgiler guncel."}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancel}
                disabled={!dirty}
              >
                Vazgec
              </Button>
              <Button size="sm" onClick={save} disabled={!dirty} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// -----------------------------
// 2) Working Hours
// -----------------------------

function WorkingHoursSection() {
  const [hours, setHours] = useState<WorkingHours>(initialHours)
  const [draft, setDraft] = useState<WorkingHours>(initialHours)
  const [saved, setSaved] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(hours)

  const netMinutes = (() => {
    const [sh, sm] = draft.startTime.split(":").map(Number)
    const [eh, em] = draft.endTime.split(":").map(Number)
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
    const start = sh * 60 + sm
    let end = eh * 60 + em
    if (end <= start) end += 24 * 60
    return Math.max(0, end - start - Math.max(0, draft.breakMinutes))
  })()
  const netHours = Math.round((netMinutes / 60) * 100) / 100
  const activeDayCount = Object.values(draft.workDays).filter(Boolean).length
  const weeklyHours = Math.round(netHours * activeDayCount * 100) / 100

  function toggleDay(key: WeekdayKey) {
    setDraft((d) => ({
      ...d,
      workDays: { ...d.workDays, [key]: !d.workDays[key] },
    }))
  }

  function save() {
    setHours(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function cancel() {
    setDraft(hours)
  }

  return (
    <Card className="p-6 border-border">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Varsayilan Calisma Saatleri
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Yeni vardiyalar ve puantaj bu varsayilanlari kullanir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hr-start" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Baslangic
              </Label>
              <Input
                id="hr-start"
                type="time"
                value={draft.startTime}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, startTime: e.target.value }))
                }
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hr-end" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Bitis
              </Label>
              <Input
                id="hr-end"
                type="time"
                value={draft.endTime}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, endTime: e.target.value }))
                }
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hr-break" className="text-xs">
                Mola (dk)
              </Label>
              <Input
                id="hr-break"
                type="number"
                min={0}
                max={480}
                step={5}
                value={draft.breakMinutes}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    breakMinutes: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Calisma Gunleri
            </Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = draft.workDays[d.key]
                return (
                  <label
                    key={d.key}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggleDay(d.key)}
                      aria-label={d.label}
                    />
                    <span className="hidden sm:inline">{d.label}</span>
                    <span className="sm:hidden font-medium">{d.short}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-2">
            {saved ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                Kaydedildi.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {dirty ? "Kaydedilmemis degisiklikler." : "Ayarlar guncel."}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancel} disabled={!dirty}>
                Vazgec
              </Button>
              <Button size="sm" onClick={save} disabled={!dirty} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>

        {/* Summary panel */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Ozet
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Canli olarak hesaplanir
                </p>
              </div>
            </div>
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gunluk brut</span>
                <span className="font-mono text-foreground">
                  {draft.startTime} - {draft.endTime}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mola</span>
                <span className="font-mono text-foreground">
                  {draft.breakMinutes} dk
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gunluk net</span>
                <span className="font-semibold text-foreground">
                  {netHours} sa
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Haftalik gun</span>
                <span className="font-semibold text-foreground">
                  {activeDayCount}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Haftalik toplam</span>
                <Badge
                  variant="outline"
                  className={`font-mono ${
                    weeklyHours > 45
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {weeklyHours} sa
                </Badge>
              </div>
              {weeklyHours > 45 && (
                <p className="flex items-start gap-1.5 text-[11px] text-rose-300">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  Haftalik 45 saati asiyor (4857 Sayili Is Kanunu siniri).
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// -----------------------------
// 3) Leave Types
// -----------------------------

function LeaveTypesSection() {
  const [types, setTypes] = useState<LeaveType[]>(initialLeaveTypes)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveType | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LeaveType | null>(null)

  // Form state
  const [fName, setFName] = useState("")
  const [fDays, setFDays] = useState(0)
  const [fReq, setFReq] = useState(false)
  const [fPaid, setFPaid] = useState(true)
  const [fDesc, setFDesc] = useState("")
  const [fError, setFError] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setFName("")
    setFDays(0)
    setFReq(false)
    setFPaid(true)
    setFDesc("")
    setFError(null)
    setDialogOpen(true)
  }

  function openEdit(lt: LeaveType) {
    setEditing(lt)
    setFName(lt.name)
    setFDays(lt.annualDays)
    setFReq(lt.requiresDocument)
    setFPaid(lt.paid)
    setFDesc(lt.description)
    setFError(null)
    setDialogOpen(true)
  }

  function save() {
    const name = fName.trim()
    if (!name) {
      setFError("Izin turu adi zorunludur.")
      return
    }
    if (
      types.some(
        (t) =>
          t.id !== editing?.id &&
          t.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setFError("Bu isimde bir izin turu zaten var.")
      return
    }
    if (editing) {
      setTypes((prev) =>
        prev.map((t) =>
          t.id === editing.id
            ? {
                ...t,
                name,
                annualDays: Math.max(0, fDays || 0),
                requiresDocument: fReq,
                paid: fPaid,
                description: fDesc.trim(),
              }
            : t,
        ),
      )
    } else {
      const next: LeaveType = {
        id: `lt-${Date.now()}`,
        name,
        annualDays: Math.max(0, fDays || 0),
        requiresDocument: fReq,
        paid: fPaid,
        description: fDesc.trim(),
      }
      setTypes((prev) => [...prev, next])
    }
    setDialogOpen(false)
  }

  function remove(lt: LeaveType) {
    setTypes((prev) => prev.filter((t) => t.id !== lt.id))
    setConfirmDelete(null)
  }

  return (
    <Card className="border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Izin Turleri
          </p>
          <p className="text-xs text-muted-foreground">
            {types.length} tanimli tur
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Izin Turu
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Izin Turu</th>
              <th className="text-right font-medium px-4 py-2.5">Yillik Gun</th>
              <th className="text-center font-medium px-4 py-2.5">Belge</th>
              <th className="text-center font-medium px-4 py-2.5">Odenek</th>
              <th className="text-right font-medium px-4 py-2.5">Islemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {types.map((t) => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {t.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-foreground">
                    {t.annualDays || "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {t.requiresDocument ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-amber-300 gap-1"
                    >
                      <FileCheck className="h-3 w-3" />
                      Gerekli
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Gerekmiyor
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {t.paid ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 gap-1"
                    >
                      <Banknote className="h-3 w-3" />
                      Ucretli
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-muted-foreground/30 text-muted-foreground"
                    >
                      Ucretsiz
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(t)}
                      aria-label="Duzenle"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => setConfirmDelete(t)}
                      aria-label="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {types.map((t) => (
          <div key={t.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground">
                    {t.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-400"
                  onClick={() => setConfirmDelete(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="border-border">
                {t.annualDays} gun
              </Badge>
              {t.requiresDocument && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-300"
                >
                  Belge gerekli
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  t.paid
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-muted-foreground/30 text-muted-foreground"
                }
              >
                {t.paid ? "Ucretli" : "Ucretsiz"}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="h-4 w-4 text-primary" />
                  Izin Turunu Duzenle
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-primary" />
                  Yeni Izin Turu
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Izin turlerinin adi, yillik gun sayisi ve ozellikleri.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lt-name" className="text-xs">
                Izin Adi <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="lt-name"
                value={fName}
                onChange={(e) => {
                  setFName(e.target.value)
                  setFError(null)
                }}
                placeholder="Orn. Egitim Izni"
                maxLength={40}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lt-days" className="text-xs">
                Yillik Gun Sayisi
              </Label>
              <Input
                id="lt-days"
                type="number"
                min={0}
                max={365}
                value={fDays}
                onChange={(e) => setFDays(Number(e.target.value) || 0)}
              />
              <p className="text-[11px] text-muted-foreground">
                0 ise sinirsiz ya da ozel onaya bagli olarak degerlendirilir.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lt-desc" className="text-xs">
                Aciklama
              </Label>
              <Textarea
                id="lt-desc"
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                rows={2}
                placeholder="Bu izin turunun kullanim kosullari..."
                maxLength={200}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Switch
                  checked={fReq}
                  onCheckedChange={setFReq}
                  aria-label="Belge gereksinimi"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Belge Gerekli
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Talep sirasinda rapor veya diger bir belge yuklenmesi
                    zorunludur.
                  </p>
                </div>
              </label>
              <Separator />
              <label className="flex items-start gap-3 cursor-pointer">
                <Switch
                  checked={fPaid}
                  onCheckedChange={setFPaid}
                  aria-label="Ucretli izin"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Ucretli Izin
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Bu izinde maas kesintisi uygulanmaz.
                  </p>
                </div>
              </label>
            </div>

            {fError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={save}>{editing ? "Guncelle" : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izin Turunu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {confirmDelete?.name}
              </span>{" "}
              kaldirilacak. Mevcut izin talepleri etkilenmez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// -----------------------------
// 6) Work Types (Calisma Tipleri)
// -----------------------------

function WorkTypesSection() {
  const settings = useSettingsStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fLabel, setFLabel] = useState("")
  const [fValue, setFValue] = useState("")
  const [fError, setFError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openNew() {
    setFLabel("")
    setFValue("")
    setFError(null)
    setDialogOpen(true)
  }

  function save() {
    const label = fLabel.trim()
    if (!label) {
      setFError("Calisma tipi adi zorunludur.")
      return
    }
    const ok = settings.addWorkType(fValue.trim() || label, label)
    if (!ok) {
      setFError("Bu calisma tipi zaten mevcut.")
      return
    }
    setDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Calisma Tipleri
          </p>
          <p className="text-xs text-muted-foreground">
            {settings.workTypes.length} tanimli tip &middot; Calisan formu bu
            listeden okur
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Tip
        </Button>
      </div>

      {settings.workTypes.length === 0 ? (
        <Card className="p-10 border-border text-center">
          <Timer className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-foreground">Henuz tip eklenmedi.</p>
        </Card>
      ) : (
        <Card className="p-4 border-border">
          <div className="flex flex-wrap gap-2">
            {settings.workTypes.map((wt) => (
              <div
                key={wt.id}
                className="group/wt flex items-center gap-2 rounded-md border border-border bg-muted/10 pl-3 pr-1 py-1 hover:border-primary/40 transition-colors"
              >
                <Timer className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm text-foreground">{wt.label}</span>
                <code className="text-[10px] text-muted-foreground font-mono">
                  {wt.value}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-60 group-hover/wt:opacity-100 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={() => setConfirmDelete(wt.id)}
                  aria-label="Sil"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Yeni Calisma Tipi
            </DialogTitle>
            <DialogDescription>
              Calisanlara atanabilecek calisma tipi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Ad <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={fLabel}
                onChange={(e) => {
                  setFLabel(e.target.value)
                  setFError(null)
                }}
                placeholder="Orn. Hibrit"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sistem Degeri (opsiyonel)</Label>
              <Input
                value={fValue}
                onChange={(e) => setFValue(e.target.value)}
                placeholder="hibrit"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Bos birakilirsa otomatik olusturulur.
              </p>
            </div>
            {fError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={save}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Calisma Tipini Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu calisma tipi Calisan formu secim listesinden kalkar. Mevcut
              calisanlar etkilenmez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => {
                if (confirmDelete) settings.removeWorkType(confirmDelete)
                setConfirmDelete(null)
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

// -----------------------------
// 7) Violation Types (Ihlal Turleri)
// -----------------------------

function ViolationTypesSection() {
  const settings = useSettingsStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fLabel, setFLabel] = useState("")
  const [fDesc, setFDesc] = useState("")
  const [fError, setFError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openNew() {
    setFLabel("")
    setFDesc("")
    setFError(null)
    setDialogOpen(true)
  }

  function save() {
    const label = fLabel.trim()
    if (!label) {
      setFError("Ihlal adi zorunludur.")
      return
    }
    const created = settings.addViolationType(label, fDesc.trim() || undefined)
    if (!created) {
      setFError("Bu ihlal turu zaten mevcut.")
      return
    }
    setDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Ihlal Turleri</p>
          <p className="text-xs text-muted-foreground">
            {settings.violationTypes.length} tanimli &middot; Disiplin
            kayitlari ve savunma taleplerinde kullanilir
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Ihlal Turu
        </Button>
      </div>

      {settings.violationTypes.length === 0 ? (
        <Card className="p-10 border-border text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-foreground">
            Henuz ihlal turu eklenmedi.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {settings.violationTypes.map((vt) => (
            <Card
              key={vt.id}
              className="p-4 border-border hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-300">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">
                    {vt.label}
                  </p>
                  {vt.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {vt.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic mt-0.5">
                      Aciklama yok
                    </p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={() => setConfirmDelete(vt.id)}
                  aria-label="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Yeni Ihlal Turu
            </DialogTitle>
            <DialogDescription>
              Disiplin modulu bu liste uzerinden secim sunar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Ad <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={fLabel}
                onChange={(e) => {
                  setFLabel(e.target.value)
                  setFError(null)
                }}
                placeholder="Orn. Gec Kalma"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aciklama (opsiyonel)</Label>
              <Textarea
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                placeholder="Ihlalin kisa tanimi"
                rows={2}
              />
            </div>
            {fError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={save}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ihlal Turunu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Mevcut kayitlar etkilenmez, yeni savunma taleplerinde bu tur
              secilemez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => {
                if (confirmDelete) settings.removeViolationType(confirmDelete)
                setConfirmDelete(null)
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

// -----------------------------
// 8) Severities (Disiplin Dereceleri)
// -----------------------------

const SEVERITY_COLOR_PRESETS = [
  { label: "Sari", value: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  { label: "Turuncu", value: "bg-orange-500/15 text-orange-300 border-orange-500/40" },
  { label: "Kirmizi", value: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
  { label: "Mavi", value: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  { label: "Yesil", value: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  { label: "Mor", value: "bg-purple-500/15 text-purple-300 border-purple-500/40" },
]

function SeveritiesSection() {
  const settings = useSettingsStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fLabel, setFLabel] = useState("")
  const [fColor, setFColor] = useState(SEVERITY_COLOR_PRESETS[3].value)
  const [fError, setFError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openNew() {
    setFLabel("")
    setFColor(SEVERITY_COLOR_PRESETS[3].value)
    setFError(null)
    setDialogOpen(true)
  }

  function save() {
    const label = fLabel.trim()
    if (!label) {
      setFError("Derece adi zorunludur.")
      return
    }
    const created = settings.addSeverity(label, fColor)
    if (!created) {
      setFError("Bu derece zaten mevcut.")
      return
    }
    setDialogOpen(false)
  }

  const sorted = [...settings.severities].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Disiplin Dereceleri
          </p>
          <p className="text-xs text-muted-foreground">
            {sorted.length} tanimli derece &middot; Uyari, Ihtar, Fesih
            varsayilan olarak korunur
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Derece
        </Button>
      </div>

      <Card className="p-0 border-border overflow-hidden">
        <div className="divide-y divide-border">
          {sorted.map((sv) => (
            <div
              key={sv.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/60" />
              <div className="flex h-6 w-8 items-center justify-center rounded bg-muted/40 text-[11px] font-mono text-muted-foreground">
                {sv.order}
              </div>
              <Badge
                variant="outline"
                className={`${sv.colorClass} uppercase tracking-wide text-[11px]`}
              >
                {sv.label}
              </Badge>
              <code className="text-[11px] text-muted-foreground font-mono">
                {sv.value}
              </code>
              {sv.isBuiltIn && (
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground text-[10px]"
                >
                  Varsayilan
                </Badge>
              )}
              <div className="flex-1" />
              {!sv.isBuiltIn && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={() => setConfirmDelete(sv.id)}
                  aria-label="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Varsayilan dereceler (Uyari, Ihtar, Fesih) sistem genelinde bekleniyor
        olup silinemez. Kendi ozel derecelerinizi (orn. &quot;Yazili Ihtar&quot;)
        ekleyip silebilirsiniz.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Yeni Disiplin Derecesi
            </DialogTitle>
            <DialogDescription>
              Disiplin karari olarak kullanilacak ozel derece.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Ad <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={fLabel}
                onChange={(e) => {
                  setFLabel(e.target.value)
                  setFError(null)
                }}
                placeholder="Orn. Yazili Ihtar"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Renk</Label>
              <div className="grid grid-cols-3 gap-2">
                {SEVERITY_COLOR_PRESETS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setFColor(c.value)}
                    className={`rounded-md border px-2 py-2 text-[11px] font-medium transition-all ${
                      c.value
                    } ${
                      fColor === c.value
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {fError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={save}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dereceyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu derece silindikten sonra yeni savunma kararlarinda
              secilemeyecek. Varsayilan dereceler silinemez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => {
                if (confirmDelete) settings.removeSeverity(confirmDelete)
                setConfirmDelete(null)
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


// -----------------------------
// 4) Locations
// -----------------------------

function LocationsSection() {
  const settings = useSettingsStore()
  const [locs, setLocs] = useState<OfficeLocation[]>(initialLocations)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OfficeLocation | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<OfficeLocation | null>(null)

  const [fName, setFName] = useState("")
  const [fAddress, setFAddress] = useState("")
  const [fCity, setFCity] = useState("")
  const [fPhone, setFPhone] = useState("")
  const [fError, setFError] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setFName("")
    setFAddress("")
    setFCity("")
    setFPhone("")
    setFError(null)
    setDialogOpen(true)
  }

  function openEdit(l: OfficeLocation) {
    setEditing(l)
    setFName(l.name)
    setFAddress(l.address)
    setFCity(l.city)
    setFPhone(l.phone)
    setFError(null)
    setDialogOpen(true)
  }

  function save() {
    const name = fName.trim()
    if (!name) {
      setFError("Lokasyon adi zorunludur.")
      return
    }
    if (editing) {
      const oldName = editing.name
      setLocs((prev) =>
        prev.map((l) =>
          l.id === editing.id
            ? {
                ...l,
                name,
                address: fAddress.trim(),
                city: fCity.trim(),
                phone: fPhone.trim(),
              }
            : l,
        ),
      )
      // Isim degistiyse paylasilan listeyi de guncelle (Calisan formu buradan okur).
      if (oldName !== name) {
        settings.removeLocation(oldName)
        settings.addLocation(name)
      }
    } else {
      setLocs((prev) => [
        ...prev,
        {
          id: `loc-${Date.now()}`,
          name,
          address: fAddress.trim(),
          city: fCity.trim(),
          phone: fPhone.trim(),
        },
      ])
      settings.addLocation(name)
    }
    setDialogOpen(false)
  }

  function remove(l: OfficeLocation) {
    setLocs((prev) => prev.filter((x) => x.id !== l.id))
    settings.removeLocation(l.name)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ofis Lokasyonlari
          </p>
          <p className="text-xs text-muted-foreground">
            {locs.length} tanimli lokasyon
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Lokasyon
        </Button>
      </div>

      {locs.length === 0 ? (
        <Card className="p-10 border-border text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-foreground">
            Henuz lokasyon eklenmedi.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locs.map((l) => (
            <Card
              key={l.id}
              className="p-4 border-border hover:border-primary/40 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">
                    {l.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{l.city}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openEdit(l)}
                    aria-label="Duzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    onClick={() => setConfirmDelete(l)}
                    aria-label="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {l.address && (
                  <p className="line-clamp-2">{l.address}</p>
                )}
                {l.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    {l.phone}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <Pencil className="h-4 w-4 text-primary" />
              ) : (
                <Plus className="h-4 w-4 text-primary" />
              )}
              {editing ? "Lokasyonu Duzenle" : "Yeni Lokasyon"}
            </DialogTitle>
            <DialogDescription>
              Ofis veya saha lokasyonu bilgileri.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name" className="text-xs">
                Lokasyon Adi <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="loc-name"
                value={fName}
                onChange={(e) => {
                  setFName(e.target.value)
                  setFError(null)
                }}
                placeholder="Orn. Izmir Sube"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-city" className="text-xs">
                Sehir
              </Label>
              <Input
                id="loc-city"
                value={fCity}
                onChange={(e) => setFCity(e.target.value)}
                placeholder="Istanbul"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-addr" className="text-xs">
                Adres
              </Label>
              <Textarea
                id="loc-addr"
                value={fAddress}
                onChange={(e) => setFAddress(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-phone" className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Telefon
              </Label>
              <Input
                id="loc-phone"
                type="tel"
                value={fPhone}
                onChange={(e) => setFPhone(e.target.value)}
                placeholder="+90 ..."
              />
            </div>
            {fError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={save}>{editing ? "Guncelle" : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lokasyonu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {confirmDelete?.name}
              </span>{" "}
              silinecek. Bu islem geri alinamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// -----------------------------
// 5) Job Titles
// -----------------------------

function JobTitlesSection() {
  const settings = useSettingsStore()
  const [titles, setTitles] = useState<JobTitle[]>(initialJobTitles)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<JobTitle | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<JobTitle | null>(null)

  const [fTitle, setFTitle] = useState("")
  const [fLevel, setFLevel] = useState<JobTitle["level"]>("mid")
  const [fDept, setFDept] = useState("")
  const [fError, setFError] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setFTitle("")
    setFLevel("mid")
    setFDept("")
    setFError(null)
    setDialogOpen(true)
  }

  function openEdit(jt: JobTitle) {
    setEditing(jt)
    setFTitle(jt.title)
    setFLevel(jt.level)
    setFDept(jt.department)
    setFError(null)
    setDialogOpen(true)
  }

  function save() {
    const title = fTitle.trim()
    if (!title) {
      setFError("Unvan adi zorunludur.")
      return
    }
    if (editing) {
      const oldTitle = editing.title
      setTitles((prev) =>
        prev.map((t) =>
          t.id === editing.id
            ? { ...t, title, level: fLevel, department: fDept.trim() }
            : t,
        ),
      )
      if (oldTitle !== title) {
        settings.removeJobTitle(oldTitle)
        settings.addJobTitle(title)
      }
    } else {
      setTitles((prev) => [
        ...prev,
        {
          id: `jt-${Date.now()}`,
          title,
          level: fLevel,
          department: fDept.trim(),
        },
      ])
      settings.addJobTitle(title)
    }
    setDialogOpen(false)
  }

  function remove(jt: JobTitle) {
    setTitles((prev) => prev.filter((x) => x.id !== jt.id))
    settings.removeJobTitle(jt.title)
    setConfirmDelete(null)
  }

  // Group by department for display
  const grouped = titles.reduce<Record<string, JobTitle[]>>((acc, t) => {
    const key = t.department || "Atanmamis"
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})
  const groupKeys = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Gorev Unvanlari
          </p>
          <p className="text-xs text-muted-foreground">
            {titles.length} tanimli unvan, {groupKeys.length} departman
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Yeni Unvan
        </Button>
      </div>

      {titles.length === 0 ? (
        <Card className="p-10 border-border text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-foreground">
            Henuz unvan eklenmedi.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupKeys.map((dept) => (
            <Card key={dept} className="p-4 border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/30 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  {dept}
                </h4>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground text-[10px]"
                >
                  {grouped[dept].length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {grouped[dept].map((jt) => (
                  <div
                    key={jt.id}
                    className="group/jt flex items-center gap-2 rounded-md border border-border bg-muted/10 pl-3 pr-1 py-1 hover:border-primary/40 transition-colors"
                  >
                    <span className="text-sm text-foreground">
                      {jt.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${LEVEL_COLORS[jt.level]}`}
                    >
                      {LEVEL_LABELS[jt.level]}
                    </Badge>
                    <div className="flex items-center opacity-60 group-hover/jt:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => openEdit(jt)}
                        aria-label="Duzenle"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={() => setConfirmDelete(jt)}
                        aria-label="Sil"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <Pencil className="h-4 w-4 text-primary" />
              ) : (
                <Plus className="h-4 w-4 text-primary" />
              )}
              {editing ? "Unvani Duzenle" : "Yeni Unvan"}
            </DialogTitle>
            <DialogDescription>
              Calisanlara atanabilecek gorev tanimi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="jt-title" className="text-xs">
                Unvan <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="jt-title"
                value={fTitle}
                onChange={(e) => {
                  setFTitle(e.target.value)
                  setFError(null)
                }}
                placeholder="Orn. Kidemli Yazilim Muhendisi"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Seviye</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(LEVEL_LABELS) as JobTitle["level"][]).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setFLevel(lv)}
                    className={`rounded-md border px-2 py-2 text-[11px] font-medium transition-colors ${
                      fLevel === lv
                        ? LEVEL_COLORS[lv]
                        : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {LEVEL_LABELS[lv]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jt-dept" className="text-xs">
                Departman
              </Label>
              <Input
                id="jt-dept"
                value={fDept}
                onChange={(e) => setFDept(e.target.value)}
                placeholder="Orn. Teknik Servis"
              />
            </div>
            {fError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={save}>{editing ? "Guncelle" : "Ekle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unvani Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {confirmDelete?.title}
              </span>{" "}
              unvani silinecek. Bu unvana sahip calisanlarin kayitlari
              etkilenmez ancak yeni atamalarda secilemez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
