import { createClient } from "@/lib/supabase/server"
import {
  getGorevPersonelContext,
  zimmetYetkiFiltresi,
} from "@/lib/services/gorev-yetki-service"
import { bugunGorevTarihiTr } from "@/lib/services/operasyon-tarih-service"

const ZIMMET_SELECT = `
  id,
  operasyon_id,
  fis_no,
  ekip_id,
  ekip_adi,
  lider_personel_id,
  gorev_tarihi,
  rota_sirasi,
  randevu_blok,
  musteri_adi,
  telefon,
  il,
  ilce,
  mahalle,
  adres,
  is_tipi,
  planlanan_is_tipi,
  urun_sayisi,
  toplam_is_zorluk_puani,
  notlar,
  adres_tanimlandi,
  adrese_varildi,
  operasyon_durumu,
  sonuc_tamamlandi,
  sonuc_barkod_zorunlu,
  durum,
  gerceklesen_is_tipi
`

const DETAY_SELECT = `
  id,
  operasyon_zimmet_id,
  fis_no,
  urun_adi,
  urun_model_kodu,
  marka,
  seri_no,
  mevcut_konum_tipi,
  mevcut_konum_adi,
  zimmete_alindi,
  barkod_dogrulandi,
  seri_no_dogrulandi,
  durum
`

export async function GET() {
  const supabase = await createClient()

  if (!supabase) {
    return Response.json({ error: "Supabase bağlantısı yok." }, { status: 500 })
  }

  const ctx = await getGorevPersonelContext(supabase)

  if (!ctx.ok) {
    return Response.json(
      { error: ctx.error },
      { status: ctx.status ?? 400 },
    )
  }

  const { data: modulYetkisi, error: modulYetkiError } = await supabase
    .from("personel_modul_yetkileri")
    .select("id")
    .eq("personel_id", ctx.data.personelId)
    .eq("modul_kod", "gorevlerim")
    .eq("aktif", true)
    .maybeSingle()

  if (modulYetkiError) {
    return Response.json({ error: modulYetkiError.message }, { status: 500 })
  }

  if (!modulYetkisi) {
    return Response.json(
      { error: "Bu modüle erişim yetkiniz yok." },
      { status: 403 },
    )
  }

  const bugun = bugunGorevTarihiTr()
  const yetkiFiltresi = zimmetYetkiFiltresi(ctx.data)

  if (!yetkiFiltresi) {
    return Response.json({
      ok: true,
      personel: {
        id: ctx.data.personelId,
        ad: ctx.data.personelAd,
        ekip_id: ctx.data.birincilEkipId,
        ekip_adi: ctx.data.birincilEkipAdi,
      },
      gorev_tarihi: bugun,
      zimmetler: [],
      detaylar: [],
    })
  }

  const { data: zimmetler, error: zimmetError } = await supabase
    .from("operasyon_zimmetleri")
    .select(ZIMMET_SELECT)
    .eq("gorev_tarihi", bugun)
    .or(yetkiFiltresi)
    .order("rota_sirasi", { ascending: true })

  if (zimmetError) {
    return Response.json({ error: zimmetError.message }, { status: 500 })
  }

  const kayitlar = zimmetler ?? []
  const zimmetIds = kayitlar.map((z) => z.id).filter(Boolean)

  let detaylar: unknown[] = []

  if (zimmetIds.length > 0) {
    const { data: detayData, error: detayError } = await supabase
      .from("operasyon_zimmet_detaylari")
      .select(DETAY_SELECT)
      .in("operasyon_zimmet_id", zimmetIds)

    if (detayError) {
      return Response.json({ error: detayError.message }, { status: 500 })
    }

    detaylar = detayData ?? []
  }

  return Response.json({
    ok: true,
    personel: {
      id: ctx.data.personelId,
      ad: ctx.data.personelAd,
      ekip_id: ctx.data.birincilEkipId,
      ekip_adi: ctx.data.birincilEkipAdi,
    },
    gorev_tarihi: bugun,
    zimmetler: kayitlar,
    detaylar,
  })
}
