import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export type KymKaynakDogrulamaDurumu =
  | "bekliyor"
  | "resmi_kaynak_dogrulandi"
  | "uzman_incelemesi_gerekli"
  | "guncelleme_gerekli"

export type KymBasvuruYonlendirme = {
  isletme_id?: string
  isletme_adi?: string
  isletme_belge_id?: string

  rehber_id: string
  belge_tanim_id: string

  belge_kodu: string
  belge_adi: string

  yukumluluk_id: string
  yukumluluk_kodu: string
  yukumluluk_basligi: string

  kategori: string
  alt_kategori?: string | null

  hukuki_dayanak?: string | null
  denetleyen_kurum?: string | null

  risk_puani: number
  oncelik: string

  uygulanabilirlik_tipi: string
  uygulanabilirlik_kosulu: Record<string, unknown>

  rehber_basligi?: string | null
  neden_gerekli?: string | null
  hangi_kosullarda_gerekli?: string | null

  resmi_kurum?: string | null
  basvuru_yeri?: string | null
  basvuru_kanali?: string | null

  resmi_kaynak_url?: string | null
  online_basvuru_url?: string | null

  tahmini_sure_notu?: string | null
  ucret_notu?: string | null

  on_kontrol_listesi: string[]
  gerekli_evraklar_json: string[]
  basvuru_adimlari_json: string[]
  dikkat_edilecekler_json: string[]

  dilekce_basligi?: string | null
  dilekce_metni?: string | null

  hukuki_uyari?: string | null

  kaynak_dogrulama_durumu: KymKaynakDogrulamaDurumu

  kaynak_son_kontrol_tarihi?: string | null

  belge_durumu?: string
  gecerlilik_bitis?: string | null

  ai_ozet?: string | null
  ai_eksikler?: string[]
}

function stringListesi(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
}

function normalizeYonlendirme(
  value: Record<string, unknown>,
): KymBasvuruYonlendirme {
  return {
    ...(value as unknown as KymBasvuruYonlendirme),

    on_kontrol_listesi: stringListesi(
      value.on_kontrol_listesi,
    ),

    gerekli_evraklar_json: stringListesi(
      value.gerekli_evraklar_json,
    ),

    basvuru_adimlari_json: stringListesi(
      value.basvuru_adimlari_json,
    ),

    dikkat_edilecekler_json: stringListesi(
      value.dikkat_edilecekler_json,
    ),

    ai_eksikler: stringListesi(
      value.ai_eksikler,
    ),
  }
}

export async function getKymBelgeYonlendirmesi(
  belgeTanimId: string,
): Promise<KymBasvuruYonlendirme | null> {
  const { data, error } = await supabase
    .from("v_kym_basvuru_yonlendirme")
    .select("*")
    .eq(
      "belge_tanim_id",
      belgeTanimId,
    )
    .maybeSingle()

  if (error) {
    console.error(
      "KYM başvuru yönlendirmesi alınamadı:",
      error,
    )

    return null
  }

  if (!data) {
    return null
  }

  return normalizeYonlendirme(
    data as Record<string, unknown>,
  )
}

export async function getKymEksikBelgeYonlendirmesi(
  isletmeBelgeId: string,
): Promise<KymBasvuruYonlendirme | null> {
  const { data, error } = await supabase
    .from("v_kym_eksik_belge_yonlendirme")
    .select("*")
    .eq(
      "isletme_belge_id",
      isletmeBelgeId,
    )
    .maybeSingle()

  if (error) {
    console.error(
      "KYM eksik belge yönlendirmesi alınamadı:",
      error,
    )

    return null
  }

  if (!data) {
    return null
  }

  return normalizeYonlendirme(
    data as Record<string, unknown>,
  )
}

export async function kymBasvuruYapildiKaydet(
  params: {
    isletmeBelgeId: string
    not?: string | null
  },
): Promise<{
  basarili: boolean
  hata?: string
}> {
  const { data, error } = await supabase.rpc(
    "kym_basvuru_yapildi_kaydet",
    {
      p_isletme_belge_id:
        params.isletmeBelgeId,

      p_not:
        params.not ?? null,
    },
  )

  if (error) {
    console.error(
      "KYM başvuru durumu kaydedilemedi:",
      error,
    )

    return {
      basarili: false,
      hata: error.message,
    }
  }

  return {
    basarili: data === true,
  }
}