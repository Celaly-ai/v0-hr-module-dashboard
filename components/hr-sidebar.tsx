"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  usePathname,
  useRouter,
} from "next/navigation"

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

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileText,
  FolderOpen,
  Gauge,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Link2,
  LogOut,
  MapPinned,
  Package,
  Receipt,
  Route,
  Settings,
  ShieldCheck,
  Star,
  Timer,
  Trophy,
  Truck,
  UserCog,
  UserPlus2,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react"

import { useAuth } from "@/lib/auth-context"

import {
  ROLE_LABELS,
  type AppRole,
} from "@/lib/modules"

type NavItem = {
  title: string

  icon: React.ComponentType<{
    className?: string
  }>

  href?: string

  alwaysVisible?: boolean

  allowedRoles?: AppRole[]
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const YONETICI_ROLLER: AppRole[] = [
  "admin",
  "servis_yoneticisi",
  "ik_yoneticisi",
]

const SERVIS_YONETIM_ROLLERI: AppRole[] = [
  "admin",
  "servis_yoneticisi",
]

const OPERASYON_ROLLERI: AppRole[] = [
  "admin",
  "servis_yoneticisi",
  "urun_sorumlusu",
]

const URUN_ROLLERI: AppRole[] = [
  "admin",
  "servis_yoneticisi",
  "urun_sorumlusu",
]

const ADMIN_ROLLERI: AppRole[] = [
  "admin",
]

const navigationItems: NavGroup[] = [
  {
    title: "Genel Bakış",

    items: [
      {
        title: "Panel",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "İK Yönetimi",

    items: [
      {
        title: "Çalışanlar",
        icon: Users,
        allowedRoles: YONETICI_ROLLER,
      },

      {
        title: "İzin Talepleri",
        icon: Calendar,
      },

      {
        title: "Varlıklar",
        icon: Package,
      },

      {
        title: "Satışlar",
        icon: Receipt,
      },

      {
        title: "Disiplin Kayıtları",
        icon: AlertTriangle,
      },

      {
        title: "Belge Takibi",
        icon: FolderOpen,
      },

      {
        title: "İşe Giriş",
        icon: UserPlus2,
      },

      {
        title: "Puantaj",
        icon: CalendarCheck,
      },

      {
        title: "Vardiya Planı",
        icon: CalendarRange,
      },

      {
        title: "Giriş Çıkış",
        icon: Clock,
      },

      {
        title: "Fazla Mesai",
        icon: Timer,
      },
    ],
  },

  {
    title: "Performans",

    items: [
      {
        title: "Performansım",
        icon: Trophy,
        href: "/portal/performansim",
        alwaysVisible: true,
      },

      {
        title: "Hızlı Performans",
        icon: Gauge,
        href: "/portal/hizli-performans",
        allowedRoles: SERVIS_YONETIM_ROLLERI,
      },

      {
        title: "Performans Eşleştirme",
        icon: Link2,
        href: "/portal/performans-eslestirme",
        allowedRoles: YONETICI_ROLLER,
      },

      {
        title: "Performans Değerlendirme",
        icon: Star,
      },
    ],
  },

  {
    title: "Canlı Operasyon",

    items: [
      {
        title: "AI Canlı Operasyon Merkezi",
        icon: Activity,
        href:
          "/portal/ai-canli-operasyon-merkezi",
        allowedRoles: SERVIS_YONETIM_ROLLERI,
      },

      {
        title: "AI Görev Merkezi",
        icon: Bot,
        href: "/portal/ai-gorev-merkezi",
        allowedRoles: SERVIS_YONETIM_ROLLERI,
      },

      {
        title: "Operasyon Havuzu",
        icon: Warehouse,
        href: "/portal/operasyon-havuzu",
        allowedRoles: OPERASYON_ROLLERI,
      },

      {
        title: "Operasyon Zimmet",
        icon: ClipboardCheck,
        href: "/portal/operasyon-zimmet",
        allowedRoles: OPERASYON_ROLLERI,
      },

      {
        title: "Yönetici Bildirimleri",
        icon: Bell,
        href:
          "/portal/yonetici-bildirimleri",
        allowedRoles: YONETICI_ROLLER,
      },
    ],
  },

  {
    title: "Konum ve Saha",

    items: [
      {
        title: "Adres / Konum Teyit",
        icon: MapPinned,
        href: "/portal/adres-konum-teyit",
        alwaysVisible: true,
      },

      {
        title: "Adres / Konum Rapor",
        icon: Route,
        href: "/portal/adres-konum-rapor",
        allowedRoles: YONETICI_ROLLER,
      },

      {
        title: "Canlı Konum",
        icon: MapPinned,
        href: "/portal/canli-konum",
        allowedRoles: YONETICI_ROLLER,
      },

      {
        title: "Konum Geçmişi",
        icon: Route,
        href: "/portal/konum-gecmisi",
        allowedRoles: YONETICI_ROLLER,
      },
    ],
  },

  {
    title: "Ürün Operasyonu",

    items: [
      {
        title: "Ürün Merkezi",
        icon: Boxes,
        href: "/portal/urun-merkezi",
        allowedRoles: URUN_ROLLERI,
      },

      {
        title: "Ürün Operasyon Dashboard",
        icon: BarChart3,
        href:
          "/portal/urun-operasyon-dashboard",
        allowedRoles: URUN_ROLLERI,
      },

      {
        title: "Ürün Kabul",
        icon: Package,
        href: "/portal/urun-kabul",
        allowedRoles: URUN_ROLLERI,
      },

      {
        title: "Ürün Devir",
        icon: Truck,
        href: "/portal/urun-devir",
        allowedRoles: URUN_ROLLERI,
      },

      {
        title: "Ürün Fişleri",
        icon: FileText,
        href: "/portal/urun-fisleri",
        allowedRoles: URUN_ROLLERI,
      },
    ],
  },

  {
    title: "Bayi Yönetimi",

    items: [
      {
        title: "Bayi Operasyon Merkezi",
        icon: Landmark,
        href:
          "/portal/bayi-operasyon-merkezi",
        allowedRoles: SERVIS_YONETIM_ROLLERI,
      },
    ],
  },

  {
    title: "Mali Yönetim",

    items: [
      {
        title: "Muhasebe",
        icon: Receipt,
        href: "/portal/muhasebe",
        allowedRoles: YONETICI_ROLLER,
      },
    ],
  },

  {
    title: "Kurumsal Yönetim",

    items: [
      {
        title: "KYM",
        icon: ShieldCheck,
        href: "/kym",
        allowedRoles: YONETICI_ROLLER,
      },

      {
        title: "Şirket Künyesi",
        icon: Building2,
        href: "/portal/sirket-kunyesi",
        allowedRoles: ADMIN_ROLLERI,
      },

      {
        title: "Belge Arşivi",
        icon: FolderOpen,
        href: "/portal/belge-arsivi",
        allowedRoles: YONETICI_ROLLER,
      },
    ],
  },

  {
    title: "Yetki ve Sistem",

    items: [
      {
        title: "Rol Atama",
        icon: UserCog,
        href: "/portal/rol-atama",
        allowedRoles: ADMIN_ROLLERI,
      },

      {
        title: "Yetki Yönetimi",
        icon: KeyRound,
        href: "/portal/yetki-yonetimi",
        allowedRoles: ADMIN_ROLLERI,
      },

      {
        title: "Rol Geçmişi",
        icon: FileCheck2,
        href: "/portal/rol-gecmisi",
        allowedRoles: ADMIN_ROLLERI,
      },

      {
        title: "Ayarlar",
        icon: Settings,
      },
    ],
  },

  {
    title: "Servis Operasyonu",

    items: [
      {
        title: "Araçlar",
        icon: Truck,
      },

      {
        title: "Teknik Destek",
        icon: Wrench,
      },
    ],
  },

  {
    title: "İdare",

    items: [
      {
        title: "Departmanlar",
        icon: Building2,
      },

      {
        title: "Raporlar",
        icon: FileText,
      },

      {
        title: "Bildirimler",
        icon: Bell,
      },
    ],
  },
]

type HRSidebarProps = {
  activeSection: string

  onSectionChange: (
    section: string,
  ) => void
}

function initialsFrom(
  fullName?: string,
  email?: string,
): string {
  if (fullName) {
    return fullName
      .split(" ")
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    email ?? "K"
  )
    .slice(0, 2)
    .toUpperCase()
}

function roleAllowed(
  item: NavItem,
  role?: AppRole,
): boolean {
  if (!item.allowedRoles) {
    return true
  }

  if (!role) {
    return false
  }

  return item.allowedRoles.includes(role)
}

export function HRSidebar({
  activeSection,
  onSectionChange,
}: HRSidebarProps) {
  const router = useRouter()

  const pathname = usePathname()

  const {
    profile,
    signOut,
    permittedModules,
  } = useAuth()

  const filteredGroups = useMemo(() => {
    const role =
      profile?.role as AppRole | undefined

    return navigationItems
      .map((group) => ({
        ...group,

        items: group.items.filter(
          (item) => {
            if (
              !roleAllowed(
                item,
                role,
              )
            ) {
              return false
            }

            if (
              item.title === "Panel"
            ) {
              return true
            }

            if (
              item.alwaysVisible
            ) {
              return true
            }

            if (
              item.allowedRoles
            ) {
              return true
            }

            return permittedModules.includes(
              item.title as never,
            )
          },
        ),
      }))
      .filter(
        (group) =>
          group.items.length > 0,
      )
  }, [
    profile?.role,
    permittedModules,
  ])

  const [
    openGroups,
    setOpenGroups,
  ] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    setOpenGroups((previous) => {
      const next: Record<
        string,
        boolean
      > = {}

      for (
        const group of filteredGroups
      ) {
        const hasActiveSection =
          group.items.some(
            (item) =>
              item.title ===
              activeSection,
          )

        const hasCurrentRoute =
          group.items.some((item) => {
            if (!item.href) {
              return false
            }

            return (
              pathname === item.href ||
              pathname.startsWith(
                `${item.href}/`,
              )
            )
          })

        next[group.title] =
          previous[group.title] ??
          (
            hasActiveSection ||
            hasCurrentRoute
          )
      }

      return next
    })
  }, [
    filteredGroups,
    activeSection,
    pathname,
  ])

  function toggleGroup(
    title: string,
  ) {
    setOpenGroups((previous) => ({
      ...previous,

      [title]:
        !previous[title],
    }))
  }

  function handleItemClick(
    item: NavItem,
  ) {
    if (item.href) {
      router.push(item.href)

      return
    }

    onSectionChange(item.title)
  }

  const displayName =
    profile?.fullName?.trim() ||
    profile?.email ||
    "Kullanıcı"

  const roleLabel = profile
    ? ROLE_LABELS[profile.role]
    : ""

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="shrink-0 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">
              FeyRoute
            </h2>

            <p className="text-xs text-muted-foreground">
              Yönetim Merkezi
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="shrink-0" />

      <SidebarContent className="min-h-0 flex-1 overflow-y-auto">
        {filteredGroups.map(
          (group) => {
            const isOpen =
              openGroups[group.title] ??
              false

            return (
              <SidebarGroup
                key={group.title}
              >
                <SidebarGroupLabel
                  className="flex cursor-pointer items-center justify-between text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() =>
                    toggleGroup(
                      group.title,
                    )
                  }
                >
                  <span>
                    {group.title}
                  </span>

                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isOpen
                        ? "rotate-0"
                        : "-rotate-90"
                    }`}
                  />
                </SidebarGroupLabel>

                {isOpen && (
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map(
                        (item) => {
                          const routeActive =
                            !!item.href &&
                            (
                              pathname ===
                                item.href ||
                              pathname.startsWith(
                                `${item.href}/`,
                              )
                            )

                          const isActive =
                            activeSection ===
                              item.title ||
                            routeActive

                          return (
                            <SidebarMenuItem
                              key={
                                item.title
                              }
                            >
                              <SidebarMenuButton
                                isActive={
                                  isActive
                                }
                                onClick={() =>
                                  handleItemClick(
                                    item,
                                  )
                                }
                                className="gap-3"
                              >
                                <item.icon className="h-4 w-4" />

                                <span>
                                  {
                                    item.title
                                  }
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        },
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            )
          },
        )}
      </SidebarContent>

      <SidebarSeparator className="shrink-0" />

      <SidebarFooter className="shrink-0 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage
              src="/placeholder.svg"
              alt={displayName}
            />

            <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
              {initialsFrom(
                profile?.fullName ??
                  undefined,

                profile?.email ?? "",
              )}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              {roleLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void signOut()
            }
            className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-accent"
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