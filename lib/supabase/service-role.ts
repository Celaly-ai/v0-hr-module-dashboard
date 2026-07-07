import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export function createServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!supabaseUrl || !serviceKey) {
    return null
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
