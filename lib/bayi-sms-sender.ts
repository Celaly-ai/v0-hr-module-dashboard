import { bayiTelefonNormalize } from "@/lib/bayi-operasyon-utils"
import { whatsappGonderimModu } from "@/lib/bayi-whatsapp-sender"

export type SmsSaglayici = "stub" | "netgsm" | "iletimerkezi" | "twilio"

export type SmsGonderimSonuc =
  | { ok: true; saglayici: SmsSaglayici; messageId?: string }
  | { ok: false; saglayici: SmsSaglayici; error: string }

function env(key: string) {
  return process.env[key]?.trim() || ""
}

/** Aktif SMS sağlayıcısını çözümler. BAYI_SMS_PROVIDER ile zorlanabilir. */
export function smsSaglayici(): SmsSaglayici {
  const zorla = env("BAYI_SMS_PROVIDER").toLowerCase()
  if (zorla === "netgsm" || zorla === "iletimerkezi" || zorla === "twilio" || zorla === "stub") {
    if (zorla === "stub") return "stub"
    if (zorla === "netgsm" && env("NETGSM_USERCODE") && env("NETGSM_PASSWORD")) return "netgsm"
    if (
      zorla === "iletimerkezi" &&
      env("ILETIMERKEZI_API_KEY") &&
      env("ILETIMERKEZI_SECRET")
    ) {
      return "iletimerkezi"
    }
    if (zorla === "twilio" && env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN")) {
      return "twilio"
    }
    return "stub"
  }

  if (env("NETGSM_USERCODE") && env("NETGSM_PASSWORD")) return "netgsm"
  if (env("ILETIMERKEZI_API_KEY") && env("ILETIMERKEZI_SECRET")) return "iletimerkezi"
  if (env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN")) return "twilio"
  return "stub"
}

export function smsUluslararasiFormat(alici: string) {
  const normalized = bayiTelefonNormalize(alici)
  if (!normalized) return null
  return `90${normalized}`
}

function smsMetinKisalt(mesaj: string, max = 640) {
  const temiz = mesaj.replace(/\s+/g, " ").trim()
  if (temiz.length <= max) return temiz
  return `${temiz.slice(0, max - 3)}...`
}

async function netgsmGonder(alici: string, mesaj: string): Promise<SmsGonderimSonuc> {
  const usercode = env("NETGSM_USERCODE")
  const password = env("NETGSM_PASSWORD")
  const msgheader = env("NETGSM_HEADER") || env("NETGSM_MSGHEADER")
  const gsm = smsUluslararasiFormat(alici)

  if (!gsm) {
    return { ok: false, saglayici: "netgsm", error: "Geçersiz telefon numarası." }
  }
  if (!msgheader) {
    return { ok: false, saglayici: "netgsm", error: "NETGSM_HEADER tanımlı değil." }
  }

  const params = new URLSearchParams({
    usercode,
    password,
    gsmno: gsm,
    message: smsMetinKisalt(mesaj),
    msgheader,
    dil: "TR",
  })

  try {
    const response = await fetch(`https://api.netgsm.com.tr/sms/send/get?${params.toString()}`, {
      method: "GET",
    })
    const text = (await response.text()).trim()

    // Netgsm: "00 bulkid" başarılı
    if (text.startsWith("00")) {
      const messageId = text.split(/\s+/)[1] || text
      return { ok: true, saglayici: "netgsm", messageId }
    }

    const hatalar: Record<string, string> = {
      "20": "Mesaj metni veya başlık hatalı.",
      "30": "Netgsm kimlik doğrulama hatası.",
      "40": "Gönderici başlığı (header) tanımlı değil.",
      "50": "İYS / gönderim izni hatası.",
      "51": "Tekrar eden gönderim.",
      "70": "Hatalı parametre.",
      "85": "Mükerrer gönderim sınırı.",
    }

    const kod = text.slice(0, 2)
    return {
      ok: false,
      saglayici: "netgsm",
      error: hatalar[kod] || `Netgsm hatası: ${text}`,
    }
  } catch (error) {
    return {
      ok: false,
      saglayici: "netgsm",
      error: error instanceof Error ? error.message : "Netgsm bağlantı hatası.",
    }
  }
}

async function iletimerkeziGonder(alici: string, mesaj: string): Promise<SmsGonderimSonuc> {
  const key = env("ILETIMERKEZI_API_KEY")
  const hash = env("ILETIMERKEZI_SECRET")
  const sender = env("ILETIMERKEZI_SENDER")
  const gsm = smsUluslararasiFormat(alici)

  if (!gsm) {
    return { ok: false, saglayici: "iletimerkezi", error: "Geçersiz telefon numarası." }
  }
  if (!sender) {
    return { ok: false, saglayici: "iletimerkezi", error: "ILETIMERKEZI_SENDER tanımlı değil." }
  }

  try {
    const response = await fetch("https://api.iletimerkezi.com/v1/send-sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request: {
          authentication: { key, hash },
          order: {
            sender,
            sendDateTime: [],
            iys: "1",
            iysList: "BIREYSEL",
            message: {
              text: smsMetinKisalt(mesaj),
              receipents: { number: [gsm] },
            },
          },
        },
      }),
    })

    const data = (await response.json()) as {
      response?: {
        status?: { code?: number; message?: string }
        order?: { id?: string | number }
      }
    }

    const code = data.response?.status?.code
    if (code === 200) {
      return {
        ok: true,
        saglayici: "iletimerkezi",
        messageId: String(data.response?.order?.id || ""),
      }
    }

    return {
      ok: false,
      saglayici: "iletimerkezi",
      error: data.response?.status?.message || `İleti Merkezi hatası (${code ?? "?"})`,
    }
  } catch (error) {
    return {
      ok: false,
      saglayici: "iletimerkezi",
      error: error instanceof Error ? error.message : "İleti Merkezi bağlantı hatası.",
    }
  }
}

async function twilioGonder(alici: string, mesaj: string): Promise<SmsGonderimSonuc> {
  const sid = env("TWILIO_ACCOUNT_SID")
  const token = env("TWILIO_AUTH_TOKEN")
  const from = env("TWILIO_FROM")
  const gsm = smsUluslararasiFormat(alici)

  if (!gsm) {
    return { ok: false, saglayici: "twilio", error: "Geçersiz telefon numarası." }
  }
  if (!from) {
    return { ok: false, saglayici: "twilio", error: "TWILIO_FROM tanımlı değil." }
  }

  try {
    const body = new URLSearchParams({
      To: `+${gsm}`,
      From: from,
      Body: smsMetinKisalt(mesaj, 1600),
    })

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    const data = (await response.json()) as {
      sid?: string
      message?: string
      error_message?: string
    }

    if (!response.ok) {
      return {
        ok: false,
        saglayici: "twilio",
        error: data.message || data.error_message || `Twilio hatası (${response.status})`,
      }
    }

    return { ok: true, saglayici: "twilio", messageId: data.sid }
  } catch (error) {
    return {
      ok: false,
      saglayici: "twilio",
      error: error instanceof Error ? error.message : "Twilio bağlantı hatası.",
    }
  }
}

export async function bayiSmsGonder(alici: string, mesaj: string): Promise<SmsGonderimSonuc> {
  const saglayici = smsSaglayici()

  if (!alici?.trim()) {
    return { ok: false, saglayici, error: "Alıcı telefon numarası eksik." }
  }
  if (!mesaj?.trim()) {
    return { ok: false, saglayici, error: "Mesaj içeriği boş." }
  }

  if (saglayici === "stub") {
    console.info("[bayi-sms-stub]", { alici, mesaj: mesaj.slice(0, 120) })
    return { ok: true, saglayici, messageId: `sms-stub-${Date.now()}` }
  }

  if (saglayici === "netgsm") return netgsmGonder(alici, mesaj)
  if (saglayici === "iletimerkezi") return iletimerkeziGonder(alici, mesaj)
  return twilioGonder(alici, mesaj)
}

export type BilgilendirmeKanalTercihi = "auto" | "whatsapp" | "sms"

export function bilgilendirmeKanalTercihi(): BilgilendirmeKanalTercihi {
  const tercih = env("BAYI_BILGILENDIRME_KANAL").toLowerCase()
  if (tercih === "sms" || tercih === "whatsapp") return tercih
  return "auto"
}

/** Kuyruk kaydı için kanal ve alıcı seçimi */
export function cozumleBilgilendirmeKanal(input: {
  telefon?: string | null
  whatsapp?: string | null
  whatsappAktif: boolean
  smsAktif: boolean
}): { kanal: "whatsapp" | "sms"; alici: string | null } {
  const telefon = input.telefon?.trim() || null
  const whatsapp = input.whatsapp?.trim() || null
  const tercih = bilgilendirmeKanalTercihi()

  if (tercih === "sms") {
    return { kanal: "sms", alici: telefon || whatsapp }
  }
  if (tercih === "whatsapp") {
    return { kanal: "whatsapp", alici: whatsapp || telefon }
  }

  // auto: canlı WhatsApp varsa ve numara varsa WhatsApp; yoksa SMS; ikisi de stub ise WhatsApp stub
  if (input.whatsappAktif && whatsapp) {
    return { kanal: "whatsapp", alici: whatsapp }
  }
  if (input.smsAktif) {
    return { kanal: "sms", alici: telefon || whatsapp }
  }
  return { kanal: "whatsapp", alici: whatsapp || telefon }
}

export function bilgilendirmeKanalDurumu() {
  return {
    whatsapp_mod: whatsappGonderimModu(),
    sms_saglayici: smsSaglayici(),
    kanal_tercihi: bilgilendirmeKanalTercihi(),
  }
}
