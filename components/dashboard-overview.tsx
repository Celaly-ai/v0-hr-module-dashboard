"use client"

import { useCallback, useEffect, useState } from "react"
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
  return name.split(" ").map((n) => n[0]).join("").toUpperCase()
}

function getLeaveTypeLabel(type: string) {
  switch (type) {
    case "vacation": case "Yillik Izin": return "Yıllık İzin"
    case "sick": case "Hastalik": return "Hastalık"
    case "personal": case "Mazeret": return "Mazeret"
    default: return type
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

// ====================== CALISAN PANELİ ======================
function CalisanDashboard({ currentUserName, personelId }: { currentUserName: string; personelId: string | null }) {
  const supabase = createClient()
  const [gunlukDurum, setGunlukDurum] = useState<GunlukDurum>({ girisZamani: null, cikisZamani: null })
  const [izinler, setIzinler] = useState<SupabaseIzin[]>([])
  const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
    if (!personelId) { setLoading(false); return }
    setLoading(true)


    const bugun = new Date().toISOString().slice(0, 10)
    const baslangic = `${bugun}T00:00:00`
    const bitis = `${bugun}T23:59:59`

    // Bugünkü giriş/çıkış
    const { data: kayitlar } = await supabase
      .from("giris_cikis_kayitlari")
      .select("tip, created_at")
      .eq("personel_id", personelId)
      .gte("created_at", baslangic)
      .lte("created_at", bitis)
      .order("created_at", { ascending: true })

    if (kayitlar) {
      const giris = kayitlar.find((k) => k.tip === "giris")
      const cikis = kayitlar.find((k) => k.tip === "cikis")
      setGunlukDurum({
        girisZamani: giris ? formatTime24(new Date(giris.created_at)) : null,
        cikisZamani: cikis ? formatTime24(new Date(cikis.created_at)) : null,
      })
    }

    // İzinler
    const { data: izinData } = await supabase
      .from("izinler")
      .select("id, izin_turu, baslangic, bitis, gun_sayisi, durum")
      .eq("personel_id", personelId)
      .order("created_at", { ascending: false })

    if (izinData) setIzinler(izinData)
    setLoading(false)
  }, [personelId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pendingLeaves = izinler.filter((r) => r.durum === "bekliyor")
  const approvedLeaves = izinler.filter((r) => r.durum === "onaylandi")

  const hasCheckedIn = !!gunlukDurum.girisZamani
  const hasCheckedOut = !!gunlukDurum.cikisZamani
  const isLate = hasCheckedIn && gunlukDurum.girisZamani ? isTimeLate(gunlukDurum.girisZamani) : false
  const now = new Date()

  const [startH, startM] = WORK_START_TIME.split(":").map(Number)
  const vardiyaBaslangic = new Date()
  vardiyaBaslangic.setHours(startH, startM, 0, 0)
  const gecikme = !hasCheckedIn && now > vardiyaBaslangic

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
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
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <Card className="p-5 border-border">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Bugünkü Mesai Durumum
        </h3>

        {gecikme && !hasCheckedIn && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-destructive font-bold text-sm">
              Vardiya saati {WORK_START_TIME} — Henüz giriş yapmadınız!
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <LogIn className="h-3.5 w-3.5 text-success" />
              <span>İş Girişi</span>
            </div>
            <p className={`text-lg font-semibold tabular-nums ${hasCheckedIn ? (isLate ? "text-warning" : "text-success") : "text-muted-foreground"}`}>
              {gunlukDurum.girisZamani ?? "-"}
            </p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">
              {hasCheckedIn ? (isLate ? "Geç kalındı" : "Zamanında") : "Giriş yapılmadı"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <LogOut className="h-3.5 w-3.5 text-destructive" />
              <span>İş Çıkışı</span>
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {gunlukDurum.cikisZamani ?? "-"}
            </p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">
              {hasCheckedOut ? "Tamamlandı" : hasCheckedIn ? "Devam ediyor" : "-"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Timer className="h-3.5 w-3.5 text-primary" />
              <span>Vardiya</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{WORK_START_TIME}</p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">Mesai başlangıcı</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>Durum</span>
            </div>
            <p className={`text-sm font-semibold mt-1 ${
              hasCheckedOut ? "text-muted-foreground" :
              hasCheckedIn ? "text-success" :
              gecikme ? "text-destructive" : "text-muted-foreground"
            }`}>
              {hasCheckedOut ? "Tamamlandı" :
               hasCheckedIn ? "Çalışıyor" :
               gecikme ? "Giriş Yok" : "Henüz Başlamadı"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5 border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-warning" />
            Bekleyen İzin Taleplerim
            {pendingLeaves.length > 0 && (
              <Badge className="bg-warning/20 text-warning border-warning/30 ml-auto">{pendingLeaves.length}</Badge>
            )}
          </h3>
          {pendingLeaves.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Bekleyen talep yok</p>
          ) : (
            <div className="space-y-2">
              {pendingLeaves.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{getLeaveTypeLabel(r.izin_turu)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.baslangic).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      {" - "}
                      {new Date(r.bitis).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">Beklemede</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Onaylanan İzinlerim
          </h3>
          {approvedLeaves.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Onaylanan izin yok</p>
          ) : (
            <div className="space-y-2">
              {approvedLeaves.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{getLeaveTypeLabel(r.izin_turu)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.baslangic).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      {" - "}
                      {new Date(r.bitis).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">Onaylandi</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ====================== YÖNETİCİ PANELİ ======================
function YoneticiDashboard() {
  const activeEmployees = employees.filter((e) => e.status === "active").length
  const remoteEmployees = employees.filter((e) => e.status === "remote").length
  const onLeaveEmployees = employees.filter((e) => e.status === "on-leave").length
  const pendingLeaves = leaveRequests.filter((r) => r.status === "pending").length
  const availableAssets = assets.filter((a) => a.status === "musait").length
  const totalAssetValue = assets.reduce((sum, a) => sum + a.value, 0)
  const recentLeaveRequests = leaveRequests.filter((r) => r.status === "pending").slice(0, 3)
  const departmentCounts = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const departmentData = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Toplam Calisan</p>
              <p className="text-3xl font-semibold text-foreground mt-1">{employees.length}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="h-3 w-3 text-success" />
                <span className="text-xs text-success">+12%</span>
                <span className="text-xs text-muted-foreground">gecen aya gore</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/20"><Users className="h-6 w-6 text-primary" /></div>
          </div>
        </Card>

        <Card className="p-5 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bekleyen Izinler</p>
              <p className="text-3xl font-semibold text-foreground mt-1">{pendingLeaves}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowDownRight className="h-3 w-3 text-destructive" />
                <span className="text-xs text-destructive">-8%</span>
                <span className="text-xs text-muted-foreground">gecen haftaya gore</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-warning/20"><Calendar className="h-6 w-6 text-warning" /></div>
          </div>
        </Card>

        <Card className="p-5 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Musait Varliklar</p>
              <p className="text-3xl font-semibold text-foreground mt-1">{availableAssets}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-muted-foreground">toplam {assets.length} adet</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-success/20"><Package className="h-6 w-6 text-success" /></div>
          </div>
        </Card>

        <Card className="p-5 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Varlik Degeri</p>
              <p className="text-3xl font-semibold text-foreground mt-1">{(totalAssetValue / 1000).toFixed(0)}k TL</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="h-3 w-3 text-success" />
                <span className="text-xs text-success">+5%</span>
                <span className="text-xs text-muted-foreground">bu ceyrek</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/20"><TrendingUp className="h-6 w-6 text-primary" /></div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 border-border lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Is Gucu Durumu</h3>
            <Badge variant="outline" className="text-xs bg-secondary border-border">Bugun</Badge>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aktif</span>
                <span className="text-foreground font-medium">{activeEmployees}</span>
              </div>
              <Progress value={(activeEmployees / employees.length) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uzaktan</span>
                <span className="text-foreground font-medium">{remoteEmployees}</span>
              </div>
              <Progress value={(remoteEmployees / employees.length) * 100} className="h-2 [&>div]:bg-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Izinli</span>
                <span className="text-foreground font-medium">{onLeaveEmployees}</span>
              </div>
              <Progress value={(onLeaveEmployees / employees.length) * 100} className="h-2 [&>div]:bg-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Bekleyen Izin Talepleri</h3>
            <Badge variant="outline" className="text-xs bg-warning/20 text-warning border-warning/30">{pendingLeaves} beklemede</Badge>
          </div>
          {recentLeaveRequests.length === 0 ? (
            <div className="text-center py-8"><p className="text-muted-foreground">Bekleyen talep yok</p></div>
          ) : (
            <div className="space-y-3">
              {recentLeaveRequests.map((request) => (
                <div key={request.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">{getInitials(request.employeeName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{request.employeeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.startDate).toLocaleDateString("tr-TR", { month: "short", day: "numeric" })}
                      {" - "}
                      {new Date(request.endDate).toLocaleDateString("tr-TR", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs bg-secondary border-border">{getLeaveTypeLabel(request.type)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Departman Dagilimi</h3>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {departmentData.map(([dept, count]) => (
              <div key={dept} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{dept}</span>
                    <span className="text-sm text-muted-foreground">{count} calisan</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / employees.length) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Son Aktiviteler</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {[
              { icon: Users, color: "success", title: "Yeni calisan ise basladi", desc: "Emre Yildiz Muhendislik ekibine katildi", time: "2 saat once" },
              { icon: Package, color: "primary", title: "Varlik atandi", desc: "MacBook Pro Can Ozturk'e atandi", time: "5 saat once" },
              { icon: Calendar, color: "warning", title: "Izin talebi gonderildi", desc: "Ayse Yilmaz yillik izin talep etti", time: "1 gun once" },
              { icon: Calendar, color: "success", title: "Izin onaylandi", desc: "Mehmet Kaya'nin tatili onaylandi", time: "2 gun once" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full bg-${item.color}/20 mt-0.5`}>
                  <item.icon className={`h-3 w-3 text-${item.color}`} />
                </div>
                <div>
                  <p className="text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ====================== ANA COMPONENT ======================
export function DashboardOverview() {
  const { profile } = useAuth()
  const supabase = createClient()
  const isYonetici = YONETICI_ROLLER.includes(profile?.role ?? "")

  const [personelId, setPersonelId] = useState<string | null>(null)
  const [personelAd, setPersonelAd] = useState("")

  useEffect(() => {
    if (!profile) return
    if (isYonetici) return

    supabase.from("personeller")
      .select("id, ad, soyad")
      .or(`auth_id.eq.${profile.id},kullanici_id.eq.${profile.id}`)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setPersonelId(data.id)
        setPersonelAd(`${data.ad ?? ""} ${data.soyad ?? ""}`.trim())
      })
  }, [isYonetici, profile, supabase])

  const currentUserName = personelAd || profile?.fullName || profile?.email || "Merhaba"

  if (isYonetici) return <YoneticiDashboard />

  return <CalisanDashboard currentUserName={currentUserName} personelId={personelId} />
}
