"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  Calendar,
  Package,
  TrendingUp,
  Clock,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Loader2,
} from "lucide-react"
import {
  employees,
  leaveRequests,
  assets,
  WORK_START_TIME,
  isTimeLate,
} from "@/lib/hr-data"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"

const YONETICI_ROLLER = ["admin", "servis_yoneticisi", "ik_yoneticisi"]

function getInitials(name: string) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function getLeaveTypeLabel(type: string) {
  switch (type) {
    case "vacation":
    case "Yillik Izin":
    case "Yıllık İzin":
      return "Yıllık İzin"
    case "sick":
    case "Hastalik":
    case "Hastalık":
      return "Hastalık"
    case "personal":
    case "Mazeret":
      return "Mazeret"
    default:
      return type || "Bilinmiyor"
  }
}

function formatTime24(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

type GunlukDurum = {
  girisZamani: string | null
  cikisZamani: string | null
}

type SupabaseIzin = {
  id: string
  izin_turu: string
  baslangic: string
  bitis: string
  gun_sayisi: number
  durum: string
}

function CalisanDashboard({
  currentUserName,
  personelId,
}: {
  currentUserName: string
  personelId: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const [gunlukDurum, setGunlukDurum] = useState<GunlukDurum>({
    girisZamani: null,
    cikisZamani: null,
  })
  const [izinler, setIzinler] = useState<SupabaseIzin[]>([])
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!personelId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setHata(null)

    try {
      const bugun = new Date().toISOString().slice(0, 10)
      const baslangic = `${bugun}T00:00:00`
      const bitis = `${bugun}T23:59:59`

      const { data: kayitlar, error: kayitError } = await supabase
        .from("giris_cikis_kayitlari")
        .select("tip, created_at")
        .eq("personel_id", personelId)
        .gte("created_at", baslangic)
        .lte("created_at", bitis)
        .order("created_at", { ascending: true })

      if (kayitError) throw kayitError

      const giris = kayitlar?.find((k) => k.tip === "giris")
      const cikis = kayitlar?.find((k) => k.tip === "cikis")

      setGunlukDurum({
        girisZamani: giris ? formatTime24(new Date(giris.created_at)) : null,
        cikisZamani: cikis ? formatTime24(new Date(cikis.created_at)) : null,
      })

      const { data: izinData, error: izinError } = await supabase
        .from("izinler")
        .select("id, izin_turu, baslangic, bitis, gun_sayisi, durum")
        .eq("personel_id", personelId)
        .order("created_at", { ascending: false })

      if (izinError) throw izinError

      setIzinler(izinData || [])
    } catch (error: any) {
      setHata(error?.message || "Dashboard verileri okunamadı.")
    } finally {
      setLoading(false)
    }
  }, [personelId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pendingLeaves = izinler.filter((r) => r.durum === "bekliyor")
  const approvedLeaves = izinler.filter((r) => r.durum === "onaylandi")

  const hasCheckedIn = !!gunlukDurum.girisZamani
  const hasCheckedOut = !!gunlukDurum.cikisZamani
  const isLate =
    hasCheckedIn && gunlukDurum.girisZamani
      ? isTimeLate(gunlukDurum.girisZamani)
      : false

  const now = new Date()
  const [startH, startM] = WORK_START_TIME.split(":").map(Number)
  const vardiyaBaslangic = new Date()
  vardiyaBaslangic.setHours(startH, startM, 0, 0)

  const gecikme = !hasCheckedIn && now > vardiyaBaslangic

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Merhaba, {currentUserName.split(" ")[0] || "Merhaba"}!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {now.toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {hata && (
        <Card className="border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-bold text-destructive">
                Dashboard verilerinde sorun var
              </p>
              <p className="mt-1 text-xs text-destructive">{hata}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="border-border p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          Bugünkü Mesai Durumum
        </h3>

        {gecikme && !hasCheckedIn && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm font-bold text-destructive">
              Vardiya saati {WORK_START_TIME} — Henüz giriş yapmadınız!
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <LogIn className="h-3.5 w-3.5 text-success" />
              <span>İş Girişi</span>
            </div>
            <p
              className={`text-lg font-semibold tabular-nums ${
                hasCheckedIn
                  ? isLate
                    ? "text-warning"
                    : "text-success"
                  : "text-muted-foreground"
              }`}
            >
              {gunlukDurum.girisZamani ?? "-"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {hasCheckedIn ? (isLate ? "Geç kalındı" : "Zamanında") : "Giriş yapılmadı"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <LogOut className="h-3.5 w-3.5 text-destructive" />
              <span>İş Çıkışı</span>
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {gunlukDurum.cikisZamani ?? "-"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {hasCheckedOut ? "Tamamlandı" : hasCheckedIn ? "Devam ediyor" : "-"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5 text-primary" />
              <span>Vardiya</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{WORK_START_TIME}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Mesai başlangıcı</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>Durum</span>
            </div>
            <p
              className={`mt-1 text-sm font-semibold ${
                hasCheckedOut
                  ? "text-muted-foreground"
                  : hasCheckedIn
                    ? "text-success"
                    : gecikme
                      ? "text-destructive"
                      : "text-muted-foreground"
              }`}
            >
              {hasCheckedOut
                ? "Tamamlandı"
                : hasCheckedIn
                  ? "Çalışıyor"
                  : gecikme
                    ? "Giriş Yok"
                    : "Henüz Başlamadı"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Calendar className="h-4 w-4 text-warning" />
            Bekleyen İzin Taleplerim
            {pendingLeaves.length > 0 && (
              <Badge className="ml-auto border-warning/30 bg-warning/20 text-warning">
                {pendingLeaves.length}
              </Badge>
            )}
          </h3>

          {pendingLeaves.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Bekleyen talep yok
            </p>
          ) : (
            <div className="space-y-2">
              {pendingLeaves.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {getLeaveTypeLabel(r.izin_turu)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.baslangic).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                      {" - "}
                      {new Date(r.bitis).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-warning/30 bg-warning/10 text-xs text-warning"
                  >
                    Beklemede
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="border-border p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Onaylanan İzinlerim
          </h3>

          {approvedLeaves.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Onaylanan izin yok
            </p>
          ) : (
            <div className="space-y-2">
              {approvedLeaves.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {getLeaveTypeLabel(r.izin_turu)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.baslangic).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                      {" - "}
                      {new Date(r.bitis).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-success/30 bg-success/10 text-xs text-success"
                  >
                    Onaylandı
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function ActivityIcon({
  color,
  Icon,
}: {
  color: "success" | "primary" | "warning"
  Icon: any
}) {
  const className =
    color === "success"
      ? "bg-success/20 text-success"
      : color === "primary"
        ? "bg-primary/20 text-primary"
        : "bg-warning/20 text-warning"

  return (
    <div className={`mt-0.5 rounded-full p-1.5 ${className}`}>
      <Icon className="h-3 w-3" />
    </div>
  )
}

function YoneticiDashboard() {
  const activeEmployees = employees.filter((e) => e.status === "active").length
  const remoteEmployees = employees.filter((e) => e.status === "remote").length
  const onLeaveEmployees = employees.filter((e) => e.status === "on-leave").length
  const pendingLeaves = leaveRequests.filter((r) => r.status === "pending").length
  const availableAssets = assets.filter((a) => a.status === "musait").length
  const totalAssetValue = assets.reduce((sum, a) => sum + a.value, 0)

  const recentLeaveRequests = leaveRequests
    .filter((r) => r.status === "pending")
    .slice(0, 3)

  const departmentCounts = employees.reduce(
    (acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const departmentData = Object.entries(departmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const employeeCount = Math.max(employees.length, 1)

  const activities = [
    {
      icon: Users,
      color: "success" as const,
      title: "Yeni çalışan işe başladı",
      desc: "Emre Yıldız mühendislik ekibine katıldı",
      time: "2 saat önce",
    },
    {
      icon: Package,
      color: "primary" as const,
      title: "Varlık atandı",
      desc: "MacBook Pro Can Öztürk'e atandı",
      time: "5 saat önce",
    },
    {
      icon: Calendar,
      color: "warning" as const,
      title: "İzin talebi gönderildi",
      desc: "Ayşe Yılmaz yıllık izin talep etti",
      time: "1 gün önce",
    },
    {
      icon: Calendar,
      color: "success" as const,
      title: "İzin onaylandı",
      desc: "Mehmet Kaya'nın tatili onaylandı",
      time: "2 gün önce",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Toplam Çalışan</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {employees.length}
              </p>
              <div className="mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-success" />
                <span className="text-xs text-success">+12%</span>
                <span className="text-xs text-muted-foreground">geçen aya göre</span>
              </div>
            </div>
            <div className="rounded-xl bg-primary/20 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bekleyen İzinler</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {pendingLeaves}
              </p>
              <div className="mt-2 flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-destructive" />
                <span className="text-xs text-destructive">-8%</span>
                <span className="text-xs text-muted-foreground">geçen haftaya göre</span>
              </div>
            </div>
            <div className="rounded-xl bg-warning/20 p-3">
              <Calendar className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Müsait Varlıklar</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {availableAssets}
              </p>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  toplam {assets.length} adet
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-success/20 p-3">
              <Package className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Varlık Değeri</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {(totalAssetValue / 1000).toFixed(0)}k TL
              </p>
              <div className="mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-success" />
                <span className="text-xs text-success">+5%</span>
                <span className="text-xs text-muted-foreground">bu çeyrek</span>
              </div>
            </div>
            <div className="rounded-xl bg-primary/20 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">İş Gücü Durumu</h3>
            <Badge variant="outline" className="border-border bg-secondary text-xs">
              Bugün
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aktif</span>
                <span className="font-medium text-foreground">{activeEmployees}</span>
              </div>
              <Progress value={(activeEmployees / employeeCount) * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uzaktan</span>
                <span className="font-medium text-foreground">{remoteEmployees}</span>
              </div>
              <Progress
                value={(remoteEmployees / employeeCount) * 100}
                className="h-2 [&>div]:bg-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">İzinli</span>
                <span className="font-medium text-foreground">{onLeaveEmployees}</span>
              </div>
              <Progress
                value={(onLeaveEmployees / employeeCount) * 100}
                className="h-2 [&>div]:bg-warning"
              />
            </div>
          </div>
        </Card>

        <Card className="border-border p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Bekleyen İzin Talepleri</h3>
            <Badge
              variant="outline"
              className="border-warning/30 bg-warning/20 text-xs text-warning"
            >
              {pendingLeaves} beklemede
            </Badge>
          </div>

          {recentLeaveRequests.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Bekleyen talep yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeaveRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 rounded-lg bg-secondary/50 p-3"
                >
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-secondary text-sm text-secondary-foreground">
                      {getInitials(request.employeeName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {request.employeeName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.startDate).toLocaleDateString("tr-TR", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" - "}
                      {new Date(request.endDate).toLocaleDateString("tr-TR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="border-border bg-secondary text-xs capitalize"
                  >
                    {getLeaveTypeLabel(request.type)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Departman Dağılımı</h3>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {departmentData.map(([dept, count]) => (
              <div key={dept} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-foreground">{dept}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} çalışan
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(count / employeeCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Son Aktiviteler</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-4">
            {activities.map((item, i) => (
              <div key={`${item.title}-${i}`} className="flex items-start gap-3">
                <ActivityIcon color={item.color} Icon={item.icon} />
                <div>
                  <p className="text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export function DashboardOverview() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const isYonetici = YONETICI_ROLLER.includes(profile?.role ?? "")

  const [personelId, setPersonelId] = useState<string | null>(null)
  const [personelAd, setPersonelAd] = useState("")

  useEffect(() => {
    let mounted = true

    async function personelGetir() {
      if (!profile || isYonetici) return

      const { data } = await supabase
        .from("personeller")
        .select("id, ad, soyad")
        .or(`auth_id.eq.${profile.id},kullanici_id.eq.${profile.id}`)
        .maybeSingle()

      if (!mounted || !data) return

      setPersonelId(data.id)
      setPersonelAd(`${data.ad ?? ""} ${data.soyad ?? ""}`.trim())
    }

    personelGetir()

    return () => {
      mounted = false
    }
  }, [isYonetici, profile, supabase])

  const currentUserName = personelAd || profile?.fullName || profile?.email || "Merhaba"

  if (isYonetici) return <YoneticiDashboard />

  return <CalisanDashboard currentUserName={currentUserName} personelId={personelId} />
}
