import { createClient } from "@/lib/supabase/server"
import {
  atamaIslemiYetkisi,
  operasyonAtamaBekliyorMu,
} from "@/lib/services/atama-onay-service"
import {
  donusQuerySuffix,
  guvenliDonusYolu,
} from "@/lib/services/operasyon-donus-yolu"
import { redirect } from "next/navigation"

export async function POST(request: Request) {
  const supabase = await createClient()
  const varsayilan = "/portal/operasyon-havuzu"

  if (!supabase) {
    redirect(donusQuerySuffix(varsayilan, "hata"))
  }

  const formData = await request.formData()
  const operasyonId = String(formData.get("operasyonId") ?? "")
  const donusYolu = guvenliDonusYolu(formData.get("returnPath"), varsayilan)

  const yetki = await atamaIslemiYetkisi(supabase)
  if (!yetki.ok) {
    redirect(donusQuerySuffix(donusYolu, "yetkisiz"))
  }

  if (!operasyonId) {
    redirect(donusQuerySuffix(donusYolu, "eksik"))
  }

  const durum = await operasyonAtamaBekliyorMu(supabase, operasyonId)
  if (!durum.ok) {
    redirect(donusQuerySuffix(donusYolu, durum.kod))
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .update({
      operasyon_disina_alindi: true,
      operasyon_disina_alinma_nedeni:
        "Atama sorumlusu tarafından atama dışı bırakıldı.",
      operasyon_disina_alinma_tarihi: now,
      atama_gerekli: false,
      operasyon_asamasi: "ATAMA_DISI",
      updated_at: now,
    })
    .eq("id", operasyonId)

  if (updateError) {
    redirect(donusQuerySuffix(donusYolu, "hata"))
  }

  redirect(donusQuerySuffix(donusYolu, "atama_disi"))
}
