#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"

function localEnvValue(name) {
  if (process.env[name]?.trim()) return process.env[name]
  if (!existsSync(".env.local")) return ""

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/)
  const prefix = `${name}=`
  const line = lines.find((item) => item.startsWith(prefix))
  if (!line) return ""

  return line.slice(prefix.length).replace(/^["']|["']$/g, "").trim()
}

const requiredFiles = [
  "scripts/007_live_pilot_add_ik_role.sql",
  "scripts/008_live_pilot_role_permissions_patch.sql",
  "scripts/009_live_pilot_readiness_check.sql",
  "docs/live-pilot-deploy-runbook.md",
  "docs/live-pilot-smoke-test.md",
  "docs/live-pilot-risk-register.md",
  ".env.example",
]

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const fileResults = requiredFiles.map((file) => ({
  file,
  ok: existsSync(file),
}))

const envResults = requiredEnv.map((name) => ({
  name,
  ok: Boolean(localEnvValue(name)),
}))

let localHealth = {
  checked: false,
  ok: false,
  note: "Local server not checked.",
}

try {
  const response = await fetch("http://localhost:3000/api/health", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
  const body = await response.json()
  localHealth = {
    checked: true,
    ok: response.ok && body.ok === true,
    note: `HTTP ${response.status}`,
  }
} catch {
  localHealth = {
    checked: true,
    ok: false,
    note: "Local server is not reachable at http://localhost:3000.",
  }
}

const missingFiles = fileResults.filter((item) => !item.ok)
const missingEnv = envResults.filter((item) => !item.ok)

console.log("FeyRoute pilot status")
console.log("---------------------")
console.log("Required files:", missingFiles.length === 0 ? "ok" : "missing")
missingFiles.forEach((item) => console.log(`- missing file: ${item.file}`))

console.log("Local env:", missingEnv.length === 0 ? "ok" : "missing")
missingEnv.forEach((item) => console.log(`- missing env: ${item.name}`))

console.log("Local health:", localHealth.ok ? "ok" : "not ready")
console.log(`- ${localHealth.note}`)

console.log("")
console.log("Pilot remaining gates:")
console.log("- Run Supabase scripts 007 and 008 in production.")
console.log("- Run script 009 and verify every row is ok=true.")
console.log("- Deploy production and run pilot:health + pilot:public.")
console.log("- Complete smoke test with 1 admin and 1 calisan.")

if (missingFiles.length === 0 && missingEnv.length === 0 && localHealth.ok) {
  console.log("")
  console.log("Local pilot preparation looks ready.")
} else {
  process.exitCode = 1
}
