import { createClient } from "@/lib/supabase/server"
import { getSupabaseUrl } from "@/lib/supabase/env"
import {
  atamaGorevKopruOzet,
  planlananIsTipiKodu,
  zimmetNotlariBirlestir,
} from "@/lib/services/atama-gorev-koprusu-service"
import {
  atamaIslemiYetkisi,
  ekipAktifMi,
} from "@/lib/services/atama-onay-service"
import { guvenliDonusYolu } from "@/lib/services/operasyon-donus-yolu"
import { bugunGorevTarihiTr } from "@/lib/services/operasyon-tarih-service"
import { redirect } from "next/navigation"

const OPERASYON_SNAPSHOT_SELECT = `
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
  toplu_musteri_urun_sayisi,
  toplam_is_zorluk_puani,
  rota_sirasi,
  randevu_blok,
  basvuru_notu,
  kat_bilgisi,
  kesin_atanan_ekip_id
`

function atamaRedirect(base: string, kod: string): never {
  const ayirici = base.includes("?") ? "&" : "?"
  redirect(`${base}${ayirici}atama=${encodeURIComponent(kod)}`)
}

function getSupabaseProjectRef(): string | null {
  const url = getSupabaseUrl()
  if (!url) return null
  try {
    const hostname = new URL(url).hostname
    const match = hostname.match(/^([^.]+)\.supabase\.co$/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const varsayilanDonus = "/portal/operasyon-havuzu"

  const formData = await request.formData()
  const donusYolu = guvenliDonusYolu(formData.get("returnPath"), varsayilanDonus)

  if (!supabase) {
    atamaRedirect(donusYolu, "hata")
  }

  const yetki = await atamaIslemiYetkisi(supabase)
  if (!yetki.ok) {
    atamaRedirect(donusYolu, "yetkisiz")
  }

  console.log("[ATAMA-DB] PROJECT-REF", getSupabaseProjectRef() ?? "bilinmiyor")

  const operasyonId = String(formData.get("operasyonId") ?? "")
  const fisNo = String(formData.get("fisNo") ?? "")
  const secim = String(formData.get("ekipSecim") ?? "")

  const [ekipId, , skorText] = secim.split("|")
  const skor = Number(skorText ?? "0")

  if (!operasyonId || !ekipId) {
    atamaRedirect(donusYolu, "eksik")
  }

  console.log("[ATAMA-01] REQUEST", { operasyonId, fisNo, ekipId })

  const { data: operasyon, error: operasyonError } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select(OPERASYON_SNAPSHOT_SELECT)
    .eq("id", operasyonId)
    .maybeSingle()

  if (operasyonError || !operasyon) {
    console.error(
      "Atama öncesi operasyon okunamadı:",
      operasyonError?.message ?? "kayıt yok",
      { operasyonId },
    )
    atamaRedirect(donusYolu, "hata")
  }

  console.log("[ATAMA-02] OPERASYON-SNAPSHOT", {
    "operasyon.id": operasyon.id,
    "operasyon.fis_no": operasyon.fis_no,
    "operasyon.kesin_atanan_ekip_id": operasyon.kesin_atanan_ekip_id,
  })

  if (operasyon.kesin_atanan_ekip_id) {
    console.error("Operasyon zaten atanmış:", operasyonId)
    atamaRedirect(donusYolu, "zaten_atandi")
  }

  const { data: ekip, error: ekipError } = await supabase
    .from("ekipler")
    .select("id, ekip_adi, lider_personel_id, aktif, durum")
    .eq("id", ekipId)
    .maybeSingle()

  if (ekipError || !ekip || !ekipAktifMi(ekip)) {
    console.error(
      "Atama ekip doğrulama hatası:",
      ekipError?.message ?? "ekip bulunamadı veya pasif",
      { ekipId },
    )
    atamaRedirect(donusYolu, "hata")
  }

  console.log("[ATAMA-03] EKIP-DOGRULANDI", {
    "ekip.id": ekip.id,
    "ekip.ekip_adi": ekip.ekip_adi,
    "ekip.aktif": ekip.aktif,
    "ekip.durum": ekip.durum,
  })

  const gercekEkipAdi = String(ekip.ekip_adi ?? "").trim()
  if (!gercekEkipAdi) {
    console.error("Atama ekip adı eksik:", ekipId)
    atamaRedirect(donusYolu, "hata")
  }

  const { error: rpcError } = await supabase.rpc("operasyon_atama_onayla_rpc", {
    p_operasyon_id: operasyonId,
    p_fis_no: fisNo || operasyon.fis_no || "",
    p_ekip_id: ekipId,
    p_ekip_adi: gercekEkipAdi,
    p_skor: Number.isFinite(skor) ? skor : 0,
  })

  if (rpcError) {
    console.error("Atama onay hatası:", rpcError)
    atamaRedirect(donusYolu, "hata")
  }

  console.log("[ATAMA-04] RPC-BASARILI", { operasyonId, ekipId })

  const { data: rpcSonrasiOperasyon, error: rpcSonrasiError } = await supabase
    .from("aktif_operasyon_havuzu_v2")
    .select("id, kesin_atanan_ekip_id, kesin_atanan_ekip_adi, operasyon_asamasi")
    .eq("id", operasyonId)
    .maybeSingle()

  console.log("[ATAMA-04B] RPC-SONRASI-VIEW", {
    data: rpcSonrasiOperasyon,
    error: rpcSonrasiError?.message ?? null,
  })

  const gorevTarihi = bugunGorevTarihiTr()
  const planlananIsTipi = planlananIsTipiKodu(operasyon.is_tipi)
  const zimmetNotlar = zimmetNotlariBirlestir(
    operasyon.basvuru_notu,
    operasyon.kat_bilgisi,
  )
  const now = new Date().toISOString()

  const { data: zimmet, error: zimmetError } = await supabase
    .from("operasyon_zimmetleri")
    .upsert(
      {
        operasyon_id: operasyon.id,
        fis_no: operasyon.fis_no,
        toplu_musteri_grup_id: operasyon.toplu_musteri_grup_id,
        ekip_id: ekipId,
        ekip_adi: gercekEkipAdi,
        lider_personel_id: ekip.lider_personel_id ?? null,
        gorev_tarihi: gorevTarihi,
        rota_sirasi: operasyon.rota_sirasi,
        randevu_blok: operasyon.randevu_blok,
        musteri_adi: operasyon.musteri_adi,
        telefon: operasyon.telefon,
        il: operasyon.il,
        ilce: operasyon.ilce,
        mahalle: operasyon.mahalle,
        adres: operasyon.adres,
        is_tipi: operasyon.is_tipi,
        planlanan_is_tipi: planlananIsTipi,
        urun_adi: operasyon.urun_adi,
        urun_model_kodu: operasyon.urun_model_kodu,
        seri_no: operasyon.seri_no,
        marka: operasyon.marka,
        barkod: null,
        urun_sayisi: operasyon.toplu_musteri_urun_sayisi ?? 1,
        toplam_is_zorluk_puani: operasyon.toplam_is_zorluk_puani ?? 0,
        durum: "atanmis",
        operasyon_durumu: "ATANMIS",
        notlar: zimmetNotlar,
        updated_at: now,
      },
      {
        onConflict: "operasyon_id,ekip_id,gorev_tarihi",
      },
    )
    .select("id")
    .single()

  console.log("[ATAMA-05] ZIMMET-UPSERT-SONUC", {
    "zimmet?.id": zimmet?.id ?? null,
    "zimmetError?.message": zimmetError?.message ?? null,
    gorevTarihi,
    operasyonId,
    ekipId,
  })

  if (zimmet?.id) {
    const { data: zimmetReadback, error: zimmetReadbackError } = await supabase
      .from("operasyon_zimmetleri")
      .select("id, operasyon_id, ekip_id, gorev_tarihi, durum, created_at, updated_at")
      .eq("id", zimmet.id)
      .maybeSingle()

    console.log("[ATAMA-05B] ZIMMET-READBACK", {
      data: zimmetReadback,
      error: zimmetReadbackError?.message ?? null,
    })
  }

  if (zimmetError || !zimmet?.id) {
    console.error(
      "Operasyon zimmeti oluşturulamadı:",
      zimmetError?.message ?? "zimmet id yok",
      { operasyonId, ekipId, gorevTarihi },
    )
    atamaRedirect(donusYolu, "hata")
  }

  const { error: detayError } = await supabase
    .from("operasyon_zimmet_detaylari")
    .upsert(
      {
        operasyon_zimmet_id: zimmet.id,
        operasyon_id: operasyon.id,
        fis_no: operasyon.fis_no,
        urun_adi: operasyon.urun_adi,
        urun_model_kodu: operasyon.urun_model_kodu,
        seri_no: operasyon.seri_no,
        marka: operasyon.marka,
        is_tipi: operasyon.is_tipi,
        barkod: null,
        urun_konumu: "atanmis",
        durum: "zimmet_bekliyor",
        notlar: operasyon.basvuru_notu,
        updated_at: now,
      },
      {
        onConflict: "operasyon_id",
      },
    )

  console.log("[ATAMA-06] DETAY-UPSERT-SONUC", {
    "detayError?.message": detayError?.message ?? null,
    operasyonId,
    "zimmet?.id": zimmet.id,
  })

  if (detayError) {
    console.error(
      "Operasyon zimmet detayı oluşturulamadı:",
      detayError.message,
      { operasyonId, zimmetId: zimmet.id },
    )
    atamaRedirect(donusYolu, "hata")
  }

  console.log("[ATAMA-07] BASARI-REDIRECT", {
    operasyonId,
    "zimmet.id": zimmet.id,
    gorevTarihi,
  })

  console.log("[ATAMA-08] GOREV-KOPRU", atamaGorevKopruOzet({
    gorevTarihi,
    planlananIsTipi,
    zimmetId: zimmet.id,
    operasyonId: operasyon.id,
    fisNo: operasyon.fis_no,
    ekipId,
  }))

  atamaRedirect(donusYolu, "ok")
}
