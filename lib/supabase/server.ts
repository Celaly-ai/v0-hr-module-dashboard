import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"

/**
 * Server Supabase client. Returns `null` if the env vars are missing so
 * callers can short-circuit cleanly. `cookies()` is async in Next 15+,
 * so this is async too.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) return null

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Called from a Server Component; the middleware refreshes the
          // session instead. Safe to ignore.
        }
      },
    },
  })
}
