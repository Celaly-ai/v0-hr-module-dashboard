import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// 📅 TARİH FORMATLARI
export function formatDate(date: string | Date | null) {
  if (!date) return "-"
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function formatTime(date: string | Date | null) {
  if (!date) return "-"
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null) {
  if (!date) return "-"
  return `${formatDate(date)} ${formatTime(date)}`
}

// 💰 PARA FORMAT
export function formatCurrency(amount: number | null) {
  if (!amount) return "₺0"
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount)
}

// 🎯 DURUM RENK
export function getStatusColor(status: string) {
  const s = status.toLowerCase()

  if (s.includes("aktif") || s.includes("tamam") || s.includes("iyi")) {
    return "bg-green-500/10 text-green-400 border-green-500/20"
  }

  if (s.includes("bekle")) {
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
  }

  if (s.includes("yaklaş")) {
    return "bg-orange-500/10 text-orange-400 border-orange-500/20"
  }

  return "bg-red-500/10 text-red-400 border-red-500/20"
}
