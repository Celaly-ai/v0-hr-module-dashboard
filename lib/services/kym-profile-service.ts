import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export type KymProfilSorusu = {
  soru_id: string
  kod: string
  profil_alani: string
  soru: string
  aciklama?: string | null
  sira: number
  etkilenen_belge_sayisi: number
  en_yuksek_risk: number
}

export type KymProfilTamamlamaOzeti = {
  isletme_id: string
  isletme_adi: string
  bekleyen_soru: number
  bilgi_gerekli_belge: number
  uygulanir_belge: number
  uygulanmayan_belge: number
}

export type KymProfilCevapSonucu = {
  basarili: boolean
  islenenBelgeSayisi?: number
  hata?: string
}

export async function getKymBekleyenProfilSorulari(
  isletmeId: string,
): Promise<KymProfilSorusu[]> {
  const { data, error } = await supabase.rpc(
    "kym_bekleyen_profil_sorulari",
    {
      p_isletme_id: isletmeId,
    },
  )

  if (error) {
    console.error(
      "KYM bekleyen profil soruları alınamadı:",
      error,
    )

    return []
  }

  return (data ?? []) as KymProfilSorusu[]
}

export async function getKymProfilTamamlamaOzeti(
  isletmeId: string,
): Promise<KymProfilTamamlamaOzeti | null> {
  const { data, error } = await supabase
    .from("v_kym_profil_tamamlama_ozeti")
    .select("*")
    .eq("isletme_id", isletmeId)
    .maybeSingle()

  if (error) {
    console.error(
      "KYM profil tamamlama özeti alınamadı:",
      error,
    )

    return null
  }

  return data as KymProfilTamamlamaOzeti | null
}

export async function cevaplaKymProfilSorusu(params: {
  isletmeId: string
  soruId: string
  cevap: boolean
}): Promise<KymProfilCevapSonucu> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc(
      "kym_profil_sorusunu_cevapla",
      {
        p_isletme_id: params.isletmeId,
        p_soru_id: params.soruId,
        p_cevap: params.cevap,
        p_cevap_kaynagi: "kullanici",
        p_cevaplayan_kullanici: user?.id ?? null,
      },
    )

    if (error) {
      console.error(
        "KYM profil sorusu cevaplanamadı:",
        error,
      )

      return {
        basarili: false,
        hata: error.message,
      }
    }

    return {
      basarili: true,
      islenenBelgeSayisi:
        typeof data === "number"
          ? data
          : Number(data ?? 0),
    }
  } catch (error: unknown) {
    console.error(
      "KYM profil cevap hatası:",
      error,
    )

    return {
      basarili: false,
      hata:
        error instanceof Error
          ? error.message
          : "Profil cevabı kaydedilemedi.",
    }
  }
}