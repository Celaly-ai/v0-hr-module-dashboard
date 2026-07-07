import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"

let browserClient: SupabaseClient | null = null

/**
 * Browser Supabase client — cookie tabanlı oturum (@supabase/ssr).
 * Server route handler'ların (createServerClient) aynı cookie oturumunu
 * okuyabilmesi için plain supabase-js yerine createBrowserClient kullanılır.
 */
export function createClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  if (!url || !key) {
    throw new Error("Supabase ortam değişkenleri eksik.")
  }

  browserClient = createBrowserClient(url, key)

  return browserClient
}
