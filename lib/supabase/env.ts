/**
 * Shared helpers to read Supabase env vars safely. Returns `null` instead
 * of throwing so the app can degrade gracefully until the env vars are
 * provided (middleware, client factory, auth context all depend on this).
 */
export function getSupabaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return null
  const trimmed = raw.trim().replace(/\/$/, "")
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function getSupabaseAnonKey(): string | null {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) return null
  const trimmed = key.trim()
  return trimmed || null
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}
