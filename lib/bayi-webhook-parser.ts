export type ParsedWhatsAppWebhook = {
  mesaj: string
  telefon?: string
  gonderen_ad?: string
  meta_message_id?: string
  sirket_id?: string
}

function metin(value: unknown) {
  const text = String(value || "").trim()
  return text || undefined
}

/** Meta Cloud API ve basit stub JSON formatlarını ayrıştırır. */
export function parseWhatsAppWebhookBody(body: unknown): ParsedWhatsAppWebhook | null {
  if (!body || typeof body !== "object") return null

  const kayit = body as Record<string, unknown>

  // Meta Cloud API formatı
  const entry = Array.isArray(kayit.entry) ? kayit.entry[0] : null
  const changes =
    entry && typeof entry === "object" && Array.isArray((entry as { changes?: unknown }).changes)
      ? (entry as { changes: unknown[] }).changes[0]
      : null
  const value =
    changes && typeof changes === "object"
      ? (changes as { value?: unknown }).value
      : null

  if (value && typeof value === "object") {
    const messages = (value as { messages?: unknown[] }).messages
    const message = Array.isArray(messages) ? messages[0] : null

    if (message && typeof message === "object") {
      const msg = message as {
        from?: string
        id?: string
        text?: { body?: string }
        type?: string
      }

      const mesaj = metin(msg.text?.body)
      if (!mesaj) return null

      return {
        mesaj,
        telefon: metin(msg.from),
        meta_message_id: metin(msg.id),
      }
    }
  }

  // Basit stub / test formatı
  const mesaj = metin(kayit.mesaj) || metin(kayit.message) || metin(kayit.text)
  if (!mesaj) return null

  return {
    mesaj,
    telefon: metin(kayit.telefon) || metin(kayit.phone),
    gonderen_ad: metin(kayit.gonderen_ad) || metin(kayit.sender) || metin(kayit.bayi_adi),
    sirket_id: metin(kayit.sirket_id),
  }
}
