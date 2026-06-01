"use client"

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react"
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Package,
  ShieldAlert,
  Clock,
  FileSignature,
  Gavel,
  type LucideIcon,
} from "lucide-react"

export type NotificationType =
  | "izin-talebi"
  | "izin-onaylandi"
  | "izin-reddedildi"
  | "belge-suresi-yaklasan"
  | "belge-suresi-doldu"
  | "zimmet-teslim"
  | "disiplin-kaydi"
  | "ise-giris-gec"
  | "savunma-talebi"
  | "savunma-alindi"
  | "savunma-suresi-doldu"
  | "disiplin-karari"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  createdAt: string // ISO timestamp
  read: boolean
  relatedSection?: string // e.g. "Izin Talepleri"
}

export interface NotificationTypeConfig {
  type: NotificationType
  label: string
  description: string
  icon: LucideIcon
  /** Tailwind text color class */
  iconColor: string
  /** Tailwind background tint class for icon wrapper */
  iconBg: string
  /** Tailwind border class for category chips */
  borderTint: string
}

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  "izin-talebi": {
    type: "izin-talebi",
    label: "Izin Talebi",
    description: "Yeni bir izin talebi olusturuldugunda bildirim al",
    icon: Calendar,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/15",
    borderTint: "border-sky-500/30",
  },
  "izin-onaylandi": {
    type: "izin-onaylandi",
    label: "Izin Onaylandi",
    description: "Izin talebiniz onaylandiginda bildirim al",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    borderTint: "border-emerald-500/30",
  },
  "izin-reddedildi": {
    type: "izin-reddedildi",
    label: "Izin Reddedildi",
    description: "Izin talebiniz reddedildiginde bildirim al",
    icon: XCircle,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/15",
    borderTint: "border-rose-500/30",
  },
  "belge-suresi-yaklasan": {
    type: "belge-suresi-yaklasan",
    label: "Belge Suresi Yaklasan",
    description: "Belge suresi dolmak uzere oldugunda bildirim al",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/15",
    borderTint: "border-amber-500/30",
  },
  "belge-suresi-doldu": {
    type: "belge-suresi-doldu",
    label: "Belge Suresi Doldu",
    description: "Bir belgenin suresi dolduğunda bildirim al",
    icon: AlertOctagon,
    iconColor: "text-red-400",
    iconBg: "bg-red-500/15",
    borderTint: "border-red-500/30",
  },
  "zimmet-teslim": {
    type: "zimmet-teslim",
    label: "Zimmet Teslim",
    description: "Yeni bir zimmet atandiginda bildirim al",
    icon: Package,
    iconColor: "text-primary",
    iconBg: "bg-primary/15",
    borderTint: "border-primary/30",
  },
  "disiplin-kaydi": {
    type: "disiplin-kaydi",
    label: "Disiplin Kaydi",
    description: "Yeni bir disiplin kaydi olusturuldugunda bildirim al",
    icon: ShieldAlert,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/15",
    borderTint: "border-orange-500/30",
  },
  "ise-giris-gec": {
    type: "ise-giris-gec",
    label: "Ise Giris Gec",
    description: "Bir personel ise gec geldiğinde bildirim al",
    icon: Clock,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/15",
    borderTint: "border-yellow-500/30",
  },
  "savunma-talebi": {
    type: "savunma-talebi",
    label: "Savunma Talebi",
    description: "Size bir savunma talebi iletildiginde bildirim al",
    icon: FileSignature,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/15",
    borderTint: "border-indigo-500/30",
  },
  "savunma-alindi": {
    type: "savunma-alindi",
    label: "Savunma Alindi",
    description: "Bir personel savunmasini gonderdiginde bildirim al",
    icon: FileSignature,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/15",
    borderTint: "border-cyan-500/30",
  },
  "savunma-suresi-doldu": {
    type: "savunma-suresi-doldu",
    label: "Savunma Suresi Doldu",
    description: "2 is gunu icinde savunma yapilmadiginda bildirim al",
    icon: AlertOctagon,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/15",
    borderTint: "border-rose-500/30",
  },
  "disiplin-karari": {
    type: "disiplin-karari",
    label: "Disiplin Karari",
    description: "Yonetici disiplin karari verdiginde bildirim al",
    icon: Gavel,
    iconColor: "text-fuchsia-400",
    iconBg: "bg-fuchsia-500/15",
    borderTint: "border-fuchsia-500/30",
  },
}

export const NOTIFICATION_TYPES = Object.values(NOTIFICATION_CONFIG)

// Seed demo notifications. Anchored against a recent "now" so "time ago" looks realistic.
const now = Date.now()
const minute = 60 * 1000
const hour = 60 * minute
const day = 24 * hour

const initialNotifications: Notification[] = [
  {
    id: "n-1",
    type: "izin-talebi",
    title: "Yeni Izin Talebi",
    description: "Ayse Yilmaz, 20-27 Nisan tarihleri arasi yillik izin talebi olusturdu.",
    createdAt: new Date(now - 12 * minute).toISOString(),
    read: false,
    relatedSection: "Izin Talepleri",
  },
  {
    id: "n-2",
    type: "ise-giris-gec",
    title: "Gec Giris Bildirimi",
    description: "Can Ozturk bugun 09:40 itibariyle ise geç geldi.",
    createdAt: new Date(now - 55 * minute).toISOString(),
    read: false,
    relatedSection: "Giris Cikis",
  },
  {
    id: "n-3",
    type: "belge-suresi-yaklasan",
    title: "Belge Suresi Yaklasiyor",
    description: "Emre Yildiz - Saglik Raporu 15 Nisan 2026 tarihinde dolacak.",
    createdAt: new Date(now - 3 * hour).toISOString(),
    read: false,
    relatedSection: "Belge Takibi",
  },
  {
    id: "n-4",
    type: "izin-onaylandi",
    title: "Izin Onaylandi",
    description: "Mehmet Kaya'nin 1-5 Mart izin talebi onaylandi.",
    createdAt: new Date(now - 5 * hour).toISOString(),
    read: false,
    relatedSection: "Izin Talepleri",
  },
  {
    id: "n-5",
    type: "zimmet-teslim",
    title: "Yeni Zimmet Teslimi",
    description: "Elif Demir'e iPad Pro 12.9\" zimmetlendi.",
    createdAt: new Date(now - 8 * hour).toISOString(),
    read: true,
    relatedSection: "Varliklar",
  },
  {
    id: "n-6",
    type: "izin-reddedildi",
    title: "Izin Reddedildi",
    description: "Zeynep Arslan'in 14 Subat izin talebi yogun is donemi nedeniyle reddedildi.",
    createdAt: new Date(now - 1 * day - 2 * hour).toISOString(),
    read: true,
    relatedSection: "Izin Talepleri",
  },
  {
    id: "n-7",
    type: "disiplin-kaydi",
    title: "Yeni Disiplin Kaydi",
    description: "Emre Yildiz - guvenlik ekipmanlari kullanmama nedeniyle uyari kaydi olusturuldu.",
    createdAt: new Date(now - 2 * day).toISOString(),
    read: true,
    relatedSection: "Disiplin Kayitlari",
  },
  {
    id: "n-8",
    type: "belge-suresi-doldu",
    title: "Belge Suresi Doldu",
    description: "Zeynep Arslan - ISG Sertifikasi'nin suresi doldu. Acil yenileme gerekli.",
    createdAt: new Date(now - 3 * day - 4 * hour).toISOString(),
    read: true,
    relatedSection: "Belge Takibi",
  },
  {
    id: "n-9",
    type: "zimmet-teslim",
    title: "Zimmet Iade",
    description: "Zeynep Arslan laptop ve telefonunu iade etti.",
    createdAt: new Date(now - 5 * day).toISOString(),
    read: true,
    relatedSection: "Varliklar",
  },
  {
    id: "n-10",
    type: "izin-talebi",
    title: "Yeni Izin Talebi",
    description: "Burak Celik, 22 Nisan icin mazeret izni talebi olusturdu.",
    createdAt: new Date(now - 6 * day).toISOString(),
    read: true,
    relatedSection: "Izin Talepleri",
  },
  {
    id: "n-11",
    type: "ise-giris-gec",
    title: "Gec Giris Bildirimi",
    description: "Mehmet Kaya 09:23 itibariyle ise gec geldi.",
    createdAt: new Date(now - 8 * day).toISOString(),
    read: true,
    relatedSection: "Giris Cikis",
  },
  {
    id: "n-12",
    type: "belge-suresi-yaklasan",
    title: "Belge Suresi Yaklasiyor",
    description: "Ayse Yilmaz - SRC Belgesi 20 Nisan 2026 tarihinde dolacak.",
    createdAt: new Date(now - 10 * day).toISOString(),
    read: true,
    relatedSection: "Belge Takibi",
  },
]

type NotificationSettings = Record<NotificationType, boolean>

const defaultSettings: NotificationSettings = {
  "izin-talebi": true,
  "izin-onaylandi": true,
  "izin-reddedildi": true,
  "belge-suresi-yaklasan": true,
  "belge-suresi-doldu": true,
  "zimmet-teslim": true,
  "disiplin-kaydi": true,
  "ise-giris-gec": true,
  "savunma-talebi": true,
  "savunma-alindi": true,
  "savunma-suresi-doldu": true,
  "disiplin-karari": true,
}

interface NotificationsContextValue {
  notifications: Notification[]
  unreadCount: number
  settings: NotificationSettings
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  updateSetting: (type: NotificationType, enabled: boolean) => void
  addNotification: (
    input: Omit<Notification, "id" | "createdAt" | "read"> & {
      read?: boolean
      createdAt?: string
    },
  ) => Notification
  goToSection?: (section: string) => void
  setGoToSection: (fn: ((section: string) => void) | undefined) => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [goToSection, setGoToSection] = useState<((section: string) => void) | undefined>(undefined)

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const updateSetting = useCallback((type: NotificationType, enabled: boolean) => {
    setSettings((prev) => ({ ...prev, [type]: enabled }))
  }, [])

  const addNotification = useCallback(
    (
      input: Omit<Notification, "id" | "createdAt" | "read"> & {
        read?: boolean
        createdAt?: string
      },
    ): Notification => {
      const created: Notification = {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: input.createdAt ?? new Date().toISOString(),
        read: input.read ?? false,
        type: input.type,
        title: input.title,
        description: input.description,
        relatedSection: input.relatedSection,
      }
      setNotifications((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const handleSetGoToSection = useCallback(
    (fn: ((section: string) => void) | undefined) => {
      setGoToSection(() => fn)
    },
    [],
  )

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      settings,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      updateSetting,
      addNotification,
      goToSection,
      setGoToSection: handleSetGoToSection,
    }),
    [
      notifications,
      unreadCount,
      settings,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      updateSetting,
      addNotification,
      goToSection,
      handleSetGoToSection,
    ],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return ctx
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return "az once"
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "az once"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} dk once`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa once`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gun once`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} hafta once`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ay once`
  const years = Math.floor(days / 365)
  return `${years} yil once`
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
