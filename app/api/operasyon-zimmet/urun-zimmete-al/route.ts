import { createClient } from "@/lib/supabase/server"
import { kullaniciDetayaYetkiliMi } from "@/lib/services/gorev-yetki-service"

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

  if (!detayId || !okunanBarkod || !okunanSeriNo) {
    return Response.json(
      { error: "Detay, barkod ve seri no zorunludur." },
      { status: 400 },
    )
  }

  const { data: detayKayit, error: detayLookupError } = await supabase
    .from("operasyon_zimmet_detaylari")
    .select("id, operasyon_zimmet_id, barkod, seri_no")
    .eq("id", detayId)
    .maybeSingle()

  if (detayLookupError) {
    return Response.json({ error: detayLookupError.message }, { status: 500 })
  }

  if (!detayKayit?.operasyon_zimmet_id) {
    return Response.json({ error: "Ürün detayı bulunamadı." }, { status: 404 })
  }

  const yetki = await kullaniciDetayaYetkiliMi(supabase, detayId)

  if (!yetki.ok) {
    return Response.json({ error: yetki.error }, { status: yetki.status ?? 403 })
  }

  const { data: zimmet, error: zimmetError } = await supabase
    .from("operasyon_zimmetleri")
    .select("id, ekip_id, ekip_adi")
    .eq("id", detayKayit.operasyon_zimmet_id)
    .maybeSingle()

  if (zimmetError) {
    return Response.json({ error: zimmetError.message }, { status: 500 })
  }

  const ekipId = temiz(zimmet?.ekip_id)
  const ekipAdi = temiz(zimmet?.ekip_adi)

  if (!ekipId || !ekipAdi) {
    return Response.json(
      {
        error:
          "Operasyon zimmetinde ekip bilgisi eksik. Ürün zimmete alınamaz.",
      },
      { status: 400 },
    )
  }

  const kayitliBarkod = temiz(detayKayit.barkod)
  const kayitliSeriNo = temiz(detayKayit.seri_no)

  const barkodEslesiyor = !kayitliBarkod || kayitliBarkod === okunanBarkod
  const seriEslesiyor = !kayitliSeriNo || kayitliSeriNo === okunanSeriNo

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

  const sonucBarkod = kayitliBarkod || okunanBarkod
  const sonucSeriNo = kayitliSeriNo || okunanSeriNo
  const ilkTanimlama = !kayitliBarkod || !kayitliSeriNo

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("operasyon_zimmet_detaylari")
    .update({
      barkod: sonucBarkod,
      seri_no: sonucSeriNo,

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
