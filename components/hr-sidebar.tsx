"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  Calendar,
  Package,
  LayoutDashboard,
  Settings,
  Bell,
  LogOut,
  Building2,
  FileText,
  AlertTriangle,
  FolderOpen,
  UserPlus2,
  CalendarCheck,
  Clock,
  CalendarRange,
  Star,
  Timer,
  Receipt,
  Truck,
  Wrench,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { ROLE_LABELS } from "@/lib/modules"

type NavItem = {
  title: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const navigationItems: NavGroup[] = [
  {
    title: "Genel Bakış",
    items: [{ title: "Panel", icon: LayoutDashboard }],
  },
  {
    title: "İK Yönetimi",
    items: [
      { title: "Çalışanlar", icon: Users },
      { title: "İzin Talepleri", icon: Calendar },
      { title: "Varlıklar", icon: Package },
      { title: "Satışlar", icon: Receipt },
      { title: "Disiplin Kayıtları", icon: AlertTriangle },
      { title: "Belge Takibi", icon: FolderOpen },
      { title: "İşe Giriş", icon: UserPlus2 },
      { title: "Puantaj", icon: CalendarCheck },
      { title: "Vardiya Planı", icon: CalendarRange },
      { title: "Giriş Çıkış", icon: Clock },
      { title: "Performans Değerlendirme", icon: Star },
      { title: "Fazla Mesai", icon: Timer },
    ],
  },
  {
    title: "Servis Operasyonu",
    items: [
      { title: "Araçlar", icon: Truck },
      { title: "Belge Arşivi", icon: FolderOpen },
      { title: "Teknik Destek", icon: Wrench },
    ],
  },
  {
    title: "İdare",
    items: [
      { title: "Departmanlar", icon: Building2 },
      { title: "Raporlar", icon: FileText },
      { title: "Bildirimler", icon: Bell },
      { title: "Ayarlar", icon: Settings },
    ],
  },
]

const CALISANLAR_IZINLI_ROLLER = ["admin", "servis_yoneticisi", "ik_yoneticisi"]

type HRSidebarProps = {
  activeSection: string
  onSectionChange: (section: string) => void
}

function initialsFrom(fullName?: string, email?: string): string {
  if (fullName) {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (email ?? "K").slice(0, 2).toUpperCase()
}

export function HRSidebar({ activeSection, onSectionChange }: HRSidebarProps) {
  const { profile, signOut, permittedModules } = useAuth()

  const filteredGroups = useMemo(() => {
    return navigationItems
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.title === "Panel") return true

          if (item.title === "Çalışanlar") {
            return CALISANLAR_IZINLI_ROLLER.includes(profile?.role ?? "")
          }

          return permittedModules.includes(item.title as any)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [profile?.role, permittedModules])

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = {}

      for (const group of filteredGroups) {
        const hasActiveItem = group.items.some((item) => item.title === activeSection)
        next[group.title] = prev[group.title] ?? hasActiveItem
      }

      return next
    })
  }, [filteredGroups, activeSection])

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const displayName = profile?.fullName?.trim() || profile?.email || "Kullanıcı"
  const roleLabel = profile ? ROLE_LABELS[profile.role] : ""

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Fey Teknik – Lunapark Servis
            </h2>
            <p className="text-xs text-muted-foreground">Yönetim Paneli</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="shrink-0" />

      <SidebarContent className="flex-1 min-h-0 overflow-y-auto">
        {filteredGroups.map((group) => {
          const isOpen = openGroups[group.title] ?? false

          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel
                className="text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center justify-between"
                onClick={() => toggleGroup(group.title)}
              >
                <span>{group.title}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </SidebarGroupLabel>

              {isOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={activeSection === item.title}
                          onClick={() => onSectionChange(item.title)}
                          className="gap-3"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarSeparator className="shrink-0" />

      <SidebarFooter className="p-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src="/placeholder.svg" alt={displayName} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              {initialsFrom(profile?.fullName ?? undefined, profile?.email ?? "")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
            title="Çıkış Yap"
            aria-label="Çıkış Yap"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
