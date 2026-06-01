#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

function envValue(name) {
  if (process.env[name]?.trim()) return process.env[name].trim()
  if (!existsSync(".env.local")) return ""

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/)
  const prefix = `${name}=`
  const line = lines.find((item) => item.startsWith(prefix))
  if (!line) return ""

  return line.slice(prefix.length).replace(/^["']|["']$/g, "").trim()
}

const supabaseUrl = envValue("NEXT_PUBLIC_SUPABASE_URL")
const serviceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY")

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase URL or service role key.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const requiredTables = [
  "profiles",
  "role_permissions",
  "personeller",
  "vardiya_planlari",
  "izinler",
  "giris_cikis_kayitlari",
  "muhasebe_hareketleri",
  "varliklar",
  "araclar",
]

const tenantTables = [
  "personeller",
  "izinler",
  "muhasebe_hareketleri",
  "varliklar",
  "araclar",
]

const requiredRoles = [
  "admin",
  "servis_yoneticisi",
  "ik_yoneticisi",
  "urun_sorumlusu",
  "calisan",
]

async function checkTable(table) {
  const { error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })

  return {
    check: `table:${table}`,
    ok: !error,
    detail: error?.message ?? "ok",
  }
}

async function checkTenantColumn(table) {
  const { error } = await supabase
    .from(table)
    .select("sirket_id", { count: "exact", head: true })

  return {
    check: `tenant_column:${table}`,
    ok: !error,
    detail: error?.message ?? "ok",
  }
}

async function checkRole(role) {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role, modules")
    .eq("role", role)
    .maybeSingle()

  return {
    check: `role_permissions:${role}`,
    ok: !error && Array.isArray(data?.modules) && data.modules.length > 0,
    detail: error?.message ?? `${data?.modules?.length ?? 0} modules`,
  }
}

const results = [
  ...(await Promise.all(requiredTables.map(checkTable))),
  ...(await Promise.all(tenantTables.map(checkTenantColumn))),
  ...(await Promise.all(requiredRoles.map(checkRole))),
]

const failed = results.filter((item) => !item.ok)

console.log("Supabase readiness preflight")
console.log("----------------------------")
results.forEach((item) => {
  console.log(`${item.ok ? "ok" : "fail"} ${item.check} - ${item.detail}`)
})

if (failed.length > 0) {
  console.error("")
  console.error(`${failed.length} readiness checks failed.`)
  console.error("Run scripts/007, scripts/008, then scripts/009 in Supabase.")
  process.exit(1)
}

console.log("")
console.log("Supabase readiness preflight passed.")
console.log("Still run scripts/009_live_pilot_readiness_check.sql for RLS verification.")
