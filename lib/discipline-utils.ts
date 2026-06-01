/**
 * Disiplin modulu icin is gunu hesaplamalari ve savunma sureci yardimcilari.
 * Hafta sonlarini atlayarak 2 is gunu gibi sureler ekler.
 */

export const DEFENSE_BUSINESS_DAYS = 2

export function isWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

/**
 * Verilen tarihe is gunu sayisi ekler (baslangic gunu haric, hafta sonu atlanir).
 * Resmi tatiller hesaplanmaz (uretim icin ileride genisletilebilir).
 */
export function addBusinessDays(fromIso: string, days: number): string {
  const start = new Date(fromIso)
  if (Number.isNaN(start.getTime())) return fromIso
  let added = 0
  const cursor = new Date(start)
  while (added < days) {
    cursor.setDate(cursor.getDate() + 1)
    if (!isWeekend(cursor)) added++
  }
  return cursor.toISOString()
}

/**
 * Iki tarih arasindaki kalan is gunu sayisi (negatif - gecmis).
 */
export function businessDaysUntil(targetIso: string): number {
  const target = new Date(targetIso)
  const now = new Date()
  if (Number.isNaN(target.getTime())) return 0
  const direction = target.getTime() >= now.getTime() ? 1 : -1
  const start = direction > 0 ? now : target
  const end = direction > 0 ? target : now
  let count = 0
  const cursor = new Date(start)
  while (cursor.getTime() < end.getTime()) {
    cursor.setDate(cursor.getDate() + 1)
    if (!isWeekend(cursor)) count++
  }
  return direction > 0 ? count : -count
}

/**
 * Son tarih gecti mi? (tam 2 is gunu bitiminde true doner)
 */
export function isDeadlinePassed(deadlineIso: string): boolean {
  const deadline = new Date(deadlineIso).getTime()
  if (Number.isNaN(deadline)) return false
  return Date.now() >= deadline
}

/**
 * Okunabilir kalan sure: "1 gun 4 saat", "Son 3 saat", "Sure doldu"
 */
export function formatRemaining(deadlineIso: string): string {
  const diff = new Date(deadlineIso).getTime() - Date.now()
  if (diff <= 0) return "Sure doldu"
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  if (days > 0) return `${days} gun ${remHours} saat`
  if (hours > 0) return `${hours} saat`
  const minutes = Math.max(1, Math.floor(diff / (1000 * 60)))
  return `${minutes} dk`
}
