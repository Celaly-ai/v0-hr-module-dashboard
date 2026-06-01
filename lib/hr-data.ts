export interface Employee {
  id: string
  name: string
  email: string
  avatar: string
  department: string
  position: string
  status: "active" | "on-leave" | "remote"
  startDate: string
  phone: string
  location: string
  // Kisisel Bilgiler
  tcKimlikNo: string
  birthDate: string
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "0+" | "0-"
  emergencyContactName: string
  emergencyContactPhone: string
  educationLevel: "ilkokul" | "ortaokul" | "lise" | "onlisans" | "lisans" | "yukseklisans" | "doktora"
  militaryStatus: "yapildi" | "muaf" | "tecilli" | "yapilmadi"
  // Gorev Bilgileri
  contractType: "belirsiz" | "belirli" | "staj"
  contractEndDate: string | null
  workType: "tam-zamanli" | "vardiyali" | "saha" | "uzaktan"
  sgkStartDate: string
  probationEndDate: string | null
  // Mali Bilgiler
  iban: string
  grossSalary: number
rol?: string
  gender?: "erkek" | "kadin" | ""
  city?: string
  district?: string
  neighborhood?: string
  openAddress?: string
  taxNumber?: string
  emergencyContactRelation?: string



}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  type: "vacation" | "sick" | "excuse" | "unpaid"
  startDate: string
  endDate: string
  status: "pending" | "approved" | "rejected"
  reason: string
  rejectionReason?: string
  submittedAt: string
}

export interface LeaveBalance {
  employeeId: string
  vacation: number // Yillik izin
  sick: number // Hastalik
  excuse: number // Mazeret
  unpaid: number // Ucretsiz
  usedVacation: number
  usedSick: number
  usedExcuse: number
  usedUnpaid: number
}

export interface Asset {
  id: string
  name: string
  /** Uretici model kodu / isim (orn. "MacBook Pro 14 M3"). Barkod/QR taramadan otomatik doldurulabilir. */
  model?: string
  category: "telefon" | "laptop" | "arac" | "ekipman" | "forma" | "tablet" | "monitor" | "diger"
  serialNumber: string
  assignedTo: string | null
  assignedToName: string | null
  assignmentDate: string | null
  condition: "yeni" | "iyi" | "orta" | "yipranmis"
  conditionNotes: string | null
  status: "zimmetli" | "musait" | "bakimda" | "kayip"
  purchaseDate: string
  value: number
  digitalSignature: string | null
}

// Built-in ihlal turleri - kullanici ayarlardan yeni tur ekleyebilir.
export type BuiltInViolationType =
  | "devamsizlik"
  | "is-kurallari"
  | "performans"
  | "davranis"
  | "diger"

// Built-in dereceler - yeni dereceler Ayarlar > Dereceler'den eklenebilir.
export type BuiltInSeverity = "uyari" | "ihtar" | "fesih"

export interface DisciplineRecord {
  id: string
  employeeId: string
  employeeName: string
  /** Built-in ya da kullanici tanimli bir deger */
  violationType: BuiltInViolationType | string
  /** Ayarlardaki etiket karsiligi (kullanici tanimli degerler icin gosterim) */
  violationTypeLabel?: string
  date: string
  description: string
  /** Built-in ya da kullanici tanimli bir derece degeri */
  severity: BuiltInSeverity | string
  witnessName: string | null
  documentUrl: string | null
  employeeSignature: string | null
  signatureStatus: "imzaladi" | "bekliyor"
  createdAt: string
  /** Eger bir savunma akisi sonrasi olusturuldu ise ilgili savunma talep kimligi */
  defenseRequestId?: string | null
}

// -----------------------------
// Savunma Talep Et akisi
// -----------------------------

export interface DefenseRequest {
  id: string
  employeeId: string
  employeeName: string
  violationType: BuiltInViolationType | string
  violationTypeLabel?: string
  violationDate: string // ihlal tarihi
  hrDescription: string // IK'nin yazdigi ihlal aciklamasi
  witnessName: string | null
  hrDocumentUrl: string | null
  requestedAt: string // ISO - savunma talebi olusturulma zamani
  deadlineAt: string // ISO - 2 is gunu sonrasi son tarih
  status:
    | "bekliyor" // personel savunma bekliyor
    | "savunma-yapildi" // personel gonderdi, yonetici karar bekliyor
    | "savunma-yapilmadi" // 2 is gunu gecti, yonetici karar bekliyor
    | "tamamlandi" // yonetici karar verdi
  // Personel savunmasi
  employeeDefenseText?: string
  employeeDefenseDocumentUrl?: string | null
  employeeDefenseSignature?: string | null
  defenseSubmittedAt?: string
  // Yonetici karari
  managerDecision?: BuiltInSeverity | "beraat" | string
  managerDecisionLabel?: string
  managerNotes?: string
  managerDecidedAt?: string
  // Olusan disiplin kaydina referans (beraat disinda)
  resultingRecordId?: string | null
}

export interface DocumentRecord {
  id: string
  employeeId: string
  employeeName: string
  documentType: "sgk-belgesi" | "saglik-raporu" | "ehliyet" | "src-belgesi" | "isg-sertifikasi" | "pasaport" | "diger"
  documentNumber: string
  issueDate: string
  expiryDate: string
  fileUrl: string | null
  reminderDays: 90 | 30 | 7
  createdAt: string
}

export interface ChecklistStep {
  id: string
  title: string
  responsiblePerson: string
  dueDate: string
  completed: boolean
  completedAt: string | null
  notes: string
}

export interface OnboardingProcess {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  department: string
  position: string
  startDate: string
  targetCompletionDate: string
  status: "devam-ediyor" | "tamamlandi" | "gecikti"
  steps: ChecklistStep[]
  createdAt: string
}

export interface OffboardingProcess {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  department: string
  position: string
  terminationDate: string
  targetCompletionDate: string
  reason: "istifa" | "fesih" | "emeklilik" | "sozlesme-bitimi" | "diger"
  status: "devam-ediyor" | "tamamlandi" | "gecikti"
  steps: ChecklistStep[]
  createdAt: string
}

export type TimesheetStatus =
  | "calisti"
  | "izin"
  | "rapor"
  | "devamsiz"
  | "resmi-tatil"
  | "hafta-sonu"

export interface TimesheetEntry {
  employeeId: string
  date: string // YYYY-MM-DD
  status: TimesheetStatus
  overtimeHours: number
  note: string
}

export interface MonthlyTimesheet {
  month: number // 1-12
  year: number
  entries: TimesheetEntry[]
  locked: boolean
  lockedBy: string | null
  lockedAt: string | null
}

// -----------------------------
// Shift Planning (Vardiya Plani)
// -----------------------------

export type ShiftType = "sabah" | "ogleden-sonra" | "gece" | "serbest" | "izin"

export interface ShiftDefinition {
  type: ShiftType
  label: string
  startTime: string
  endTime: string
  breakMinutes: number
  hours: number // net working hours after break is subtracted
  colorClass: string
  dotClass: string
  shortCode: string
  editable: boolean
}

export const SHIFT_DEFINITIONS: Record<ShiftType, ShiftDefinition> = {
  sabah: {
    type: "sabah",
    label: "Sabah",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    hours: 8,
    colorClass:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25",
    dotClass: "bg-emerald-500",
    shortCode: "S",
    editable: true,
  },
  "ogleden-sonra": {
    type: "ogleden-sonra",
    label: "Ogleden Sonra",
    startTime: "14:00",
    endTime: "23:00",
    breakMinutes: 60,
    hours: 8,
    colorClass:
      "bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/25",
    dotClass: "bg-sky-500",
    shortCode: "O",
    editable: true,
  },
  gece: {
    type: "gece",
    label: "Gece",
    startTime: "22:00",
    endTime: "07:00",
    breakMinutes: 60,
    hours: 8,
    colorClass:
      "bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/25",
    dotClass: "bg-purple-500",
    shortCode: "G",
    editable: true,
  },
  serbest: {
    type: "serbest",
    label: "Serbest",
    startTime: "",
    endTime: "",
    breakMinutes: 0,
    hours: 0,
    colorClass:
      "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60",
    dotClass: "bg-muted-foreground/40",
    shortCode: "-",
    editable: false,
  },
  izin: {
    type: "izin",
    label: "Izin",
    startTime: "",
    endTime: "",
    breakMinutes: 0,
    hours: 0,
    colorClass:
      "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25",
    dotClass: "bg-amber-500",
    shortCode: "I",
    editable: false,
  },
}

/**
 * Compute net working hours for a shift defined by a start/end clock time
 * and a break duration in minutes. Handles overnight shifts (end <= start
 * rolls over to the next day).
 */
export function calculateNetHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
): number {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return 0
  }
  const startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60 // overnight rollover
  const gross = endMin - startMin
  const net = Math.max(0, gross - Math.max(0, breakMinutes))
  // Round to 2 decimals to avoid 7.99999 artifacts.
  return Math.round((net / 60) * 100) / 100
}

export interface ShiftTemplate {
  id: string
  name: string
  description: string
  pattern: ShiftType[] // 7 entries Pzt..Paz
}

export const defaultShiftTemplates: ShiftTemplate[] = [
  {
    id: "tpl-standart",
    name: "Standart Hafta",
    description: "Pzt-Cuma sabah vardiyasi, hafta sonu serbest",
    pattern: ["sabah", "sabah", "sabah", "sabah", "sabah", "serbest", "serbest"],
  },
  {
    id: "tpl-gece",
    name: "Gece Vardiyasi",
    description: "Pzt-Cuma gece vardiyasi, hafta sonu serbest",
    pattern: ["gece", "gece", "gece", "gece", "gece", "serbest", "serbest"],
  },
  {
    id: "tpl-rotasyon",
    name: "Rotasyon",
    description: "Sabah/Ogleden sonra karma rotasyon",
    pattern: [
      "sabah",
      "ogleden-sonra",
      "sabah",
      "ogleden-sonra",
      "sabah",
      "serbest",
      "serbest",
    ],
  },
]

export interface ShiftAssignment {
  employeeId: string
  date: string // YYYY-MM-DD
  shift: ShiftType
}

export const WEEKDAY_SHORT_LABELS = [
  "Pzt",
  "Sal",
  "Car",
  "Per",
  "Cum",
  "Cmt",
  "Paz",
] as const

export const WEEKDAY_LONG_LABELS = [
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const

// Returns the Monday of the week containing `date` at midnight.
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 Sun - 6 Sat
  const mondayOffset = (day + 6) % 7
  d.setDate(d.getDate() - mondayOffset)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function formatISODate(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function formatDayMonth(d: Date): string {
  const day = d.getDate().toString().padStart(2, "0")
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  return `${day}.${m}`
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const startLabel = sameMonth
    ? weekStart.getDate().toString()
    : formatDayMonth(weekStart)
  const endLabel = formatDayMonth(end)
  const year = end.getFullYear()
  return `${startLabel} - ${endLabel} ${year}`
}

// Turkish official holidays (fixed-date only for demo)
export const turkishHolidays: { date: string; name: string }[] = [
  { date: "01-01", name: "Yilbasi" },
  { date: "04-23", name: "Ulusal Egemenlik ve Cocuk Bayrami" },
  { date: "05-01", name: "Emek ve Dayanisma Gunu" },
  { date: "05-19", name: "Genclik ve Spor Bayrami" },
  { date: "07-15", name: "Demokrasi ve Milli Birlik Gunu" },
  { date: "08-30", name: "Zafer Bayrami" },
  { date: "10-29", name: "Cumhuriyet Bayrami" },
]

export const onboardingStepTemplates = [
  { id: "sgk-bildirimi", title: "SGK Bildirimi", defaultResponsible: "IK Departmani" },
  { id: "sozlesme-imzalama", title: "Sozlesme Imzalama", defaultResponsible: "IK Departmani" },
  { id: "kimlik-fotokopisi", title: "Kimlik Fotokopisi Alma", defaultResponsible: "IK Departmani" },
  { id: "sistem-hesabi", title: "Sistem Hesabi Acma", defaultResponsible: "IT Departmani" },
  { id: "ekipman-zimmet", title: "Ekipman Zimmet Teslimi", defaultResponsible: "IT Departmani" },
  { id: "oryantasyon", title: "Oryantasyon Egitimi", defaultResponsible: "IK Departmani" },
  { id: "departman-tanitim", title: "Departman Tanitimi", defaultResponsible: "Departman Yoneticisi" },
  { id: "gorev-tanimi", title: "Gorev Tanimi Verilmesi", defaultResponsible: "Departman Yoneticisi" },
] as const

export const offboardingStepTemplates = [
  { id: "zimmet-iade", title: "Zimmet Iade", defaultResponsible: "IT Departmani" },
  { id: "sistem-hesabi-kapatma", title: "Sistem Hesabi Kapatma", defaultResponsible: "IT Departmani" },
  { id: "sgk-cikis", title: "SGK Cikis", defaultResponsible: "IK Departmani" },
  { id: "cikis-mulakati", title: "Cikis Mulakati", defaultResponsible: "IK Muduru" },
  { id: "son-maas", title: "Son Maas Hesabi", defaultResponsible: "Finans Departmani" },
] as const

export const employees: Employee[] = [
  {
    id: "1",
    name: "Ayse Yilmaz",
    email: "ayse.yilmaz@feyteknik.com",
    avatar: "",
    department: "Teknik Servis",
    position: "Kidemli Teknisyen",
    status: "active",
    startDate: "2021-03-15",
    phone: "+90 (532) 123-4567",
    location: "Istanbul",
    tcKimlikNo: "12345678901",
    birthDate: "1990-05-12",
    bloodType: "A+",
    emergencyContactName: "Ahmet Yilmaz",
    emergencyContactPhone: "+90 (532) 111-2233",
    educationLevel: "lisans",
    militaryStatus: "muaf",
    contractType: "belirsiz",
    contractEndDate: null,
    workType: "saha",
    sgkStartDate: "2021-03-15",
    probationEndDate: null,
    iban: "TR33 0006 1005 1978 6457 8413 26",
    grossSalary: 45000,
  },
  {
    id: "2",
    name: "Mehmet Kaya",
    email: "mehmet.k@feyteknik.com",
    avatar: "",
    department: "Satis",
    position: "Satis Temsilcisi",
    status: "remote",
    startDate: "2022-01-10",
    phone: "+90 (533) 234-5678",
    location: "Ankara",
    tcKimlikNo: "23456789012",
    birthDate: "1988-11-23",
    bloodType: "B+",
    emergencyContactName: "Fatma Kaya",
    emergencyContactPhone: "+90 (533) 222-3344",
    educationLevel: "yukseklisans",
    militaryStatus: "yapildi",
    contractType: "belirsiz",
    contractEndDate: null,
    workType: "uzaktan",
    sgkStartDate: "2022-01-10",
    probationEndDate: null,
    iban: "TR44 0006 1005 1978 6457 8413 27",
    grossSalary: 38000,
  },
  {
    id: "3",
    name: "Elif Demir",
    email: "elif.d@feyteknik.com",
    avatar: "",
    department: "Operasyon",
    position: "Operasyon Muduru",
    status: "on-leave",
    startDate: "2020-06-20",
    phone: "+90 (534) 345-6789",
    location: "Izmir",
    tcKimlikNo: "34567890123",
    birthDate: "1985-03-08",
    bloodType: "0+",
    emergencyContactName: "Murat Demir",
    emergencyContactPhone: "+90 (534) 333-4455",
    educationLevel: "lisans",
    militaryStatus: "muaf",
    contractType: "belirsiz",
    contractEndDate: null,
    workType: "tam-zamanli",
    sgkStartDate: "2020-06-20",
    probationEndDate: null,
    iban: "TR55 0006 1005 1978 6457 8413 28",
    grossSalary: 65000,
  },
  {
    id: "4",
    name: "Can Ozturk",
    email: "can.ozturk@feyteknik.com",
    avatar: "",
    department: "Teknik Servis",
    position: "Elektrik Teknisyeni",
    status: "active",
    startDate: "2023-02-01",
    phone: "+90 (535) 456-7890",
    location: "Istanbul",
    tcKimlikNo: "45678901234",
    birthDate: "1995-07-19",
    bloodType: "AB+",
    emergencyContactName: "Zehra Ozturk",
    emergencyContactPhone: "+90 (535) 444-5566",
    educationLevel: "onlisans",
    militaryStatus: "yapildi",
    contractType: "belirli",
    contractEndDate: "2025-02-01",
    workType: "vardiyali",
    sgkStartDate: "2023-02-01",
    probationEndDate: "2023-04-01",
    iban: "TR66 0006 1005 1978 6457 8413 29",
    grossSalary: 32000,
  },
  {
    id: "5",
    name: "Zeynep Arslan",
    email: "zeynep.a@feyteknik.com",
    avatar: "",
    department: "IK",
    position: "IK Uzmani",
    status: "active",
    startDate: "2021-09-15",
    phone: "+90 (536) 567-8901",
    location: "Antalya",
    tcKimlikNo: "56789012345",
    birthDate: "1992-12-01",
    bloodType: "A-",
    emergencyContactName: "Kemal Arslan",
    emergencyContactPhone: "+90 (536) 555-6677",
    educationLevel: "lisans",
    militaryStatus: "muaf",
    contractType: "belirsiz",
    contractEndDate: null,
    workType: "tam-zamanli",
    sgkStartDate: "2021-09-15",
    probationEndDate: null,
    iban: "TR77 0006 1005 1978 6457 8413 30",
    grossSalary: 42000,
  },
  {
    id: "6",
    name: "Burak Celik",
    email: "burak.c@feyteknik.com",
    avatar: "",
    department: "Finans",
    position: "Finans Analisti",
    status: "active",
    startDate: "2022-04-01",
    phone: "+90 (537) 678-9012",
    location: "Bursa",
    tcKimlikNo: "67890123456",
    birthDate: "1991-09-14",
    bloodType: "B-",
    emergencyContactName: "Aylin Celik",
    emergencyContactPhone: "+90 (537) 666-7788",
    educationLevel: "yukseklisans",
    militaryStatus: "yapildi",
    contractType: "belirsiz",
    contractEndDate: null,
    workType: "tam-zamanli",
    sgkStartDate: "2022-04-01",
    probationEndDate: null,
    iban: "TR88 0006 1005 1978 6457 8413 31",
    grossSalary: 48000,
  },
  {
    id: "7",
    name: "Selin Sahin",
    email: "selin.s@feyteknik.com",
    avatar: "",
    department: "Musteri Hizmetleri",
    position: "Musteri Iliskileri Muduru",
    status: "remote",
    startDate: "2020-11-10",
    phone: "+90 (538) 789-0123",
    location: "Ankara",
    tcKimlikNo: "78901234567",
    birthDate: "1987-04-25",
    bloodType: "0-",
    emergencyContactName: "Hakan Sahin",
    emergencyContactPhone: "+90 (538) 777-8899",
    educationLevel: "lisans",
    militaryStatus: "muaf",
    contractType: "belirsiz",
    contractEndDate: null,
    workType: "uzaktan",
    sgkStartDate: "2020-11-10",
    probationEndDate: null,
    iban: "TR99 0006 1005 1978 6457 8413 32",
    grossSalary: 55000,
  },
  {
    id: "8",
    name: "Emre Yildiz",
    email: "emre.y@feyteknik.com",
    avatar: "",
    department: "Teknik Servis",
    position: "Stajyer Teknisyen",
    status: "active",
    startDate: "2023-06-15",
    phone: "+90 (539) 890-1234",
    location: "Istanbul",
    tcKimlikNo: "89012345678",
    birthDate: "2000-02-10",
    bloodType: "AB-",
    emergencyContactName: "Deniz Yildiz",
    emergencyContactPhone: "+90 (539) 888-9900",
    educationLevel: "onlisans",
    militaryStatus: "tecilli",
    contractType: "staj",
    contractEndDate: "2024-06-15",
    workType: "tam-zamanli",
    sgkStartDate: "2023-06-15",
    probationEndDate: "2023-08-15",
    iban: "TR10 0006 1005 1978 6457 8413 33",
    grossSalary: 17002,
  },
]

export const leaveRequests: LeaveRequest[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    type: "vacation",
    startDate: "2026-04-20",
    endDate: "2026-04-27",
    status: "pending",
    reason: "Aile tatili",
    submittedAt: "2026-04-10",
  },
  {
    id: "2",
    employeeId: "4",
    employeeName: "Can Ozturk",
    employeeAvatar: "",
    type: "sick",
    startDate: "2026-04-15",
    endDate: "2026-04-16",
    status: "pending",
    reason: "Doktor randevusu ve dinlenme",
    submittedAt: "2026-04-14",
  },
  {
    id: "3",
    employeeId: "6",
    employeeName: "Burak Celik",
    employeeAvatar: "",
    type: "excuse",
    startDate: "2026-04-22",
    endDate: "2026-04-22",
    status: "pending",
    reason: "Kisisel isler",
    submittedAt: "2026-04-12",
  },
  {
    id: "4",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    employeeAvatar: "",
    type: "vacation",
    startDate: "2026-03-01",
    endDate: "2026-03-05",
    status: "approved",
    reason: "Bahar tatili",
    submittedAt: "2026-02-15",
  },
  {
    id: "5",
    employeeId: "7",
    employeeName: "Selin Sahin",
    employeeAvatar: "",
    type: "sick",
    startDate: "2026-03-10",
    endDate: "2026-03-11",
    status: "approved",
    reason: "Grip iyilesmesi",
    submittedAt: "2026-03-10",
  },
  {
    id: "6",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    employeeAvatar: "",
    type: "vacation",
    startDate: "2026-02-14",
    endDate: "2026-02-14",
    status: "rejected",
    reason: "Sevgililer gunu izni",
    rejectionReason: "Yogun is donemi nedeniyle uygun degil",
    submittedAt: "2026-02-01",
  },
]

export const leaveBalances: LeaveBalance[] = [
  { employeeId: "1", vacation: 14, sick: 10, excuse: 5, unpaid: 30, usedVacation: 3, usedSick: 1, usedExcuse: 0, usedUnpaid: 0 },
  { employeeId: "2", vacation: 14, sick: 10, excuse: 5, unpaid: 30, usedVacation: 5, usedSick: 0, usedExcuse: 2, usedUnpaid: 0 },
  { employeeId: "3", vacation: 20, sick: 10, excuse: 5, unpaid: 30, usedVacation: 10, usedSick: 2, usedExcuse: 1, usedUnpaid: 5 },
  { employeeId: "4", vacation: 14, sick: 10, excuse: 5, unpaid: 30, usedVacation: 0, usedSick: 2, usedExcuse: 0, usedUnpaid: 0 },
  { employeeId: "5", vacation: 14, sick: 10, excuse: 5, unpaid: 30, usedVacation: 1, usedSick: 0, usedExcuse: 1, usedUnpaid: 0 },
  { employeeId: "6", vacation: 14, sick: 10, excuse: 5, unpaid: 30, usedVacation: 2, usedSick: 1, usedExcuse: 0, usedUnpaid: 0 },
  { employeeId: "7", vacation: 20, sick: 10, excuse: 5, unpaid: 30, usedVacation: 8, usedSick: 2, usedExcuse: 0, usedUnpaid: 0 },
  { employeeId: "8", vacation: 14, sick: 10, excuse: 5, unpaid: 30, usedVacation: 0, usedSick: 0, usedExcuse: 0, usedUnpaid: 0 },
]

export const assets: Asset[] = [
  {
    id: "1",
    name: "MacBook Pro 16\"",
    category: "laptop",
    serialNumber: "MBP-2024-001",
    assignedTo: "1",
    assignedToName: "Ayse Yilmaz",
    assignmentDate: "2024-01-20",
    condition: "iyi",
    conditionNotes: "Hafif kullanim izleri mevcut",
    status: "zimmetli",
    purchaseDate: "2024-01-15",
    value: 62000,
    digitalSignature: "imza_ayse_yilmaz_2024",
  },
  {
    id: "2",
    name: "MacBook Pro 14\"",
    category: "laptop",
    serialNumber: "MBP-2024-002",
    assignedTo: "4",
    assignedToName: "Can Ozturk",
    assignmentDate: "2024-02-05",
    condition: "yeni",
    conditionNotes: null,
    status: "zimmetli",
    purchaseDate: "2024-02-01",
    value: 49000,
    digitalSignature: "imza_can_ozturk_2024",
  },
  {
    id: "3",
    name: "iPhone 15 Pro",
    category: "telefon",
    serialNumber: "IP15-2024-001",
    assignedTo: "2",
    assignedToName: "Mehmet Kaya",
    assignmentDate: "2023-11-10",
    condition: "iyi",
    conditionNotes: null,
    status: "zimmetli",
    purchaseDate: "2023-11-01",
    value: 29000,
    digitalSignature: "imza_mehmet_kaya_2023",
  },
  {
    id: "4",
    name: "Samsung Galaxy S24",
    category: "telefon",
    serialNumber: "SGS24-2024-001",
    assignedTo: null,
    assignedToName: null,
    assignmentDate: null,
    condition: "yeni",
    conditionNotes: null,
    status: "musait",
    purchaseDate: "2024-03-01",
    value: 24000,
    digitalSignature: null,
  },
  {
    id: "5",
    name: "Ford Transit Servis Araci",
    category: "arac",
    serialNumber: "34-FT-2024",
    assignedTo: "1",
    assignedToName: "Ayse Yilmaz",
    assignmentDate: "2024-02-01",
    condition: "iyi",
    conditionNotes: "Haftalik bakim yapilmakta",
    status: "zimmetli",
    purchaseDate: "2024-01-01",
    value: 850000,
    digitalSignature: "imza_ayse_yilmaz_arac_2024",
  },
  {
    id: "6",
    name: "Fiat Doblo Servis Araci",
    category: "arac",
    serialNumber: "34-FD-2023",
    assignedTo: null,
    assignedToName: null,
    assignmentDate: null,
    condition: "orta",
    conditionNotes: "Motor bakimi gerekiyor",
    status: "bakimda",
    purchaseDate: "2023-06-01",
    value: 420000,
    digitalSignature: null,
  },
  {
    id: "7",
    name: "Bosch Elektrik Takim Seti",
    category: "ekipman",
    serialNumber: "BSH-ETS-001",
    assignedTo: "4",
    assignedToName: "Can Ozturk",
    assignmentDate: "2023-03-01",
    condition: "iyi",
    conditionNotes: null,
    status: "zimmetli",
    purchaseDate: "2023-02-15",
    value: 8500,
    digitalSignature: "imza_can_ozturk_ekipman_2023",
  },
  {
    id: "8",
    name: "Multimetre Profesyonel",
    category: "ekipman",
    serialNumber: "MLT-PRO-002",
    assignedTo: null,
    assignedToName: null,
    assignmentDate: null,
    condition: "yeni",
    conditionNotes: null,
    status: "musait",
    purchaseDate: "2024-01-20",
    value: 3200,
    digitalSignature: null,
  },
  {
    id: "9",
    name: "Teknisyen Formasi (M)",
    category: "forma",
    serialNumber: "FRM-M-001",
    assignedTo: "8",
    assignedToName: "Emre Yildiz",
    assignmentDate: "2023-06-20",
    condition: "iyi",
    conditionNotes: null,
    status: "zimmetli",
    purchaseDate: "2023-06-15",
    value: 450,
    digitalSignature: "imza_emre_yildiz_forma_2023",
  },
  {
    id: "10",
    name: "Teknisyen Formasi (L)",
    category: "forma",
    serialNumber: "FRM-L-002",
    assignedTo: "4",
    assignedToName: "Can Ozturk",
    assignmentDate: "2023-02-05",
    condition: "orta",
    conditionNotes: "Yikama sonrasi hafif solma",
    status: "zimmetli",
    purchaseDate: "2023-02-01",
    value: 450,
    digitalSignature: "imza_can_ozturk_forma_2023",
  },
  {
    id: "11",
    name: "iPad Pro 12.9\"",
    category: "tablet",
    serialNumber: "IPAD-PRO-001",
    assignedTo: "3",
    assignedToName: "Elif Demir",
    assignmentDate: "2024-01-10",
    condition: "yeni",
    conditionNotes: null,
    status: "zimmetli",
    purchaseDate: "2024-01-05",
    value: 35000,
    digitalSignature: "imza_elif_demir_tablet_2024",
  },
  {
    id: "12",
    name: "Samsung Galaxy Tab S9",
    category: "tablet",
    serialNumber: "SGT-S9-002",
    assignedTo: null,
    assignedToName: null,
    assignmentDate: null,
    condition: "yeni",
    conditionNotes: null,
    status: "musait",
    purchaseDate: "2024-02-20",
    value: 22000,
    digitalSignature: null,
  },
  {
    id: "13",
    name: "Guvenlik Kemeri Seti",
    category: "ekipman",
    serialNumber: "GKS-001",
    assignedTo: null,
    assignedToName: null,
    assignmentDate: null,
    condition: "iyi",
    conditionNotes: "Kayip bildirimi yapildi - 12.03.2024",
    status: "kayip",
    purchaseDate: "2023-05-01",
    value: 2800,
    digitalSignature: null,
  },
  {
    id: "14",
    name: "Portatif Isik Seti",
    category: "diger",
    serialNumber: "PIS-001",
    assignedTo: "1",
    assignedToName: "Ayse Yilmaz",
    assignmentDate: "2024-03-01",
    condition: "yeni",
    conditionNotes: null,
    status: "zimmetli",
    purchaseDate: "2024-02-28",
    value: 1500,
    digitalSignature: "imza_ayse_yilmaz_diger_2024",
  },
]

export const disciplineRecords: DisciplineRecord[] = [
  {
    id: "1",
    employeeId: "4",
    employeeName: "Can Ozturk",
    violationType: "devamsizlik",
    date: "2026-03-15",
    description: "3 gun ust uste mazeretsiz ise gelmedi. Telefonla ulasilamadi.",
    severity: "ihtar",
    witnessName: "Elif Demir",
    documentUrl: null,
    employeeSignature: "imza_can_ozturk_disiplin_2026",
    signatureStatus: "imzaladi",
    createdAt: "2026-03-18",
  },
  {
    id: "2",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    violationType: "is-kurallari",
    date: "2026-04-01",
    description: "Guvenlik ekipmanlari kullanmadan calisti. Ilk uyari.",
    severity: "uyari",
    witnessName: "Ayse Yilmaz",
    documentUrl: null,
    employeeSignature: null,
    signatureStatus: "bekliyor",
    createdAt: "2026-04-02",
  },
  {
    id: "3",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    violationType: "performans",
    date: "2026-02-20",
    description: "Hedeflenen satis rakamlarina 3 ay ust uste ulasilamadi.",
    severity: "uyari",
    witnessName: null,
    documentUrl: null,
    employeeSignature: "imza_mehmet_kaya_disiplin_2026",
    signatureStatus: "imzaladi",
    createdAt: "2026-02-22",
  },
  {
    id: "4",
    employeeId: "4",
    employeeName: "Can Ozturk",
    violationType: "davranis",
    date: "2026-01-10",
    description: "Is arkadasina karsi uygunsuz davranis. Sozlu uyari verildi.",
    severity: "uyari",
    witnessName: "Burak Celik",
    documentUrl: null,
    employeeSignature: "imza_can_ozturk_disiplin_ocak_2026",
    signatureStatus: "imzaladi",
    createdAt: "2026-01-12",
  },
]

export const documentRecords: DocumentRecord[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    documentType: "ehliyet",
    documentNumber: "B-12345678",
    issueDate: "2020-05-15",
    expiryDate: "2030-05-15",
    fileUrl: null,
    reminderDays: 90,
    createdAt: "2021-03-15",
  },
  {
    id: "2",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    documentType: "src-belgesi",
    documentNumber: "SRC-2023-001",
    issueDate: "2023-01-10",
    expiryDate: "2026-04-20",
    fileUrl: null,
    reminderDays: 30,
    createdAt: "2023-01-15",
  },
  {
    id: "3",
    employeeId: "4",
    employeeName: "Can Ozturk",
    documentType: "isg-sertifikasi",
    documentNumber: "ISG-2024-0045",
    issueDate: "2024-02-01",
    expiryDate: "2026-02-01",
    fileUrl: null,
    reminderDays: 90,
    createdAt: "2024-02-05",
  },
  {
    id: "4",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    documentType: "saglik-raporu",
    documentNumber: "SR-2026-0012",
    issueDate: "2026-01-15",
    expiryDate: "2026-04-15",
    fileUrl: null,
    reminderDays: 7,
    createdAt: "2026-01-20",
  },
  {
    id: "5",
    employeeId: "3",
    employeeName: "Elif Demir",
    documentType: "pasaport",
    documentNumber: "U12345678",
    issueDate: "2022-08-10",
    expiryDate: "2032-08-10",
    fileUrl: null,
    reminderDays: 90,
    createdAt: "2022-08-15",
  },
  {
    id: "6",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    documentType: "sgk-belgesi",
    documentNumber: "SGK-2026-0089",
    issueDate: "2026-04-01",
    expiryDate: "2026-04-22",
    fileUrl: null,
    reminderDays: 7,
    createdAt: "2026-04-02",
  },
  {
    id: "7",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    documentType: "isg-sertifikasi",
    documentNumber: "ISG-2023-0112",
    issueDate: "2023-09-20",
    expiryDate: "2025-09-20",
    fileUrl: null,
    reminderDays: 90,
    createdAt: "2023-09-25",
  },
  {
    id: "8",
    employeeId: "6",
    employeeName: "Burak Celik",
    documentType: "ehliyet",
    documentNumber: "B-87654321",
    issueDate: "2018-03-10",
    expiryDate: "2028-03-10",
    fileUrl: null,
    reminderDays: 90,
    createdAt: "2022-04-01",
  },
  {
    id: "9",
    employeeId: "7",
    employeeName: "Selin Sahin",
    documentType: "saglik-raporu",
    documentNumber: "SR-2025-0088",
    issueDate: "2025-11-01",
    expiryDate: "2026-05-01",
    fileUrl: null,
    reminderDays: 30,
    createdAt: "2025-11-05",
  },
  {
    id: "10",
    employeeId: "4",
    employeeName: "Can Ozturk",
    documentType: "ehliyet",
    documentNumber: "B-11223344",
    issueDate: "2019-07-20",
    expiryDate: "2029-07-20",
    fileUrl: null,
    reminderDays: 90,
    createdAt: "2023-02-01",
  },
]

export const onboardingProcesses: OnboardingProcess[] = [
  {
    id: "ob-1",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    employeeAvatar: "",
    department: "Teknik Servis",
    position: "Teknisyen",
    startDate: "2026-04-01",
    targetCompletionDate: "2026-04-15",
    status: "devam-ediyor",
    createdAt: "2026-03-28",
    steps: [
      { id: "sgk-bildirimi", title: "SGK Bildirimi", responsiblePerson: "IK Departmani", dueDate: "2026-04-01", completed: true, completedAt: "2026-04-01", notes: "Bildirim tamamlandi" },
      { id: "sozlesme-imzalama", title: "Sozlesme Imzalama", responsiblePerson: "IK Departmani", dueDate: "2026-04-02", completed: true, completedAt: "2026-04-02", notes: "Belirsiz sureli sozlesme" },
      { id: "kimlik-fotokopisi", title: "Kimlik Fotokopisi Alma", responsiblePerson: "IK Departmani", dueDate: "2026-04-02", completed: true, completedAt: "2026-04-02", notes: "" },
      { id: "sistem-hesabi", title: "Sistem Hesabi Acma", responsiblePerson: "IT Departmani", dueDate: "2026-04-03", completed: true, completedAt: "2026-04-03", notes: "Email ve CRM erisimi verildi" },
      { id: "ekipman-zimmet", title: "Ekipman Zimmet Teslimi", responsiblePerson: "IT Departmani", dueDate: "2026-04-05", completed: true, completedAt: "2026-04-05", notes: "Forma ve kulaklik teslim edildi" },
      { id: "oryantasyon", title: "Oryantasyon Egitimi", responsiblePerson: "IK Departmani", dueDate: "2026-04-10", completed: false, completedAt: null, notes: "" },
      { id: "departman-tanitim", title: "Departman Tanitimi", responsiblePerson: "Ayse Yilmaz", dueDate: "2026-04-12", completed: false, completedAt: null, notes: "" },
      { id: "gorev-tanimi", title: "Gorev Tanimi Verilmesi", responsiblePerson: "Ayse Yilmaz", dueDate: "2026-04-15", completed: false, completedAt: null, notes: "" },
    ],
  },
  {
    id: "ob-2",
    employeeId: "3",
    employeeName: "Elif Demir",
    employeeAvatar: "",
    department: "Operasyon",
    position: "Operasyon Uzmani",
    startDate: "2026-03-15",
    targetCompletionDate: "2026-03-30",
    status: "gecikti",
    createdAt: "2026-03-10",
    steps: [
      { id: "sgk-bildirimi", title: "SGK Bildirimi", responsiblePerson: "IK Departmani", dueDate: "2026-03-15", completed: true, completedAt: "2026-03-15", notes: "" },
      { id: "sozlesme-imzalama", title: "Sozlesme Imzalama", responsiblePerson: "IK Departmani", dueDate: "2026-03-16", completed: true, completedAt: "2026-03-16", notes: "" },
      { id: "kimlik-fotokopisi", title: "Kimlik Fotokopisi Alma", responsiblePerson: "IK Departmani", dueDate: "2026-03-16", completed: true, completedAt: "2026-03-16", notes: "" },
      { id: "sistem-hesabi", title: "Sistem Hesabi Acma", responsiblePerson: "IT Departmani", dueDate: "2026-03-17", completed: true, completedAt: "2026-03-18", notes: "1 gun gecikmeyle tamamlandi" },
      { id: "ekipman-zimmet", title: "Ekipman Zimmet Teslimi", responsiblePerson: "IT Departmani", dueDate: "2026-03-20", completed: true, completedAt: "2026-03-22", notes: "Tablet stokta yoktu" },
      { id: "oryantasyon", title: "Oryantasyon Egitimi", responsiblePerson: "IK Departmani", dueDate: "2026-03-25", completed: true, completedAt: "2026-03-26", notes: "" },
      { id: "departman-tanitim", title: "Departman Tanitimi", responsiblePerson: "Departman Yoneticisi", dueDate: "2026-03-28", completed: false, completedAt: null, notes: "Yonetici mazeretli" },
      { id: "gorev-tanimi", title: "Gorev Tanimi Verilmesi", responsiblePerson: "Departman Yoneticisi", dueDate: "2026-03-30", completed: false, completedAt: null, notes: "" },
    ],
  },
  {
    id: "ob-3",
    employeeId: "6",
    employeeName: "Burak Celik",
    employeeAvatar: "",
    department: "Satis",
    position: "Satis Temsilcisi",
    startDate: "2026-02-01",
    targetCompletionDate: "2026-02-15",
    status: "tamamlandi",
    createdAt: "2026-01-28",
    steps: [
      { id: "sgk-bildirimi", title: "SGK Bildirimi", responsiblePerson: "IK Departmani", dueDate: "2026-02-01", completed: true, completedAt: "2026-02-01", notes: "" },
      { id: "sozlesme-imzalama", title: "Sozlesme Imzalama", responsiblePerson: "IK Departmani", dueDate: "2026-02-01", completed: true, completedAt: "2026-02-01", notes: "" },
      { id: "kimlik-fotokopisi", title: "Kimlik Fotokopisi Alma", responsiblePerson: "IK Departmani", dueDate: "2026-02-01", completed: true, completedAt: "2026-02-01", notes: "" },
      { id: "sistem-hesabi", title: "Sistem Hesabi Acma", responsiblePerson: "IT Departmani", dueDate: "2026-02-03", completed: true, completedAt: "2026-02-03", notes: "CRM egitimi dahil" },
      { id: "ekipman-zimmet", title: "Ekipman Zimmet Teslimi", responsiblePerson: "IT Departmani", dueDate: "2026-02-05", completed: true, completedAt: "2026-02-05", notes: "" },
      { id: "oryantasyon", title: "Oryantasyon Egitimi", responsiblePerson: "IK Departmani", dueDate: "2026-02-08", completed: true, completedAt: "2026-02-08", notes: "" },
      { id: "departman-tanitim", title: "Departman Tanitimi", responsiblePerson: "Departman Yoneticisi", dueDate: "2026-02-10", completed: true, completedAt: "2026-02-10", notes: "" },
      { id: "gorev-tanimi", title: "Gorev Tanimi Verilmesi", responsiblePerson: "Departman Yoneticisi", dueDate: "2026-02-15", completed: true, completedAt: "2026-02-14", notes: "Hedefler belirlendi" },
    ],
  },
]

export const offboardingProcesses: OffboardingProcess[] = [
  {
    id: "off-1",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    employeeAvatar: "",
    department: "Pazarlama",
    position: "Pazarlama Uzmani",
    terminationDate: "2026-04-30",
    targetCompletionDate: "2026-05-05",
    reason: "istifa",
    status: "devam-ediyor",
    createdAt: "2026-04-05",
    steps: [
      { id: "zimmet-iade", title: "Zimmet Iade", responsiblePerson: "IT Departmani", dueDate: "2026-04-30", completed: true, completedAt: "2026-04-30", notes: "Laptop ve telefon iade alindi" },
      { id: "sistem-hesabi-kapatma", title: "Sistem Hesabi Kapatma", responsiblePerson: "IT Departmani", dueDate: "2026-04-30", completed: false, completedAt: null, notes: "" },
      { id: "sgk-cikis", title: "SGK Cikis", responsiblePerson: "IK Departmani", dueDate: "2026-05-02", completed: false, completedAt: null, notes: "" },
      { id: "cikis-mulakati", title: "Cikis Mulakati", responsiblePerson: "Ahmet Yilmaz", dueDate: "2026-04-28", completed: true, completedAt: "2026-04-28", notes: "Calisan memnuniyet formu dolduruldu" },
      { id: "son-maas", title: "Son Maas Hesabi", responsiblePerson: "Finans Departmani", dueDate: "2026-05-05", completed: false, completedAt: null, notes: "Kidem ve ihbar tazminati hesaplanacak" },
    ],
  },
  {
    id: "off-2",
    employeeId: "7",
    employeeName: "Selin Sahin",
    employeeAvatar: "",
    department: "Finans",
    position: "Finans Analisti",
    terminationDate: "2026-01-31",
    targetCompletionDate: "2026-02-07",
    reason: "sozlesme-bitimi",
    status: "tamamlandi",
    createdAt: "2026-01-15",
    steps: [
      { id: "zimmet-iade", title: "Zimmet Iade", responsiblePerson: "IT Departmani", dueDate: "2026-01-31", completed: true, completedAt: "2026-01-31", notes: "" },
      { id: "sistem-hesabi-kapatma", title: "Sistem Hesabi Kapatma", responsiblePerson: "IT Departmani", dueDate: "2026-01-31", completed: true, completedAt: "2026-01-31", notes: "" },
      { id: "sgk-cikis", title: "SGK Cikis", responsiblePerson: "IK Departmani", dueDate: "2026-02-02", completed: true, completedAt: "2026-02-02", notes: "" },
      { id: "cikis-mulakati", title: "Cikis Mulakati", responsiblePerson: "Ahmet Yilmaz", dueDate: "2026-01-30", completed: true, completedAt: "2026-01-30", notes: "" },
      { id: "son-maas", title: "Son Maas Hesabi", responsiblePerson: "Finans Departmani", dueDate: "2026-02-07", completed: true, completedAt: "2026-02-05", notes: "Odemeler tamamlandi" },
    ],
  },
]

export const departments = [
  "Tum Departmanlar",
  "Teknik Servis",
  "Satis",
  "Operasyon",
  "IK",
  "Finans",
  "Musteri Hizmetleri",
]

export const statuses = ["Tum Durumlar", "active", "on-leave", "remote"]

// Helper functions for labels
export function getEducationLabel(level: Employee["educationLevel"]): string {
  const labels: Record<Employee["educationLevel"], string> = {
    ilkokul: "Ilkokul",
    ortaokul: "Ortaokul",
    lise: "Lise",
    onlisans: "On Lisans",
    lisans: "Lisans",
    yukseklisans: "Yuksek Lisans",
    doktora: "Doktora",
  }
  return labels[level]
}

export function getMilitaryLabel(status: Employee["militaryStatus"]): string {
  const labels: Record<Employee["militaryStatus"], string> = {
    yapildi: "Yapildi",
    muaf: "Muaf",
    tecilli: "Tecilli",
    yapilmadi: "Yapilmadi",
  }
  return labels[status]
}

export function getContractTypeLabel(type: Employee["contractType"]): string {
  const labels: Record<Employee["contractType"], string> = {
    belirsiz: "Belirsiz Sureli",
    belirli: "Belirli Sureli",
    staj: "Staj",
  }
  return labels[type]
}

export function getWorkTypeLabel(type: Employee["workType"]): string {
  const labels: Record<Employee["workType"], string> = {
    "tam-zamanli": "Tam Zamanli",
    vardiyali: "Vardiyali",
    saha: "Saha",
    uzaktan: "Uzaktan",
  }
  return labels[type]
}

export function getAssetCategoryLabel(category: Asset["category"]): string {
  const labels: Record<Asset["category"], string> = {
  telefon: "Telefon",
  laptop: "Laptop",
  arac: "Arac",
  ekipman: "Ekipman",
  forma: "Forma",
  tablet: "Tablet",
  monitor: "Monitor",
  diger: "Diger",
  }
  return labels[category]
}

export function getAssetStatusLabel(status: Asset["status"]): string {
  const labels: Record<Asset["status"], string> = {
    zimmetli: "Zimmetli",
    musait: "Musait",
    bakimda: "Bakimda",
    kayip: "Kayip",
  }
  return labels[status]
}

export function getAssetConditionLabel(condition: Asset["condition"]): string {
  const labels: Record<Asset["condition"], string> = {
    yeni: "Yeni",
    iyi: "Iyi",
    orta: "Orta",
    yipranmis: "Yipranmis",
  }
  return labels[condition]
}

export function getViolationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    devamsizlik: "Devamsizlik",
    "is-kurallari": "Is Kurallari Ihlali",
    performans: "Performans",
    davranis: "Davranis",
    diger: "Diger",
  }
  return labels[type] ?? type
}

export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    uyari: "Uyari",
    ihtar: "Ihtar",
    fesih: "Fesih",
    beraat: "Beraat",
  }
  return labels[severity] ?? severity
}

export function getOnboardingStatusLabel(status: OnboardingProcess["status"]): string {
  const labels: Record<OnboardingProcess["status"], string> = {
    "devam-ediyor": "Devam Ediyor",
    tamamlandi: "Tamamlandi",
    gecikti: "Gecikti",
  }
  return labels[status]
}

export function getOffboardingReasonLabel(reason: OffboardingProcess["reason"]): string {
  const labels: Record<OffboardingProcess["reason"], string> = {
    istifa: "Istifa",
    fesih: "Fesih",
    emeklilik: "Emeklilik",
    "sozlesme-bitimi": "Sozlesme Bitimi",
    diger: "Diger",
  }
  return labels[reason]
}

export function calculateProgress(steps: ChecklistStep[]): number {
  if (steps.length === 0) return 0
  const completed = steps.filter((s) => s.completed).length
  return Math.round((completed / steps.length) * 100)
}

export function computeProcessStatus(
  steps: ChecklistStep[],
  targetCompletionDate: string,
): OnboardingProcess["status"] {
  const allDone = steps.every((s) => s.completed)
  if (allDone) return "tamamlandi"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetCompletionDate)
  if (target < today) return "gecikti"
  const anyOverdue = steps.some((s) => {
    if (s.completed) return false
    const due = new Date(s.dueDate)
    return due < today
  })
  return anyOverdue ? "gecikti" : "devam-ediyor"
}

export function getDocumentTypeLabel(type: DocumentRecord["documentType"]): string {
  const labels: Record<DocumentRecord["documentType"], string> = {
    "sgk-belgesi": "SGK Belgesi",
    "saglik-raporu": "Saglik Raporu",
    ehliyet: "Ehliyet",
    "src-belgesi": "SRC Belgesi",
    "isg-sertifikasi": "ISG Sertifikasi",
    pasaport: "Pasaport",
    diger: "Diger",
  }
  return labels[type]
}

export function getTimesheetStatusLabel(status: TimesheetStatus): string {
  const labels: Record<TimesheetStatus, string> = {
    calisti: "Calisti",
    izin: "Izin",
    rapor: "Rapor",
    devamsiz: "Devamsiz",
    "resmi-tatil": "Resmi Tatil",
    "hafta-sonu": "Hafta Sonu",
  }
  return labels[status]
}

export function getTimesheetStatusShort(status: TimesheetStatus): string {
  const labels: Record<TimesheetStatus, string> = {
    calisti: "C",
    izin: "I",
    rapor: "R",
    devamsiz: "D",
    "resmi-tatil": "T",
    "hafta-sonu": "H",
  }
  return labels[status]
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0")
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-12
  return new Date(year, month, 0).getDate()
}

export function isHolidayDate(year: number, month: number, day: number): string | null {
  const key = `${pad2(month)}-${pad2(day)}`
  const found = turkishHolidays.find((h) => h.date === key)
  return found ? found.name : null
}

/**
 * Generate a default monthly timesheet for all employees.
 * - Weekends become hafta-sonu.
 * - Turkish fixed holidays become resmi-tatil.
 * - Active employees work; on-leave default to izin.
 * - A few deterministic absences/overtime are sprinkled for demo.
 */
export function generateMonthlyTimesheet(
  year: number,
  month: number,
  emps: Employee[],
): MonthlyTimesheet {
  const entries: TimesheetEntry[] = []
  const totalDays = daysInMonth(year, month)

  for (const emp of emps) {
    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month - 1, day)
      const dow = dateObj.getDay() // 0 Sun - 6 Sat
      const dateStr = `${year}-${pad2(month)}-${pad2(day)}`
      let status: TimesheetStatus = "calisti"
      let overtime = 0
      let note = ""

      if (dow === 0 || dow === 6) {
        status = "hafta-sonu"
      } else {
        const holidayName = isHolidayDate(year, month, day)
        if (holidayName) {
          status = "resmi-tatil"
          note = holidayName
        } else if (emp.status === "on-leave") {
          status = "izin"
        } else {
          // Deterministic demo variations
          const seed = (parseInt(emp.id, 10) * 31 + day * 7) % 37
          if (seed === 3) status = "rapor"
          else if (seed === 7) status = "devamsiz"
          else if (seed === 11 || seed === 19) status = "izin"
          else {
            status = "calisti"
            if (seed === 5) overtime = 2
            else if (seed === 13) overtime = 3
            else if (seed === 23) overtime = 1
          }
        }
      }

      entries.push({
        employeeId: emp.id,
        date: dateStr,
        status,
        overtimeHours: overtime,
        note,
      })
    }
  }

  return {
    year,
    month,
    entries,
    locked: false,
    lockedBy: null,
    lockedAt: null,
  }
}

export function countWorkingDaysInMonth(year: number, month: number): number {
  const total = daysInMonth(year, month)
  let count = 0
  for (let day = 1; day <= total; day++) {
    const dow = new Date(year, month - 1, day).getDay()
    const isWeekend = dow === 0 || dow === 6
    const isHoliday = isHolidayDate(year, month, day) !== null
    if (!isWeekend && !isHoliday) count++
  }
  return count
}

// -----------------------------
// Giris / Cikis (Check-in/out)
// -----------------------------

export interface GeoLocation {
  lat: number
  lng: number
  accuracy?: number | null
  label?: string | null
}

export interface CheckInOutRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  department: string
  date: string // YYYY-MM-DD
  checkInTime: string | null // HH:MM (24h)
  checkOutTime: string | null
  checkInLocation: GeoLocation | null
  checkOutLocation: GeoLocation | null
}

// Work schedule rules for late determination
export const WORK_START_TIME = "09:00"
export const LATE_GRACE_MINUTES = 5

// Demo current logged-in user
export const CURRENT_USER_ID = "1"

// Demo "today" anchor for seeded records. The component still uses real
// `new Date()` for the live clock, but the daily log rows are seeded against
// this date so the UI always has content in the demo.
export const DEMO_TODAY = "2026-04-16"

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function isTimeLate(checkInTime: string | null): boolean {
  if (!checkInTime) return false
  return toMinutes(checkInTime) > toMinutes(WORK_START_TIME) + LATE_GRACE_MINUTES
}

export function formatDurationBetween(
  checkIn: string | null,
  checkOut: string | null,
): string {
  if (!checkIn || !checkOut) return "-"
  const diff = toMinutes(checkOut) - toMinutes(checkIn)
  if (diff <= 0) return "-"
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return `${h} sa ${pad2(m)} dk`
}

export function buildMapsUrl(loc: GeoLocation | null): string | null {
  if (!loc) return null
  return `https://www.google.com/maps?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`
}

// Seed records for "today" in the demo. Coordinates are dispersed around
// Istanbul/Ankara service points for realism. These are the initial entries
// the component hydrates from; all user interactions are stored in React state.
export const initialCheckInOutRecords: CheckInOutRecord[] = [
  {
    id: "cio-1",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    employeeAvatar: "",
    department: "Satis",
    date: DEMO_TODAY,
    checkInTime: "09:23",
    checkOutTime: "18:15",
    checkInLocation: {
      lat: 41.0422,
      lng: 29.0094,
      accuracy: 12,
      label: "Besiktas Ofis",
    },
    checkOutLocation: {
      lat: 41.0422,
      lng: 29.0094,
      accuracy: 9,
      label: "Besiktas Ofis",
    },
  },
  {
    id: "cio-2",
    employeeId: "3",
    employeeName: "Elif Demir",
    employeeAvatar: "",
    department: "Operasyon",
    date: DEMO_TODAY,
    checkInTime: "08:30",
    checkOutTime: "17:45",
    checkInLocation: {
      lat: 41.0151,
      lng: 28.9795,
      accuracy: 15,
      label: "Merkez Ofis",
    },
    checkOutLocation: {
      lat: 41.0151,
      lng: 28.9795,
      accuracy: 11,
      label: "Merkez Ofis",
    },
  },
  {
    id: "cio-3",
    employeeId: "4",
    employeeName: "Can Ozturk",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: DEMO_TODAY,
    checkInTime: null,
    checkOutTime: null,
    checkInLocation: null,
    checkOutLocation: null,
  },
  {
    id: "cio-4",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    employeeAvatar: "",
    department: "Pazarlama",
    date: DEMO_TODAY,
    checkInTime: "09:12",
    checkOutTime: null,
    checkInLocation: {
      lat: 39.9208,
      lng: 32.8541,
      accuracy: 20,
      label: "Ankara Sube",
    },
    checkOutLocation: null,
  },
  {
    id: "cio-5",
    employeeId: "6",
    employeeName: "Burak Celik",
    employeeAvatar: "",
    department: "Satis",
    date: DEMO_TODAY,
    checkInTime: "08:55",
    checkOutTime: null,
    checkInLocation: {
      lat: 41.0422,
      lng: 29.0094,
      accuracy: 14,
      label: "Besiktas Ofis",
    },
    checkOutLocation: null,
  },
  {
    id: "cio-6",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: DEMO_TODAY,
    checkInTime: "09:40",
    checkOutTime: "18:30",
    checkInLocation: {
      lat: 40.9854,
      lng: 29.0272,
      accuracy: 18,
      label: "Kadikoy Saha",
    },
    checkOutLocation: {
      lat: 40.9854,
      lng: 29.0272,
      accuracy: 22,
      label: "Kadikoy Saha",
    },
  },
]

// -----------------------------
// Performance Reviews (Performans Degerlendirme)
// -----------------------------

export type ReviewQuarter = "Q1" | "Q2" | "Q3" | "Q4"
export type ReviewStatus = "taslak" | "tamamlandi" | "onaylandi"

export interface KpiScores {
  isKalitesi: number // 1-5
  verimlilik: number
  takimCalismasi: number
  musteriMemnuniyeti: number
  devamDurumu: number
}

export interface PerformanceReview {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  department: string
  position: string
  period: ReviewQuarter
  year: number
  reviewerId: string
  reviewerName: string
  kpiScores: KpiScores
  selfScores: KpiScores | null
  reviewerNotes: string
  selfNotes: string
  status: ReviewStatus
  createdDate: string // YYYY-MM-DD
  completedDate: string | null
  approvedDate: string | null
}

export const KPI_CATEGORIES: {
  key: keyof KpiScores
  label: string
  description: string
}[] = [
  {
    key: "isKalitesi",
    label: "Is Kalitesi",
    description: "Gorev ve ciktilarin standartlara uygunlugu, detay ve dogruluk.",
  },
  {
    key: "verimlilik",
    label: "Verimlilik",
    description: "Zamanin etkin kullanimi, is tamamlama hizi ve oncelik yonetimi.",
  },
  {
    key: "takimCalismasi",
    label: "Takim Calismasi",
    description: "Isbirligi, iletisim ve ekip icindeki destek.",
  },
  {
    key: "musteriMemnuniyeti",
    label: "Musteri Memnuniyeti",
    description: "Ic/dis musterilerle iletisim, cozum sunma ve geri bildirim.",
  },
  {
    key: "devamDurumu",
    label: "Devam Durumu",
    description: "Isyeri devamliligi, dakik olma ve gec kalma / devamsizlik orani.",
  },
]

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  taslak: "Taslak",
  tamamlandi: "Tamamlandi",
  onaylandi: "Onaylandi",
}

export function calcOverallScore(kpi: KpiScores): number {
  const values = [
    kpi.isKalitesi,
    kpi.verimlilik,
    kpi.takimCalismasi,
    kpi.musteriMemnuniyeti,
    kpi.devamDurumu,
  ]
  const sum = values.reduce((a, b) => a + b, 0)
  // Round to one decimal.
  return Math.round((sum / values.length) * 10) / 10
}

export function periodLabel(p: ReviewQuarter, year: number): string {
  return `${p} ${year}`
}

export function periodSortValue(p: ReviewQuarter, year: number): number {
  const q = Number(p.slice(1)) // 1..4
  return year * 10 + q
}

// Deterministic seed so tables stay stable across renders.
export const performanceReviews: PerformanceReview[] = [
  {
    id: "pr-1",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    department: "Teknik Servis",
    position: "Kidemli Teknisyen",
    period: "Q1",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 4,
      verimlilik: 4,
      takimCalismasi: 5,
      musteriMemnuniyeti: 4,
      devamDurumu: 5,
    },
    selfScores: {
      isKalitesi: 4,
      verimlilik: 5,
      takimCalismasi: 5,
      musteriMemnuniyeti: 4,
      devamDurumu: 5,
    },
    reviewerNotes:
      "Saha operasyonlarinda guclu teknik bilgi ve ekip uyumu sergiledi. Oncelik yonetiminde kucuk iyilestirmeler ise verimliligi artirabilir.",
    selfNotes:
      "Yeni ekip uyelerine mentorluk yaptim. Bir sonraki ceyrekte sertifikasyonumu tamamlamak istiyorum.",
    status: "onaylandi",
    createdDate: "2025-04-05",
    completedDate: "2025-04-18",
    approvedDate: "2025-04-22",
  },
  {
    id: "pr-2",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    department: "Teknik Servis",
    position: "Kidemli Teknisyen",
    period: "Q2",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 5,
      verimlilik: 4,
      takimCalismasi: 5,
      musteriMemnuniyeti: 5,
      devamDurumu: 5,
    },
    selfScores: {
      isKalitesi: 5,
      verimlilik: 4,
      takimCalismasi: 5,
      musteriMemnuniyeti: 5,
      devamDurumu: 5,
    },
    reviewerNotes:
      "Musteri memnuniyeti skoru belirgin sekilde yukseldi, zor vakalari proaktif sekilde yonetti.",
    selfNotes:
      "Ekip icindeki bilgi paylasimini artirdim, yeni bir bakim sureci onerdim.",
    status: "onaylandi",
    createdDate: "2025-07-05",
    completedDate: "2025-07-15",
    approvedDate: "2025-07-19",
  },
  {
    id: "pr-3",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    department: "Teknik Servis",
    position: "Kidemli Teknisyen",
    period: "Q3",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 5,
      verimlilik: 5,
      takimCalismasi: 5,
      musteriMemnuniyeti: 5,
      devamDurumu: 4,
    },
    selfScores: null,
    reviewerNotes:
      "Uc aylik hedeflerin tamamini asti. Bir tam gun raporlu izin disinda devam durumu kusursuz.",
    selfNotes: "",
    status: "tamamlandi",
    createdDate: "2025-10-02",
    completedDate: "2025-10-12",
    approvedDate: null,
  },
  {
    id: "pr-4",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    employeeAvatar: "",
    department: "Satis",
    position: "Satis Temsilcisi",
    period: "Q2",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 4,
      verimlilik: 5,
      takimCalismasi: 4,
      musteriMemnuniyeti: 5,
      devamDurumu: 3,
    },
    selfScores: {
      isKalitesi: 4,
      verimlilik: 5,
      takimCalismasi: 4,
      musteriMemnuniyeti: 5,
      devamDurumu: 4,
    },
    reviewerNotes:
      "Satis hedeflerini astı. Sabah toplantilarina gec katilim devamliligi dusurdu.",
    selfNotes:
      "Evden calisirken farkli bir mesai duzeninde daha verimli oldugumu fark ettim.",
    status: "onaylandi",
    createdDate: "2025-07-06",
    completedDate: "2025-07-20",
    approvedDate: "2025-07-25",
  },
  {
    id: "pr-5",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    employeeAvatar: "",
    department: "Satis",
    position: "Satis Temsilcisi",
    period: "Q3",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 4,
      verimlilik: 5,
      takimCalismasi: 4,
      musteriMemnuniyeti: 5,
      devamDurumu: 4,
    },
    selfScores: {
      isKalitesi: 5,
      verimlilik: 5,
      takimCalismasi: 4,
      musteriMemnuniyeti: 5,
      devamDurumu: 5,
    },
    reviewerNotes:
      "Devam durumunda iyilesme. Yeni musteri portfoyu kazaniminda lider konumda.",
    selfNotes:
      "Hedeflerimin uzerinde satis yaptim ve iki buyuk anlasma imzaladim.",
    status: "tamamlandi",
    createdDate: "2025-10-03",
    completedDate: "2025-10-14",
    approvedDate: null,
  },
  {
    id: "pr-6",
    employeeId: "3",
    employeeName: "Elif Demir",
    employeeAvatar: "",
    department: "Operasyon",
    position: "Operasyon Uzmani",
    period: "Q3",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 5,
      verimlilik: 5,
      takimCalismasi: 5,
      musteriMemnuniyeti: 4,
      devamDurumu: 5,
    },
    selfScores: {
      isKalitesi: 5,
      verimlilik: 5,
      takimCalismasi: 5,
      musteriMemnuniyeti: 4,
      devamDurumu: 5,
    },
    reviewerNotes:
      "Operasyon sureclerinde otomasyon onerileri ciddi zaman kazandirdi.",
    selfNotes:
      "Vardiya planlamasinda yeni bir araç kullanmaya basladim, ekip verimligini artirdi.",
    status: "onaylandi",
    createdDate: "2025-10-02",
    completedDate: "2025-10-09",
    approvedDate: "2025-10-14",
  },
  {
    id: "pr-7",
    employeeId: "4",
    employeeName: "Can Ozturk",
    employeeAvatar: "",
    department: "Teknik Servis",
    position: "Teknisyen",
    period: "Q3",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 3,
      verimlilik: 3,
      takimCalismasi: 4,
      musteriMemnuniyeti: 4,
      devamDurumu: 3,
    },
    selfScores: null,
    reviewerNotes:
      "Saha egitimi ve sertifikasyon gerekli. Devam durumu iyilestirilmeli.",
    selfNotes: "",
    status: "taslak",
    createdDate: "2025-10-05",
    completedDate: null,
    approvedDate: null,
  },
  {
    id: "pr-8",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    employeeAvatar: "",
    department: "Pazarlama",
    position: "Pazarlama Uzmani",
    period: "Q2",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 4,
      verimlilik: 4,
      takimCalismasi: 5,
      musteriMemnuniyeti: 5,
      devamDurumu: 5,
    },
    selfScores: {
      isKalitesi: 5,
      verimlilik: 4,
      takimCalismasi: 5,
      musteriMemnuniyeti: 5,
      devamDurumu: 5,
    },
    reviewerNotes:
      "Dijital kampanyalarda olculebilir basari. Icerik kalitesi pazar ortalamasinin uzerinde.",
    selfNotes:
      "Yeni CRM entegrasyonunda aktif rol aldim, olculebilir sonuclar elde ettik.",
    status: "onaylandi",
    createdDate: "2025-07-07",
    completedDate: "2025-07-16",
    approvedDate: "2025-07-20",
  },
  {
    id: "pr-9",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    employeeAvatar: "",
    department: "Pazarlama",
    position: "Pazarlama Uzmani",
    period: "Q3",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 5,
      verimlilik: 4,
      takimCalismasi: 5,
      musteriMemnuniyeti: 5,
      devamDurumu: 5,
    },
    selfScores: null,
    reviewerNotes:
      "Marka bilinirliginde belirgin artis. Yeni kampanya icin ek kaynak planlamasi oneriliyor.",
    selfNotes: "",
    status: "tamamlandi",
    createdDate: "2025-10-04",
    completedDate: "2025-10-11",
    approvedDate: null,
  },
  {
    id: "pr-10",
    employeeId: "6",
    employeeName: "Burak Celik",
    employeeAvatar: "",
    department: "Satis",
    position: "Satis Muduru",
    period: "Q3",
    year: 2025,
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    kpiScores: {
      isKalitesi: 4,
      verimlilik: 4,
      takimCalismasi: 4,
      musteriMemnuniyeti: 4,
      devamDurumu: 5,
    },
    selfScores: null,
    reviewerNotes: "Ekip hedefleri tutturuldu. Dokumantasyon surecinde iyilestirme onerildi.",
    selfNotes: "",
    status: "taslak",
    createdDate: "2025-10-06",
    completedDate: null,
    approvedDate: null,
  },
]

// -----------------------------
// Overtime Tracking (Fazla Mesai)
// -----------------------------

export type OvertimeStatus = "bekliyor" | "onaylandi" | "reddedildi"

export interface OvertimeRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  department: string
  date: string // YYYY-MM-DD
  plannedEndTime: string // HH:MM - normal mesai bitis
  actualEndTime: string // HH:MM - gercek cikis
  overtimeHours: number // auto-calculated, decimal hours
  reason: string
  status: OvertimeStatus
  submittedAt: string // ISO date
  reviewerId: string | null
  reviewerName: string | null
  reviewedAt: string | null
  rejectionReason: string | null
}

export const OVERTIME_STATUS_LABELS: Record<OvertimeStatus, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandi",
  reddedildi: "Reddedildi",
}

// Turkish labor law limits
export const WEEKLY_OVERTIME_LIMIT = 45 // regular + overtime cannot exceed 45h/week
export const YEARLY_OVERTIME_LIMIT = 270 // total overtime cap per year
export const OVERTIME_MULTIPLIER = 1.5 // 1.5x base hourly rate
export const MONTHLY_WORK_HOURS = 225 // Turkish monthly baseline (45h * ~5 weeks)

/**
 * Compute overtime hours between two HH:MM timestamps on the same date.
 * Returns decimal hours, 0 if actual <= planned.
 */
export function calculateOvertimeHours(
  plannedEndTime: string,
  actualEndTime: string,
): number {
  if (!plannedEndTime || !actualEndTime) return 0
  const [ph, pm] = plannedEndTime.split(":").map(Number)
  const [ah, am] = actualEndTime.split(":").map(Number)
  if (
    Number.isNaN(ph) ||
    Number.isNaN(pm) ||
    Number.isNaN(ah) ||
    Number.isNaN(am)
  ) {
    return 0
  }
  const plannedMin = ph * 60 + pm
  let actualMin = ah * 60 + am
  // Overnight rollover (e.g., planned 18:00, actual 01:00)
  if (actualMin <= plannedMin) actualMin += 24 * 60
  const diff = actualMin - plannedMin
  if (diff <= 0) return 0
  return Math.round((diff / 60) * 100) / 100
}

/**
 * Estimated overtime cost based on employee gross salary.
 * Hourly rate = grossSalary / MONTHLY_WORK_HOURS, multiplied by 1.5x legal rate.
 */
export function calculateOvertimeCost(
  grossSalary: number,
  hours: number,
): number {
  if (!grossSalary || hours <= 0) return 0
  const hourlyRate = grossSalary / MONTHLY_WORK_HOURS
  const cost = hourlyRate * hours * OVERTIME_MULTIPLIER
  return Math.round(cost * 100) / 100
}

/** ISO week number (Monday-first) used for weekly overtime aggregation. */
export function getIsoWeek(dateStr: string): { year: number; week: number } {
  const d = new Date(`${dateStr}T00:00:00`)
  const target = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
  )
  const dayNr = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const diff =
    (target.getTime() - firstThursday.getTime()) / 86400000
  const week = 1 + Math.round((diff - ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return { year: target.getUTCFullYear(), week }
}

export function formatTurkishCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount)
}

export const overtimeRecords: OvertimeRecord[] = [
  {
    id: "ot-1",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-04-02",
    plannedEndTime: "18:00",
    actualEndTime: "21:30",
    overtimeHours: 3.5,
    reason: "Acil musteri saha arizasina mudahale edildi.",
    status: "onaylandi",
    submittedAt: "2026-04-02",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-03",
    rejectionReason: null,
  },
  {
    id: "ot-2",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-04-09",
    plannedEndTime: "18:00",
    actualEndTime: "20:00",
    overtimeHours: 2,
    reason: "Aylik bakim raporlarinin tamamlanmasi.",
    status: "onaylandi",
    submittedAt: "2026-04-09",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-10",
    rejectionReason: null,
  },
  {
    id: "ot-3",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-04-15",
    plannedEndTime: "18:00",
    actualEndTime: "22:00",
    overtimeHours: 4,
    reason: "Musteri demo hazirligi.",
    status: "bekliyor",
    submittedAt: "2026-04-15",
    reviewerId: null,
    reviewerName: null,
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: "ot-4",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    employeeAvatar: "",
    department: "Satis",
    date: "2026-04-03",
    plannedEndTime: "18:00",
    actualEndTime: "19:30",
    overtimeHours: 1.5,
    reason: "Potansiyel musteri gorusmesi.",
    status: "onaylandi",
    submittedAt: "2026-04-03",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-04",
    rejectionReason: null,
  },
  {
    id: "ot-5",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    employeeAvatar: "",
    department: "Satis",
    date: "2026-04-10",
    plannedEndTime: "18:00",
    actualEndTime: "20:30",
    overtimeHours: 2.5,
    reason: "Ceyrek sonu satis kapanisi icin ek mesai.",
    status: "onaylandi",
    submittedAt: "2026-04-10",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-11",
    rejectionReason: null,
  },
  {
    id: "ot-6",
    employeeId: "3",
    employeeName: "Elif Demir",
    employeeAvatar: "",
    department: "Operasyon",
    date: "2026-04-06",
    plannedEndTime: "17:00",
    actualEndTime: "20:00",
    overtimeHours: 3,
    reason: "Vardiya plani ve puantaj kapanisi.",
    status: "onaylandi",
    submittedAt: "2026-04-06",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-07",
    rejectionReason: null,
  },
  {
    id: "ot-7",
    employeeId: "3",
    employeeName: "Elif Demir",
    employeeAvatar: "",
    department: "Operasyon",
    date: "2026-04-13",
    plannedEndTime: "17:00",
    actualEndTime: "19:45",
    overtimeHours: 2.75,
    reason: "Ay sonu raporlari ve denetim hazirligi.",
    status: "bekliyor",
    submittedAt: "2026-04-13",
    reviewerId: null,
    reviewerName: null,
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: "ot-8",
    employeeId: "4",
    employeeName: "Can Ozturk",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-04-07",
    plannedEndTime: "18:00",
    actualEndTime: "19:00",
    overtimeHours: 1,
    reason: "Gunluk bakim onarim listesi tamamlama.",
    status: "reddedildi",
    submittedAt: "2026-04-07",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-08",
    rejectionReason:
      "Mesai icinde tamamlanabilecek gorev kapsaminda degerlendirildi.",
  },
  {
    id: "ot-9",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    employeeAvatar: "",
    department: "Pazarlama",
    date: "2026-04-08",
    plannedEndTime: "18:00",
    actualEndTime: "21:00",
    overtimeHours: 3,
    reason: "Yeni kampanya icerik uretimi.",
    status: "onaylandi",
    submittedAt: "2026-04-08",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-09",
    rejectionReason: null,
  },
  {
    id: "ot-10",
    employeeId: "5",
    employeeName: "Zeynep Arslan",
    employeeAvatar: "",
    department: "Pazarlama",
    date: "2026-04-14",
    plannedEndTime: "18:00",
    actualEndTime: "22:30",
    overtimeHours: 4.5,
    reason: "Fuar standi ve materyal hazirligi.",
    status: "bekliyor",
    submittedAt: "2026-04-14",
    reviewerId: null,
    reviewerName: null,
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: "ot-11",
    employeeId: "6",
    employeeName: "Burak Celik",
    employeeAvatar: "",
    department: "Satis",
    date: "2026-04-01",
    plannedEndTime: "18:00",
    actualEndTime: "20:00",
    overtimeHours: 2,
    reason: "Ekip degerlendirme toplantisi.",
    status: "onaylandi",
    submittedAt: "2026-04-01",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-02",
    rejectionReason: null,
  },
  {
    id: "ot-12",
    employeeId: "6",
    employeeName: "Burak Celik",
    employeeAvatar: "",
    department: "Satis",
    date: "2026-04-11",
    plannedEndTime: "18:00",
    actualEndTime: "20:30",
    overtimeHours: 2.5,
    reason: "Yeni musteri ziyareti icin raporlama.",
    status: "onaylandi",
    submittedAt: "2026-04-11",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-12",
    rejectionReason: null,
  },
  {
    id: "ot-13",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-04-04",
    plannedEndTime: "18:00",
    actualEndTime: "23:30",
    overtimeHours: 5.5,
    reason: "Saha montaj surecinin tamamlanmasi.",
    status: "onaylandi",
    submittedAt: "2026-04-04",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-05",
    rejectionReason: null,
  },
  {
    id: "ot-14",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-04-12",
    plannedEndTime: "18:00",
    actualEndTime: "22:00",
    overtimeHours: 4,
    reason: "Lunapark saha kurulumu.",
    status: "onaylandi",
    submittedAt: "2026-04-12",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-04-13",
    rejectionReason: null,
  },
  {
    id: "ot-15",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-04-16",
    plannedEndTime: "18:00",
    actualEndTime: "00:30",
    overtimeHours: 6.5,
    reason: "Acil saha mudahalesi, gece vardiyasi.",
    status: "bekliyor",
    submittedAt: "2026-04-16",
    reviewerId: null,
    reviewerName: null,
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: "ot-16",
    employeeId: "1",
    employeeName: "Ayse Yilmaz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-03-12",
    plannedEndTime: "18:00",
    actualEndTime: "21:00",
    overtimeHours: 3,
    reason: "Sertifikasyon dokumani hazirligi.",
    status: "onaylandi",
    submittedAt: "2026-03-12",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-03-13",
    rejectionReason: null,
  },
  {
    id: "ot-17",
    employeeId: "8",
    employeeName: "Emre Yildiz",
    employeeAvatar: "",
    department: "Teknik Servis",
    date: "2026-03-18",
    plannedEndTime: "18:00",
    actualEndTime: "23:00",
    overtimeHours: 5,
    reason: "Saha kurulum projesi.",
    status: "onaylandi",
    submittedAt: "2026-03-18",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-03-19",
    rejectionReason: null,
  },
  {
    id: "ot-18",
    employeeId: "2",
    employeeName: "Mehmet Kaya",
    employeeAvatar: "",
    department: "Satis",
    date: "2026-03-28",
    plannedEndTime: "18:00",
    actualEndTime: "20:00",
    overtimeHours: 2,
    reason: "Ay sonu satis kapanisi.",
    status: "onaylandi",
    submittedAt: "2026-03-28",
    reviewerId: "7",
    reviewerName: "Ahmet Yilmaz",
    reviewedAt: "2026-03-29",
    rejectionReason: null,
  },
]
