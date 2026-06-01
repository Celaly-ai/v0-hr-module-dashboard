import { NextResponse } from "next/server"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"

export const dynamic = "force-dynamic"

export function GET() {
  const supabaseConfigured = Boolean(getSupabaseUrl() && getSupabaseAnonKey())
  const serviceRoleConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  )
  const aiReceiptEnabled = Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  const ok = supabaseConfigured && serviceRoleConfigured

  return NextResponse.json(
    {
      ok,
      app: "feyroute",
      supabaseConfigured,
      serviceRoleConfigured,
      aiReceiptEnabled,
      checkedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
