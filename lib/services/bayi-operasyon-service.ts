import { createClient } from "@/lib/supabase/client"
import {
  bayiOperasyonFisNo,
  bilgilendirmeSablonu,
  bayiTelefonNormalize,
  operasyonaAktarilabilirTur,
  slaAsildiMi,
  sorumluDepartman,
  slaHedefDk,
  talepAcikMi,
  talepNoUret,
  talepOnceligi,
  talepTurundenIsTipi,
  TALEP_TURU_ETIKETLERI,
  whatsappMesajindanTalepTuru,
  ziyaretBekliyorMu,
} from "@/lib/bayi-operasyon-utils"
import type {
  BayiBilgilendirme,
  BayiBilgilendirmeOzet,
  BayiCariOzet,
  BayiKart,
  BayiKartOzet,
  BayiMesajGonderenTip,
  BayiMesajMerkeziOzet,
  BayiOperasyonAktarimSonuc,
  BayiOperasyonDashboard,
  BayiOperasyonSenkronSonuc,
  BayiSlaUyari,
  BayiSlaUyariOzet,
  BayiTalep,
  BayiTalepDurum,
  BayiTalepFiltre,
  BayiTalepMesaj,
  BayiTalepBelge,
  BayiTalepOperasyonBekleyen,
  BayiYonetimPaneli,
  BayiZiyaret,
  BayiZiyaretMerkeziOzet,
  CreateBayiKartInput,
  CreateBayiTalepMesajInput,
  CreateBayiTalepInput,
  CreateBayiZiyaretInput,
  WhatsAppTalepStubInput,
  BilgilendirmeIslemSonuc,
} from "@/lib/types/bayi-operasyon"
import type { SupabaseClient } from "@supabase/supabase-js"
import { bayiWhatsAppGonder, whatsappGonderimModu } from "@/lib/bayi-whatsapp-sender"
import {
  bayiSmsGonder,
  bilgilendirmeKanalDurumu,
  cozumleBilgilendirmeKanal,
  smsSaglayici,
} from "@/lib/bayi-sms-sender"
import { analyzeBayiMetrics } from "@/lib/bayi-risk-analiz"
import type { BayiMetricsAnaliz } from "@/lib/bayi-risk-analiz"
import { hesaplaBayiMuhasebeOzet } from "@/lib/bayi-muhasebe-karlilik"

export type BayiOperasyonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type AuthPersonel = {
  id: string
  sirket_id: string | null
  ad: string | null
  soyad: string | null
}

const BAYI_KART_SELECT =
  "id, sirket_id, bayi_cari_id, bayi_adi, yetkili_kisi, telefon, whatsapp, email, magaza_adresi, depo_adresi, son_ziyaret_tarihi, son_gorusme_tarihi, son_sikayet, son_tesekkur, sadakat_skoru, risk_skoru, risk_seviyesi, aylik_is_hacmi, performans_puani, karlilik_skoru, risk_analiz_json, durum, created_at"

const TALEP_SELECT =
  "id, sirket_id, bayi_kart_id, bayi_cari_id, talep_no, talep_turu, durum, oncelik, musteri_adi, telefon, alternatif_telefon, adres, il, ilce, mahalle, urun_turu, model, seri_no, satis_tarihi, aciklama, personel_notu, ai_analiz_json, ai_guven_skoru, sorumlu_departman, sla_hedef_dk, sla_asildi_mi, kaynak, olusturan_kisi, olusturan_personel_id, ilgili_is_emri_id, operasyon_fis_no, operasyon_aktarildi_mi, operasyon_aktarim_tarihi, created_at, updated_at"

function bugunBaslangic() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function bugunBitis() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export async function getBayiOperasyonContext(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<AuthPersonel>> {
  const client = supabase ?? createClient()

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Oturum bulunamadı." }
  }

  const personelSelect = "id, sirket_id, ad, soyad"

  const { data: authEslesme, error: authError } = await client
    .from("personeller")
    .select(personelSelect)
    .eq("auth_id", user.id)
    .limit(1)

  if (authError) {
    return { ok: false, error: "Personel kaydı okunamadı: " + authError.message }
  }

  let personel = (authEslesme || [])[0] as AuthPersonel | undefined

  if (!personel) {
    const { data: kullaniciEslesme, error: kullaniciError } = await client
      .from("personeller")
      .select(personelSelect)
      .eq("kullanici_id", user.id)
      .limit(1)

    if (kullaniciError) {
      return { ok: false, error: "Personel kaydı okunamadı: " + kullaniciError.message }
    }

    personel = (kullaniciEslesme || [])[0] as AuthPersonel | undefined
  }

  if (!personel && user.email) {
    const { data: emailEslesme, error: emailError } = await client
      .from("personeller")
      .select(personelSelect)
      .eq("email", user.email)
      .limit(1)

    if (emailError) {
      return { ok: false, error: "Personel kaydı okunamadı: " + emailError.message }
    }

    personel = (emailEslesme || [])[0] as AuthPersonel | undefined
  }

  if (!personel?.id) {
    return { ok: false, error: "Bu kullanıcı için personel kaydı bulunamadı." }
  }

  return { ok: true, data: personel }
}

export async function calculateBayiOperasyonDashboard(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiOperasyonDashboard>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)

  if (!ctx.ok) {
    return ctx
  }

  const sirketId = ctx.data.sirket_id

  const talepSorgu = client.from("bayi_talepleri").select(TALEP_SELECT).order("created_at", {
    ascending: false,
  })

  const bayiSorgu = client
    .from("bayi_kartlari")
    .select("performans_puani, risk_skoru")
    .eq("durum", "aktif")

  if (sirketId) {
    talepSorgu.eq("sirket_id", sirketId)
    bayiSorgu.eq("sirket_id", sirketId)
  }

  const [{ data: talepler, error: talepError }, { data: bayiler, error: bayiError }] =
    await Promise.all([talepSorgu, bayiSorgu])

  if (talepError) {
    return { ok: false, error: "Bayi talepleri okunamadı: " + talepError.message }
  }

  if (bayiError) {
    return { ok: false, error: "Bayi kartları okunamadı: " + bayiError.message }
  }

  const kayitlar = (talepler || []) as BayiTalep[]
  const bugunBas = bugunBaslangic()
  const bugunSon = bugunBitis()

  const acikDurumlar = new Set([
    "alindi",
    "inceleniyor",
    "planlandi",
    "atandi",
    "yolda",
    "ulasilamadi",
  ])

  const bekleyenMontaj = kayitlar.filter(
    (t) => t.talep_turu === "montaj" && acikDurumlar.has(t.durum)
  ).length

  const bekleyenAriza = kayitlar.filter(
    (t) => t.talep_turu === "ariza" && acikDurumlar.has(t.durum)
  ).length

  const bugunkuRandevu = kayitlar.filter((t) => {
    if (!t.created_at) return false
    const tarih = t.created_at
    return tarih >= bugunBas && tarih <= bugunSon
  }).length

  const gecikenIs = kayitlar.filter((t) => t.sla_asildi_mi && acikDurumlar.has(t.durum)).length

  const tamamlananIs = kayitlar.filter(
    (t) => t.durum === "tamamlandi" || t.durum === "kapandi"
  ).length

  const acilTalep = kayitlar.filter(
    (t) =>
      (t.oncelik === "acil" || t.oncelik === "kritik" || t.talep_turu === "acil") &&
      acikDurumlar.has(t.durum)
  ).length

  const ulasilamayanIs = kayitlar.filter((t) => t.durum === "ulasilamadi").length

  const tekrarServis = kayitlar.filter(
    (t) => t.talep_turu === "tekrar_servis" && acikDurumlar.has(t.durum)
  ).length

  const acikTalep = kayitlar.filter((t) => acikDurumlar.has(t.durum)).length

  const performansDegerleri = (bayiler || [])
    .map((b) => Number(b.performans_puani))
    .filter((v) => !Number.isNaN(v))

  const riskDegerleri = (bayiler || [])
    .map((b) => Number(b.risk_skoru))
    .filter((v) => !Number.isNaN(v))

  return {
    ok: true,
    data: {
      bekleyenMontaj,
      bekleyenAriza,
      bugunkuRandevu,
      gecikenIs,
      tamamlananIs,
      acilTalep,
      ulasilamayanIs,
      tekrarServis,
      acikTalep,
      bayiSayisi: (bayiler || []).length,
      ortalamaPerformans:
        performansDegerleri.length > 0
          ? Math.round(
              performansDegerleri.reduce((toplam, v) => toplam + v, 0) /
                performansDegerleri.length
            )
          : null,
      ortalamaRisk:
        riskDegerleri.length > 0
          ? Math.round(riskDegerleri.reduce((toplam, v) => toplam + v, 0) / riskDegerleri.length)
          : null,
      sonTalepler: kayitlar.slice(0, 8),
    },
  }
}

export async function listBayiKartlari(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiKart[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const sorgu = client
    .from("bayi_kartlari")
    .select(BAYI_KART_SELECT)
    .eq("durum", "aktif")
    .order("bayi_adi", { ascending: true })

  if (ctx.data.sirket_id) {
    sorgu.eq("sirket_id", ctx.data.sirket_id)
  }

  const { data, error } = await sorgu
  if (error) {
    return { ok: false, error: "Bayi kartları okunamadı: " + error.message }
  }

  return { ok: true, data: (data || []) as BayiKart[] }
}

export async function listBayiTalepleri(
  filtre: BayiTalepFiltre = {},
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalep[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const sorgu = client.from("bayi_talepleri").select(TALEP_SELECT).order("created_at", {
    ascending: false,
  })

  if (ctx.data.sirket_id) {
    sorgu.eq("sirket_id", ctx.data.sirket_id)
  }
  if (filtre.durum) {
    sorgu.eq("durum", filtre.durum)
  }
  if (filtre.talep_turu) {
    sorgu.eq("talep_turu", filtre.talep_turu)
  }
  if (filtre.oncelik) {
    sorgu.eq("oncelik", filtre.oncelik)
  }
  if (filtre.bayi_kart_id) {
    sorgu.eq("bayi_kart_id", filtre.bayi_kart_id)
  }
  if (filtre.sorumlu_departman) {
    sorgu.eq("sorumlu_departman", filtre.sorumlu_departman)
  }

  const { data, error } = await sorgu
  if (error) {
    return { ok: false, error: "Bayi talepleri okunamadı: " + error.message }
  }

  let kayitlar = (data || []) as BayiTalep[]

  if (filtre.arama?.trim()) {
    const aranan = filtre.arama.trim().toLocaleLowerCase("tr-TR")
    kayitlar = kayitlar.filter((t) => {
      const metin = [
        t.talep_no,
        t.musteri_adi,
        t.telefon,
        t.alternatif_telefon,
        t.adres,
        t.aciklama,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
      return metin.includes(aranan)
    })
  }

  return { ok: true, data: kayitlar }
}

export async function getBayiTalep(
  talepId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalep>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const sorgu = client.from("bayi_talepleri").select(TALEP_SELECT).eq("id", talepId).limit(1)

  if (ctx.data.sirket_id) {
    sorgu.eq("sirket_id", ctx.data.sirket_id)
  }

  const { data, error } = await sorgu
  if (error) {
    return { ok: false, error: "Talep okunamadı: " + error.message }
  }

  const talep = (data || [])[0] as BayiTalep | undefined
  if (!talep) {
    return { ok: false, error: "Talep bulunamadı." }
  }

  return { ok: true, data: talep }
}

export async function listBayiTalepMesajlari(
  talepId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalepMesaj[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const { data, error } = await client
    .from("bayi_talep_mesajlari")
    .select(
      "id, sirket_id, bayi_talep_id, gonderen_tip, gonderen_ad, gonderen_personel_id, mesaj_icerik, ai_analiz_json, created_at"
    )
    .eq("bayi_talep_id", talepId)
    .order("created_at", { ascending: true })

  if (error) {
    return { ok: false, error: "Talep mesajları okunamadı: " + error.message }
  }

  return { ok: true, data: (data || []) as BayiTalepMesaj[] }
}

export async function createBayiTalepMesaj(
  talepId: string,
  input: CreateBayiTalepMesajInput,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalepMesaj>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  const icerik = input.mesaj_icerik.trim()
  if (!icerik) {
    return { ok: false, error: "Mesaj içeriği zorunludur." }
  }

  const talepSonuc = await getBayiTalep(talepId, client)
  if (!talepSonuc.ok) return talepSonuc

  const gonderenTip: BayiMesajGonderenTip = input.gonderen_tip || "personel"
  const gonderenAd =
    gonderenTip === "personel"
      ? `${ctx.data.ad || ""} ${ctx.data.soyad || ""}`.trim() || "Personel"
      : gonderenTip === "bayi"
        ? "Bayi"
        : gonderenTip === "ai"
          ? "FeyRoute AI"
          : "FeyRoute"

  const { data, error } = await client
    .from("bayi_talep_mesajlari")
    .insert({
      sirket_id: ctx.data.sirket_id,
      bayi_talep_id: talepId,
      gonderen_tip: gonderenTip,
      gonderen_ad: gonderenAd,
      gonderen_personel_id: gonderenTip === "personel" ? ctx.data.id : null,
      mesaj_icerik: icerik,
    })
    .select(
      "id, sirket_id, bayi_talep_id, gonderen_tip, gonderen_ad, gonderen_personel_id, mesaj_icerik, ai_analiz_json, created_at"
    )
    .limit(1)

  if (error) {
    return { ok: false, error: "Mesaj gönderilemedi: " + error.message }
  }

  const mesaj = (data || [])[0] as BayiTalepMesaj | undefined
  if (!mesaj) {
    return { ok: false, error: "Mesaj gönderildi ancak okunamadı." }
  }

  return { ok: true, data: mesaj }
}

export async function gonderOnayliBayiYanit(
  talepId: string,
  mesajIcerik: string,
  options: { bilgilendir?: boolean } = {},
  supabase?: SupabaseClient
): Promise<
  BayiOperasyonResult<{ mesaj: BayiTalepMesaj; bilgilendirme_kuyruga: boolean }>
> {
  const metin = mesajIcerik.trim()
  if (!metin) {
    return { ok: false, error: "Mesaj içeriği zorunludur." }
  }

  const client = supabase ?? createClient()
  const mesajSonuc = await createBayiTalepMesaj(talepId, { mesaj_icerik: metin }, client)
  if (!mesajSonuc.ok) return mesajSonuc

  let bilgilendirme_kuyruga = false

  if (options.bilgilendir) {
    const talepSonuc = await getBayiTalep(talepId, client)
    if (talepSonuc.ok) {
      const talep = talepSonuc.data
      let telefon = talep.telefon
      let whatsapp: string | null = null

      if (talep.bayi_kart_id) {
        const bayiSonuc = await getBayiKart(talep.bayi_kart_id, client)
        if (bayiSonuc.ok) {
          telefon = bayiSonuc.data.telefon || telefon
          whatsapp = bayiSonuc.data.whatsapp
        }
      }

      await insertBilgilendirmeKuyrugu(client, {
        sirket_id: talep.sirket_id,
        bayi_talep_id: talep.id,
        bayi_kart_id: talep.bayi_kart_id,
        mesaj: metin,
        telefon,
        whatsapp,
      })
      bilgilendirme_kuyruga = true
    }
  }

  return {
    ok: true,
    data: { mesaj: mesajSonuc.data, bilgilendirme_kuyruga },
  }
}

export async function listBayiMesajMerkezi(
  filtre: { acik?: boolean | null; arama?: string } = {},
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiMesajMerkeziOzet[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const talepSonuc = await listBayiTalepleri({ arama: filtre.arama }, client)
  if (!talepSonuc.ok) return talepSonuc

  let talepler = talepSonuc.data
  if (filtre.acik === true) {
    talepler = talepler.filter((t) => talepAcikMi(t.durum))
  } else if (filtre.acik === false) {
    talepler = talepler.filter((t) => !talepAcikMi(t.durum))
  }

  const mesajSorgu = client
    .from("bayi_talep_mesajlari")
    .select(
      "id, sirket_id, bayi_talep_id, gonderen_tip, gonderen_ad, gonderen_personel_id, mesaj_icerik, ai_analiz_json, created_at"
    )
    .order("created_at", { ascending: false })

  if (ctx.data.sirket_id) {
    mesajSorgu.eq("sirket_id", ctx.data.sirket_id)
  }

  const { data: mesajlar, error: mesajError } = await mesajSorgu
  if (mesajError) {
    return { ok: false, error: "Mesajlar okunamadı: " + mesajError.message }
  }

  const sonMesajMap = new Map<string, BayiTalepMesaj>()
  const mesajSayisiMap = new Map<string, number>()

  for (const kayit of (mesajlar || []) as BayiTalepMesaj[]) {
    mesajSayisiMap.set(kayit.bayi_talep_id, (mesajSayisiMap.get(kayit.bayi_talep_id) || 0) + 1)
    if (!sonMesajMap.has(kayit.bayi_talep_id)) {
      sonMesajMap.set(kayit.bayi_talep_id, kayit)
    }
  }

  const ozetler: BayiMesajMerkeziOzet[] = talepler.map((talep) => ({
    talep,
    son_mesaj: sonMesajMap.get(talep.id) || null,
    mesaj_sayisi: mesajSayisiMap.get(talep.id) || 0,
  }))

  ozetler.sort((a, b) => {
    const aTarih = a.son_mesaj?.created_at || a.talep.updated_at || a.talep.created_at || ""
    const bTarih = b.son_mesaj?.created_at || b.talep.updated_at || b.talep.created_at || ""
    return bTarih.localeCompare(aTarih)
  })

  return { ok: true, data: ozetler }
}

export async function createBayiTalep(
  input: CreateBayiTalepInput,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalep>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Personel kaydında şirket bilgisi bulunamadı." }
  }

  const olusturanKisi = `${ctx.data.ad || ""} ${ctx.data.soyad || ""}`.trim() || "Personel"
  const talepNo = talepNoUret()
  const oncelik = talepOnceligi(input.talep_turu)

  const { data, error } = await client
    .from("bayi_talepleri")
    .insert({
      sirket_id: ctx.data.sirket_id,
      bayi_kart_id: input.bayi_kart_id || null,
      talep_no: talepNo,
      talep_turu: input.talep_turu,
      durum: "alindi",
      oncelik,
      musteri_adi: input.musteri_adi?.trim() || null,
      telefon: input.telefon?.trim() || null,
      alternatif_telefon: input.alternatif_telefon?.trim() || null,
      adres: input.adres?.trim() || null,
      il: input.il?.trim() || null,
      ilce: input.ilce?.trim() || null,
      mahalle: input.mahalle?.trim() || null,
      urun_turu: input.urun_turu?.trim() || null,
      model: input.model?.trim() || null,
      seri_no: input.seri_no?.trim() || null,
      satis_tarihi: input.satis_tarihi || null,
      aciklama: input.aciklama?.trim() || null,
      personel_notu: input.personel_notu?.trim() || null,
      ai_analiz_json: input.ai_analiz_json || null,
      ai_guven_skoru: input.ai_guven_skoru ?? null,
      sorumlu_departman: sorumluDepartman(input.talep_turu),
      sla_hedef_dk: slaHedefDk(input.talep_turu),
      sla_asildi_mi: false,
      kaynak: "portal",
      olusturan_kisi: olusturanKisi,
      olusturan_personel_id: ctx.data.id,
    })
    .select(TALEP_SELECT)
    .limit(1)

  if (error) {
    return { ok: false, error: "Talep oluşturulamadı: " + error.message }
  }

  const talep = (data || [])[0] as BayiTalep | undefined
  if (!talep) {
    return { ok: false, error: "Talep oluşturuldu ancak kayıt okunamadı." }
  }

  await client.from("bayi_talep_mesajlari").insert({
    sirket_id: ctx.data.sirket_id,
    bayi_talep_id: talep.id,
    gonderen_tip: "sistem",
    gonderen_ad: "FeyRoute",
    mesaj_icerik: `Talebiniz alındı. Talep no: ${talepNo}`,
  })

  return { ok: true, data: talep }
}

export async function uploadBayiTalepBelgesi(
  talepId: string,
  dosya: File,
  secenekler?: { ocrJson?: Record<string, unknown> | null },
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<{ publicUrl: string; belgeId: string }>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  if (!dosya.type.startsWith("image/")) {
    return { ok: false, error: "Lütfen geçerli bir görsel dosyası seçin." }
  }

  const uzanti = dosya.name.split(".").pop() || "jpg"
  const yol = `bayi-talep/${talepId}/${Date.now()}.${uzanti}`

  const { error: uploadError } = await client.storage.from("belgeler").upload(yol, dosya, {
    cacheControl: "3600",
    upsert: false,
  })

  if (uploadError) {
    return { ok: false, error: "Görsel yüklenemedi: " + uploadError.message }
  }

  const { data: urlData } = client.storage.from("belgeler").getPublicUrl(yol)

  const { data: belgeKayit, error: belgeError } = await client.from("bayi_talep_belgeleri").insert({
    sirket_id: ctx.data.sirket_id,
    bayi_talep_id: talepId,
    storage_bucket: "belgeler",
    storage_path: yol,
    public_url: urlData.publicUrl,
    dosya_adi: dosya.name,
    mime_type: dosya.type,
    ocr_json: secenekler?.ocrJson || null,
  }).select("id").limit(1)

  if (belgeError) {
    return { ok: false, error: "Belge kaydı oluşturulamadı: " + belgeError.message }
  }

  const belgeId = ((belgeKayit || [])[0] as { id?: string } | undefined)?.id
  if (!belgeId) {
    return { ok: false, error: "Belge kaydı oluşturuldu ancak okunamadı." }
  }

  return { ok: true, data: { publicUrl: urlData.publicUrl, belgeId } }
}

export async function listBayiTalepBelgeleri(
  talepId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalepBelge[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const { data, error } = await client
    .from("bayi_talep_belgeleri")
    .select(
      "id, sirket_id, bayi_talep_id, storage_bucket, storage_path, public_url, dosya_adi, mime_type, ocr_json, created_at"
    )
    .eq("bayi_talep_id", talepId)
    .order("created_at", { ascending: false })

  if (error) {
    return { ok: false, error: "Talep belgeleri okunamadı: " + error.message }
  }

  return { ok: true, data: (data || []) as BayiTalepBelge[] }
}

function hesaplaBayiSkorlari(
  bayi: Pick<BayiKart, "son_ziyaret_tarihi" | "son_gorusme_tarihi">,
  talepler: BayiTalep[],
  muhasebe: Awaited<ReturnType<typeof hesaplaBayiMuhasebeOzet>> = null
) {
  const analiz = analyzeBayiMetrics(bayi, talepler, muhasebe)
  return {
    risk_skoru: analiz.risk_skoru,
    risk_seviyesi: analiz.risk_seviyesi,
    performans_puani: analiz.performans_puani,
    sadakat_skoru: analiz.sadakat_skoru,
    karlilik_skoru: analiz.karlilik_skoru,
    aylik_is_hacmi: analiz.aylik_is_hacmi,
    risk_analiz_json: {
      risk_faktorleri: analiz.risk_faktorleri,
      karlilik_notu: analiz.karlilik_notu,
      onerilen_aksiyonlar: analiz.onerilen_aksiyonlar,
      muhasebe: analiz.muhasebe,
    },
  }
}

export async function getBayiRiskAnalizi(
  bayiId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiMetricsAnaliz>> {
  const client = supabase ?? createClient()
  const bayiSonuc = await getBayiKart(bayiId, client)
  if (!bayiSonuc.ok) return bayiSonuc

  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const talepSorgu = client.from("bayi_talepleri").select(TALEP_SELECT).eq("bayi_kart_id", bayiId)
  if (ctx.data.sirket_id) talepSorgu.eq("sirket_id", ctx.data.sirket_id)

  const { data: talepler, error } = await talepSorgu
  if (error) {
    return { ok: false, error: "Talepler okunamadı: " + error.message }
  }

  const muhasebe =
    ctx.data.sirket_id && bayiSonuc.data.bayi_cari_id
      ? await hesaplaBayiMuhasebeOzet(client, ctx.data.sirket_id, bayiSonuc.data.bayi_cari_id)
      : null

  return {
    ok: true,
    data: analyzeBayiMetrics(bayiSonuc.data, (talepler || []) as BayiTalep[], muhasebe),
  }
}

export async function listBayiKartlariDetayli(
  durum = "",
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiKartOzet[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const sorgu = client.from("bayi_kartlari").select(BAYI_KART_SELECT).order("bayi_adi", {
    ascending: true,
  })

  if (ctx.data.sirket_id) sorgu.eq("sirket_id", ctx.data.sirket_id)
  if (durum) sorgu.eq("durum", durum)

  const talepSorgu = client.from("bayi_talepleri").select(TALEP_SELECT)
  if (ctx.data.sirket_id) talepSorgu.eq("sirket_id", ctx.data.sirket_id)

  const [{ data: bayiler, error: bayiError }, { data: talepler, error: talepError }] =
    await Promise.all([sorgu, talepSorgu])

  if (bayiError) return { ok: false, error: "Bayi kartları okunamadı: " + bayiError.message }
  if (talepError) return { ok: false, error: "Talepler okunamadı: " + talepError.message }

  const kayitlar = (talepler || []) as BayiTalep[]

  const ozetler = ((bayiler || []) as BayiKart[]).map((bayi) => {
    const bayiTalepleri = kayitlar.filter((t) => t.bayi_kart_id === bayi.id)
    return {
      ...bayi,
      acik_talep: bayiTalepleri.filter((t) => talepAcikMi(t.durum)).length,
      tamamlanan_talep: bayiTalepleri.filter(
        (t) => t.durum === "tamamlandi" || t.durum === "kapandi"
      ).length,
      sikayet_sayisi: bayiTalepleri.filter((t) => t.talep_turu === "sikayet").length,
    }
  })

  return { ok: true, data: ozetler }
}

export async function getBayiKart(
  bayiId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiKart>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const sorgu = client.from("bayi_kartlari").select(BAYI_KART_SELECT).eq("id", bayiId).limit(1)
  if (ctx.data.sirket_id) sorgu.eq("sirket_id", ctx.data.sirket_id)

  const { data, error } = await sorgu
  if (error) return { ok: false, error: "Bayi kartı okunamadı: " + error.message }

  const bayi = (data || [])[0] as BayiKart | undefined
  if (!bayi) return { ok: false, error: "Bayi kartı bulunamadı." }

  return { ok: true, data: bayi }
}

export async function createBayiKart(
  input: CreateBayiKartInput,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiKart>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Personel kaydında şirket bilgisi bulunamadı." }
  }

  if (!input.bayi_adi.trim()) {
    return { ok: false, error: "Bayi adı zorunludur." }
  }

  const { data, error } = await client
    .from("bayi_kartlari")
    .insert({
      sirket_id: ctx.data.sirket_id,
      bayi_adi: input.bayi_adi.trim(),
      yetkili_kisi: input.yetkili_kisi?.trim() || null,
      telefon: input.telefon?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      email: input.email?.trim() || null,
      magaza_adresi: input.magaza_adresi?.trim() || null,
      depo_adresi: input.depo_adresi?.trim() || null,
      durum: "aktif",
    })
    .select(BAYI_KART_SELECT)
    .limit(1)

  if (error) return { ok: false, error: "Bayi kartı oluşturulamadı: " + error.message }

  const bayi = (data || [])[0] as BayiKart | undefined
  if (!bayi) return { ok: false, error: "Bayi kartı oluşturuldu ancak okunamadı." }

  return { ok: true, data: bayi }
}

export async function guncelleBayiSkorlari(
  bayiId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiKart>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const bayiSonuc = await getBayiKart(bayiId, client)
  if (!bayiSonuc.ok) return bayiSonuc

  const talepSorgu = client
    .from("bayi_talepleri")
    .select(TALEP_SELECT)
    .eq("bayi_kart_id", bayiId)

  if (ctx.data.sirket_id) talepSorgu.eq("sirket_id", ctx.data.sirket_id)

  const { data: talepler, error: talepError } = await talepSorgu
  if (talepError) return { ok: false, error: "Talepler okunamadı: " + talepError.message }

  const muhasebe =
    ctx.data.sirket_id && bayiSonuc.data.bayi_cari_id
      ? await hesaplaBayiMuhasebeOzet(client, ctx.data.sirket_id, bayiSonuc.data.bayi_cari_id)
      : null

  const skorlar = hesaplaBayiSkorlari(bayiSonuc.data, (talepler || []) as BayiTalep[], muhasebe)

  const { data, error } = await client
    .from("bayi_kartlari")
    .update(skorlar)
    .eq("id", bayiId)
    .select(BAYI_KART_SELECT)
    .limit(1)

  if (error) return { ok: false, error: "Bayi skorları güncellenemedi: " + error.message }

  const bayi = (data || [])[0] as BayiKart | undefined
  if (!bayi) return { ok: false, error: "Güncellenen bayi okunamadı." }

  return { ok: true, data: bayi }
}

export async function updateBayiTalepDurum(
  talepId: string,
  durum: BayiTalepDurum,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalep>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  const mevcut = await getBayiTalep(talepId, client)
  if (!mevcut.ok) return mevcut

  const slaAsildi = slaAsildiMi(mevcut.data)

  const { data, error } = await client
    .from("bayi_talepleri")
    .update({
      durum,
      sla_asildi_mi: slaAsildi || mevcut.data.sla_asildi_mi,
    })
    .eq("id", talepId)
    .select(TALEP_SELECT)
    .limit(1)

  if (error) return { ok: false, error: "Talep durumu güncellenemedi: " + error.message }

  const talep = (data || [])[0] as BayiTalep | undefined
  if (!talep) return { ok: false, error: "Güncellenen talep okunamadı." }

  const durumMesajlari: Partial<Record<BayiTalepDurum, string>> = {
    inceleniyor: "Talebiniz inceleniyor.",
    planlandi: "Randevu planlandı.",
    atandi: "Teknisyen atandı.",
    yolda: "Teknisyen yola çıktı.",
    tamamlandi: "İş tamamlandı.",
    ulasilamadi: "Müşteriye ulaşılamadı.",
    kapandi: "Talep kapatıldı.",
    iptal: "Talep iptal edildi.",
  }

  const mesaj = durumMesajlari[durum]
  if (mesaj) {
    await client.from("bayi_talep_mesajlari").insert({
      sirket_id: ctx.data.sirket_id,
      bayi_talep_id: talepId,
      gonderen_tip: "sistem",
      gonderen_ad: "FeyRoute",
      mesaj_icerik: mesaj,
    })
  }

  await kuyrukBayiBilgilendirme(talep, durum, client)

  if (talep.bayi_kart_id) {
    await guncelleBayiSkorlari(talep.bayi_kart_id, client)
  }

  return { ok: true, data: talep }
}

export async function calculateBayiYonetimPaneli(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiYonetimPaneli>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const [talepSonuc, bayiSonuc] = await Promise.all([
    listBayiTalepleri({}, client),
    listBayiKartlariDetayli("", client),
  ])

  if (!talepSonuc.ok) return talepSonuc
  if (!bayiSonuc.ok) return bayiSonuc

  const talepler = talepSonuc.data
  const acikTalepler = talepler.filter((t) => talepAcikMi(t.durum))
  const slaAsildi = acikTalepler.filter((t) => slaAsildiMi(t) || t.sla_asildi_mi).length
  const acilBekleyen = acikTalepler.filter(
    (t) => t.oncelik === "acil" || t.oncelik === "kritik" || t.talep_turu === "acil"
  ).length
  const operasyonBekleyen = acikTalepler.filter(
    (t) => t.sorumlu_departman === "operasyon" || !t.sorumlu_departman
  ).length
  const operasyonAktarilmamis = acikTalepler.filter(
    (t) =>
      operasyonaAktarilabilirTur(t.talep_turu) &&
      !t.operasyon_aktarildi_mi &&
      (t.sorumlu_departman === "operasyon" || !t.sorumlu_departman)
  ).length
  const sikayetBekleyen = acikTalepler.filter((t) => t.talep_turu === "sikayet").length
  const kritikBayi = bayiSonuc.data.filter(
    (b) => b.risk_seviyesi === "kritik" || b.risk_seviyesi === "yuksek"
  ).length

  await senkronizeBayiSlaUyarilari(client)

  const uyariSonuc = await listBayiSlaUyarilari(false, client)
  const okunmamisSlaUyari = uyariSonuc.ok
    ? uyariSonuc.data.filter((u) => !u.okundu_mi).length
    : 0

  return {
    ok: true,
    data: {
      acikTalep: acikTalepler.length,
      slaAsildi,
      acilBekleyen,
      operasyonBekleyen,
      operasyonAktarilmamis,
      sikayetBekleyen,
      kritikBayi,
      okunmamisSlaUyari,
      talepler: acikTalepler.slice(0, 50),
    },
  }
}

function bayiUrunKategorisi(urunTuru: string | null | undefined, talepTuru: BayiTalep["talep_turu"]) {
  const b = `${urunTuru || ""} ${TALEP_TURU_ETIKETLERI[talepTuru] || ""}`.toLocaleLowerCase("tr-TR")
  if (b.includes("klima")) return "KLIMA"
  if (b.includes("buzdolab")) return "BUZDOLABI"
  if (b.includes("çamaşır") || b.includes("camasir") || b.includes("çm")) return "CAMASIR_MAKINESI"
  if (b.includes("bulaşık") || b.includes("bulasik")) return "BULASIK_MAKINESI"
  if (b.includes("tv")) return "TV"
  return "GENEL"
}

function bayiReferansSureDk(talepTuru: BayiTalep["talep_turu"]) {
  if (talepTuru === "acil") return 30
  if (talepTuru === "montaj") return 35
  if (talepTuru === "ariza" || talepTuru === "tekrar_servis") return 20
  return 45
}

/** aktif_operasyon_havuzu_v2 upsert — ARON aktarım şeması + bayi iz kolonları */
function operasyonHavuzPayload(
  talep: BayiTalep,
  fisNo: string,
  bayiAdi: string | null
): Record<string, unknown> {
  const isTipi = talepTurundenIsTipi(talep.talep_turu)
  const acil = talep.oncelik === "acil" || talep.oncelik === "kritik" || talep.talep_turu === "acil"
  const kategori = bayiUrunKategorisi(talep.urun_turu, talep.talep_turu)
  const referansSure = bayiReferansSureDk(talep.talep_turu)
  const basvuruNedeni = TALEP_TURU_ETIKETLERI[talep.talep_turu]

  return {
    fis_no: fisNo,
    basvuru_no: talep.talep_no,
    musteri_adi: talep.musteri_adi,
    telefon: talep.telefon,
    il: talep.il,
    ilce: talep.ilce,
    mahalle: talep.mahalle,
    adres: talep.adres,
    bayi: bayiAdi,
    basvuru_nedeni: basvuruNedeni,
    basvuru_notu: `[BAYI TALEP ${talep.talep_no || talep.id}] ${talep.aciklama || ""}`.trim(),
    urun_adi: talep.urun_turu || basvuruNedeni,
    urun_grubu: talep.urun_turu,
    urun_model_kodu: talep.model,
    seri_no: talep.seri_no,
    is_tipi: isTipi,
    urun_kategori: kategori,
    gerekli_arac_sinifi: kategori === "BUZDOLABI" ? "BUYUK" : "ORTA",
    gerekli_yetenek: kategori === "KLIMA" ? "KLIMA_NAKLIYE" : "BEYAZ_ESYA",
    klima_cift_unite: kategori === "KLIMA",
    zimmet_islem_tipi: isTipi,
    operasyon_durumu: "atama_bekliyor",
    operasyon_asamasi: "havuz",
    teknisyen: "",
    randevu_tarihi: null,
    zaman_slotu: null,
    atama_gerekli: true,
    randevu_gerekli: true,
    teknisyen_ekranina_aktar: false,
    acik_gun: 0,
    kritik_cagri: acil,
    referans_sure_dk: referansSure,
    kat_bilgisi: null,
    kat_zam_orani: 0,
    kat_zamli_sure_dk: referansSure,
    riskli_sure_dk: Math.ceil(referansSure * 1.2),
    kaynak: "bayi_operasyon",
    bayi_talep_id: talep.id,
    updated_at: new Date().toISOString(),
  }
}

function operasyonHavuzHataMesaji(ham: string): string {
  const mesaj = ham.toLowerCase()
  if (mesaj.includes("bayi_talep_id") || mesaj.includes("kaynak")) {
    return "Operasyon havuzu şeması güncel değil. scripts/020_bayi_operasyon_havuz_koprusu_p1.sql dosyasını Supabase'de çalıştırın."
  }
  if (mesaj.includes("bayi_talep_operasyon_bekleyen")) {
    return "Bayi operasyon kuyruk tablosu bulunamadı. scripts/020_bayi_operasyon_havuz_koprusu_p1.sql dosyasını Supabase'de çalıştırın."
  }
  if (mesaj.includes("operasyon_aktarildi_mi") || mesaj.includes("operasyon_fis_no")) {
    return "Bayi talep tablosu operasyon kolonları eksik. scripts/020_bayi_operasyon_havuz_koprusu_p1.sql dosyasını Supabase'de çalıştırın."
  }
  if (mesaj.includes("duplicate key") && mesaj.includes("fis_no")) {
    return "Bu fiş numarası operasyon havuzunda zaten kayıtlı. Destek ekibine bildirin."
  }
  return `Operasyon havuzuna yazılamadı: ${ham}`
}

export async function bayiTalepOperasyonaAktar(
  talepId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiOperasyonAktarimSonuc>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  const talepSonuc = await getBayiTalep(talepId, client)
  if (!talepSonuc.ok) return talepSonuc

  const talep = talepSonuc.data

  if (!operasyonaAktarilabilirTur(talep.talep_turu)) {
    return {
      ok: false,
      error: "Bu talep türü operasyon havuzuna aktarılamaz.",
    }
  }

  if (talep.operasyon_aktarildi_mi) {
    return {
      ok: false,
      error: talep.operasyon_fis_no
        ? `Talep zaten operasyon havuzuna aktarılmış. Fiş no: ${talep.operasyon_fis_no}`
        : "Talep zaten operasyon havuzuna aktarılmış.",
    }
  }

  const { data: mevcutKuyruk, error: kuyrukOkumaHatasi } = await client
    .from("bayi_talep_operasyon_bekleyen")
    .select(
      "id, sirket_id, bayi_talep_id, fis_no, havuz_payload, durum, operasyon_havuzu_id, hata_mesaji, aktaran_personel_id, created_at, updated_at"
    )
    .eq("bayi_talep_id", talep.id)
    .maybeSingle()

  if (kuyrukOkumaHatasi) {
    return {
      ok: false,
      error: operasyonHavuzHataMesaji(kuyrukOkumaHatasi.message),
    }
  }

  if (mevcutKuyruk?.durum === "aktarildi") {
    return {
      ok: false,
      error: `Talep zaten operasyon havuzuna aktarılmış. Fiş no: ${mevcutKuyruk.fis_no}`,
    }
  }

  let bayiAdi: string | null = null
  if (talep.bayi_kart_id) {
    const bayiSonuc = await getBayiKart(talep.bayi_kart_id, client)
    if (bayiSonuc.ok) bayiAdi = bayiSonuc.data.bayi_adi
  }

  const fisNo = bayiOperasyonFisNo(talep.talep_no, talep.id)
  const payload = operasyonHavuzPayload(talep, fisNo, bayiAdi)

  const { data: bekleyenKayit, error: bekleyenError } = await client
    .from("bayi_talep_operasyon_bekleyen")
    .upsert(
      {
        sirket_id: ctx.data.sirket_id,
        bayi_talep_id: talep.id,
        fis_no: fisNo,
        havuz_payload: payload,
        durum: "bekliyor",
        hata_mesaji: null,
        aktaran_personel_id: ctx.data.id,
      },
      { onConflict: "bayi_talep_id" }
    )
    .select(
      "id, sirket_id, bayi_talep_id, fis_no, havuz_payload, durum, operasyon_havuzu_id, hata_mesaji, aktaran_personel_id, created_at, updated_at"
    )
    .limit(1)

  if (bekleyenError) {
    return { ok: false, error: operasyonHavuzHataMesaji(bekleyenError.message) }
  }

  const bekleyen = (bekleyenKayit || [])[0] as BayiTalepOperasyonBekleyen | undefined
  if (!bekleyen) {
    return { ok: false, error: "Operasyon kuyruğu kaydı okunamadı." }
  }

  let havuzId: string | null = null

  const { data: havuzKayit, error: havuzError } = await client
    .from("aktif_operasyon_havuzu_v2")
    .upsert(payload, { onConflict: "fis_no" })
    .select("id")
    .limit(1)

  if (havuzError) {
    const havuzHatasi = operasyonHavuzHataMesaji(havuzError.message)
    await client
      .from("bayi_talep_operasyon_bekleyen")
      .update({ durum: "hata", hata_mesaji: havuzHatasi })
      .eq("id", bekleyen.id)

    return { ok: false, error: havuzHatasi }
  }

  havuzId = ((havuzKayit || [])[0] as { id?: string } | undefined)?.id || null

  await client
    .from("bayi_talep_operasyon_bekleyen")
    .update({
      durum: "aktarildi",
      operasyon_havuzu_id: havuzId,
      hata_mesaji: null,
      havuz_payload: payload,
    })
    .eq("id", bekleyen.id)

  const yeniDurum: BayiTalepDurum =
    talep.durum === "alindi" || talep.durum === "inceleniyor" ? "planlandi" : talep.durum

  const { data: guncellenenTalep, error: talepGuncellemeHatasi } = await client
    .from("bayi_talepleri")
    .update({
      operasyon_fis_no: fisNo,
      operasyon_aktarildi_mi: true,
      operasyon_aktarim_tarihi: new Date().toISOString(),
      ilgili_is_emri_id: havuzId,
      durum: yeniDurum,
    })
    .eq("id", talep.id)
    .eq("operasyon_aktarildi_mi", false)
    .select("id")
    .maybeSingle()

  if (talepGuncellemeHatasi) {
    return {
      ok: false,
      error: operasyonHavuzHataMesaji(talepGuncellemeHatasi.message),
    }
  }

  if (!guncellenenTalep) {
    return {
      ok: false,
      error: "Talep zaten operasyon havuzuna aktarılmış.",
    }
  }

  await client.from("bayi_talep_mesajlari").insert({
    sirket_id: ctx.data.sirket_id,
    bayi_talep_id: talep.id,
    gonderen_tip: "sistem",
    gonderen_ad: "FeyRoute",
    mesaj_icerik: `Talep operasyon havuzuna aktarıldı. Fiş no: ${fisNo}`,
  })

  const { data: guncelBekleyen } = await client
    .from("bayi_talep_operasyon_bekleyen")
    .select(
      "id, sirket_id, bayi_talep_id, fis_no, havuz_payload, durum, operasyon_havuzu_id, hata_mesaji, aktaran_personel_id, created_at, updated_at"
    )
    .eq("id", bekleyen.id)
    .limit(1)

  return {
    ok: true,
    data: {
      bekleyen: ((guncelBekleyen || [])[0] as BayiTalepOperasyonBekleyen) || bekleyen,
      havuz_id: havuzId,
      havuz_hatasi: null,
    },
  }
}

export async function senkronizeBayiSlaUyarilari(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<{ olusturulan: number }>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  const talepSonuc = await listBayiTalepleri({}, client)
  if (!talepSonuc.ok) return talepSonuc

  const acikTalepler = talepSonuc.data.filter((t) => talepAcikMi(t.durum))
  let olusturulan = 0

  for (const talep of acikTalepler) {
    const adaylar: { tip: BayiSlaUyari["uyari_tipi"]; mesaj: string }[] = []

    if (slaAsildiMi(talep) || talep.sla_asildi_mi) {
      adaylar.push({
        tip: "sla_asildi",
        mesaj: `${talep.talep_no || talep.musteri_adi || "Talep"} SLA süresini aştı.`,
      })
    }

    if (
      talep.oncelik === "acil" ||
      talep.oncelik === "kritik" ||
      talep.talep_turu === "acil"
    ) {
      adaylar.push({
        tip: "acil_bekleyen",
        mesaj: `Acil talep bekliyor: ${talep.musteri_adi || talep.talep_no || talep.id}`,
      })
    }

    for (const aday of adaylar) {
      const { data: mevcut } = await client
        .from("bayi_sla_uyarilari")
        .select("id")
        .eq("bayi_talep_id", talep.id)
        .eq("uyari_tipi", aday.tip)
        .eq("okundu_mi", false)
        .limit(1)

      if ((mevcut || []).length > 0) continue

      const { error } = await client.from("bayi_sla_uyarilari").insert({
        sirket_id: ctx.data.sirket_id,
        bayi_talep_id: talep.id,
        uyari_tipi: aday.tip,
        mesaj: aday.mesaj,
      })

      if (!error) olusturulan += 1
    }
  }

  return { ok: true, data: { olusturulan } }
}

export async function listBayiSlaUyarilari(
  sadeceOkunmamis = false,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiSlaUyariOzet[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const sorgu = client
    .from("bayi_sla_uyarilari")
    .select("id, sirket_id, bayi_talep_id, uyari_tipi, mesaj, okundu_mi, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (ctx.data.sirket_id) sorgu.eq("sirket_id", ctx.data.sirket_id)
  if (sadeceOkunmamis) sorgu.eq("okundu_mi", false)

  const { data, error } = await sorgu
  if (error) {
    return { ok: false, error: "SLA uyarıları okunamadı: " + error.message }
  }

  const uyariKayitlari = (data || []) as BayiSlaUyari[]
  const talepIdleri = [...new Set(uyariKayitlari.map((u) => u.bayi_talep_id))]

  if (talepIdleri.length === 0) {
    return { ok: true, data: [] }
  }

  const talepSorgu = client
    .from("bayi_talepleri")
    .select("id, talep_no, musteri_adi, talep_turu, durum, telefon")
    .in("id", talepIdleri)

  if (ctx.data.sirket_id) talepSorgu.eq("sirket_id", ctx.data.sirket_id)

  const { data: talepler, error: talepError } = await talepSorgu
  if (talepError) {
    return { ok: false, error: "Talep bilgileri okunamadı: " + talepError.message }
  }

  const talepMap = new Map(
    ((talepler || []) as BayiTalep[]).map((t) => [
      t.id,
      {
        id: t.id,
        talep_no: t.talep_no,
        musteri_adi: t.musteri_adi,
        talep_turu: t.talep_turu,
        durum: t.durum,
        telefon: t.telefon,
      },
    ])
  )

  const ozetler: BayiSlaUyariOzet[] = uyariKayitlari
    .map((uyari) => {
      const talep = talepMap.get(uyari.bayi_talep_id)
      if (!talep) return null
      return { ...uyari, talep }
    })
    .filter(Boolean) as BayiSlaUyariOzet[]

  return { ok: true, data: ozetler }
}

export async function okunduBayiSlaUyari(
  uyariId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<{ ok: true }>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const { error } = await client
    .from("bayi_sla_uyarilari")
    .update({ okundu_mi: true })
    .eq("id", uyariId)

  if (error) {
    return { ok: false, error: "Uyarı güncellenemedi: " + error.message }
  }

  return { ok: true, data: { ok: true } }
}

export async function listBayiCariOzetleri(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiCariOzet[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  const [{ data: cariler, error: cariError }, { data: kartlar, error: kartError }] =
    await Promise.all([
      client
        .from("muhasebe_cariler")
        .select("id, cari_adi, telefon, email, adres")
        .eq("sirket_id", ctx.data.sirket_id)
        .eq("cari_tipi", "bayi")
        .order("cari_adi", { ascending: true }),
      client
        .from("bayi_kartlari")
        .select("bayi_cari_id")
        .eq("sirket_id", ctx.data.sirket_id),
    ])

  if (cariError) {
    return { ok: false, error: "Bayi carileri okunamadı: " + cariError.message }
  }
  if (kartError) {
    return { ok: false, error: "Bayi kartları okunamadı: " + kartError.message }
  }

  const bagliCariIdleri = new Set(
    ((kartlar || []) as { bayi_cari_id: string | null }[])
      .map((k) => k.bayi_cari_id)
      .filter(Boolean)
  )

  const ozetler: BayiCariOzet[] = ((cariler || []) as {
    id: string
    cari_adi: string
    telefon: string | null
    email: string | null
    adres: string | null
  }[]).map((cari) => ({
    id: cari.id,
    cari_adi: cari.cari_adi,
    telefon: cari.telefon,
    email: cari.email,
    adres: cari.adres,
    zaten_bagli: bagliCariIdleri.has(cari.id),
  }))

  return { ok: true, data: ozetler }
}

export async function bayiKartCariBagla(
  cariId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiKart>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  const { data: cariKayit, error: cariError } = await client
    .from("muhasebe_cariler")
    .select("id, cari_adi, telefon, email, adres")
    .eq("id", cariId)
    .eq("sirket_id", ctx.data.sirket_id)
    .eq("cari_tipi", "bayi")
    .limit(1)

  if (cariError) {
    return { ok: false, error: "Cari okunamadı: " + cariError.message }
  }

  const cari = (cariKayit || [])[0] as {
    id: string
    cari_adi: string
    telefon: string | null
    email: string | null
    adres: string | null
  } | undefined

  if (!cari) {
    return { ok: false, error: "Bayi cari kaydı bulunamadı." }
  }

  const { data: mevcutKart } = await client
    .from("bayi_kartlari")
    .select(BAYI_KART_SELECT)
    .eq("bayi_cari_id", cari.id)
    .limit(1)

  const kart = (mevcutKart || [])[0] as BayiKart | undefined
  if (kart) {
    return { ok: true, data: kart }
  }

  return createBayiKart(
    {
      bayi_adi: cari.cari_adi,
      telefon: cari.telefon || undefined,
      email: cari.email || undefined,
      magaza_adresi: cari.adres || undefined,
    },
    client
  ).then(async (sonuc) => {
    if (!sonuc.ok) return sonuc

    const { data, error } = await client
      .from("bayi_kartlari")
      .update({ bayi_cari_id: cari.id })
      .eq("id", sonuc.data.id)
      .select(BAYI_KART_SELECT)
      .limit(1)

    if (error) {
      return { ok: false, error: "Cari bağlantısı kaydedilemedi: " + error.message }
    }

    const guncel = (data || [])[0] as BayiKart | undefined
    if (!guncel) {
      return { ok: false, error: "Güncellenen bayi kartı okunamadı." }
    }

    return { ok: true, data: guncel }
  })
}

export async function whatsappStubTalepOlustur(
  input: WhatsAppTalepStubInput,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalep>> {
  const client = supabase ?? createClient()
  let payload = input

  const {
    data: { user },
  } = await client.auth.getUser()

  if (user && !payload.sirket_id) {
    const ctx = await getBayiOperasyonContext(client)
    if (ctx.ok && ctx.data.sirket_id) {
      payload = { ...payload, sirket_id: ctx.data.sirket_id }
    }
  }

  return whatsappWebhookTalepOlustur(payload, client)
}

async function cozumleWebhookSirketId(
  client: SupabaseClient,
  tercih?: string
): Promise<string | null> {
  if (tercih?.trim()) return tercih.trim()

  const envSirket = process.env.BAYI_WHATSAPP_DEFAULT_SIRKET_ID?.trim()
  if (envSirket) return envSirket

  const { data: kartlar } = await client
    .from("bayi_kartlari")
    .select("sirket_id")
    .order("created_at", { ascending: true })
    .limit(1)

  const kartSirket = (kartlar || [])[0] as { sirket_id?: string } | undefined
  if (kartSirket?.sirket_id) return kartSirket.sirket_id

  const { data: talepler } = await client
    .from("bayi_talepleri")
    .select("sirket_id")
    .order("created_at", { ascending: true })
    .limit(1)

  const talepSirket = (talepler || [])[0] as { sirket_id?: string } | undefined
  return talepSirket?.sirket_id || null
}

async function bayiKartTelefondanBul(
  client: SupabaseClient,
  sirketId: string,
  telefon?: string
): Promise<string | null> {
  const normalized = bayiTelefonNormalize(telefon)
  if (!normalized) return null

  const { data: kartlar } = await client
    .from("bayi_kartlari")
    .select("id, telefon, whatsapp")
    .eq("sirket_id", sirketId)
    .eq("durum", "aktif")

  for (const kart of (kartlar || []) as BayiKart[]) {
    const tel = bayiTelefonNormalize(kart.telefon)
    const wa = bayiTelefonNormalize(kart.whatsapp)
    if (tel === normalized || wa === normalized) {
      return kart.id
    }
  }

  return null
}

export async function whatsappWebhookTalepOlustur(
  input: WhatsAppTalepStubInput,
  client: SupabaseClient
): Promise<BayiOperasyonResult<BayiTalep>> {
  const mesaj = input.mesaj.trim()
  if (!mesaj) {
    return { ok: false, error: "WhatsApp mesajı zorunludur." }
  }

  const sirketId = await cozumleWebhookSirketId(client, input.sirket_id)
  if (!sirketId) {
    return { ok: false, error: "Webhook için şirket bilgisi çözümlenemedi." }
  }

  const bayiKartId =
    input.bayi_kart_id || (await bayiKartTelefondanBul(client, sirketId, input.telefon))

  const talepTuru = whatsappMesajindanTalepTuru(mesaj)
  const talepNo = talepNoUret()
  const oncelik = talepOnceligi(talepTuru)

  const { data, error } = await client
    .from("bayi_talepleri")
    .insert({
      sirket_id: sirketId,
      bayi_kart_id: bayiKartId,
      talep_no: talepNo,
      talep_turu: talepTuru,
      durum: "alindi",
      oncelik,
      telefon: input.telefon?.trim() || null,
      aciklama: mesaj,
      ai_analiz_json: {
        kaynak: "whatsapp",
        gonderen_ad: input.gonderen_ad || input.bayi_adi || null,
        siniflandirma: talepTuru,
        meta_message_id: input.meta_message_id || null,
      },
      sorumlu_departman: sorumluDepartman(talepTuru),
      sla_hedef_dk: slaHedefDk(talepTuru),
      sla_asildi_mi: false,
      kaynak: "whatsapp",
      olusturan_kisi: input.gonderen_ad || input.bayi_adi || "WhatsApp Bayi",
      olusturan_personel_id: null,
    })
    .select(TALEP_SELECT)
    .limit(1)

  if (error) {
    return { ok: false, error: "WhatsApp talebi oluşturulamadı: " + error.message }
  }

  const talep = (data || [])[0] as BayiTalep | undefined
  if (!talep) {
    return { ok: false, error: "Talep oluşturuldu ancak okunamadı." }
  }

  await client.from("bayi_talep_mesajlari").insert({
    sirket_id: sirketId,
    bayi_talep_id: talep.id,
    gonderen_tip: "bayi",
    gonderen_ad: input.gonderen_ad || input.bayi_adi || "WhatsApp Bayi",
    mesaj_icerik: mesaj,
  })

  await client.from("bayi_talep_mesajlari").insert({
    sirket_id: sirketId,
    bayi_talep_id: talep.id,
    gonderen_tip: "sistem",
    gonderen_ad: "FeyRoute",
    mesaj_icerik: `WhatsApp talebiniz alındı. Talep no: ${talepNo}`,
  })

  try {
    await client.from("bayi_whatsapp_webhook_loglari").insert({
      sirket_id: sirketId,
      kaynak: input.meta_message_id ? "meta" : "stub",
      telefon: input.telefon || null,
      mesaj,
      meta_message_id: input.meta_message_id || null,
      talep_id: talep.id,
      durum: "islendi",
    })
  } catch {
    // Log tablosu yoksa akışı bozma
  }

  return { ok: true, data: talep }
}

async function insertBilgilendirmeKuyrugu(
  client: SupabaseClient,
  input: {
    sirket_id: string
    bayi_talep_id: string
    bayi_kart_id: string | null
    mesaj: string
    telefon?: string | null
    whatsapp?: string | null
  }
) {
  const { kanal, alici: secilenAlici } = cozumleBilgilendirmeKanal({
    telefon: input.telefon,
    whatsapp: input.whatsapp,
    whatsappAktif: whatsappGonderimModu() === "meta",
    smsAktif: smsSaglayici() !== "stub",
  })

  const alici = secilenAlici || input.telefon || input.whatsapp
  if (!alici) return

  await client.from("bayi_bilgilendirme_kuyrugu").insert({
    sirket_id: input.sirket_id,
    bayi_talep_id: input.bayi_talep_id,
    bayi_kart_id: input.bayi_kart_id,
    kanal,
    alici,
    mesaj: input.mesaj,
    durum: "bekliyor",
  })
}

async function kuyrukBayiBilgilendirme(
  talep: BayiTalep,
  durum: BayiTalepDurum,
  client: SupabaseClient
) {
  const sablon = bilgilendirmeSablonu(durum, {
    musteri: talep.musteri_adi,
    talep_no: talep.talep_no,
    fis_no: talep.operasyon_fis_no,
  })

  if (!sablon) return

  let bayiTelefon: string | null = talep.telefon
  let bayiWhatsapp: string | null = null

  if (talep.bayi_kart_id) {
    const bayiSonuc = await getBayiKart(talep.bayi_kart_id, client)
    if (bayiSonuc.ok) {
      bayiTelefon = bayiSonuc.data.telefon
      bayiWhatsapp = bayiSonuc.data.whatsapp
    }
  }

  await insertBilgilendirmeKuyrugu(client, {
    sirket_id: talep.sirket_id,
    bayi_talep_id: talep.id,
    bayi_kart_id: talep.bayi_kart_id,
    mesaj: sablon,
    telefon: bayiTelefon,
    whatsapp: bayiWhatsapp,
  })
}

export async function createBayiZiyaret(
  input: CreateBayiZiyaretInput,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiZiyaret>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx
  if (!ctx.data.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  if (!input.bayi_kart_id) {
    return { ok: false, error: "Bayi seçimi zorunludur." }
  }

  const personelAdi = `${ctx.data.ad || ""} ${ctx.data.soyad || ""}`.trim() || "Personel"
  const ziyaretTarihi = input.ziyaret_tarihi || new Date().toISOString().slice(0, 10)

  const { data, error } = await client
    .from("bayi_ziyaretleri")
    .insert({
      sirket_id: ctx.data.sirket_id,
      bayi_kart_id: input.bayi_kart_id,
      ziyaret_tarihi: ziyaretTarihi,
      ziyaret_tipi: input.ziyaret_tipi || "saha",
      personel_id: ctx.data.id,
      personel_adi: personelAdi,
      notlar: input.notlar?.trim() || null,
    })
    .select(
      "id, sirket_id, bayi_kart_id, ziyaret_tarihi, ziyaret_tipi, personel_id, personel_adi, notlar, aksiyonlar, created_at"
    )
    .limit(1)

  if (error) {
    return { ok: false, error: "Ziyaret kaydedilemedi: " + error.message }
  }

  const ziyaret = (data || [])[0] as BayiZiyaret | undefined
  if (!ziyaret) {
    return { ok: false, error: "Ziyaret kaydedildi ancak okunamadı." }
  }

  const guncelleme: Record<string, string> = {
    son_gorusme_tarihi: new Date().toISOString(),
  }
  if (input.ziyaret_tipi === "saha" || input.ziyaret_tipi === "magaza" || !input.ziyaret_tipi) {
    guncelleme.son_ziyaret_tarihi = ziyaretTarihi
  }

  await client.from("bayi_kartlari").update(guncelleme).eq("id", input.bayi_kart_id)
  await guncelleBayiSkorlari(input.bayi_kart_id, client)

  return { ok: true, data: ziyaret }
}

export async function calculateBayiZiyaretMerkezi(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiZiyaretMerkeziOzet>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const ziyaretSorgu = client
    .from("bayi_ziyaretleri")
    .select(
      "id, sirket_id, bayi_kart_id, ziyaret_tarihi, ziyaret_tipi, personel_id, personel_adi, notlar, aksiyonlar, created_at"
    )
    .order("ziyaret_tarihi", { ascending: false })
    .limit(20)

  if (ctx.data.sirket_id) {
    ziyaretSorgu.eq("sirket_id", ctx.data.sirket_id)
  }

  const [bayiSonuc, { data: ziyaretler, error: ziyaretError }] = await Promise.all([
    listBayiKartlariDetayli("aktif", client),
    ziyaretSorgu,
  ])

  if (!bayiSonuc.ok) return bayiSonuc
  if (ziyaretError) {
    return { ok: false, error: "Ziyaretler okunamadı: " + ziyaretError.message }
  }

  const bayiMap = new Map(bayiSonuc.data.map((b) => [b.id, b.bayi_adi]))
  const ziyaretKayitlari = ((ziyaretler || []) as BayiZiyaret[]).map((z) => ({
    ...z,
    bayi_adi: bayiMap.get(z.bayi_kart_id) || null,
  }))

  const buAyBas = new Date()
  buAyBas.setDate(1)
  buAyBas.setHours(0, 0, 0, 0)

  const buAyZiyaret = ziyaretKayitlari.filter(
    (z) => z.ziyaret_tarihi && new Date(`${z.ziyaret_tarihi}T00:00:00`) >= buAyBas
  ).length

  const ziyaretBekleyenBayiler = bayiSonuc.data
    .filter((b) => ziyaretBekliyorMu(b))
    .slice(0, 12)
    .map((b) => ({
      id: b.id,
      bayi_adi: b.bayi_adi,
      son_ziyaret_tarihi: b.son_ziyaret_tarihi,
      risk_seviyesi: b.risk_seviyesi,
    }))

  return {
    ok: true,
    data: {
      ziyaret_bekleyen: ziyaretBekleyenBayiler.length,
      bu_ay_ziyaret: buAyZiyaret,
      son_ziyaretler: ziyaretKayitlari,
      ziyaret_bekleyen_bayiler: ziyaretBekleyenBayiler,
    },
  }
}

export async function listBayiBilgilendirmeKuyrugu(
  sadeceBekleyen = true,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiBilgilendirmeOzet[]>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const sorgu = client
    .from("bayi_bilgilendirme_kuyrugu")
    .select(
      "id, sirket_id, bayi_talep_id, bayi_kart_id, kanal, alici, mesaj, durum, hata_mesaji, dis_ref, created_at, gonderim_tarihi"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (ctx.data.sirket_id) sorgu.eq("sirket_id", ctx.data.sirket_id)
  if (sadeceBekleyen) sorgu.eq("durum", "bekliyor")

  const { data, error } = await sorgu
  if (error) {
    return { ok: false, error: "Bilgilendirme kuyruğu okunamadı: " + error.message }
  }

  const kayitlar = (data || []) as BayiBilgilendirme[]
  const talepIdleri = [
    ...new Set(kayitlar.map((k) => k.bayi_talep_id).filter(Boolean)),
  ] as string[]

  let talepMap = new Map<string, { talep_no: string | null; musteri_adi: string | null }>()
  if (talepIdleri.length > 0) {
    const talepSorgu = client
      .from("bayi_talepleri")
      .select("id, talep_no, musteri_adi")
      .in("id", talepIdleri)
    if (ctx.data.sirket_id) talepSorgu.eq("sirket_id", ctx.data.sirket_id)
    const { data: talepler } = await talepSorgu
    talepMap = new Map(
      ((talepler || []) as BayiTalep[]).map((t) => [
        t.id,
        { talep_no: t.talep_no, musteri_adi: t.musteri_adi },
      ])
    )
  }

  const ozetler: BayiBilgilendirmeOzet[] = kayitlar.map((k) => {
    const talep = k.bayi_talep_id ? talepMap.get(k.bayi_talep_id) : null
    return {
      ...k,
      talep_no: talep?.talep_no || null,
      musteri_adi: talep?.musteri_adi || null,
    }
  })

  return { ok: true, data: ozetler }
}

export async function isaretleBilgilendirmeGonderildi(
  kayitId: string,
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiBilgilendirme>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const { data, error } = await client
    .from("bayi_bilgilendirme_kuyrugu")
    .update({
      durum: "gonderildi",
      gonderim_tarihi: new Date().toISOString(),
    })
    .eq("id", kayitId)
    .select(
      "id, sirket_id, bayi_talep_id, bayi_kart_id, kanal, alici, mesaj, durum, hata_mesaji, dis_ref, created_at, gonderim_tarihi"
    )
    .limit(1)

  if (error) {
    return { ok: false, error: "Kayıt güncellenemedi: " + error.message }
  }

  const kayit = (data || [])[0] as BayiBilgilendirme | undefined
  if (!kayit) {
    return { ok: false, error: "Güncellenen kayıt okunamadı." }
  }

  return { ok: true, data: kayit }
}

export async function senkronizeBayiOperasyonDurumlari(
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BayiOperasyonSenkronSonuc>> {
  const client = supabase ?? createClient()
  const ctx = await getBayiOperasyonContext(client)
  if (!ctx.ok) return ctx

  const talepSonuc = await listBayiTalepleri({}, client)
  if (!talepSonuc.ok) return talepSonuc

  const adaylar = talepSonuc.data.filter(
    (t) =>
      t.operasyon_aktarildi_mi &&
      t.operasyon_fis_no &&
      talepAcikMi(t.durum) &&
      !["tamamlandi", "kapandi", "iptal"].includes(t.durum)
  )

  const detaylar: BayiOperasyonSenkronSonuc["detaylar"] = []
  let guncellenen = 0

  for (const talep of adaylar) {
    const fisNo = talep.operasyon_fis_no!
    const { data: havuzKayitlari } = await client
      .from("aktif_operasyon_havuzu_v2")
      .select("id, kesin_atanan_ekip_id, operasyon_durumu")
      .eq("fis_no", fisNo)
      .limit(1)

    const havuz = (havuzKayitlari || [])[0] as {
      kesin_atanan_ekip_id?: string | null
      operasyon_durumu?: string | null
    } | undefined

    let yeniDurum: BayiTalepDurum | null = null

    const { data: zimmetKayitlari } = await client
      .from("operasyon_zimmetleri")
      .select("sonuc_tamamlandi")
      .eq("fis_no", fisNo)
      .limit(1)

    const zimmet = (zimmetKayitlari || [])[0] as { sonuc_tamamlandi?: boolean | null } | undefined

    if (zimmet?.sonuc_tamamlandi) {
      yeniDurum = "tamamlandi"
    } else if (havuz?.operasyon_durumu === "ADRESE_VARILDI") {
      yeniDurum = "yolda"
    } else if (havuz?.kesin_atanan_ekip_id) {
      yeniDurum = "atandi"
    }

    if (!yeniDurum || yeniDurum === talep.durum) continue

    const guncelleme = await updateBayiTalepDurum(talep.id, yeniDurum, client)
    if (guncelleme.ok) {
      guncellenen += 1
      detaylar.push({
        talep_id: talep.id,
        eski_durum: talep.durum,
        yeni_durum: yeniDurum,
        fis_no: fisNo,
      })
    }
  }

  return {
    ok: true,
    data: {
      kontrol_edilen: adaylar.length,
      guncellenen,
      detaylar,
    },
  }
}

export async function isleBayiBilgilendirmeKuyrugu(
  options: { limit?: number; sirket_id?: string } = {},
  supabase?: SupabaseClient
): Promise<BayiOperasyonResult<BilgilendirmeIslemSonuc>> {
  const client = supabase ?? createClient()
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)
  const kanalDurumu = bilgilendirmeKanalDurumu()

  const sorgu = client
    .from("bayi_bilgilendirme_kuyrugu")
    .select(
      "id, sirket_id, bayi_talep_id, bayi_kart_id, kanal, alici, mesaj, durum, hata_mesaji, dis_ref, created_at, gonderim_tarihi"
    )
    .eq("durum", "bekliyor")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (options.sirket_id) {
    sorgu.eq("sirket_id", options.sirket_id)
  } else {
    const envSirket = process.env.BAYI_WHATSAPP_DEFAULT_SIRKET_ID?.trim()
    if (envSirket) {
      sorgu.eq("sirket_id", envSirket)
    } else {
      const ctx = await getBayiOperasyonContext(client)
      if (!ctx.ok) return ctx
      if (ctx.data.sirket_id) sorgu.eq("sirket_id", ctx.data.sirket_id)
    }
  }

  const { data, error } = await sorgu
  if (error) {
    return { ok: false, error: "Bilgilendirme kuyruğu okunamadı: " + error.message }
  }

  const kayitlar = (data || []) as BayiBilgilendirme[]
  const detaylar: BilgilendirmeIslemSonuc["detaylar"] = []
  let gonderildi = 0
  let hata = 0

  for (const kayit of kayitlar) {
    if (kayit.kanal === "portal") {
      continue
    }

    let sonuc: { ok: boolean; messageId?: string; error?: string }

    if (kayit.kanal === "whatsapp") {
      const wa = await bayiWhatsAppGonder(kayit.alici || "", kayit.mesaj)
      sonuc = wa.ok
        ? { ok: true, messageId: wa.messageId }
        : { ok: false, error: wa.error }
    } else if (kayit.kanal === "sms") {
      const sms = await bayiSmsGonder(kayit.alici || "", kayit.mesaj)
      sonuc = sms.ok
        ? { ok: true, messageId: sms.messageId }
        : { ok: false, error: sms.error }
    } else {
      continue
    }

    if (sonuc.ok) {
      gonderildi += 1
      await client
        .from("bayi_bilgilendirme_kuyrugu")
        .update({
          durum: "gonderildi",
          gonderim_tarihi: new Date().toISOString(),
          dis_ref: sonuc.messageId || null,
          hata_mesaji: null,
        })
        .eq("id", kayit.id)

      detaylar.push({
        id: kayit.id,
        durum: "gonderildi",
        kanal: kayit.kanal,
        dis_ref: sonuc.messageId || null,
      })
    } else {
      hata += 1
      const hataMesaji = sonuc.error || "Gönderim başarısız."
      await client
        .from("bayi_bilgilendirme_kuyrugu")
        .update({
          durum: "hata",
          hata_mesaji: hataMesaji,
        })
        .eq("id", kayit.id)

      detaylar.push({
        id: kayit.id,
        durum: "hata",
        kanal: kayit.kanal,
        hata: hataMesaji,
      })
    }
  }

  return {
    ok: true,
    data: {
      whatsapp_mod: kanalDurumu.whatsapp_mod,
      sms_saglayici: kanalDurumu.sms_saglayici,
      kanal_tercihi: kanalDurumu.kanal_tercihi,
      kontrol_edilen: kayitlar.length,
      gonderildi,
      hata,
      detaylar,
    },
  }
}
