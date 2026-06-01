"use client"

import { useMemo, useState } from "react"
import { Bell, Check, X, Filter, Settings2, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  useNotifications,
  NOTIFICATION_CONFIG,
  NOTIFICATION_TYPES,
  formatTimeAgo,
  formatFullDate,
  type Notification,
  type NotificationType,
} from "@/lib/notifications-context"
import { cn } from "@/lib/utils"

type DateRangeFilter = "all" | "today" | "week" | "month"
type ReadFilter = "all" | "unread" | "read"

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    settings,
    updateSetting,
    goToSection,
  } = useNotifications()

  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all")
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("all")
  const [readFilter, setReadFilter] = useState<ReadFilter>("all")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const now = Date.now()
    const DAY = 24 * 60 * 60 * 1000
    const q = search.trim().toLowerCase()

    return [...notifications]
      .filter((n) => {
        if (typeFilter !== "all" && n.type !== typeFilter) return false
        if (readFilter === "unread" && n.read) return false
        if (readFilter === "read" && !n.read) return false
        if (q) {
          const hay = `${n.title} ${n.description}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (dateFilter !== "all") {
          const age = now - new Date(n.createdAt).getTime()
          if (dateFilter === "today" && age > DAY) return false
          if (dateFilter === "week" && age > 7 * DAY) return false
          if (dateFilter === "month" && age > 30 * DAY) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [notifications, typeFilter, dateFilter, readFilter, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const enabledCount = Object.values(settings).filter(Boolean).length

  const clearFilters = () => {
    setTypeFilter("all")
    setDateFilter("all")
    setReadFilter("all")
    setSearch("")
  }

  const hasActiveFilters =
    typeFilter !== "all" || dateFilter !== "all" || readFilter !== "all" || search !== ""

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary/15 shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Bildirimler</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {notifications.length} toplam, {unreadCount} okunmamis bildirim
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Tumunu Okundu Isaretle
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-5">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="all" className="gap-2">
            <Bell className="h-4 w-4" />
            Tum Bildirimler
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Ayarlar
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {enabledCount}/{NOTIFICATION_TYPES.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Notifications list */}
        <TabsContent value="all" className="space-y-4 mt-0">
          {/* Filter bar */}
          <Card className="p-4 border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Bildirim ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-secondary border-border"
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as NotificationType | "all")}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Tur filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Turler</SelectItem>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t.type} value={t.type}>
                      <span className="flex items-center gap-2">
                        <t.icon className={cn("h-3.5 w-3.5", t.iconColor)} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={dateFilter}
                onValueChange={(v) => setDateFilter(v as DateRangeFilter)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Tarih araligi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Zamanlar</SelectItem>
                  <SelectItem value="today">Bugun</SelectItem>
                  <SelectItem value="week">Son 7 Gun</SelectItem>
                  <SelectItem value="month">Son 30 Gun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick chips & active filter info */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-1">
                <Filter className="h-3 w-3" />
                Durum:
              </span>
              {(
                [
                  { value: "all", label: "Tumu", count: notifications.length },
                  { value: "unread", label: "Okunmamis", count: unreadCount },
                  {
                    value: "read",
                    label: "Okunmus",
                    count: notifications.length - unreadCount,
                  },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setReadFilter(chip.value)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5",
                    readFilter === chip.value
                      ? "bg-primary/15 border-primary/40 text-foreground"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {chip.label}
                  <span className="text-[10px] opacity-75">({chip.count})</span>
                </button>
              ))}

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Filtreleri Temizle
                </button>
              )}
            </div>
          </Card>

          {/* Grouped list */}
          {filtered.length === 0 ? (
            <Card className="p-12 text-center border-border">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Bildirim bulunamadi</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasActiveFilters
                  ? "Filtreleri degistirmeyi deneyin"
                  : "Yeni bildirimler burada gorunecek"}
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              {grouped.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 px-1">
                    {group.label}
                  </h3>
                  <Card className="border-border overflow-hidden p-0">
                    <ul className="divide-y divide-border">
                      {group.items.map((n) => (
                        <NotificationFullRow
                          key={n.id}
                          notification={n}
                          onMarkRead={markAsRead}
                          onDelete={deleteNotification}
                          onNavigate={goToSection}
                        />
                      ))}
                    </ul>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="space-y-4 mt-0">
          <Card className="p-5 border-border">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">Bildirim Tercihleri</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Hangi bildirim turlerini almak istediginizi buradan yonetin. Kapattiginiz
                bildirimler size gonderilmeyecektir.
              </p>
            </div>

            <div className="space-y-1 divide-y divide-border">
              {NOTIFICATION_TYPES.map((config) => {
                const Icon = config.icon
                const enabled = settings[config.type]
                return (
                  <div
                    key={config.type}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                          config.iconBg,
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{config.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => updateSetting(config.type, checked)}
                      aria-label={`${config.label} bildirimlerini ${enabled ? "kapat" : "ac"}`}
                    />
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {enabledCount} / {NOTIFICATION_TYPES.length} bildirim turu aktif
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    NOTIFICATION_TYPES.forEach((t) => updateSetting(t.type, false))
                  }}
                >
                  Tumunu Kapat
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    NOTIFICATION_TYPES.forEach((t) => updateSetting(t.type, true))
                  }}
                >
                  Tumunu Ac
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationFullRow({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate?: (section: string) => void
}) {
  const config = NOTIFICATION_CONFIG[notification.type]
  const Icon = config.icon

  const handleClick = () => {
    if (!notification.read) onMarkRead(notification.id)
    if (notification.relatedSection && onNavigate) {
      onNavigate(notification.relatedSection)
    }
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 hover:bg-accent/40 transition-colors relative",
        !notification.read && "bg-primary/[0.04]",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-0.5",
          config.iconBg,
        )}
      >
        <Icon className={cn("h-4.5 w-4.5", config.iconColor)} />
      </div>

      {/* Content - clickable */}
      <button
        type="button"
        onClick={handleClick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-foreground">{notification.title}</p>
            {!notification.read && (
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary"
                aria-label="Okunmamis"
              />
            )}
          </div>
          <span
            className="text-[11px] text-muted-foreground shrink-0"
            title={formatFullDate(notification.createdAt)}
          >
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge
            variant="outline"
            className={cn("text-[10px] h-5 px-1.5 font-normal", config.borderTint)}
          >
            <span className={cn("flex items-center gap-1", config.iconColor)}>
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </span>
          </Badge>
          {notification.relatedSection && (
            <span className="text-[11px] text-muted-foreground">
              &rarr; {notification.relatedSection}
            </span>
          )}
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onMarkRead(notification.id)}
            aria-label="Okundu isaretle"
            title="Okundu isaretle"
          >
            <Check className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:text-destructive"
          onClick={() => onDelete(notification.id)}
          aria-label="Bildirimi sil"
          title="Sil"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </li>
  )
}

// ----- helpers -----

interface NotificationGroup {
  label: string
  items: Notification[]
}

function groupByDate(items: Notification[]): NotificationGroup[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
  const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000

  const buckets: Record<string, Notification[]> = {
    Bugun: [],
    Dun: [],
    "Bu Hafta": [],
    "Daha Eski": [],
  }

  for (const n of items) {
    const t = new Date(n.createdAt).getTime()
    if (t >= startOfToday) buckets["Bugun"].push(n)
    else if (t >= startOfYesterday) buckets["Dun"].push(n)
    else if (t >= startOfWeek) buckets["Bu Hafta"].push(n)
    else buckets["Daha Eski"].push(n)
  }

  return Object.entries(buckets)
    .filter(([, arr]) => arr.length > 0)
    .map(([label, itemsInBucket]) => ({ label, items: itemsInBucket }))
}
