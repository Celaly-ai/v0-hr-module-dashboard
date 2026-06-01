#!/usr/bin/env node

const input = process.argv[2] || "http://localhost:3000"
const baseUrl = input.startsWith("http") ? input : `https://${input}`
const url = new URL("/api/health", baseUrl)

try {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const body = await response.json()

  if (!response.ok || body.ok !== true) {
    console.error("Health check failed:", {
      status: response.status,
      body,
    })
    process.exit(1)
  }

  console.log("Health check passed:", {
    url: url.toString(),
    status: response.status,
    supabaseConfigured: body.supabaseConfigured,
    serviceRoleConfigured: body.serviceRoleConfigured,
    aiReceiptEnabled: body.aiReceiptEnabled,
  })
} catch (error) {
  console.error("Health check request failed:", error)
  process.exit(1)
}
