import type { SupabaseClient } from "@supabase/supabase-js"
import { getGorevPersonelContext } from "@/lib/services/gorev-yetki-service"

export function ekipAktifMi(ekip: {
  aktif?: boolean | null
  durum?: string | null
}) {
  if (typeof ekip.aktif === "boolean") return ekip.aktif
  return ekip.durum !== "pasif"
}

export async function atamaIslemiYetkisi(supabase: SupabaseClient) {
  const ctx = await getGorevPersonelContext(supabase)

  if (!ctx.ok) {
    return { ok: false as const, kod: "yetkisiz" as const }
  }

  if (!ctx.data.operasyonYoneticisiMi) {
    return { ok: false as const, kod: "yetkisiz" as const }
  }

  return { ok: true as const, personelId: ctx.data.personelId }
}

export async function operasyonAtamaBekliyorMu(
  supabase: SupabaseClient,
  operasyonId: string,
) {
  const { data, error } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select("id, atama_gerekli, kesin_atanan_ekip_id, operasyon_disina_alindi")
    .eq("id", operasyonId)
    .limit(1)

  const kayit = data?.[0]
  if (error || !kayit) {
    return { ok: false as const, kod: "yok" as const }
  }

  if (kayit.kesin_atanan_ekip_id) {
    return { ok: false as const, kod: "zaten_atandi" as const }
  }

  if (!kayit.atama_gerekli || kayit.operasyon_disina_alindi) {
    return { ok: false as const, kod: "atama_yok" as const }
  }

  return { ok: true as const, kayit }
}
