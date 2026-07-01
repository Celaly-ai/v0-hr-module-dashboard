import { createClient } from "@/lib/supabase/server"

function temiz(value: unknown) {
  const v = String(value ?? "").trim()
  if (!v || v === "0" || v.toLowerCase() === "null") return ""
  return v
}

export async function POST(request: Request) {
  const supabase = await createClient()

  if (!supabase) {
    return Response.json({ error: "Supabase bağlantısı yok." }, { status: 500 })
  }

  const body = await request.json().catch(() => null)

  const detayId = temiz(body?.detay_id)
  const okunanBarkod = temiz(body?.barkod)
  const okunanSeriNo = temiz(body?.seri_no)
  const ekipId = temiz(body?.ekip_id)
  const ekipAdi = temiz(body?.ekip_adi)

  if (!detayId || !okunanBarkod || !okunanSeriNo || !ekipId || !ekipAdi) {
    return Response.json(
      { error: "Detay, barkod, seri no ve ekip bilgisi zorunludur." },
      { status: 400 },
    )
  }

  const { data: detay, error: detayError } = await supabase
    .from("operasyon_zimmet_detaylari")
    .select("id, barkod, seri_no")
    .eq("id", detayId)
    .single()

  if (detayError || !detay) {
    return Response.json({ error: "Ürün detayı bulunamadı." }, { status: 404 })
  }

  const kayitliBarkod = temiz(detay.barkod)
  const kayitliSeriNo = temiz(detay.seri_no)

  const ilkTanimlama = !kayitliBarkod && !kayitliSeriNo

  if (!ilkTanimlama) {
    const barkodEslesiyor = kayitliBarkod === okunanBarkod
    const seriEslesiyor = kayitliSeriNo === okunanSeriNo

    if (!barkodEslesiyor || !seriEslesiyor) {
      const hata = [
        !barkodEslesiyor ? "Barkod kayıtlı ürünle eşleşmedi." : null,
        !seriEslesiyor ? "Seri no kayıtlı ürünle eşleşmedi." : null,
      ]
        .filter(Boolean)
        .join(" ")

      await supabase
        .from("operasyon_zimmet_detaylari")
        .update({
          barkod_okundu: Boolean(okunanBarkod),
          seri_no_okundu: Boolean(okunanSeriNo),
          barkod_dogrulandi: barkodEslesiyor,
          seri_no_dogrulandi: seriEslesiyor,
          dogrulama_hatasi: hata,
          dogrulama_zamani: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", detayId)

      return Response.json({ error: hata, mod: "dogrulama" }, { status: 400 })
    }
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("operasyon_zimmet_detaylari")
    .update({
      barkod: ilkTanimlama ? okunanBarkod : kayitliBarkod,
      seri_no: ilkTanimlama ? okunanSeriNo : kayitliSeriNo,

      barkod_okundu: true,
      seri_no_okundu: true,
      barkod_dogrulandi: true,
      seri_no_dogrulandi: true,
      dogrulama_hatasi: null,
      dogrulama_zamani: now,

      zimmete_alindi: true,
      zimmete_alinma_zamani: now,
      zimmet_devralan_ekip_id: ekipId,
      zimmet_devralan_ekip_adi: ekipAdi,
      zimmet_devralma_zamani: now,

      mevcut_konum_tipi: "ekip",
      mevcut_konum_adi: ekipAdi,
      son_zimmet_tipi: "ekip",
      son_zimmet_adi: ekipAdi,
      son_zimmet_ekip_id: ekipId,
      urun_konumu: ekipAdi,
      durum: "ekip_zimmetinde",
      eski_zimmet_bildirildi: false,
      updated_at: now,
    })
    .eq("id", detayId)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    mod: ilkTanimlama ? "ilk_tanimlama" : "dogrulama",
    message: ilkTanimlama
      ? "Ürün ilk kez tanımlandı ve ekip zimmetine alındı."
      : "Ürün doğrulandı ve ekip zimmetine alındı.",
    ekip_adi: ekipAdi,
  })
}
