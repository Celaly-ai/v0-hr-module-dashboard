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

  const { data: opRows, error: opError } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select("id, fis_no, musteri_adi, telefon, urun_adi, is_tipi, randevu_tarihi")
    .eq("id", operasyonId)
    .limit(1)

  const op = opRows?.[0]
  if (opError || !op) {
    redirect(donusQuerySuffix(donusYolu, "yok"))
  }

  const { error: insertError } = await supabase
    .from("operasyon_randevu_bekleyenler")
    .insert({
      operasyon_id: op.id,
      fis_no: op.fis_no,
      musteri_adi: op.musteri_adi,
      telefon: op.telefon,
      urun_adi: op.urun_adi,
      is_tipi: op.is_tipi,
      eski_randevu_tarihi: op.randevu_tarihi,
      durum: "randevu_bekliyor",
    })

  if (insertError) {
    redirect(donusQuerySuffix(donusYolu, "hata"))
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .update({
      operasyon_disina_alindi: true,
      operasyon_disina_alinma_nedeni:
        "Atama sorumlusu tarafından randevu beklemeye alındı.",
      operasyon_disina_alinma_tarihi: now,
      randevu_bekliyor: true,
      atama_gerekli: false,
      operasyon_asamasi: "RANDEVU_BEKLIYOR",
      updated_at: now,
    })
    .eq("id", operasyonId)

  if (updateError) {
    redirect(donusQuerySuffix(donusYolu, "hata"))
  }

  redirect(donusQuerySuffix(donusYolu, "randevu_bekliyor"))
}
