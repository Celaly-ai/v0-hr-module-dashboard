import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function POST(request: Request) {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/portal/operasyon-havuzu?atama=hata")
  }

  const formData = await request.formData()

  const operasyonId = String(formData.get("operasyonId") ?? "")
  const fisNo = String(formData.get("fisNo") ?? "")
  const secim = String(formData.get("ekipSecim") ?? "")

  const [ekipId, ekipAdi, skorText] = secim.split("|")
  const skor = Number(skorText ?? "0")

  if (!operasyonId || !ekipId || !ekipAdi) {
    redirect("/portal/operasyon-havuzu?atama=eksik")
  }

  const { error } = await supabase.rpc("operasyon_atama_onayla_rpc", {
    p_operasyon_id: operasyonId,
    p_fis_no: fisNo,
    p_ekip_id: ekipId,
    p_ekip_adi: ekipAdi,
    p_skor: Number.isFinite(skor) ? skor : 0,
  })

  if (error) {
    console.error("Atama onay hatası:", error)
    redirect("/portal/operasyon-havuzu?atama=hata")
  }

  const { data: operasyon } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select(`
      id,
      fis_no,
      toplu_musteri_grup_id,
      musteri_adi,
      telefon,
      il,
      ilce,
      mahalle,
      adres,
      is_tipi,
      urun_adi,
      urun_model_kodu,
      seri_no,
      marka,
      barkod,
      toplu_musteri_urun_sayisi,
      toplam_is_zorluk_puani,
      rota_sirasi,
      randevu_blok,
      basvuru_notu
    `)
    .eq("id", operasyonId)
    .single()

  const { data: ekip } = await supabase
    .from("ekipler")
    .select("id, lider_personel_id")
    .eq("id", ekipId)
    .single()

  if (operasyon) {
    const { data: zimmet } = await supabase
      .from("operasyon_zimmetleri")
      .upsert(
        {
          operasyon_id: operasyon.id,
          fis_no: operasyon.fis_no,
          toplu_musteri_grup_id: operasyon.toplu_musteri_grup_id,
          ekip_id: ekipId,
          ekip_adi: ekipAdi,
          lider_personel_id: ekip?.lider_personel_id ?? null,
          gorev_tarihi: new Date().toISOString().slice(0, 10),
          rota_sirasi: operasyon.rota_sirasi,
          randevu_blok: operasyon.randevu_blok,
          musteri_adi: operasyon.musteri_adi,
          telefon: operasyon.telefon,
          il: operasyon.il,
          ilce: operasyon.ilce,
          mahalle: operasyon.mahalle,
          adres: operasyon.adres,
          is_tipi: operasyon.is_tipi,
          urun_adi: operasyon.urun_adi,
          urun_model_kodu: operasyon.urun_model_kodu,
          seri_no: operasyon.seri_no,
          marka: operasyon.marka,
          barkod: operasyon.barkod ?? operasyon.seri_no,
          urun_sayisi: operasyon.toplu_musteri_urun_sayisi ?? 1,
          toplam_is_zorluk_puani: operasyon.toplam_is_zorluk_puani ?? 0,
          durum: "atanmis",
          notlar: operasyon.basvuru_notu,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "operasyon_id,ekip_id,gorev_tarihi",
        },
      )
      .select("id")
      .single()

    if (zimmet?.id) {
      await supabase.from("operasyon_zimmet_detaylari").upsert(
        {
          operasyon_zimmet_id: zimmet.id,
          operasyon_id: operasyon.id,
          fis_no: operasyon.fis_no,
          urun_adi: operasyon.urun_adi,
          urun_model_kodu: operasyon.urun_model_kodu,
          seri_no: operasyon.seri_no,
          marka: operasyon.marka,
          is_tipi: operasyon.is_tipi,
          barkod: operasyon.barkod ?? operasyon.seri_no,
          urun_konumu: "atanmis",
          durum: "zimmet_bekliyor",
          notlar: operasyon.basvuru_notu,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "operasyon_id",
        },
      )
    }
  }

  redirect("/portal/operasyon-havuzu?atama=ok")
}
