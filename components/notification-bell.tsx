"use client"

import { useState } from "react"
import { Bell, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import {
  useNotifications,
  NOTIFICATION_CONFIG,
  formatTimeAgo,
  type Notification,
} from "@/lib/notifications-context"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  onOpenAll?: () => void
}

export function NotificationBell({ onOpenAll }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    goToSection,
  } = useNotifications()

  // Show most recent 6 in the dropdown
  const recent = [...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const handleItemClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id)
    if (n.relatedSection && goToSection) {
      goToSection(n.relatedSection)
      setOpen(false)
    }
  }

  const handleOpenAll = () => {
    setOpen(false)
    onOpenAll?.()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Bildirimler${unreadCount > 0 ? `, ${unreadCount} okunmamis` : ""}`}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-none border-2 border-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 border-border bg-popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Bildirimler</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                {unreadCount} yeni
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Tumunu Oku
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Bildirim yok</p>
              <p className="text-xs text-muted-foreground mt-1">
                Yeni bildirimler burada gorunecek
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onItemClick={handleItemClick}
                  onDelete={deleteNotification}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs h-8"
              onClick={handleOpenAll}
            >
              Tum Bildirimleri Gor
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  notification,
  onItemClick,
  onDelete,
}: {
  notification: Notification
  onItemClick: (n: Notification) => void
  onDelete: (id: string) => void
}) {
  const config = NOTIFICATION_CONFIG[notification.type]
  const Icon = config.icon

  return (
    <li>
      <button
        type="button"
        onClick={() => onItemClick(notification)}
        className={cn(
          "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors relative group",
          !notification.read && "bg-primary/[0.04]",
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5",
              config.iconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", config.iconColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground leading-tight">
                {notification.title}
              </p>
              {!notification.read && (
                <span
                  className="shrink-0 mt-1 w-2 h-2 rounded-full bg-primary"
                  aria-label="Okunmamis"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {notification.description}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {formatTimeAgo(notification.createdAt)}
            </p>
          </div>
        </div>

        {/* Delete button (appears on hover) */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.stopPropagation()
              onDelete(notification.id)
            }
          }}
          aria-label="Bildirimi sil"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-6 h-6 rounded-md hover:bg-background flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </button>
    </li>
  )
}
