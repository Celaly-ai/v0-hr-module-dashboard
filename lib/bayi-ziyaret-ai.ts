import { riskSeviyesiEtiketi, ziyaretBekliyorMu } from "@/lib/bayi-operasyon-utils"
import type { BayiKart, BayiTalep, BayiZiyaretAiPlan } from "@/lib/types/bayi-operasyon"

export type { BayiZiyaretAiPlan }

export function stubBayiZiyaretAiPlan(bayi: BayiKart, talepler: BayiTalep[] = []): BayiZiyaretAiPlan {
  const acikSikayet = talepler.filter(
    (t) => t.talep_turu === "sikayet" && !["tamamlandi", "kapandi", "iptal"].includes(t.durum)
  ).length
  const slaAsilan = talepler.filter((t) => t.sla_asildi_mi).length
  const ziyaretBekliyor = ziyaretBekliyorMu(bayi)

  let oncelik: BayiZiyaretAiPlan["oncelik"] = "dusuk"
  if (bayi.risk_seviyesi === "kritik" || acikSikayet > 1) oncelik = "yuksek"
  else if (bayi.risk_seviyesi === "yuksek" || ziyaretBekliyor || slaAsilan > 0) oncelik = "orta"

  const sorular: string[] = [
    "Son dönemde en çok hangi ürün gruplarında iş hacmi arttı/azaldı?",
    "Müşteri tarafında tekrarlayan şikayet veya bekleme konuları var mı?",
    "Ekibimizden daha hızlı dönüş veya planlama beklentiniz nedir?",
  ]

  if (acikSikayet > 0) {
    sorular.unshift("Açık şikayet kayıtları için bayinin beklentisi ve çözüm önerisi nedir?")
  }

  const aksiyonlar: string[] = []
  if (ziyaretBekliyor) aksiyonlar.push("Saha ziyareti planla ve son_gorusme_tarihi güncelle.")
  if (acikSikayet > 0) aksiyonlar.push(`${acikSikayet} açık şikayeti yönetim panelinden önceliklendir.`)
  if (slaAsilan > 0) aksiyonlar.push("SLA aşan talepler için operasyon aktarımını kontrol et.")
  if (bayi.risk_seviyesi === "kritik" || bayi.risk_seviyesi === "yuksek") {
    aksiyonlar.push("Risk skorunu düşürmek için 2 hafta içinde ikinci ziyaret planı oluştur.")
  }
  if (aksiyonlar.length === 0) {
    aksiyonlar.push("Rutin ilişki ziyareti yap; memnuniyet ve yeni iş potansiyelini sor.")
  }

  return {
    mode: "stub",
    ozet: `${bayi.bayi_adi} · ${riskSeviyesiEtiketi(bayi.risk_seviyesi || "dusuk")} · ${oncelik} öncelik`,
    oncelik,
    sorular: sorular.slice(0, 5),
    aksiyonlar: aksiyonlar.slice(0, 4),
    guven_skoru: 70,
  }
}

export async function uretBayiZiyaretAiPlan(
  bayi: BayiKart,
  talepler: BayiTalep[] = []
): Promise<BayiZiyaretAiPlan> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return stubBayiZiyaretAiPlan(bayi, talepler)
  }

  const acikTalep = talepler.filter(
    (t) => !["tamamlandi", "kapandi", "iptal"].includes(t.durum)
  ).length

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
            content: `FeyRoute bayi saha ziyareti planı oluştur.

Bayi: ${bayi.bayi_adi}
Risk: ${bayi.risk_seviyesi} (${bayi.risk_skoru}/100)
Performans: ${bayi.performans_puani}/100
Son ziyaret: ${bayi.son_ziyaret_tarihi || "yok"}
Açık talep: ${acikTalep}
30 gün iş hacmi: ${bayi.aylik_is_hacmi || 0}

SADECE JSON:
{"ozet":"tek cümle","oncelik":"dusuk|orta|yuksek","sorular":["soru1","soru2","soru3"],"aksiyonlar":["aksiyon1","aksiyon2"],"guven_skoru":0-100}`,
          },
        ],
      }),
    })

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
    }
    const text = data.content?.find((c) => c.type === "text")?.text || ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return stubBayiZiyaretAiPlan(bayi, talepler)

    const parsed = JSON.parse(jsonMatch[0]) as Partial<BayiZiyaretAiPlan>
    const oncelik = parsed.oncelik
    if (oncelik !== "dusuk" && oncelik !== "orta" && oncelik !== "yuksek") {
      return stubBayiZiyaretAiPlan(bayi, talepler)
    }

    const sorular = (parsed.sorular || []).filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
    const aksiyonlar = (parsed.aksiyonlar || [])
      .filter((s) => typeof s === "string" && s.trim())
      .slice(0, 4)

    if (sorular.length === 0 || aksiyonlar.length === 0) {
      return stubBayiZiyaretAiPlan(bayi, talepler)
    }

    return {
      mode: "ai",
      ozet: parsed.ozet?.trim() || `${bayi.bayi_adi} ziyaret planı`,
      oncelik,
      sorular,
      aksiyonlar,
      guven_skoru: Math.min(100, Math.max(0, Number(parsed.guven_skoru) || 75)),
    }
  } catch {
    return stubBayiZiyaretAiPlan(bayi, talepler)
  }
}
