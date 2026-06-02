import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env"

type AdminAuthResult =
  | {
      ok: true
      supabaseAdmin: SupabaseClient
      user: User
      role: string
      personelId: string | null
      sirketId: string | null
    }
  | {
      ok: false
      response: NextResponse
    }

const DEFAULT_ALLOWED_ROLES = ["admin", "ik_yoneticisi", "servis_yoneticisi"]

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return key || null
}

function metadataRole(user: User) {
  const role = (user.user_metadata as { role?: unknown } | null)?.role
  return typeof role === "string" ? role : null
}

async function bearerToken() {
  const h = await headers()
  const authHeader = h.get("authorization") || h.get("Authorization") || ""

  if (!authHeader.toLowerCase().startsWith("bearer ")) return null

  return authHeader.slice(7).trim() || null
}

async function findUserContext(supabaseAdmin: SupabaseClient, user: User) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const { data: personel } = await supabaseAdmin
    .from("personeller")
    .select("id, rol, sirket_id")
    .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle()

  const role =
    typeof profile?.role === "string" && profile.role
      ? profile.role
      : typeof personel?.rol === "string" && personel.rol
        ? personel.rol
        : metadataRole(user) || "calisan"

  return {
    role,
    personelId: typeof personel?.id === "string" ? personel.id : null,
    sirketId:
      typeof personel?.sirket_id === "string" ? personel.sirket_id : null,
  }
}

export async function requireAdminAuth(
  allowedRoles = DEFAULT_ALLOWED_ROLES,
): Promise<AdminAuthResult> {
  const supabaseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  const serviceKey = serviceRoleKey()

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase admin ayarları eksik." },
        { status: 500 },
      ),
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let user: User | null = null

  const token = await bearerToken()

  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (!error && data?.user) {
      user = data.user
    }
  }

  if (!user) {
    const cookieStore = await cookies()

    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // Route handlers can still authenticate with existing cookies.
            }
          })
        },
      },
    })

    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser()

    user = cookieUser || null
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Oturum bulunamadı." },
        { status: 401 },
      ),
    }
  }

  const userContext = await findUserContext(supabaseAdmin, user)
  const role = userContext.role

  if (!allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Bu işlem için yetkiniz yok. Rol: ${role}` },
        { status: 403 },
      ),
    }
  }

  return {
    ok: true,
    supabaseAdmin,
    user,
    role,
    personelId: userContext.personelId,
    sirketId: userContext.sirketId,
  }
}
