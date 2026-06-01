"use client"

import { useMemo, useState } from "react"
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  Pencil,
  Trash2,
  Check,
  X,
  UserRound,
  FileText,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { employees } from "@/lib/hr-data"

interface Department {
  id: string
  name: string
  manager: string
  location: string
  description: string
  createdAt: string
}

const initialDepartments: Department[] = [
  {
    id: "dep-1",
    name: "Teknik Servis",
    manager: "Can Ozturk",
    location: "Istanbul - Merkez",
    description: "Saha arizalari, periyodik bakim ve kurulum operasyonlari.",
    createdAt: "2023-02-10",
  },
  {
    id: "dep-2",
    name: "Satis",
    manager: "Mehmet Kaya",
    location: "Istanbul - Besiktas",
    description: "Bireysel ve kurumsal satis kanallari, teklif yonetimi.",
    createdAt: "2023-01-05",
  },
  {
    id: "dep-3",
    name: "Operasyon",
    manager: "Elif Demir",
    location: "Istanbul - Merkez",
    description: "Sevkiyat, envanter ve tedarik zinciri koordinasyonu.",
    createdAt: "2023-01-05",
  },
  {
    id: "dep-4",
    name: "IK",
    manager: "Ayse Yilmaz",
    location: "Istanbul - Merkez",
    description: "Ise alim, calisan deneyimi ve bordro sureclerinin yonetimi.",
    createdAt: "2022-11-12",
  },
  {
    id: "dep-5",
    name: "Finans",
    manager: "Selim Aydin",
    location: "Istanbul - Merkez",
    description: "Muhasebe, butce planlama ve raporlama.",
    createdAt: "2022-11-12",
  },
  {
    id: "dep-6",
    name: "Musteri Hizmetleri",
    manager: "Zeynep Arslan",
    location: "Ankara - Sube",
    description: "Cagri merkezi, talep yonetimi ve musteri memnuniyeti.",
    createdAt: "2023-03-20",
  },
  {
    id: "dep-7",
    name: "Pazarlama",
    manager: "Burak Celik",
    location: "Istanbul - Besiktas",
    description: "Marka, dijital pazarlama ve kampanya yonetimi.",
    createdAt: "2023-04-01",
  },
]

function getManagerCandidates(): string[] {
  // Unique employee names for the manager picker.
  const set = new Set<string>()
  for (const e of employees) set.add(e.name)
  return Array.from(set).sort()
}

export function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>(initialDepartments)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null)

  // Inline editing state
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState("")
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null)
  const [managerDraft, setManagerDraft] = useState("")

  // New department form state
  const [formName, setFormName] = useState("")
  const [formManager, setFormManager] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const managers = useMemo(getManagerCandidates, [])

  const employeeCountByDept = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of employees) {
      counts.set(e.department, (counts.get(e.department) ?? 0) + 1)
    }
    return counts
  }, [])

  const filteredDepts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return depts
    return depts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.manager.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q),
    )
  }, [depts, search])

  const totalEmployees = useMemo(
    () =>
      depts.reduce(
        (sum, d) => sum + (employeeCountByDept.get(d.name) ?? 0),
        0,
      ),
    [depts, employeeCountByDept],
  )

  function openNewDialog() {
    setFormName("")
    setFormManager("")
    setFormLocation("")
    setFormDescription("")
    setFormError(null)
    setDialogOpen(true)
  }

  function saveNewDepartment() {
    const trimmed = formName.trim()
    if (!trimmed) {
      setFormError("Departman adi zorunludur.")
      return
    }
    if (
      depts.some(
        (d) => d.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setFormError("Bu isimde bir departman zaten var.")
      return
    }
    const newDept: Department = {
      id: `dep-${Date.now()}`,
      name: trimmed,
      manager: formManager || "-",
      location: formLocation.trim() || "-",
      description: formDescription.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setDepts((prev) => [newDept, ...prev])
    setDialogOpen(false)
  }

  function startEditName(d: Department) {
    setEditingManagerId(null)
    setEditingNameId(d.id)
    setNameDraft(d.name)
  }

  function commitNameEdit(d: Department) {
    const next = nameDraft.trim()
    if (!next) {
      setEditingNameId(null)
      return
    }
    if (
      depts.some(
        (x) =>
          x.id !== d.id && x.name.toLowerCase() === next.toLowerCase(),
      )
    ) {
      setEditingNameId(null)
      return
    }
    setDepts((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, name: next } : x)),
    )
    setEditingNameId(null)
  }

  function startEditManager(d: Department) {
    setEditingNameId(null)
    setEditingManagerId(d.id)
    setManagerDraft(d.manager)
  }

  function commitManagerEdit(d: Department, next: string) {
    setDepts((prev) =>
      prev.map((x) =>
        x.id === d.id ? { ...x, manager: next || "-" } : x,
      ),
    )
    setEditingManagerId(null)
  }

  function handleDelete(d: Department) {
    setDepts((prev) => prev.filter((x) => x.id !== d.id))
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      {/* Header + KPI strip */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Departman Yonetimi
            </h2>
            <p className="text-sm text-muted-foreground">
              Departman olustur, duzenle ve organizasyon agacini yonet.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 w-48"
            />
          </div>
          <Button onClick={openNewDialog} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Yeni Departman
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Toplam
            </span>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {depts.length}
          </p>
          <p className="text-xs text-muted-foreground">departman</p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Calisan
            </span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {totalEmployees}
          </p>
          <p className="text-xs text-muted-foreground">aktif kayit</p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Yonetici
            </span>
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {new Set(depts.map((d) => d.manager)).size}
          </p>
          <p className="text-xs text-muted-foreground">atanmis kisi</p>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Lokasyon
            </span>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {new Set(depts.map((d) => d.location)).size}
          </p>
          <p className="text-xs text-muted-foreground">bolge</p>
        </Card>
      </div>

      {/* Departments grid */}
      {filteredDepts.length === 0 ? (
        <Card className="p-12 border-border text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {search ? "Aramayla eslesen departman yok" : "Henuz departman yok"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ilk departmani olusturmak icin sag ustteki butonu kullanin.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((d) => {
            const empCount = employeeCountByDept.get(d.name) ?? 0
            const isEditingName = editingNameId === d.id
            const isEditingManager = editingManagerId === d.id
            return (
              <Card
                key={d.id}
                className="flex flex-col gap-4 p-5 border-border hover:border-primary/40 hover:bg-card/80 transition-colors"
              >
                {/* Name row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitNameEdit(d)
                            if (e.key === "Escape") setEditingNameId(null)
                          }}
                          className="h-8 text-base font-semibold"
                          maxLength={40}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-emerald-500"
                          onClick={() => commitNameEdit(d)}
                          aria-label="Kaydet"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-muted-foreground"
                          onClick={() => setEditingNameId(null)}
                          aria-label="Iptal"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditName(d)}
                        className="group/name flex items-center gap-1.5 text-left"
                      >
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {d.name}
                        </h3>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                      </button>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Olusturulma: {d.createdAt}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 border-border text-muted-foreground"
                  >
                    <Users className="h-3 w-3" />
                    {empCount}
                  </Badge>
                </div>

                <Separator />

                {/* Manager row */}
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <UserRound className="h-3 w-3" />
                    Yonetici
                  </Label>
                  {isEditingManager ? (
                    <div className="flex items-center gap-1">
                      <Select
                        value={managerDraft}
                        onValueChange={(v) => {
                          setManagerDraft(v)
                          commitManagerEdit(d, v)
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm flex-1">
                          <SelectValue placeholder="Yonetici sec" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-muted-foreground"
                        onClick={() => setEditingManagerId(null)}
                        aria-label="Iptal"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditManager(d)}
                      className="group/m flex items-center gap-2 rounded-md border border-transparent bg-muted/20 px-2.5 py-1.5 w-full text-left hover:border-border hover:bg-muted/40 transition-colors"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                        {d.manager
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="text-sm text-foreground truncate flex-1">
                        {d.manager}
                      </span>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover/m:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{d.location}</span>
                </div>

                {/* Description */}
                {d.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {d.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-end gap-1 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5"
                    onClick={() => startEditName(d)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Duzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    onClick={() => setConfirmDelete(d)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* New department dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Yeni Departman
            </DialogTitle>
            <DialogDescription>
              Departman bilgilerini girin. Tum alanlar daha sonra duzenlenebilir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name" className="text-xs">
                Departman Adi <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="dept-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value)
                  setFormError(null)
                }}
                placeholder="Orn. Lojistik"
                maxLength={40}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dept-manager" className="text-xs">
                  Yonetici
                </Label>
                <Select value={formManager} onValueChange={setFormManager}>
                  <SelectTrigger id="dept-manager">
                    <SelectValue placeholder="Secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept-location" className="text-xs">
                  Lokasyon
                </Label>
                <Input
                  id="dept-location"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Orn. Istanbul - Merkez"
                  maxLength={60}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc" className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Aciklama
              </Label>
              <Textarea
                id="dept-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Kisa aciklama..."
                rows={3}
                maxLength={200}
              />
            </div>
            {formError && (
              <p className="text-xs text-rose-400">{formError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={saveNewDepartment}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Departmani Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {confirmDelete?.name}
              </span>{" "}
              departmani silinecek. Bu islem geri alinamaz. Bu departmana bagli
              calisanlar hala calisanlar listesinde gorunecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600 focus-visible:ring-rose-500"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
