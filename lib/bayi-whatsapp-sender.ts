import { bayiTelefonNormalize } from "@/lib/bayi-operasyon-utils"

export type WhatsAppGonderimModu = "stub" | "meta"

export type WhatsAppGonderimSonuc =
  | { ok: true; mod: WhatsAppGonderimModu; messageId?: string }
  | { ok: false; mod: WhatsAppGonderimModu; error: string }

export function whatsappGonderimModu(): WhatsAppGonderimModu {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim()
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  return token && phoneId ? "meta" : "stub"
}

function metaAliciFormat(alici: string) {
  const normalized = bayiTelefonNormalize(alici)
  if (!normalized) return null
  return `90${normalized}`
}

export async function bayiWhatsAppGonder(
  alici: string,
  mesaj: string
): Promise<WhatsAppGonderimSonuc> {
  const mod = whatsappGonderimModu()

  if (!alici?.trim()) {
    return { ok: false, mod, error: "Alıcı telefon numarası eksik." }
  }

  if (!mesaj?.trim()) {
    return { ok: false, mod, error: "Mesaj içeriği boş." }
  }

  if (mod === "stub") {
    console.info("[bayi-whatsapp-stub]", { alici, mesaj: mesaj.slice(0, 120) })
    return { ok: true, mod, messageId: `stub-${Date.now()}` }
  }

  const token = process.env.WHATSAPP_CLOUD_API_TOKEN!.trim()
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim()
  const to = metaAliciFormat(alici)

  if (!to) {
    return { ok: false, mod, error: "Geçersiz alıcı telefon formatı." }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: mesaj },
      }),
    })

    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>
      error?: { message?: string }
    }

    if (!response.ok) {
      return {
        ok: false,
        mod,
        error: data.error?.message || `WhatsApp API hatası (${response.status})`,
      }
    }

    return {
      ok: true,
      mod,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    return {
      ok: false,
      mod,
      error: error instanceof Error ? error.message : "WhatsApp gönderimi başarısız.",
    }
  }
}
