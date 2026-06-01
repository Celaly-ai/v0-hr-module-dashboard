"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import {
  ALL_MODULES,
  APP_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  type AppRole,
  type ModuleSlug,
} from "@/lib/modules"

export interface AppProfile {
  id: string
  email: string
  fullName: string | null
  role: AppRole
  personel_id: string | null
}

interface AuthContextValue {
  loading: boolean
  configError: boolean
  session: Session | null
  user: User | null
  profile: AppProfile | null
  permittedModules: ModuleSlug[]
  can: (module: string) => boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  reloadPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const CALISANLAR_IZINLI_ROLLER: AppRole[] = [
  "admin",
  "servis_yoneticisi",
  "ik_yoneticisi",
]

const MODULE_ALIASES: Record<string, string> = {
  "Genel Bakış": "Panel",
  "Genel Bakis": "Panel",

  "Çalışanlar": "Calisanlar",
  "Calisanlar": "Calisanlar",

  "İzin Talepleri": "Izin Talepleri",
  "Izin Talepleri": "Izin Talepleri",

  "Varlıklar": "Varliklar",
  "Varliklar": "Varliklar",

  "Satışlar": "Satislar",
  "Satislar": "Satislar",

  "Disiplin Kayıtları": "Disiplin Kayitlari",
  "Disiplin Kayitlari": "Disiplin Kayitlari",

  "Belge Takibi": "Belge Takibi",

  "İşe Giriş": "Ise Giris",
  "Ise Giris": "Ise Giris",

  "Puantaj": "Puantaj",

  "Vardiya Planı": "Vardiya Plani",
  "Vardiya Plani": "Vardiya Plani",

  "Giriş Çıkış": "Giris Cikis",
  "Giris Cikis": "Giris Cikis",

  "Performans Değerlendirme": "Performans Degerlendirme",
  "Performans Degerlendirme": "Performans Degerlendirme",

  "Fazla Mesai": "Fazla Mesai",

  "Bildirimler": "Bildirimler",
  "Departmanlar": "Departmanlar",
  "Raporlar": "Raporlar",
  "Ayarlar": "Ayarlar",

  "Araçlar": "Araclar",
  "Araclar": "Araclar",

  "Rol Yönetimi": "Rol Yonetimi",
  "Rol Yonetimi": "Rol Yonetimi",

  "Belge Arşivi": "Belge Arsivi",
  "Belge Arsivi": "Belge Arsivi",

  "Teknik Destek": "Teknik Destek",
}

function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    (APP_ROLES as readonly string[]).includes(value)
  )
}

function normalizeModule(module: string): string {
  return MODULE_ALIASES[module] ?? module
}

function isModuleSlug(value: string): value is ModuleSlug {
  return (ALL_MODULES as readonly string[]).includes(value)
}

function uniqueModules(modules: string[]): ModuleSlug[] {
  const normalized = modules
    .map(normalizeModule)
    .filter(isModuleSlug)

  return Array.from(new Set(normalized))
}

async function findPersonelId(
  client: SupabaseClient,
  profileId: string,
): Promise<string | null> {
  const { data: personelByKullanici } = await client
    .from("personeller")
    .select("id")
    .eq("kullanici_id", profileId)
    .maybeSingle()

  if (personelByKullanici?.id) {
    return personelByKullanici.id
  }

  const { data: personelByAuth } = await client
    .from("personeller")
    .select("id")
    .eq("auth_id", profileId)
    .maybeSingle()

  return personelByAuth?.id ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase: SupabaseClient | null = useMemo(() => createClient(), [])
  const configError = supabase === null

  const [loading, setLoading] = useState(!configError)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [rolePermissions, setRolePermissions] =
    useState<Record<AppRole, ModuleSlug[]>>(DEFAULT_ROLE_PERMISSIONS)
  const [kisiYetkiler, setKisiYetkiler] = useState<
    { modul: string; aktif: boolean }[]
  >([])

  const loadKisiYetkiler = useCallback(
    async (client: SupabaseClient, profileId: string) => {
      const personelId = await findPersonelId(client, profileId)

      if (!personelId) {
        setKisiYetkiler([])
        return
      }

      const { data } = await client
        .from("personel_yetkiler")
        .select("modul, aktif")
        .eq("personel_id", personelId)

      setKisiYetkiler(data || [])
    },
    [],
  )

  const loadProfileAndPermissions = useCallback(
    async (client: SupabaseClient, user: User) => {
      const userId = user.id
      const email = user.email ?? undefined

      const { data: profileRow, error: profileError } = await client
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", userId)
        .maybeSingle()

      if (profileError) {
        console.error("[auth] profile fetch error:", profileError.message)
      }

      const metaRole = (user.user_metadata as { role?: unknown } | null)?.role
      const role: AppRole = isAppRole(profileRow?.role)
        ? profileRow.role
        : isAppRole(metaRole)
          ? metaRole
          : "calisan"

      const metaFullName = (
        user.user_metadata as { full_name?: unknown } | null
      )?.full_name
      const personelId = await findPersonelId(client, userId)

      setProfile({
        id: userId,
        email: profileRow?.email ?? email ?? "",
        fullName:
          profileRow?.full_name ??
          (typeof metaFullName === "string" ? metaFullName : null),
        role,
        personel_id: personelId,
      })

      const { data: permRows, error: permError } = await client
        .from("role_permissions")
        .select("role, modules")

      if (!permError && permRows && permRows.length > 0) {
        const map: Record<AppRole, ModuleSlug[]> = {
          ...DEFAULT_ROLE_PERMISSIONS,
        }

        for (const row of permRows) {
          if (isAppRole(row.role) && Array.isArray(row.modules)) {
            map[row.role] = uniqueModules(row.modules as string[])
          }
        }

        setRolePermissions(map)
      }

      await loadKisiYetkiler(client, userId)
    },
    [loadKisiYetkiler],
  )

  const reloadPermissions = useCallback(async () => {
    if (!supabase) return

    const { data: permRows } = await supabase
      .from("role_permissions")
      .select("role, modules")

    if (permRows && permRows.length > 0) {
      const map: Record<AppRole, ModuleSlug[]> = {
        ...DEFAULT_ROLE_PERMISSIONS,
      }

      for (const row of permRows) {
        if (isAppRole(row.role) && Array.isArray(row.modules)) {
          map[row.role] = uniqueModules(row.modules as string[])
        }
      }

      setRolePermissions(map)
    }

    if (profile) {
      await loadKisiYetkiler(supabase, profile.id)
    }
  }, [supabase, profile, loadKisiYetkiler])

  const refresh = useCallback(async () => {
    if (!supabase) return

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    setSession(currentSession)

    if (currentSession?.user) {
      await loadProfileAndPermissions(supabase, currentSession.user)
    } else {
      setProfile(null)
      setKisiYetkiler([])
    }
  }, [supabase, loadProfileAndPermissions])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true

    ;(async () => {
      try {
        await refresh()
      } finally {
        if (active) setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)

      if (s?.user) {
        void loadProfileAndPermissions(supabase, s.user)
      } else {
        setProfile(null)
        setKisiYetkiler([])
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase, refresh, loadProfileAndPermissions])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()

    setSession(null)
    setProfile(null)
    setKisiYetkiler([])

    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }, [supabase])

  const permittedModules: ModuleSlug[] = useMemo(() => {
    if (!profile) return []

    if (profile.role === "admin") {
      return uniqueModules([...ALL_MODULES])
    }

    const rolModulleri =
      rolePermissions[profile.role] ?? DEFAULT_ROLE_PERMISSIONS[profile.role] ?? []

    const eklenenler = kisiYetkiler
      .filter((k) => k.aktif)
      .map((k) => normalizeModule(k.modul))

    const cikarilanlar = kisiYetkiler
      .filter((k) => !k.aktif)
      .map((k) => normalizeModule(k.modul))

    const sonuc = [
      ...rolModulleri.filter((m) => !cikarilanlar.includes(m)),
      ...eklenenler.filter((m) => !rolModulleri.includes(m as ModuleSlug)),
    ]

    return uniqueModules(sonuc)
  }, [profile, rolePermissions, kisiYetkiler])

  const can = useCallback(
    (module: string) => {
      const normalized = normalizeModule(module)

      if (!profile) return false

      if (profile.role === "admin") return true

      if (normalized === "Calisanlar") {
        return CALISANLAR_IZINLI_ROLLER.includes(profile.role)
      }

      return permittedModules.includes(normalized as ModuleSlug)
    },
    [permittedModules, profile],
  )

  const value: AuthContextValue = {
    loading,
    configError,
    session,
    user: session?.user ?? null,
    profile,
    permittedModules,
    can,
    signOut,
    refresh,
    reloadPermissions,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>")
  }

  return ctx
}
