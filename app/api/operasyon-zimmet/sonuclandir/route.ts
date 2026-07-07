import { createClient } from "@/lib/supabase/server"
import { kullaniciZimmeteYetkiliMi } from "@/lib/services/gorev-yetki-service"

function temiz(value: unknown) {
  return String(value ?? "").trim()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) {
    return Response.json({ error: "Supabase bağlantısı yok." }, { status: 500 })
  }

  const body = await request.json().catch(() => null)

  const zimmetId = temiz(body?.zimmet_id)
  const gerceklesenIsTipi = temiz(body?.gerceklesen_is_tipi).toUpperCase()
  const aciklama = temiz(body?.aciklama)

  if (!zimmetId || !["NM", "N", "M", "İ", "I"].includes(gerceklesenIsTipi)) {
    return Response.json({ error: "Zimmet ve geçerli sonuç tipi zorunludur." }, { status: 400 })
  }

  const yetki = await kullaniciZimmeteYetkiliMi(supabase, zimmetId)

  if (!yetki.ok) {
    return Response.json({ error: yetki.error }, { status: yetki.status ?? 403 })
  }

  const sonucTipi = gerceklesenIsTipi === "I" ? "İ" : gerceklesenIsTipi

  const { data: zimmet, error } = await supabase
    .from("operasyon_zimmetleri")
    .select("id, planlanan_is_tipi, sonuc_barkod_zorunlu")
    .eq("id", zimmetId)
    .single()

  if (error || !zimmet) {
    return Response.json({ error: "Operasyon zimmeti bulunamadı." }, { status: 404 })
  }

  const { data: detaylar } = await supabase
    .from("operasyon_zimmet_detaylari")
    .select("id, zimmete_alindi, barkod_dogrulandi, seri_no_dogrulandi")
    .eq("operasyon_zimmet_id", zimmetId)

  const urunler = detaylar ?? []
  const eksikDogrulama = urunler.some(
    (d) => !d.zimmete_alindi || !d.barkod_dogrulandi || !d.seri_no_dogrulandi,
  )

  if (sonucTipi !== "İ" && zimmet.sonuc_barkod_zorunlu && (urunler.length === 0 || eksikDogrulama)) {
    return Response.json(
      { error: "Tüm ürünler barkod/seri no doğrulanmadan işlem sonuçlandırılamaz." },
      { status: 400 },
    )
  }

  const aciklamaZorunlu =
    sonucTipi === "İ" ||
    (zimmet.planlanan_is_tipi === "NM" && sonucTipi === "N")

  if (aciklamaZorunlu && !aciklama) {
    return Response.json(
      { error: "Bu sonuç için açıklama zorunludur." },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("operasyon_zimmetleri")
    .update({
      gerceklesen_is_tipi: sonucTipi,
      sonuc_aciklama_zorunlu: aciklamaZorunlu,
      sonuc_aciklama: aciklama || null,
      sonuc_barkod_dogrulandi: true,
      sonuc_tamamlandi: true,
      sonuc_tamamlanma_zamani: now,
      durum: sonucTipi === "İ" ? "iptal" : "tamamlandi",
      anket_havuzuna_aktarildi: false,
      updated_at: now,
    })
    .eq("id", zimmetId)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    message: "Operasyon sonucu kaydedildi. Anket havuzuna aktarım için hazır.",
    gerceklesen_is_tipi: sonucTipi,
  })
}
