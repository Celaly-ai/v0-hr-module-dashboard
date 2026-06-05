import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  AiCanliOperasyonKayit,
  AiCanliOperasyonKpi,
  AiCanliOperasyonVeri,
} from "@/lib/types/ai-live-operations"

export type AiGorevAtanabilirPersonel = {
  personel_kodu: string
  ad_soyad: string
  rol: string | null
}

export type AiGorevGecmisiKaydi = {
  id: number
  gorev_id: number
  gorev_kodu: string | null
  islem_tipi: string
  eski_deger: string | null
  yeni_deger: string | null
  aciklama: string | null
  yapan_personel_kodu: string | null
  yapan_personel_adi: string | null
  created_at: string | null
}


export type AiOnerilenPersonel = {
  personel_id: string | null
  personel_kodu: string
  personel_adi: string
  uygunluk_skoru: number | null
  performans_skoru: number | null
  guven_skoru: number | null
  risk_skoru: number | null
  ai_oncelik: number | null
  atanabilir: boolean
  ai_aciklama: string | null
}

const BOS_KPI: AiCanliOperasyonKpi = {
  aktifGorev: 0,
  sahadakiEkip: 0,
  riskliIs: 0,
  tamamlanan: 0,
}

function durumNormalize(value: any): AiCanliOperasyonKayit["durum"] {
  const text = String(value || "").toLocaleLowerCase("tr-TR").trim()

  if (text === "acik" || text === "açık") return "acik"
  if (text === "inceleniyor" || text === "incelemede") return "inceleniyor"
  if (
    text === "tamamlandi" ||
    text === "tamamlandı" ||
    text.includes("tamam") ||
    text.includes("cozuldu") ||
    text.includes("çözüldü")
  ) return "tamamlandi"
  if (text === "arsivlendi" || text === "arşivlendi") return "arsivlendi"
  if (
    text.includes("devam") ||
    text.includes("aktif") ||
    text.includes("bekliyor") ||
    text.includes("egitime_alindi") ||
    text.includes("eğitime_alındı") ||
    text.includes("egitime alindi") ||
    text.includes("eğitime alındı")
  ) return "devam_ediyor"
  if (text.includes("gecik")) return "gecikti"
  if (text.includes("iptal") || text.includes("reddedildi")) return "iptal"

  return "bekliyor"
}

function seviyeNormalize(value: any): AiCanliOperasyonKayit["seviye"] {
  const text = String(value || "").toLocaleLowerCase("tr-TR").trim()

  if (text.includes("kritik")) return "kritik"
  if (text.includes("yüksek") || text.includes("yuksek") || text.includes("risk")) return "riskli"
  if (text.includes("uyarı") || text.includes("uyari") || text.includes("orta")) return "uyari"

  return "normal"
}

function metin(value: any): string | null {
  const text = String(value ?? "").trim()
  return text.length > 0 ? text : null
}

function kayitTipiBul(item: Record<string, any>): string {
  const id = String(item.id || "")

  if (id.startsWith("gorev_")) return "AI Görev Merkezi"
  if (id.startsWith("aksiyon_")) return "AI Aksiyon Görevi"
  if (id.startsWith("aktif_")) return "Aktif Operasyon"
  if (id.startsWith("risk_")) return "Operasyon Riski"
  if (id.startsWith("gecikme_")) return "Gecikme Alarmı"
  if (id.startsWith("karar_")) return "Yönetici Kararı"

  return "Diğer"
}

function kayitDonustur(item: Record<string, any>): AiCanliOperasyonKayit {
  return {
    id: String(item.id ?? item.gorev_id ?? item.randevu_id ?? crypto.randomUUID()),
    kayit_tipi: kayitTipiBul(item),
    baslik:
      metin(item.baslik) ||
      metin(item.gorev_basligi) ||
      metin(item.randevu_kodu) ||
      "Operasyon Kaydı",
    aciklama:
      metin(item.aciklama) ||
      metin(item.ai_aciklama) ||
      metin(item.notlar) ||
      null,
    durum: durumNormalize(item.durum ?? item.gorev_durumu ?? item.status),
    seviye: seviyeNormalize(item.seviye ?? item.risk_seviyesi ?? item.ai_seviye),
    personel_adi:
      metin(item.sorumlu_personel_adi) ||
      metin(item.personel_adi) ||
      metin(item.teknisyen_adi) ||
      metin(item.ad_soyad) ||
      null,
    personel_kodu:
      metin(item.sorumlu_personel_kodu) ||
      metin(item.personel_kodu) ||
      metin(item.teknisyen_kodu) ||
      null,
    gorev_adresi:
      metin(item.gorev_adresi) ||
      metin(item.adres) ||
      metin(item.musteri_adresi) ||
      null,
    planlanan_baslangic:
      metin(item.planlanan_baslangic) ||
      metin(item.baslangic_zamani) ||
      metin(item.randevu_tarihi) ||
      null,
    planlanan_bitis:
      metin(item.planlanan_bitis) ||
      metin(item.bitis_zamani) ||
      null,
    created_at: metin(item.created_at),
  }
}

function kpiHesapla(kayitlar: AiCanliOperasyonKayit[]): AiCanliOperasyonKpi {
  return {
    aktifGorev: kayitlar.filter(
      (kayit) =>
        kayit.durum !== "tamamlandi" &&
        kayit.durum !== "arsivlendi" &&
        kayit.durum !== "iptal",
    ).length,

    sahadakiEkip: new Set(
      kayitlar
        .filter(
          (kayit) =>
            kayit.durum === "devam_ediyor" ||
            kayit.durum === "inceleniyor" ||
            kayit.durum === "acik",
        )
        .map((kayit) => kayit.personel_kodu || kayit.personel_adi)
        .filter(Boolean),
    ).size,

    riskliIs: kayitlar.filter(
      (kayit) => kayit.seviye === "riskli" || kayit.seviye === "kritik",
    ).length,

    tamamlanan: kayitlar.filter((kayit) => kayit.durum === "tamamlandi").length,
  }
}

function gorevIdCoz(kayitId: string): number | null {
  if (!kayitId.startsWith("gorev_")) return null

  const rawId = kayitId.replace("gorev_", "")
  const id = Number(rawId)

  return Number.isFinite(id) ? id : null
}

export async function aiCanliOperasyonVerisiGetir(
  supabase: SupabaseClient,
): Promise<AiCanliOperasyonVeri> {
  const uyarilar: string[] = []

  try {
    const { data, error } = await supabase
      .from("v_ai_canli_operasyon_merkezi")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      uyarilar.push(`v_ai_canli_operasyon_merkezi okunamadı: ${error.message}`)

      return {
        kpi: BOS_KPI,
        kayitlar: [],
        uyarilar,
      }
    }

    const kayitlar = Array.isArray(data) ? data.map(kayitDonustur) : []

    return {
      kpi: kpiHesapla(kayitlar),
      kayitlar,
      uyarilar,
    }
  } catch (error: any) {
    return {
      kpi: BOS_KPI,
      kayitlar: [],
      uyarilar: [error?.message || "AI canlı operasyon verisi okunamadı."],
    }
  }
}

export async function aiGorevAtanabilirPersonellerGetir(
  supabase: SupabaseClient,
): Promise<{ personeller: AiGorevAtanabilirPersonel[]; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "ai_gorev_atanabilir_personeller_getir",
  )

  if (error) {
    return {
      personeller: [],
      error: error.message,
    }
  }

  const personeller = (data || [])
    .map((p: any) => ({
      personel_kodu: String(p.personel_kodu || "").trim(),
      ad_soyad: String(p.ad_soyad || "").trim(),
      rol: metin(p.rol),
    }))
    .filter((p: AiGorevAtanabilirPersonel) => p.personel_kodu && p.ad_soyad)

  return {
    personeller,
    error: null,
  }
}

export async function aiCanliOperasyonGorevDurumuGuncelle(
  supabase: SupabaseClient,
  kayitId: string,
  yeniDurum: "acik" | "inceleniyor" | "tamamlandi" | "arsivlendi",
  not?: string,
): Promise<{ success: boolean; error: string | null }> {
  const gorevId = gorevIdCoz(kayitId)

  if (!gorevId) {
    return {
      success: false,
      error: "Şimdilik sadece AI Görev Merkezi kayıtlarının durumu güncellenebilir.",
    }
  }

  const { data, error } = await supabase.rpc(
    "ai_canli_operasyon_gorev_durum_guncelle",
    {
      p_gorev_id: gorevId,
      p_yeni_durum: yeniDurum,
      p_not: not || null,
    },
  )

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  const sonuc = data as { success?: boolean; error?: string | null } | null

  if (!sonuc?.success) {
    return {
      success: false,
      error: sonuc?.error || "Görev durumu güncellenemedi.",
    }
  }

  return {
    success: true,
    error: null,
  }
}

export async function aiGorevPersonelAta(
  supabase: SupabaseClient,
  kayitId: string,
  personelKodu: string,
): Promise<{ success: boolean; error: string | null }> {
  const gorevId = gorevIdCoz(kayitId)

  if (!gorevId) {
    return {
      success: false,
      error: "Personel atama sadece AI Görev Merkezi kayıtlarında yapılabilir.",
    }
  }

  const temizPersonelKodu = String(personelKodu || "").trim()

  if (!temizPersonelKodu) {
    return {
      success: false,
      error: "Atanacak personel seçilmedi.",
    }
  }

  const { data, error } = await supabase.rpc("ai_gorev_personel_ata", {
    p_gorev_id: gorevId,
    p_personel_kodu: temizPersonelKodu,
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  const sonuc = data as { success?: boolean; error?: string | null } | null

  if (!sonuc?.success) {
    return {
      success: false,
      error: sonuc?.error || "Göreve personel atanamadı.",
    }
  }

  return {
    success: true,
    error: null,
  }
}

export async function aiGorevGecmisiGetir(
  supabase: SupabaseClient,
  kayitId: string,
): Promise<{ gecmis: AiGorevGecmisiKaydi[]; error: string | null }> {
  const gorevId = gorevIdCoz(kayitId)

  if (!gorevId) {
    return {
      gecmis: [],
      error: "Görev geçmişi sadece AI Görev Merkezi kayıtlarında okunabilir.",
    }
  }

  const { data, error } = await supabase.rpc("ai_gorev_gecmisi_getir", {
    p_gorev_id: gorevId,
  })

  if (error) {
    return {
      gecmis: [],
      error: error.message,
    }
  }

  const gecmis = (data || []).map((item: any) => ({
    id: Number(item.id),
    gorev_id: Number(item.gorev_id),
    gorev_kodu: metin(item.gorev_kodu),
    islem_tipi: String(item.islem_tipi || ""),
    eski_deger: metin(item.eski_deger),
    yeni_deger: metin(item.yeni_deger),
    aciklama: metin(item.aciklama),
    yapan_personel_kodu: metin(item.yapan_personel_kodu),
    yapan_personel_adi: metin(item.yapan_personel_adi),
    created_at: metin(item.created_at),
  }))

  return {
    gecmis,
    error: null,
  }
}

export async function aiCanliOperasyondanGorevOlustur(
  supabase: SupabaseClient,
  kayit: AiCanliOperasyonKayit,
): Promise<{ success: boolean; already_exists: boolean; gorev_id: number | null; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "ai_canli_operasyon_kayittan_gorev_olustur",
    {
      p_kaynak_kayit_id: kayit.id,
      p_kaynak_modul: kayit.kayit_tipi,
      p_baslik: kayit.baslik,
      p_aciklama: kayit.aciklama || "",
      p_oncelik: kayit.seviye,
      p_personel_kodu: kayit.personel_kodu,
      p_personel_adi: kayit.personel_adi,
    },
  )

  if (error) {
    return {
      success: false,
      already_exists: false,
      gorev_id: null,
      error: error.message,
    }
  }

  const sonuc = data as {
    success?: boolean
    already_exists?: boolean
    gorev_id?: number | null
    error?: string | null
  } | null

  if (!sonuc?.success) {
    return {
      success: false,
      already_exists: false,
      gorev_id: null,
      error: sonuc?.error || "Canlı operasyon kaydından görev oluşturulamadı.",
    }
  }

  return {
    success: true,
    already_exists: Boolean(sonuc.already_exists),
    gorev_id: sonuc.gorev_id ?? null,
    error: null,
  }
}

export async function aiEnUygunPersonellerGetir(
  supabase: SupabaseClient,
  limit = 5,
): Promise<{ personeller: AiOnerilenPersonel[]; error: string | null }> {
  const { data, error } = await supabase
    .from("v_ai_personel_akilli_skor_v5")
    .select(
      "personel_id, personel_kodu, personel_adi, ortalama_performans_skoru, ai_guven_skoru, geciken_is_sayisi, riskli_is_sayisi, aktif_gorev_sayisi, musait, tahmini_mesafe_km, tahmini_varis_dk, ai_akilli_skor_v5",
    )
    .order("ai_akilli_skor_v5", { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    return {
      personeller: [],
      error: error.message,
    }
  }

  const personeller = (data || []).map((item: any) => {
    const performans = Number(item.ortalama_performans_skoru ?? 50)
    const guven = Number(item.ai_guven_skoru ?? 50)
    const riskliIs = Number(item.riskli_is_sayisi ?? 0)
    const gecikenIs = Number(item.geciken_is_sayisi ?? 0)
    const v5 = Number(item.ai_akilli_skor_v5 ?? 50)
    const aktifGorev = Number(item.aktif_gorev_sayisi ?? 0)

    return {
      personel_id: item.personel_id ? String(item.personel_id) : null,
      personel_kodu: String(item.personel_kodu || "").trim(),
      personel_adi: String(item.personel_adi || "").trim(),
      uygunluk_skoru: v5,
      performans_skoru: performans,
      guven_skoru: guven,
      risk_skoru: riskliIs + gecikenIs,
      ai_oncelik: v5,
      atanabilir: riskliIs < 3,
      ai_aciklama:
        riskliIs > 0 || gecikenIs > 0
          ? `Dikkatli ata: ${riskliIs} riskli iş, ${gecikenIs} geciken iş var. Performans ${performans}, güven ${guven}, aktif görev ${aktifGorev}, AI skor ${v5}.`
          : `Önerilir: riskli/geciken iş görünmüyor. Performans ${performans}, güven ${guven}, aktif görev ${aktifGorev}, AI skor ${v5}.`,
    }
  })

  return {
    personeller,
    error: null,
  }
}
