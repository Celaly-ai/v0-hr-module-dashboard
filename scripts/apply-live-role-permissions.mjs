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

const permissions = [
  {
    role: "admin",
    modules: [
      "Panel",
      "Calisanlar",
      "Izin Talepleri",
      "Varliklar",
      "Satislar",
      "Disiplin Kayitlari",
      "Belge Takibi",
      "Ise Giris",
      "Puantaj",
      "Vardiya Plani",
      "Giris Cikis",
      "Performans Degerlendirme",
      "Fazla Mesai",
      "Departmanlar",
      "Raporlar",
      "Bildirimler",
      "Ayarlar",
      "Araclar",
      "Belge Arsivi",
      "Teknik Destek",
    ],
  },
  {
    role: "servis_yoneticisi",
    modules: [
      "Panel",
      "Calisanlar",
      "Izin Talepleri",
      "Varliklar",
      "Satislar",
      "Disiplin Kayitlari",
      "Belge Takibi",
      "Ise Giris",
      "Puantaj",
      "Vardiya Plani",
      "Giris Cikis",
      "Performans Degerlendirme",
      "Fazla Mesai",
      "Departmanlar",
      "Raporlar",
      "Bildirimler",
      "Araclar",
      "Belge Arsivi",
      "Teknik Destek",
    ],
  },
  {
    role: "ik_yoneticisi",
    modules: [
      "Panel",
      "Calisanlar",
      "Izin Talepleri",
      "Varliklar",
      "Belge Takibi",
      "Ise Giris",
      "Puantaj",
      "Vardiya Plani",
      "Giris Cikis",
      "Performans Degerlendirme",
      "Fazla Mesai",
      "Departmanlar",
      "Raporlar",
      "Bildirimler",
      "Ayarlar",
    ],
  },
  {
    role: "urun_sorumlusu",
    modules: [
      "Panel",
      "Calisanlar",
      "Varliklar",
      "Satislar",
      "Belge Takibi",
      "Raporlar",
      "Bildirimler",
    ],
  },
  {
    role: "calisan",
    modules: [
      "Panel",
      "Izin Talepleri",
      "Puantaj",
      "Vardiya Plani",
      "Giris Cikis",
      "Bildirimler",
    ],
  },
]

const { error } = await supabase.from("role_permissions").upsert(
  permissions.map((item) => ({
    ...item,
    updated_at: new Date().toISOString(),
  })),
  { onConflict: "role" },
)

if (error) {
  console.error("Role permission patch failed:", error.message)
  console.error("If the error mentions ik_yoneticisi enum, run scripts/007 first.")
  process.exit(1)
}

console.log("Role permission patch applied.")
