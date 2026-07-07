import {
  DURUM_ETIKETLERI,
  TALEP_TURU_ETIKETLERI,
  bilgilendirmeSablonu,
  slaAsildiMi,
} from "@/lib/bayi-operasyon-utils"
import type { BayiTalep, BayiTalepMesaj } from "@/lib/types/bayi-operasyon"

export type BayiAiYanitOneri = {
  mode: "ai" | "stub"
  ozet: string
  oneriler: string[]
  oncelikli_aksiyon: string | null
  guven_skoru: number
}

function sonBayiMesaji(mesajlar: BayiTalepMesaj[]) {
  return [...mesajlar]
    .reverse()
    .find((m) => m.gonderen_tip === "bayi")?.mesaj_icerik
}

export function stubBayiAiYanitOneri(
  talep: BayiTalep,
  mesajlar: BayiTalepMesaj[] = []
): BayiAiYanitOneri {
  const tur = TALEP_TURU_ETIKETLERI[talep.talep_turu] || talep.talep_turu
  const durum = DURUM_ETIKETLERI[talep.durum] || talep.durum
  const musteri = talep.musteri_adi?.trim() || "müşteri"
  const talepNo = talep.talep_no || "-"
  const sonBayi = sonBayiMesaji(mesajlar)

  const oneriler: string[] = []

  if (talep.durum === "alindi" || talep.durum === "inceleniyor") {
    oneriler.push(
      `Sayın bayimiz, ${talepNo} numaralı ${tur.toLowerCase()} talebiniz alındı ve inceleniyor. En kısa sürede planlama bilgisi paylaşacağız.`
    )
  }

  if (talep.durum === "planlandi") {
    oneriler.push(
      `${musteri} için randevu planlandı. Kesin saat netleşince tekrar bilgilendireceğiz. Talep no: ${talepNo}.`
    )
  }

  if (talep.durum === "atandi" || talep.durum === "yolda") {
    oneriler.push(
      `${musteri} işine teknisyenimiz ${talep.durum === "yolda" ? "yolda" : "atandı"}. Talep no: ${talepNo}${
        talep.operasyon_fis_no ? ` · Fiş: ${talep.operasyon_fis_no}` : ""
      }.`
    )
  }

  if (talep.durum === "ulasilamadi") {
    oneriler.push(
      `${musteri} için ulaşım sağlanamadı. Alternatif telefon veya uygun arama saati paylaşabilir misiniz? Talep no: ${talepNo}.`
    )
  }

  if (talep.talep_turu === "sikayet") {
    oneriler.push(
      `Şikayetinizi kayda aldık ve önceliklendirdik. ${musteri} sürecini yakından takip ediyoruz. Talep no: ${talepNo}.`
    )
  }

  if (talep.sla_asildi_mi || slaAsildiMi(talep)) {
    oneriler.push(
      `Gecikme için özür dileriz. ${talepNo} numaralı talebiniz öncelikli olarak ele alınıyor; bugün içinde güncelleme ileteceğiz.`
    )
  }

  if (talep.talep_turu === "musteri_bilgi" || sonBayi?.toLocaleLowerCase("tr-TR").includes("ulaşam")) {
    oneriler.push(
      `Müşteriye ulaşım konusunda bilgi alabilir miyiz? Alternatif numara veya uygun saat paylaşırsanız ekibimiz tekrar arayacaktır.`
    )
  }

  const bilgilendirme = bilgilendirmeSablonu(talep.durum, {
    musteri: talep.musteri_adi,
    talep_no: talep.talep_no,
    fis_no: talep.operasyon_fis_no,
  })
  if (bilgilendirme && !oneriler.includes(bilgilendirme)) {
    oneriler.push(bilgilendirme)
  }

  if (oneriler.length === 0) {
    oneriler.push(
      `Sayın bayimiz, ${talepNo} (${tur}) talebiniz ${durum.toLowerCase()} aşamasında. Güncelleme olduğunda bilgilendireceğiz.`
    )
  }

  const uniq = [...new Set(oneriler)].slice(0, 4)

  let oncelikli_aksiyon: string | null = null
  if (!talep.operasyon_aktarildi_mi && ["montaj", "ariza", "acil", "tekrar_servis"].includes(talep.talep_turu)) {
    oncelikli_aksiyon = "Operasyon havuzuna aktarım yapılmamış — yönetim panelinden aktarın."
  } else if (talep.durum === "ulasilamadi") {
    oncelikli_aksiyon = "Bayiden alternatif telefon veya randevu saati isteyin."
  } else if (talep.sla_asildi_mi) {
    oncelikli_aksiyon = "SLA aşıldı — durumu güncelleyip bayiyi bilgilendirin."
  }

  return {
    mode: "stub",
    ozet: `${tur} · ${durum}${talep.oncelik === "acil" || talep.oncelik === "kritik" ? " · Acil" : ""}`,
    oneriler: uniq,
    oncelikli_aksiyon,
    guven_skoru: 65,
  }
}

export async function uretBayiAiYanitOneri(
  talep: BayiTalep,
  mesajlar: BayiTalepMesaj[] = []
): Promise<BayiAiYanitOneri> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return stubBayiAiYanitOneri(talep, mesajlar)
  }

  const tur = TALEP_TURU_ETIKETLERI[talep.talep_turu] || talep.talep_turu
  const durum = DURUM_ETIKETLERI[talep.durum] || talep.durum
  const mesajOzet = mesajlar
    .slice(-6)
    .map((m) => `${m.gonderen_tip}: ${m.mesaj_icerik}`)
    .join("\n")

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `Sen FeyRoute Bayii Operasyon Merkezi asistanısın. Arçelik/Beko/Altus servis bayilerine kısa, profesyonel WhatsApp yanıtları öner.

Talep: ${talep.talep_no || "-"}
Tür: ${tur}
Durum: ${durum}
Öncelik: ${talep.oncelik}
Müşteri: ${talep.musteri_adi || "-"}
Telefon: ${talep.telefon || "-"}
Açıklama: ${talep.aciklama || "-"}
SLA aşıldı: ${talep.sla_asildi_mi ? "evet" : "hayır"}
Operasyon fiş: ${talep.operasyon_fis_no || "-"}

Son mesajlar:
${mesajOzet || "(yok)"}

SADECE JSON döndür:
{"ozet":"tek cümle özet","oneriler":["yanıt1","yanıt2","yanıt3"],"oncelikli_aksiyon":"personel için aksiyon veya null","guven_skoru":0-100}

Kurallar:
- Yanıtlar Türkçe, resmi ama samimi
- Her yanıt max 2 cümle
- Bayiye "Sayın bayimiz" ile başla
- Talep numarasını en az bir yanıtta geçir`,
          },
        ],
      }),
    })

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
    }

    const text = data.content?.find((c) => c.type === "text")?.text || ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return stubBayiAiYanitOneri(talep, mesajlar)
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      ozet?: string
      oneriler?: string[]
      oncelikli_aksiyon?: string | null
      guven_skoru?: number
    }

    const oneriler = (parsed.oneriler || []).filter((o) => typeof o === "string" && o.trim()).slice(0, 4)
    if (oneriler.length === 0) {
      return stubBayiAiYanitOneri(talep, mesajlar)
    }

    return {
      mode: "ai",
      ozet: parsed.ozet?.trim() || `${tur} · ${durum}`,
      oneriler,
      oncelikli_aksiyon: parsed.oncelikli_aksiyon?.trim() || null,
      guven_skoru: Math.min(100, Math.max(0, Number(parsed.guven_skoru) || 75)),
    }
  } catch {
    return stubBayiAiYanitOneri(talep, mesajlar)
  }
}
