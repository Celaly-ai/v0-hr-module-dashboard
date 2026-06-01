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

const adminRoles = ["admin", "servis_yoneticisi", "ik_yoneticisi"]
const activeStatuses = ["aktif", "active", "izinli", "izınli"]

async function countPersoneller(applyFilters = (query) => query) {
  const query = supabase
    .from("personeller")
    .select("id", { count: "exact", head: true })

  const { count, error } = await applyFilters(query)

  if (error) {
    console.error("Pilot user check failed:", error.message)
    process.exit(1)
  }

  return count || 0
}

function withPortalAccount(query) {
  return query
    .or("auth_id.not.is.null,kullanici_id.not.is.null")
    .not("email", "is", null)
    .not("sirket_id", "is", null)
}

const personelCount = await countPersoneller()
const activePortalUserCount = await countPersoneller((query) =>
  withPortalAccount(query).in("durum", activeStatuses),
)
const adminCount = await countPersoneller((query) =>
  withPortalAccount(query).in("durum", activeStatuses).in("rol", adminRoles),
)
const calisanCount = await countPersoneller((query) =>
  withPortalAccount(query).in("durum", activeStatuses).eq("rol", "calisan"),
)
const missingCompanyCount = await countPersoneller((query) =>
  query.or("auth_id.not.is.null,kullanici_id.not.is.null").is("sirket_id", null),
)

console.log("Pilot user readiness")
console.log("--------------------")
console.log(`personeller: ${personelCount}`)
console.log(`active portal users: ${activePortalUserCount}`)
console.log(`active admin users: ${adminCount}`)
console.log(`active calisan users: ${calisanCount}`)
console.log(`portal users missing sirket_id: ${missingCompanyCount}`)

if (personelCount === 0) {
  console.error("No personel records found.")
  process.exit(1)
}

if (adminCount === 0) {
  console.error("No active admin/manager portal user found.")
  process.exit(1)
}

if (calisanCount === 0) {
  console.error("No active calisan portal user found.")
  process.exit(1)
}

if (missingCompanyCount > 0) {
  console.error("Some portal users are missing sirket_id.")
  process.exit(1)
}

console.log("")
console.log("Pilot user readiness passed.")
