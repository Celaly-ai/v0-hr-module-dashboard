"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  User,
  Briefcase,
  Banknote,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  MapPin,
  Compass,
  Loader2,
} from "lucide-react"
import type { Employee } from "@/lib/hr-data"
import type { NewEmployeeInput } from "@/lib/personnel-repo"
import {
  TR_PROVINCES,
  getDistricts,
  geocodeAddress,
  searchNeighborhoods,
  type NeighborhoodSuggestion,
} from "@/lib/turkey-locations"
import { useSettingsStore } from "@/lib/settings-store"

interface AddEmployeeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddEmployee: (employee: NewEmployeeInput) => void | Promise<void>
  managers?: Employee[]
  editMode?: boolean
  initialData?: Partial<NewEmployeeInput & { id: string; rol?: string }>
}

interface FormData {
  tcKimlikNo: string
  firstName: string
  lastName: string
  birthDate: string
  gender: "erkek" | "kadin" | ""
  bloodType: Employee["bloodType"] | ""
  phone: string
  email: string
  city: string
  district: string
  neighborhood: string
  openAddress: string
  latitude: string
  longitude: string
  department: string
  position: string
  location: string
  manager: string
  workType: string
  contractType: Employee["contractType"] | ""
  rol: string
  startDate: string
  sgkStartDate: string
  grossSalary: string
  iban: string
  taxNumber: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
}

const initialFormData: FormData = {
  tcKimlikNo: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  bloodType: "",
  phone: "",
  email: "",
  city: "",
  district: "",
  neighborhood: "",
  openAddress: "",
  latitude: "",
  longitude: "",
  department: "",
  position: "",
  location: "",
  manager: "",
  workType: "",
  contractType: "",
  rol: "calisan",
  startDate: "",
  sgkStartDate: "",
  grossSalary: "",
  iban: "",
  taxNumber: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
}

const steps = [
  { id: 1, title: "Kisisel Bilgiler", icon: User },
  { id: 2, title: "Gorev Bilgileri", icon: Briefcase },
  { id: 3, title: "Mali Bilgiler", icon: Banknote },
  { id: 4, title: "Acil Durum", icon: AlertCircle },
]

const bloodTypes: Employee["bloodType"][] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"]

export function AddEmployeeWizard({
  open,
  onOpenChange,
  onAddEmployee,
  managers = [],
  editMode = false,
  initialData,
}: AddEmployeeWizardProps) {
  const settings = useSettingsStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [neighborhoodSuggestions, setNeighborhoodSuggestions] = useState<NeighborhoodSuggestion[]>([])
  const [neighborhoodSearching, setNeighborhoodSearching] = useState(false)
  const neighborhoodAbortRef = useRef<AbortController | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const geocodeAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        ...initialFormData,
        firstName: initialData.name?.split(" ")[0] ?? "",
        lastName: initialData.name?.split(" ").slice(1).join(" ") ?? "",
        phone: initialData.phone ?? "",
        email: initialData.email ?? "",
        department: initialData.department ?? "",
        position: initialData.position ?? "",
        startDate: initialData.startDate ?? "",
        sgkStartDate: initialData.sgkStartDate ?? "",
        grossSalary: initialData.grossSalary?.toString() ?? "",
        iban: initialData.iban ?? "",
        workType: initialData.workType ?? "",
        contractType: initialData.contractType ?? "",
        tcKimlikNo: initialData.tcKimlikNo ?? "",
        birthDate: initialData.birthDate ?? "",
        bloodType: initialData.bloodType ?? "",
        location: initialData.location ?? "",
        rol: initialData.rol ?? "calisan",
        gender: initialData.gender ?? "",
        city: initialData.city ?? "",
        district: (initialData as any).district ?? "",
        neighborhood: (initialData as any).neighborhood ?? "",
        openAddress: (initialData as any).openAddress ?? "",
        emergencyContactName: initialData.emergencyContactName ?? "",
        emergencyContactPhone: initialData.emergencyContactPhone ?? "",
        emergencyContactRelation: initialData.emergencyContactRelation ?? "",
      })
    } else if (open && !initialData) {
      setFormData(initialFormData)
    }
  }, [open, initialData])

  const districtOptions = useMemo(
    () => (formData.city ? getDistricts(formData.city) : []),
    [formData.city],
  )

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }

      if (field === "city") {
        next.district = ""
        next.neighborhood = ""
        next.latitude = ""
        next.longitude = ""
      }

      if (field === "district") {
        next.neighborhood = ""
        next.latitude = ""
        next.longitude = ""
      }

      return next
    })

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  useEffect(() => {
    const q = formData.neighborhood.trim()

    if (!formData.city || !formData.district || q.length < 2) {
      setNeighborhoodSuggestions([])
      setNeighborhoodSearching(false)
      return
    }

    neighborhoodAbortRef.current?.abort()
    const controller = new AbortController()
    neighborhoodAbortRef.current = controller
    setNeighborhoodSearching(true)

    const t = window.setTimeout(async () => {
      const results = await searchNeighborhoods(
        formData.city,
        formData.district,
        q,
        controller.signal,
      )

      if (!controller.signal.aborted) {
        setNeighborhoodSuggestions(results)
        setNeighborhoodSearching(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(t)
      controller.abort()
    }
  }, [formData.neighborhood, formData.city, formData.district])

  async function handleGeocode(options?: { silent?: boolean }) {
    if (!formData.city || !formData.openAddress.trim()) {
      if (!options?.silent) {
        setGeocodeError("Once Sehir ve Acik Adres alanlarini doldurun.")
      }
      return
    }

    geocodeAbortRef.current?.abort()
    const controller = new AbortController()
    geocodeAbortRef.current = controller
    setGeocoding(true)
    setGeocodeError(null)

    const addressParts = [formData.openAddress, formData.neighborhood].filter(Boolean).join(", ")
    const res = await geocodeAddress(
      addressParts,
      formData.city,
      formData.district || undefined,
      controller.signal,
    )

    if (controller.signal.aborted) return

    if (!res) {
      setGeocoding(false)
      if (!options?.silent) setGeocodeError("Adres koordinata cevrilemedi.")
      return
    }

    setFormData((prev) => ({
      ...prev,
      latitude: res.lat.toFixed(6),
      longitude: res.lng.toFixed(6),
    }))

    setGeocoding(false)
  }

  function applyNeighborhoodSuggestion(s: NeighborhoodSuggestion) {
    setFormData((prev) => ({
      ...prev,
      neighborhood: s.name,
      latitude: Number.isFinite(s.lat) ? s.lat.toFixed(6) : prev.latitude,
      longitude: Number.isFinite(s.lng) ? s.lng.toFixed(6) : prev.longitude,
    }))

    setNeighborhoodSuggestions([])
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    switch (step) {
      case 1:
        if (!formData.tcKimlikNo || formData.tcKimlikNo.length !== 11) newErrors.tcKimlikNo = "TC Kimlik No 11 haneli olmalidir"
        if (!formData.firstName.trim()) newErrors.firstName = "Ad zorunludur"
        if (!formData.lastName.trim()) newErrors.lastName = "Soyad zorunludur"
        if (!formData.birthDate) newErrors.birthDate = "Dogum tarihi zorunludur"
        if (!formData.gender) newErrors.gender = "Cinsiyet zorunludur"
        if (!formData.bloodType) newErrors.bloodType = "Kan grubu zorunludur"
        if (!formData.phone.trim()) newErrors.phone = "Telefon zorunludur"
        if (!formData.email.trim()) newErrors.email = "E-posta zorunludur"
        if (!formData.city) newErrors.city = "Sehir zorunludur"
        break
      case 2:
        if (!formData.department) newErrors.department = "Departman zorunludur"
        if (!formData.position.trim()) newErrors.position = "Unvan zorunludur"
        if (!formData.location.trim()) newErrors.location = "Lokasyon zorunludur"
        if (!formData.workType) newErrors.workType = "Calisma tipi zorunludur"
        if (!formData.contractType) newErrors.contractType = "Sozlesme turu zorunludur"
        if (!formData.startDate) newErrors.startDate = "Ise giris tarihi zorunludur"
        if (!formData.sgkStartDate) newErrors.sgkStartDate = "SGK baslangic tarihi zorunludur"
        break
      case 3:
        if (!formData.grossSalary || Number(formData.grossSalary) <= 0) newErrors.grossSalary = "Gecerli bir maas giriniz"
        if (!formData.iban.trim()) newErrors.iban = "IBAN zorunludur"
        break
      case 4:
        if (!formData.emergencyContactName.trim()) newErrors.emergencyContactName = "Acil durum kisi adi zorunludur"
        if (!formData.emergencyContactPhone.trim()) newErrors.emergencyContactPhone = "Acil durum telefonu zorunludur"
        if (!formData.emergencyContactRelation.trim()) newErrors.emergencyContactRelation = "Yakinlik derecesi zorunludur"
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSave = () => {
    if (!validateStep(4)) return

    const newEmployee: NewEmployeeInput & { rol?: string } = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      avatar: "",
      department: formData.department,
      position: formData.position,
      status: "active",
      startDate: formData.startDate,
      phone: formData.phone,
      location: formData.location || formData.city,
      tcKimlikNo: formData.tcKimlikNo,
      birthDate: formData.birthDate,
      bloodType: formData.bloodType as Employee["bloodType"],
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
      educationLevel: "lisans",
      militaryStatus: formData.gender === "kadin" ? "muaf" : "yapilmadi",
      contractType: formData.contractType as Employee["contractType"],
      contractEndDate: formData.contractType === "belirsiz" ? null : formData.startDate,
      workType: formData.workType as unknown as Employee["workType"],
      sgkStartDate: formData.sgkStartDate,
      probationEndDate: null,
      iban: formData.iban,
      grossSalary: Number(formData.grossSalary),
      rol: formData.rol,
      gender: formData.gender as Employee["gender"],
      city: formData.city,
      district: formData.district,
      openAddress: formData.openAddress,
      neighborhood: formData.neighborhood,
      taxNumber: formData.taxNumber,
      emergencyContactRelation: formData.emergencyContactRelation,
    }

    onAddEmployee(newEmployee)
    handleClose()
  }

  const handleClose = () => {
    setCurrentStep(1)
    setFormData(initialFormData)
    setErrors({})
    setNeighborhoodSuggestions([])
    setGeocodeError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[calc(100vw-24px)] sm:max-w-2xl lg:max-w-3xl h-[calc(100svh-28px)] max-h-[760px] bg-card border-border p-0 overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-foreground">
            {editMode ? "Calisani Duzenle" : "Yeni Calisan Ekle"}
          </DialogTitle>
        </DialogHeader>

        <div className="shrink-0 px-5 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? "bg-primary border-primary"
                          : isCurrent
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <Icon
                          className={`h-4 w-4 ${
                            isCurrent ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[11px] mt-1 text-center leading-tight ${
                        isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>

                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isCompleted ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="w-full bg-secondary rounded-full h-1.5 mt-3">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {currentStep === 1 && (
            <div className="space-y-4 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tcKimlikNo" className="text-foreground">
                    TC Kimlik No <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tcKimlikNo"
                    value={formData.tcKimlikNo}
                    onChange={(e) =>
                      updateFormData("tcKimlikNo", e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="12345678901"
                    className={`bg-secondary border-border ${errors.tcKimlikNo ? "border-destructive" : ""}`}
                  />
                  {errors.tcKimlikNo && <p className="text-xs text-destructive">{errors.tcKimlikNo}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-foreground">
                    Dogum Tarihi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => updateFormData("birthDate", e.target.value)}
                    className={`bg-secondary border-border ${errors.birthDate ? "border-destructive" : ""}`}
                  />
                  {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground">
                    Ad <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    placeholder="Ad"
                    className={`bg-secondary border-border ${errors.firstName ? "border-destructive" : ""}`}
                  />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground">
                    Soyad <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    placeholder="Soyad"
                    className={`bg-secondary border-border ${errors.lastName ? "border-destructive" : ""}`}
                  />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-foreground">
                    Cinsiyet <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => updateFormData("gender", value)}>
                    <SelectTrigger className={`bg-secondary border-border ${errors.gender ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Cinsiyet seciniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="erkek">Erkek</SelectItem>
                      <SelectItem value="kadin">Kadin</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodType" className="text-foreground">
                    Kan Grubu <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.bloodType} onValueChange={(value) => updateFormData("bloodType", value)}>
                    <SelectTrigger className={`bg-secondary border-border ${errors.bloodType ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Kan grubu seciniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {bloodTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.bloodType && <p className="text-xs text-destructive">{errors.bloodType}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">
                    Telefon <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    placeholder="+90 (5XX) XXX-XXXX"
                    className={`bg-secondary border-border ${errors.phone ? "border-destructive" : ""}`}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    E-posta <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    placeholder="ornek@feyteknik.com"
                    className={`bg-secondary border-border ${errors.email ? "border-destructive" : ""}`}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Adres Bilgileri</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-foreground">
                      Il <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.city} onValueChange={(value) => updateFormData("city", value)}>
                      <SelectTrigger className={`bg-secondary border-border ${errors.city ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Il seciniz" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border max-h-72">
                        {TR_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district" className="text-foreground">
                      Ilce
                    </Label>
                    <Select
                      value={formData.district}
                      onValueChange={(value) => updateFormData("district", value)}
                      disabled={!formData.city}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder={formData.city ? "Ilce seciniz" : "Once il secin"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border max-h-72">
                        {districtOptions.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood" className="text-foreground">
                    Mahalle
                  </Label>
                  <div className="relative">
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => updateFormData("neighborhood", e.target.value)}
                      placeholder={formData.district ? "Mahalle yazin" : "Once ilce secin"}
                      disabled={!formData.district}
                      className="bg-secondary border-border pr-8"
                    />
                    {neighborhoodSearching && (
                      <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {neighborhoodSuggestions.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                        {neighborhoodSuggestions.map((s, idx) => (
                          <button
                            key={`${s.name}-${idx}`}
                            type="button"
                            onClick={() => applyNeighborhoodSuggestion(s)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-start gap-2"
                          >
                            <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-foreground truncate">{s.name}</p>
                              {s.displayName && (
                                <p className="text-xs text-muted-foreground truncate">{s.displayName}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openAddress" className="text-foreground">
                    Acik Adres
                  </Label>
                  <Textarea
                    id="openAddress"
                    value={formData.openAddress}
                    onChange={(e) => updateFormData("openAddress", e.target.value)}
                    placeholder="Sokak, bina adi, kapi no, daire"
                    className="bg-secondary border-border resize-none"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-foreground">Koordinatlar</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGeocode()}
                      disabled={geocoding || !formData.city || !formData.openAddress.trim()}
                      className="gap-1.5 h-8"
                    >
                      {geocoding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Compass className="h-3.5 w-3.5" />
                      )}
                      Koordinat Bul
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={formData.latitude}
                      onChange={(e) => updateFormData("latitude", e.target.value)}
                      placeholder="Enlem (lat)"
                      className="bg-secondary border-border font-mono text-xs"
                    />
                    <Input
                      value={formData.longitude}
                      onChange={(e) => updateFormData("longitude", e.target.value)}
                      placeholder="Boylam (lng)"
                      className="bg-secondary border-border font-mono text-xs"
                    />
                  </div>
                  {geocodeError && <p className="text-xs text-destructive">{geocodeError}</p>}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldSelect
                  label="Departman"
                  required
                  value={formData.department}
                  error={errors.department}
                  placeholder="Departman seciniz"
                  options={settings.departments.map((dept) => ({ value: dept, label: dept }))}
                  onChange={(value) => updateFormData("department", value)}
                />

                <FieldSelect
                  label="Unvan"
                  required
                  value={formData.position}
                  error={errors.position}
                  placeholder="Unvan seciniz"
                  options={settings.jobTitles.map((title) => ({ value: title, label: title }))}
                  onChange={(value) => updateFormData("position", value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldSelect
                  label="Lokasyon"
                  required
                  value={formData.location}
                  error={errors.location}
                  placeholder="Lokasyon seciniz"
                  options={settings.locations.map((loc) => ({ value: loc, label: loc }))}
                  onChange={(value) => updateFormData("location", value)}
                />

                <FieldSelect
                  label="Rol"
                  required
                  value={formData.rol}
                  placeholder="Rol seciniz"
                  options={[
                    { value: "calisan", label: "Calisan" },
                    { value: "servis_yoneticisi", label: "Servis Yoneticisi" },
                    { value: "urun_sorumlusu", label: "Urun Sorumlusu" },
                    { value: "admin", label: "Yonetici" },
                  ]}
                  onChange={(value) => updateFormData("rol", value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldSelect
                  label="Bagli Yonetici"
                  value={formData.manager}
                  placeholder="Yonetici seciniz"
                  options={[
                    { value: "none", label: "Yok" },
                    ...managers.map((manager) => ({
                      value: manager.id,
                      label: `${manager.name} - ${manager.position}`,
                    })),
                  ]}
                  onChange={(value) => updateFormData("manager", value)}
                />

                <FieldSelect
                  label="Calisma Tipi"
                  required
                  value={formData.workType}
                  error={errors.workType}
                  placeholder="Calisma tipi seciniz"
                  options={settings.workTypes.map((wt) => ({ value: wt.value, label: wt.label }))}
                  onChange={(value) => updateFormData("workType", value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldSelect
                  label="Sozlesme Turu"
                  required
                  value={formData.contractType}
                  error={errors.contractType}
                  placeholder="Sozlesme turu seciniz"
                  options={[
                    { value: "belirsiz", label: "Belirsiz Sureli" },
                    { value: "belirli", label: "Belirli Sureli" },
                    { value: "staj", label: "Staj" },
                  ]}
                  onChange={(value) => updateFormData("contractType", value)}
                />

                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-foreground">
                    Ise Giris Tarihi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateFormData("startDate", e.target.value)}
                    className={`bg-secondary border-border ${errors.startDate ? "border-destructive" : ""}`}
                  />
                  {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sgkStartDate" className="text-foreground">
                    SGK Baslangic Tarihi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sgkStartDate"
                    type="date"
                    value={formData.sgkStartDate}
                    onChange={(e) => updateFormData("sgkStartDate", e.target.value)}
                    className={`bg-secondary border-border ${errors.sgkStartDate ? "border-destructive" : ""}`}
                  />
                  {errors.sgkStartDate && <p className="text-xs text-destructive">{errors.sgkStartDate}</p>}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 pb-2">
              <div className="space-y-2">
                <Label htmlFor="grossSalary" className="text-foreground">
                  Brut Maas (TL) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="grossSalary"
                  type="number"
                  value={formData.grossSalary}
                  onChange={(e) => updateFormData("grossSalary", e.target.value)}
                  placeholder="0"
                  className={`bg-secondary border-border ${errors.grossSalary ? "border-destructive" : ""}`}
                />
                {errors.grossSalary && <p className="text-xs text-destructive">{errors.grossSalary}</p>}
                {formData.grossSalary && Number(formData.grossSalary) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Tahmini Net:{" "}
                    {new Intl.NumberFormat("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    }).format(Number(formData.grossSalary) * 0.7)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban" className="text-foreground">
                  IBAN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => updateFormData("iban", e.target.value.toUpperCase())}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className={`bg-secondary border-border font-mono ${errors.iban ? "border-destructive" : ""}`}
                />
                {errors.iban && <p className="text-xs text-destructive">{errors.iban}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxNumber" className="text-foreground">
                  Vergi No
                </Label>
                <Input
                  id="taxNumber"
                  value={formData.taxNumber}
                  onChange={(e) => updateFormData("taxNumber", e.target.value.replace(/\D/g, ""))}
                  placeholder="Vergi numarasi (opsiyonel)"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 pb-2">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Acil Durum Iletisim Bilgileri</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acil bir durumda iletisime gecilebilecek kisi bilgileri.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactName" className="text-foreground">
                  Acil Durum Kisi Adi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => updateFormData("emergencyContactName", e.target.value)}
                  placeholder="Ad Soyad"
                  className={`bg-secondary border-border ${errors.emergencyContactName ? "border-destructive" : ""}`}
                />
                {errors.emergencyContactName && (
                  <p className="text-xs text-destructive">{errors.emergencyContactName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone" className="text-foreground">
                  Telefon <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateFormData("emergencyContactPhone", e.target.value)}
                  placeholder="+90 (5XX) XXX-XXXX"
                  className={`bg-secondary border-border ${errors.emergencyContactPhone ? "border-destructive" : ""}`}
                />
                {errors.emergencyContactPhone && (
                  <p className="text-xs text-destructive">{errors.emergencyContactPhone}</p>
                )}
              </div>

              <FieldSelect
                label="Yakinlik Derecesi"
                required
                value={formData.emergencyContactRelation}
                error={errors.emergencyContactRelation}
                placeholder="Yakinlik seciniz"
                options={[
                  { value: "es", label: "Es" },
                  { value: "anne", label: "Anne" },
                  { value: "baba", label: "Baba" },
                  { value: "kardes", label: "Kardes" },
                  { value: "cocuk", label: "Cocuk" },
                  { value: "arkadas", label: "Arkadas" },
                  { value: "diger", label: "Diger" },
                ]}
                onChange={(value) => updateFormData("emergencyContactRelation", value)}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-card">
          <Button variant="outline" onClick={handleClose} className="border-border">
            <X className="h-4 w-4 mr-2" />
            Iptal
          </Button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="secondary" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Geri
              </Button>
            )}

            {currentStep < 4 ? (
              <Button variant="default" onClick={handleNext}>
                Ileri
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button variant="default" onClick={handleSave}>
                <Check className="h-4 w-4 mr-2" />
                {editMode ? "Guncelle" : "Kaydet"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FieldSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  error,
  required,
}: {
  label: string
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  error?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`bg-secondary border-border ${error ? "border-destructive" : ""}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border max-h-72">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
