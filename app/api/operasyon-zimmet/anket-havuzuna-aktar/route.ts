import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()

  if (!supabase) {
    return Response.json({ error: "Supabase bağlantısı yok." }, { status: 500 })
  }

  const { data: zimmetler, error } = await supabase
    .from("operasyon_zimmetleri")
    .select(`
      id,
      operasyon_id,
      fis_no,
      musteri_adi,
      telefon,
      ilce,
      mahalle,
      ekip_adi,
      marka,
      urun_adi,
      urun_model_kodu,
      planlanan_is_tipi,
      gerceklesen_is_tipi,
      sonuc_aciklama,
      sonuc_tamamlandi,
      anket_havuzuna_aktarildi
    `)
    .eq("sonuc_tamamlandi", true)
    .eq("anket_havuzuna_aktarildi", false)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const kayitlar = zimmetler ?? []

  if (kayitlar.length === 0) {
    return Response.json({ ok: true, aktarilan: 0 })
  }

  const now = new Date().toISOString()

  const aktarilacak = kayitlar.map((z) => ({
    is_kodu: `OZ-${z.id}`,
    musteri_adi: z.musteri_adi,
    fis_numarasi: z.fis_no,
    telefon: z.telefon,
    basvuru_nedeni: `Planlanan: ${z.planlanan_is_tipi || "-"} / Gerçekleşen: ${z.gerceklesen_is_tipi || "-"}`,
    ilce: z.ilce,
    mahalle: z.mahalle,
    teknisyen_adi: z.ekip_adi,
    marka: z.marka,
    urun_grubu: z.urun_adi,
    model: z.urun_model_kodu,
    yapilan_hizmet_kodu: z.gerceklesen_is_tipi,
    teknisyen_notu: z.sonuc_aciklama,
    kaynak_tipi: "OPERASYON_ZIMMET",
    anket_durumu: "bekliyor",
    ai_risk_seviyesi:
      z.gerceklesen_is_tipi === "İ"
        ? "KRITIK"
        : z.planlanan_is_tipi === "NM" && z.gerceklesen_is_tipi === "N"
          ? "ONEMLI"
          : "NORMAL",
    created_at: now,
    updated_at: now,
  }))

  const { error: insertError } = await supabase
    .from("ai_anket_is_havuzu")
    .upsert(aktarilacak, {
      onConflict: "is_kodu",
    })

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 })
  }

  const ids = kayitlar.map((z) => z.id)

  const { error: updateError } = await supabase
    .from("operasyon_zimmetleri")
    .update({
      anket_havuzuna_aktarildi: true,
      anket_havuzuna_aktarilma_zamani: now,
      updated_at: now,
    })
    .in("id", ids)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    aktarilan: kayitlar.length,
  })
}
