/**
 * Bayi bilgilendirme kuyruğunu işler (WhatsApp stub veya Meta Cloud API).
 *
 * Kullanım:
 *   node scripts/bayi-bilgilendirme-cron.mjs
 *
 * Ortam değişkenleri:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BAYI_CRON_TOKEN (opsiyonel — API token)
 *   BAYI_WHATSAPP_DEFAULT_SIRKET_ID (opsiyonel)
 *   WHATSAPP_CLOUD_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID (canlı gönderim için)
 */

const baseUrl = process.env.BAYI_APP_URL?.trim() || "http://localhost:3000"
const token = process.env.BAYI_CRON_TOKEN?.trim() || process.env.BAYI_WHATSAPP_WEBHOOK_TOKEN?.trim()

const headers = {
  "Content-Type": "application/json",
  ...(token ? { "x-bayi-cron-token": token } : {}),
}

const response = await fetch(`${baseUrl}/api/bayi-operasyon/bilgilendirme-isle`, {
  method: "POST",
  headers,
  body: JSON.stringify({ limit: 30 }),
})

const data = await response.json()
console.log(JSON.stringify(data, null, 2))

if (!response.ok || !data.success) {
  process.exit(1)
}
