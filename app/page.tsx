"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldAlert } from "lucide-react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { HRSidebar } from "@/components/hr-sidebar"
import { DashboardOverview } from "@/components/dashboard-overview"
import { EmployeeList } from "@/components/employee-list"
import { LeaveRequests } from "@/components/leave-requests"
import { AssetTracking } from "@/components/asset-tracking"
import { SalesTracking } from "@/components/sales-tracking"
import { DisciplineRecords } from "@/components/discipline-records"
import { DocumentTracking } from "@/components/document-tracking"
import { Onboarding } from "@/components/onboarding"
import { Timesheet } from "@/components/timesheet"
import { ShiftSchedule } from "@/components/shift-schedule"
import { CheckInOut } from "@/components/check-in-out"
import { Reports } from "@/components/reports"
import { NotificationsPage } from "@/components/notifications-page"
import { NotificationBell } from "@/components/notification-bell"
import { DepartmentsPage } from "@/components/departments-page"
import { SettingsPage } from "@/components/settings-page"
import { PerformanceReviews } from "@/components/performance-reviews"
import { OvertimeTracking } from "@/components/overtime-tracking"
import { AraclarSection } from "@/components/araclar-section"
import { BelgeArsiviSection } from "@/components/belge-arsivi-section"
import { TeknikDestekPanel } from "@/components/teknik-destek-panel"
import { RolYonetimi } from "@/components/rol-yonetimi"
import { NotificationsProvider, useNotifications } from "@/lib/notifications-context"
import { SettingsStoreProvider } from "@/lib/settings-store"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { useAuth } from "@/lib/auth-context"

const sectionAliases: Record<string, string> = {
  "Genel Bakış": "Panel",
  "Genel Bakis": "Panel",

  "Çalışanlar": "Calisanlar",
  Calisanlar: "Calisanlar",

  "İzin Talepleri": "Izin Talepleri",
  "Izin Talepleri": "Izin Talepleri",

  Varlıklar: "Varliklar",
  Varliklar: "Varliklar",

  Satışlar: "Satislar",
  Satislar: "Satislar",

  "Disiplin Kayıtları": "Disiplin Kayitlari",
  "Disiplin Kayitlari": "Disiplin Kayitlari",

  "Belge Takibi": "Belge Takibi",

  "İşe Giriş": "Ise Giris",
  "Ise Giris": "Ise Giris",

  Puantaj: "Puantaj",

  "Vardiya Planı": "Vardiya Plani",
  "Vardiya Plani": "Vardiya Plani",

  "Giriş Çıkış": "Giris Cikis",
  "Giris Cikis": "Giris Cikis",

  "Performans Değerlendirme": "Performans Degerlendirme",
  "Performans Degerlendirme": "Performans Degerlendirme",

  "Fazla Mesai": "Fazla Mesai",

  Bildirimler: "Bildirimler",
  Departmanlar: "Departmanlar",
  Raporlar: "Raporlar",
  Ayarlar: "Ayarlar",

  Araçlar: "Araclar",
  Araclar: "Araclar",

  "Rol Yönetimi": "Rol Yonetimi",
  "Rol Yonetimi": "Rol Yonetimi",

  "Belge Arşivi": "Belge Arsivi",
  "Belge Arsivi": "Belge Arsivi",

  "Teknik Destek": "Teknik Destek",
}

function normalizeSection(section: string) {
  return sectionAliases[section] ?? section
}

const sectionTitles: Record<string, string> = {
  Panel: "Genel Bakış Paneli",
  Calisanlar: "Çalışanlar",
  "Izin Talepleri": "İzin Yönetimi",
  Varliklar: "Varlık Takibi",
  Satislar: "Satış Takibi",
  "Disiplin Kayitlari": "Disiplin Yönetimi",
  "Belge Takibi": "Belge Takibi",
  "Ise Giris": "İşe Giriş ve Çıkış Yönetimi",
  Puantaj: "Aylık Puantaj",
  "Vardiya Plani": "Vardiya Planı",
  "Giris Cikis": "Giriş / Çıkış Kaydı",
  "Performans Degerlendirme": "Performans Değerlendirme",
  "Fazla Mesai": "Fazla Mesai Takibi",
  Bildirimler: "Bildirimler",
  Departmanlar: "Departman Yönetimi",
  Raporlar: "Raporlar ve Analizler",
  Ayarlar: "Sistem Ayarları",
  Araclar: "Araçlar",
  "Rol Yonetimi": "Rol Yönetimi",
  "Belge Arsivi": "Belge Arşivi",
  "Teknik Destek": "Teknik Destek",
}

export default function HRDashboard() {
  return (
    <SettingsStoreProvider>
      <NotificationsProvider>
        <HRDashboardInner />
      </NotificationsProvider>
    </SettingsStoreProvider>
  )
}

function HRDashboardInner() {
  const router = useRouter()
  const { loading, profile, permittedModules, can } = useAuth()
  const [activeSection, setActiveSection] = useState("Panel")
  const { setGoToSection } = useNotifications()

  const activeKey = normalizeSection(activeSection)

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login")
    }
  }, [loading, profile, router])

  const firstAllowed = useMemo(
    () => permittedModules[0] ?? "Panel",
    [permittedModules],
  )

  useEffect(() => {
    if (!permittedModules.length) return

    if (
      profile?.role !== "admin" &&
      activeKey !== "Rol Yonetimi" &&
      !permittedModules.includes(activeKey as (typeof permittedModules)[number])
    ) {
      setActiveSection(firstAllowed)
    }
  }, [permittedModules, activeKey, firstAllowed, profile?.role])

  useEffect(() => {
    setGoToSection((section: string) => {
      const normalized = normalizeSection(section)

      if (sectionTitles[normalized] && can(normalized)) {
        setActiveSection(normalized)
      }
    })

    return () => setGoToSection(undefined)
  }, [setGoToSection, can])

  if (loading || !profile) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background pt-[env(safe-area-inset-top)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  const renderContent = () => {
    if (!can(activeKey)) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Bu bölüme erişiminiz yok
            </h2>
            <p className="text-sm text-muted-foreground">
              {sectionTitles[activeKey] ?? activeKey} bölümünü görüntülemek için
              gerekli izne sahip değilsiniz. Lütfen yönetici ile iletişime geçin.
            </p>
          </div>
        </div>
      )
    }

    switch (activeKey) {
      case "Panel":
        return <DashboardOverview />
      case "Calisanlar":
        return <EmployeeList />
      case "Izin Talepleri":
        return <LeaveRequests />
      case "Varliklar":
        return <AssetTracking />
      case "Satislar":
        return <SalesTracking />
      case "Disiplin Kayitlari":
        return <DisciplineRecords />
      case "Belge Takibi":
        return <DocumentTracking />
      case "Ise Giris":
        return <Onboarding />
      case "Puantaj":
        return <Timesheet />
      case "Vardiya Plani":
        return <ShiftSchedule />
      case "Giris Cikis":
        return <CheckInOut />
      case "Performans Degerlendirme":
        return <PerformanceReviews />
      case "Fazla Mesai":
        return <OvertimeTracking />
      case "Bildirimler":
        return <NotificationsPage />
      case "Departmanlar":
        return <DepartmentsPage />
      case "Ayarlar":
        return <SettingsPage />
      case "Raporlar":
        return <Reports />
      case "Araclar":
        return <AraclarSection />
      case "Rol Yonetimi":
        return <RolYonetimi />
      case "Belge Arsivi":
        return <BelgeArsiviSection />
      case "Teknik Destek":
        return <TeknikDestekPanel />
      default:
        return (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {sectionTitles[activeKey] || activeKey}
              </h2>
              <p className="text-muted-foreground">
                Bu bölüm geliştirme aşamasındadır.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <SidebarProvider>
      <HRSidebar
        activeSection={activeSection}
        onSectionChange={(section) => setActiveSection(normalizeSection(section))}
      />

      <SidebarInset className="min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-80 flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mr-2 h-5" />

          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate text-base font-semibold text-foreground">
                  {sectionTitles[activeKey] || activeKey}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {can("Bildirimler") && (
              <NotificationBell onOpenAll={() => setActiveSection("Bildirimler")} />
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {renderContent()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}