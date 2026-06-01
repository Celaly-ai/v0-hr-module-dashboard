"use client"

/**
 * Paylasilan ayarlar deposu. Yonetici, formlar ve listeler ayni kaynaktan
 * okur; bu sayede Ayarlar sayfasindan yapilan ekleme/silmeler Calisan
 * formuna ve Disiplin modulune aninda yansir.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

// -----------------------------
// Tipler
// -----------------------------

export interface WorkTypeOption {
  id: string
  value: string
  label: string
}

export interface ViolationTypeOption {
  id: string
  value: string
  label: string
  description?: string
}

export interface SeverityOption {
  id: string
  value: string // "uyari" | "ihtar" | "fesih" veya kullanici tanimli
  label: string
  colorClass: string
  order: number
  isBuiltIn?: boolean
}

interface SettingsStoreValue {
  // Departmanlar (basit isim listesi - DepartmentsPage detayli kayit tutar,
  // burada Calisan formu icin kullanilan paylasilan liste yer alir).
  departments: string[]
  addDepartment: (name: string) => boolean
  removeDepartment: (name: string) => void
  renameDepartment: (oldName: string, newName: string) => void

  // Gorev unvanlari - basit isim listesi
  jobTitles: string[]
  addJobTitle: (title: string) => boolean
  removeJobTitle: (title: string) => void

  // Lokasyonlar - basit isim listesi
  locations: string[]
  addLocation: (name: string) => boolean
  removeLocation: (name: string) => void

  // Calisma tipleri
  workTypes: WorkTypeOption[]
  addWorkType: (value: string, label: string) => boolean
  removeWorkType: (id: string) => void

  // Ihlal turleri
  violationTypes: ViolationTypeOption[]
  addViolationType: (
    label: string,
    description?: string,
  ) => ViolationTypeOption | null
  removeViolationType: (id: string) => void

  // Disiplin dereceleri (Uyari / Ihtar / Fesih + kullanici tanimli)
  severities: SeverityOption[]
  addSeverity: (label: string, colorClass?: string) => SeverityOption | null
  removeSeverity: (id: string) => void
}

// -----------------------------
// Baslangic verileri
// -----------------------------

const DEFAULT_DEPARTMENTS = [
  "Teknik Servis",
  "Satis",
  "Operasyon",
  "IK",
  "Finans",
  "Musteri Hizmetleri",
  "Pazarlama",
]

const DEFAULT_JOB_TITLES = [
  "Teknisyen",
  "Kidemli Teknisyen",
  "Saha Sorumlusu",
  "Satis Uzmani",
  "Satis Muduru",
  "Operasyon Uzmani",
  "IK Uzmani",
  "IK Muduru",
  "Mali Musavir",
  "Musteri Temsilcisi",
]

const DEFAULT_LOCATIONS = [
  "Genel Merkez",
  "Besiktas Ofis",
  "Ankara Sube",
  "Kadikoy Saha",
]

const DEFAULT_WORK_TYPES: WorkTypeOption[] = [
  { id: "wt-tam-zamanli", value: "tam-zamanli", label: "Tam Zamanli" },
  { id: "wt-vardiyali", value: "vardiyali", label: "Vardiyali" },
  { id: "wt-saha", value: "saha", label: "Saha" },
  { id: "wt-uzaktan", value: "uzaktan", label: "Uzaktan" },
]

const DEFAULT_VIOLATION_TYPES: ViolationTypeOption[] = [
  {
    id: "vt-devamsizlik",
    value: "devamsizlik",
    label: "Devamsizlik",
    description: "Mazeretsiz ise gelmeme veya gec kalma",
  },
  {
    id: "vt-is-kurallari",
    value: "is-kurallari",
    label: "Is Kurallari Ihlali",
    description: "Is yeri kurallarina aykiri davranis",
  },
  {
    id: "vt-performans",
    value: "performans",
    label: "Performans",
    description: "Hedeflenen performansi karsilayamama",
  },
  {
    id: "vt-davranis",
    value: "davranis",
    label: "Davranis",
    description: "Calisma arkadaslarina veya musteriye karsi uygunsuz tutum",
  },
  { id: "vt-diger", value: "diger", label: "Diger" },
]

const DEFAULT_SEVERITIES: SeverityOption[] = [
  {
    id: "sv-uyari",
    value: "uyari",
    label: "Uyari",
    colorClass: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    order: 1,
    isBuiltIn: true,
  },
  {
    id: "sv-ihtar",
    value: "ihtar",
    label: "Ihtar",
    colorClass: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    order: 2,
    isBuiltIn: true,
  },
  {
    id: "sv-fesih",
    value: "fesih",
    label: "Fesih",
    colorClass: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    order: 3,
    isBuiltIn: true,
  },
]

// -----------------------------
// Context
// -----------------------------

const SettingsStoreContext = createContext<SettingsStoreValue | null>(null)

function slugify(input: string): string {
  return input
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
}

export function SettingsStoreProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS)
  const [jobTitles, setJobTitles] = useState<string[]>(DEFAULT_JOB_TITLES)
  const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS)
  const [workTypes, setWorkTypes] = useState<WorkTypeOption[]>(DEFAULT_WORK_TYPES)
  const [violationTypes, setViolationTypes] = useState<ViolationTypeOption[]>(
    DEFAULT_VIOLATION_TYPES,
  )
  const [severities, setSeverities] = useState<SeverityOption[]>(DEFAULT_SEVERITIES)

  const addDepartment = useCallback((name: string) => {
    const v = name.trim()
    if (!v) return false
    let added = false
    setDepartments((prev) => {
      if (prev.some((d) => d.toLowerCase() === v.toLowerCase())) return prev
      added = true
      return [...prev, v].sort((a, b) => a.localeCompare(b, "tr"))
    })
    return added
  }, [])
  const removeDepartment = useCallback((name: string) => {
    setDepartments((prev) => prev.filter((d) => d !== name))
  }, [])
  const renameDepartment = useCallback((oldName: string, newName: string) => {
    const v = newName.trim()
    if (!v) return
    setDepartments((prev) =>
      prev.map((d) => (d === oldName ? v : d)).sort((a, b) => a.localeCompare(b, "tr")),
    )
  }, [])

  const addJobTitle = useCallback((title: string) => {
    const v = title.trim()
    if (!v) return false
    let added = false
    setJobTitles((prev) => {
      if (prev.some((t) => t.toLowerCase() === v.toLowerCase())) return prev
      added = true
      return [...prev, v].sort((a, b) => a.localeCompare(b, "tr"))
    })
    return added
  }, [])
  const removeJobTitle = useCallback((title: string) => {
    setJobTitles((prev) => prev.filter((t) => t !== title))
  }, [])

  const addLocation = useCallback((name: string) => {
    const v = name.trim()
    if (!v) return false
    let added = false
    setLocations((prev) => {
      if (prev.some((l) => l.toLowerCase() === v.toLowerCase())) return prev
      added = true
      return [...prev, v].sort((a, b) => a.localeCompare(b, "tr"))
    })
    return added
  }, [])
  const removeLocation = useCallback((name: string) => {
    setLocations((prev) => prev.filter((l) => l !== name))
  }, [])

  const addWorkType = useCallback((value: string, label: string) => {
    const v = value.trim() || slugify(label)
    const l = label.trim()
    if (!v || !l) return false
    let added = false
    setWorkTypes((prev) => {
      if (prev.some((wt) => wt.value === v)) return prev
      added = true
      return [
        ...prev,
        { id: `wt-${v}-${Date.now()}`, value: v, label: l },
      ]
    })
    return added
  }, [])
  const removeWorkType = useCallback((id: string) => {
    setWorkTypes((prev) => prev.filter((wt) => wt.id !== id))
  }, [])

  const addViolationType = useCallback(
    (label: string, description?: string) => {
      const l = label.trim()
      if (!l) return null
      const value = slugify(l) || `custom-${Date.now()}`
      let created: ViolationTypeOption | null = null
      setViolationTypes((prev) => {
        if (prev.some((vt) => vt.value === value)) return prev
        created = {
          id: `vt-${value}-${Date.now()}`,
          value,
          label: l,
          description: description?.trim() || undefined,
        }
        return [...prev, created]
      })
      return created
    },
    [],
  )
  const removeViolationType = useCallback((id: string) => {
    setViolationTypes((prev) => prev.filter((vt) => vt.id !== id))
  }, [])

  const addSeverity = useCallback(
    (label: string, colorClass?: string) => {
      const l = label.trim()
      if (!l) return null
      const value = slugify(l) || `sv-${Date.now()}`
      let created: SeverityOption | null = null
      setSeverities((prev) => {
        if (prev.some((sv) => sv.value === value)) return prev
        const nextOrder = prev.reduce((m, s) => Math.max(m, s.order), 0) + 1
        created = {
          id: `sv-${value}-${Date.now()}`,
          value,
          label: l,
          colorClass:
            colorClass ??
            "bg-sky-500/15 text-sky-300 border-sky-500/40",
          order: nextOrder,
          isBuiltIn: false,
        }
        return [...prev, created]
      })
      return created
    },
    [],
  )
  const removeSeverity = useCallback((id: string) => {
    setSeverities((prev) => prev.filter((sv) => sv.id !== id))
  }, [])

  const value = useMemo<SettingsStoreValue>(
    () => ({
      departments,
      addDepartment,
      removeDepartment,
      renameDepartment,
      jobTitles,
      addJobTitle,
      removeJobTitle,
      locations,
      addLocation,
      removeLocation,
      workTypes,
      addWorkType,
      removeWorkType,
      violationTypes,
      addViolationType,
      removeViolationType,
      severities,
      addSeverity,
      removeSeverity,
    }),
    [
      departments,
      addDepartment,
      removeDepartment,
      renameDepartment,
      jobTitles,
      addJobTitle,
      removeJobTitle,
      locations,
      addLocation,
      removeLocation,
      workTypes,
      addWorkType,
      removeWorkType,
      violationTypes,
      addViolationType,
      removeViolationType,
      severities,
      addSeverity,
      removeSeverity,
    ],
  )

  return (
    <SettingsStoreContext.Provider value={value}>
      {children}
    </SettingsStoreContext.Provider>
  )
}

export function useSettingsStore() {
  const ctx = useContext(SettingsStoreContext)
  if (!ctx) {
    throw new Error(
      "useSettingsStore must be used within a SettingsStoreProvider",
    )
  }
  return ctx
}
