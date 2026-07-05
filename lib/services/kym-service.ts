import { createClient } from "@/lib/supabase/client"

import type {
  KymBelgeDogrulama,
  KymBelgeDogrulamaInput,
  KymBelgeDurumu,
  KymBelgeSatiri,
  KymDashboardOzet,
  KymIsletme,
  KymIsletmeBelgesi,
  KymModul,
  KymOzelYukumluluk,
  KymOzelYukumlulukInput,
} from "@/lib/types/kym"

const supabase = createClient()

type KymAiAnalizSonucu = {
  sonuc:
    | "dogrulandi"
    | "eksik"
    | "gecersiz"
    | "inceleme_gerekli"

  guven_skoru: number | null

  belge_turu_tahmini: string | null
  belge_sahibi: string | null
  belge_numarasi: string | null

  belge_tarihi: string | null
  gecerlilik_baslangic: string | null
  gecerlilik_bitis: string | null

  ozet: string | null

  eksikler: string[]
  uyumsuzluklar: string[]

  cikarilan_veriler: Record<string, unknown>
}

type KymAiApiCevabi = {
  success?: boolean
  error?: string
  data?: KymAiAnalizSonucu
}

export type KymBelgeYuklemeSonucu = {
  basarili: boolean

  dosyaId?: string
  dosyaYolu?: string

  analizTamamlandi?: boolean

  analizSonucu?:
    | "dogrulandi"
    | "eksik"
    | "gecersiz"
    | "inceleme_gerekli"

  yeniDurum?: KymBelgeDurumu

  ozet?: string | null

  hata?: string
}

function dosyaAdiTemizle(
  dosyaAdi: string,
): string {
  return dosyaAdi
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

async function fileToBase64(
  file: File,
): Promise<string> {
  const buffer = await file.arrayBuffer()

  const bytes = new Uint8Array(buffer)

  const chunkSize = 32768

  let binary = ""

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        index,
        index + chunkSize,
      ),
    )
  }

  return btoa(binary)
}

function sonucDurumu(
  sonuc:
    | "dogrulandi"
    | "eksik"
    | "gecersiz"
    | "inceleme_gerekli",
  gecerlilikBitis?: string | null,
): KymBelgeDurumu {
  if (sonuc === "eksik") {
    return "eksik_bilgi_var"
  }

  if (sonuc === "gecersiz") {
    return "yanlis_belge"
  }

  if (sonuc === "inceleme_gerekli") {
    return "manuel_inceleme_gerekli"
  }

  if (!gecerlilikBitis) {
    return "dogrulandi_guncel"
  }

  const bugun = new Date()

  bugun.setHours(
    0,
    0,
    0,
    0,
  )

  const bitis = new Date(
    `${gecerlilikBitis}T00:00:00`,
  )

  if (
    Number.isNaN(
      bitis.getTime(),
    )
  ) {
    return "dogrulandi_guncel"
  }

  if (bitis < bugun) {
    return "suresi_doldu"
  }

  const otuzGunSonra = new Date(bugun)

  otuzGunSonra.setDate(
    otuzGunSonra.getDate() + 30,
  )

  if (bitis <= otuzGunSonra) {
    return "suresi_yaklasiyor"
  }

  return "dogrulandi_guncel"
}

export async function getKymIsletmeler(): Promise<
  KymIsletme[]
> {
  const { data, error } = await supabase
    .from("kym_isletmeler")
    .select("*")
    .eq("aktif", true)
    .order(
      "created_at",
      {
        ascending: true,
      },
    )

  if (error) {
    console.error(
      "KYM işletmeler alınamadı:",
      error,
    )

    return []
  }

  return (data ?? []) as KymIsletme[]
}

export async function getKymModuller(): Promise<
  KymModul[]
> {
  const { data, error } = await supabase
    .from("kym_moduller")
    .select("*")
    .eq("aktif", true)
    .order(
      "sira",
      {
        ascending: true,
      },
    )

  if (error) {
    console.error(
      "KYM modüller alınamadı:",
      error,
    )

    return []
  }

  return (data ?? []) as KymModul[]
}

export async function getKymDashboardOzet(
  isletmeId: string,
): Promise<KymDashboardOzet | null> {
  const { data, error } = await supabase
    .from("v_kym_dashboard_ozet")
    .select("*")
    .eq(
      "isletme_id",
      isletmeId,
    )
    .maybeSingle()

  if (error) {
    console.error(
      "KYM dashboard özeti alınamadı:",
      error,
    )

    return null
  }

  return data as KymDashboardOzet | null
}

export async function getKymKritikEksikler(
  isletmeId: string,
): Promise<KymBelgeSatiri[]> {
  const { data, error } = await supabase
    .from("v_kym_kritik_eksikler")
    .select("*")
    .eq(
      "isletme_id",
      isletmeId,
    )
    .order(
      "risk_puani",
      {
        ascending: false,
      },
    )

  if (error) {
    console.error(
      "KYM kritik eksikler alınamadı:",
      error,
    )

    return []
  }

  return (data ?? []) as KymBelgeSatiri[]
}

export async function getKymTumBelgeler(
  isletmeId: string,
): Promise<KymBelgeSatiri[]> {
  const { data, error } = await supabase
    .from("v_kym_belge_listesi")
    .select("*")
    .eq(
      "isletme_id",
      isletmeId,
    )
    .order(
      "risk_puani",
      {
        ascending: false,
      },
    )

  if (error) {
    console.error(
      "KYM tüm belgeler alınamadı:",
      error,
    )

    return []
  }

  return (data ?? []) as KymBelgeSatiri[]
}

export async function updateKymBelgeDurumu(
  params: {
    isletmeBelgeId: string
    durum: KymBelgeDurumu
    notlar?: string | null
    gecerlilikBitis?: string | null
  },
): Promise<KymIsletmeBelgesi | null> {
  const mevcutMu =
    params.durum === "dogrulandi_guncel" ||
    params.durum === "suresi_yaklasiyor"

  const { data, error } = await supabase
    .from("kym_isletme_belgeleri")
    .update({
      durum: params.durum,

      mevcut_mu: mevcutMu,

      notlar:
        params.notlar ?? null,

      gecerlilik_bitis:
        params.gecerlilikBitis ?? null,

      son_kontrol_tarihi:
        new Date()
          .toISOString()
          .slice(
            0,
            10,
          ),
    })
    .eq(
      "id",
      params.isletmeBelgeId,
    )
    .select("*")
    .maybeSingle()

  if (error) {
    console.error(
      "KYM belge durumu güncellenemedi:",
      error,
    )

    return null
  }

  return data as KymIsletmeBelgesi | null
}

export async function createKymBelgeDogrulama(
  input: KymBelgeDogrulamaInput,
): Promise<KymBelgeDogrulama | null> {
  const { data, error } = await supabase.rpc(
    "kym_belge_dogrulama_kaydet",
    {
      p_isletme_belge_id:
        input.isletmeBelgeId,

      p_belge_dosya_id:
        input.belgeDosyaId ?? null,

      p_kaynak:
        input.kaynak ?? "ai",

      p_sonuc:
        input.sonuc,

      p_yeni_durum:
        input.yeniDurum,

      p_guven_skoru:
        input.guvenSkoru ?? null,

      p_belge_turu_tahmini:
        input.belgeTuruTahmini ?? null,

      p_belge_sahibi:
        input.belgeSahibi ?? null,

      p_belge_numarasi:
        input.belgeNumarasi ?? null,

      p_belge_tarihi:
        input.belgeTarihi ?? null,

      p_gecerlilik_baslangic:
        input.gecerlilikBaslangic ?? null,

      p_gecerlilik_bitis:
        input.gecerlilikBitis ?? null,

      p_ozet:
        input.ozet ?? null,

      p_eksikler:
        input.eksikler ?? [],

      p_uyumsuzluklar:
        input.uyumsuzluklar ?? [],

      p_cikarilan_veriler:
        input.cikarilanVeriler ?? {},

      p_ham_ai_cevabi:
        input.hamAiCevabi ?? {},
    },
  )

  if (error) {
    console.error(
      "KYM belge doğrulama kaydı oluşturulamadı:",
      error,
    )

    return null
  }

  if (!data) {
    return null
  }

  const {
    data: dogrulama,
    error: dogrulamaError,
  } = await supabase
    .from("kym_belge_dogrulamalari")
    .select("*")
    .eq(
      "id",
      data,
    )
    .maybeSingle()

  if (dogrulamaError) {
    console.error(
      "KYM belge doğrulama sonucu okunamadı:",
      dogrulamaError,
    )

    return null
  }

  return dogrulama as KymBelgeDogrulama | null
}

export async function yukleKymBelgesi(
  params: {
    belge: KymBelgeSatiri
    dosya: File
    isletmeAdi?: string | null
  },
): Promise<KymBelgeYuklemeSonucu> {
  const MAX_FILE_SIZE = 8 * 1024 * 1024

  if (
    params.dosya.size > MAX_FILE_SIZE
  ) {
    return {
      basarili: false,

      hata:
        "Belge boyutu V1 için 8 MB sınırını aşıyor.",
    }
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const temizAd = dosyaAdiTemizle(
      params.dosya.name,
    )

    const dosyaYolu =
      `${params.belge.isletme_belge_id}/` +
      `${Date.now()}-${temizAd}`

    const { error: storageError } = await supabase.storage
      .from("kym-belgeleri")
      .upload(
        dosyaYolu,
        params.dosya,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            params.dosya.type || undefined,
        },
      )

    if (storageError) {
      console.error(
        "KYM belge dosyası yüklenemedi:",
        storageError,
      )

      return {
        basarili: false,
        hata: storageError.message,
      }
    }

    const {
      data: dosyaKaydi,
      error: dosyaKayitError,
    } = await supabase
      .from("kym_belge_dosyalari")
      .insert({
        isletme_belge_id:
          params.belge.isletme_belge_id,

        dosya_url:
          dosyaYolu,

        dosya_adi:
          params.dosya.name,

        dosya_tipi:
          params.dosya.type || null,

        yukleyen_kullanici:
          user?.id ?? null,
      })
      .select("*")
      .maybeSingle()

    if (
      dosyaKayitError ||
      !dosyaKaydi
    ) {
      await supabase.storage
        .from("kym-belgeleri")
        .remove([
          dosyaYolu,
        ])

      console.error(
        "KYM belge dosya kaydı oluşturulamadı:",
        dosyaKayitError,
      )

      return {
        basarili: false,

        hata:
          dosyaKayitError?.message ??
          "Belge dosya kaydı oluşturulamadı.",
      }
    }

    const {
      error: belgeGuncellemeError,
    } = await supabase
      .from("kym_isletme_belgeleri")
      .update({
        durum:
          "yuklendi_incelemede",

        mevcut_mu: false,

        son_dosya_id:
          dosyaKaydi.id,

        ai_son_kontrol_tarihi:
          null,

        ai_guven_skoru:
          null,

        ai_ozet:
          "Belge yüklendi. AI incelemesi başlatıldı.",

        ai_eksikler: [],

        ai_cikarilan_veriler:
          {},

        son_kontrol_tarihi:
          new Date()
            .toISOString()
            .slice(
              0,
              10,
            ),
      })
      .eq(
        "id",
        params.belge.isletme_belge_id,
      )

    if (
      belgeGuncellemeError
    ) {
      console.error(
        "KYM belge inceleme durumuna alınamadı:",
        belgeGuncellemeError,
      )

      return {
        basarili: false,

        hata:
          belgeGuncellemeError.message,
      }
    }

    const fileBase64 = await fileToBase64(
      params.dosya,
    )

    let aiCevabi: Response

    try {
      aiCevabi = await fetch(
        "/api/kym/belge-analiz",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fileBase64,

            mediaType:
              params.dosya.type,

            belgeAdi:
              params.belge.belge_adi,

            yukumlulukBasligi:
              params.belge
                .yukumluluk_basligi,

            kategori:
              params.belge.kategori,

            isletmeAdi:
              params.isletmeAdi ?? null,
          }),
        },
      )
    } catch (error: unknown) {
      const mesaj =
        error instanceof Error
          ? error.message
          : "AI servisine ulaşılamadı."

      const dogrulama =
        await createKymBelgeDogrulama({
          isletmeBelgeId:
            params.belge.isletme_belge_id,

          belgeDosyaId:
            dosyaKaydi.id,

          kaynak: "sistem",

          sonuc:
            "inceleme_gerekli",

          yeniDurum:
            "manuel_inceleme_gerekli",

          ozet:
            "AI servisine ulaşılamadığı için belge manuel incelemeye ayrıldı.",

          eksikler: [],

          uyumsuzluklar: [
            mesaj,
          ],

          cikarilanVeriler: {},

          hamAiCevabi: {
            hata: mesaj,
          },
        })

      return {
        basarili: true,

        dosyaId:
          dosyaKaydi.id,

        dosyaYolu,

        analizTamamlandi:
          false,

        analizSonucu:
          "inceleme_gerekli",

        yeniDurum:
          dogrulama?.yeni_durum ??
          "manuel_inceleme_gerekli",

        ozet:
          "Belge yüklendi ancak AI servisine ulaşılamadı. Manuel incelemeye ayrıldı.",

        hata: mesaj,
      }
    }

    const aiBody =
      (await aiCevabi.json()) as KymAiApiCevabi

    if (
      !aiCevabi.ok ||
      !aiBody.success ||
      !aiBody.data
    ) {
      const mesaj =
        aiBody.error ??
        "AI belge analizi tamamlanamadı."

      const dogrulama =
        await createKymBelgeDogrulama({
          isletmeBelgeId:
            params.belge.isletme_belge_id,

          belgeDosyaId:
            dosyaKaydi.id,

          kaynak: "sistem",

          sonuc:
            "inceleme_gerekli",

          yeniDurum:
            "manuel_inceleme_gerekli",

          ozet:
            "AI analizi tamamlanamadığı için belge manuel incelemeye ayrıldı.",

          eksikler: [],

          uyumsuzluklar: [
            mesaj,
          ],

          cikarilanVeriler: {},

          hamAiCevabi: {
            hata: mesaj,
          },
        })

      return {
        basarili: true,

        dosyaId:
          dosyaKaydi.id,

        dosyaYolu,

        analizTamamlandi:
          false,

        analizSonucu:
          "inceleme_gerekli",

        yeniDurum:
          dogrulama?.yeni_durum ??
          "manuel_inceleme_gerekli",

        ozet:
          "Belge yüklendi. AI analizi tamamlanamadığı için manuel incelemeye ayrıldı.",

        hata: mesaj,
      }
    }

    const analiz = aiBody.data

    const beklenenDurum = sonucDurumu(
      analiz.sonuc,
      analiz.gecerlilik_bitis,
    )

    const dogrulama =
      await createKymBelgeDogrulama({
        isletmeBelgeId:
          params.belge.isletme_belge_id,

        belgeDosyaId:
          dosyaKaydi.id,

        kaynak: "ai",

        sonuc:
          analiz.sonuc,

        yeniDurum:
          beklenenDurum,

        guvenSkoru:
          analiz.guven_skoru,

        belgeTuruTahmini:
          analiz.belge_turu_tahmini,

        belgeSahibi:
          analiz.belge_sahibi,

        belgeNumarasi:
          analiz.belge_numarasi,

        belgeTarihi:
          analiz.belge_tarihi,

        gecerlilikBaslangic:
          analiz.gecerlilik_baslangic,

        gecerlilikBitis:
          analiz.gecerlilik_bitis,

        ozet:
          analiz.ozet,

        eksikler:
          analiz.eksikler,

        uyumsuzluklar:
          analiz.uyumsuzluklar,

        cikarilanVeriler:
          analiz.cikarilan_veriler,

        hamAiCevabi:
          analiz as unknown as Record<
            string,
            unknown
          >,
      })

    if (!dogrulama) {
      return {
        basarili: true,

        dosyaId:
          dosyaKaydi.id,

        dosyaYolu,

        analizTamamlandi:
          false,

        analizSonucu:
          "inceleme_gerekli",

        yeniDurum:
          "yuklendi_incelemede",

        ozet:
          "AI belgeyi analiz etti ancak doğrulama sonucu veritabanına kaydedilemedi.",

        hata:
          "Doğrulama kaydı oluşturulamadı.",
      }
    }

    return {
      basarili: true,

      dosyaId:
        dosyaKaydi.id,

      dosyaYolu,

      analizTamamlandi:
        true,

      analizSonucu:
        analiz.sonuc,

      yeniDurum:
        dogrulama.yeni_durum,

      ozet:
        analiz.ozet,
    }
  } catch (error: unknown) {
    console.error(
      "KYM belge yükleme/analiz hatası:",
      error,
    )

    return {
      basarili: false,

      hata:
        error instanceof Error
          ? error.message
          : "Belge işlenirken beklenmeyen hata oluştu.",
    }
  }
}

export async function getKymOzelYukumluluklar(
  isletmeId: string,
): Promise<KymOzelYukumluluk[]> {
  const { data, error } = await supabase
    .from("v_kym_ozel_yukumluluklar")
    .select("*")
    .eq(
      "isletme_id",
      isletmeId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )

  if (error) {
    console.error(
      "KYM özel yükümlülükler alınamadı:",
      error,
    )

    return []
  }

  return (data ?? []) as KymOzelYukumluluk[]
}

export async function createKymOzelYukumluluk(
  input: KymOzelYukumlulukInput,
): Promise<KymOzelYukumluluk | null> {
  const { data, error } = await supabase
    .from("kym_ozel_yukumluluklar")
    .insert({
      isletme_id:
        input.isletme_id,

      kaynak_tipi:
        input.kaynak_tipi ?? "manuel",

      kaynak_aciklama:
        input.kaynak_aciklama ?? null,

      kayit_tipi:
        input.kayit_tipi ?? "belge",

      baslik:
        input.baslik,

      kategori:
        input.kategori,

      alt_kategori:
        input.alt_kategori ?? null,

      zorunluluk_tipi:
        input.zorunluluk_tipi ?? "manuel",

      hukuki_dayanak:
        input.hukuki_dayanak ?? null,

      denetleyen_kurum:
        input.denetleyen_kurum ?? null,

      basvuru_yeri:
        input.basvuru_yeri ?? null,

      yenileme_periyodu:
        input.yenileme_periyodu ?? null,

      aciklama:
        input.aciklama ?? null,

      risk_puani:
        input.risk_puani ?? 50,

      oncelik:
        input.oncelik ?? "P3",

      ai_ogrenme_havuzuna_alinsin:
        input.ai_ogrenme_havuzuna_alinsin ??
        true,

      aktif:
        input.aktif ?? true,
    })
    .select("*")
    .maybeSingle()

  if (error) {
    console.error(
      "KYM özel yükümlülük oluşturulamadı:",
      error,
    )

    return null
  }

  return data as KymOzelYukumluluk | null
}

export async function aktiflestirKymOzelYukumluluk(
  ozelYukumlulukId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc(
    "kym_ozel_yukumlulugu_aktiflestir",
    {
      p_ozel_yukumluluk_id:
        ozelYukumlulukId,
    },
  )

  if (error) {
    console.error(
      "KYM özel yükümlülük aktifleştirilemedi:",
      error,
    )

    return null
  }

  return typeof data === "string"
    ? data
    : null
}

export async function getKymBelgeDogrulamalari(
  isletmeBelgeId: string,
): Promise<KymBelgeDogrulama[]> {
  const { data, error } = await supabase
    .from("kym_belge_dogrulamalari")
    .select("*")
    .eq(
      "isletme_belge_id",
      isletmeBelgeId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )

  if (error) {
    console.error(
      "KYM belge doğrulama geçmişi alınamadı:",
      error,
    )

    return []
  }

  return (data ?? []) as KymBelgeDogrulama[]
}