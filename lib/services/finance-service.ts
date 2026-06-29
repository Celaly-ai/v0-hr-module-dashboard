import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

export type FinanceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; partial?: Partial<T> }

export type FinanceContext = {
  sirketId: string
  personelId: string
  personelAdSoyad: string | null
}

export type FaturaTipi = "satis" | "alis" | "gider" | "iade" | "proforma"
export type FaturaDurum = "bekliyor" | "kismi_odendi" | "odendi" | "iptal"
export type OdemeIslemTipi = "tahsilat" | "odeme"

export type CreateInvoiceInput = {
  fatura_tipi: FaturaTipi
  cari_id?: string | null
  fatura_no?: string | null
  fatura_tarihi?: string | null
  vade_tarihi?: string | null
  toplam_tutar: number
  odenen_tutar?: number
  durum?: FaturaDurum
  belge_url?: string | null
  aciklama?: string | null
  kaynak_modul?: string
}

export type CreateInvoiceResult = {
  faturaId: string
  hareketId: string | null
  hareketOlusturuldu: boolean
  uyari?: string
}

export type CreatePaymentInput = {
  islem_tipi: OdemeIslemTipi
  cari_id: string
  hesap_id: string
  tutar: number
  tarih?: string | null
  belge_no?: string | null
  odeme_yontemi?: string
  aciklama?: string | null
  kaynak_modul?: string
}

export type CreatePaymentResult = {
  hareketId: string
}

export type CreateExpenseInput = {
  tutar: number
  kategori_id?: string | null
  kategori_ad?: string | null
  odeme_yontemi?: string
  aciklama?: string | null
  detay_aciklama?: string | null
  fatura_no?: string | null
  belge_no?: string | null
  islem_yapan_ad_soyad?: string | null
  masrafi_yapan_ad_soyad?: string | null
  masraf_yeri?: string | null
  belge_var_mi?: boolean
  tarih?: string | null
  kaynak_modul?: string
}

export type CreateIncomeInput = {
  tutar: number
  kategori_id?: string | null
  kategori_ad?: string | null
  odeme_yontemi?: string
  aciklama?: string | null
  detay_aciklama?: string | null
  fatura_no?: string | null
  belge_no?: string | null
  islem_yapan_ad_soyad?: string | null
  belge_var_mi?: boolean
  tarih?: string | null
  kaynak_modul?: string
}

export type FinanceTransactionInput = {
  tur: string
  hareket_tipi?: string
  tutar: number
  borc_tutar?: number
  alacak_tutar?: number
  cari_id?: string | null
  hesap_id?: string | null
  kategori_id?: string | null
  kategori_ad?: string | null
  tarih?: string | null
  islem_tarihi?: string | null
  odeme_yontemi?: string | null
  odeme_tipi?: string | null
  aciklama?: string | null
  detay_aciklama?: string | null
  fatura_no?: string | null
  belge_no?: string | null
  islem_yapan_ad_soyad?: string | null
  masrafi_yapan_ad_soyad?: string | null
  avans_personel_ad_soyad?: string | null
  masraf_yeri?: string | null
  belge_var_mi?: boolean
  kaynak?: string
  kaynak_modul?: string
  kaynak_kayit_id?: string | null
  onay_durumu?: string
  odeme_durumu?: string
  durum?: string
}

export type FinanceTransactionResult = {
  hareketId: string
}

export type FinanceDashboard = {
  gelir: number
  gider: number
  tahsilat: number
  odeme: number
  netDurum: number
  acikFatura: number
  cariSayisi: number
  kasaBankaSayisi: number
  sonHareketler: Array<{
    id: string
    tur: string
    hareket_tipi: string | null
    tutar: number
    kategori_ad: string | null
    aciklama: string | null
    created_at: string
  }>
  sonFaturalar: Array<{
    id: string
    fatura_no: string | null
    fatura_tipi: string
    toplam_tutar: number
    kalan_tutar: number | null
    durum: string
    created_at: string
  }>
}


// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const GIDER_TURLERI = ["gider", "odeme", "avans", "maas", "yemek", "kesinti"]
const GELIR_TURLERI = ["gelir", "tahsilat", "ek_odeme"]

function bugunTarihi() {
  return new Date().toISOString().slice(0, 10)
}

function turEsles(
  tur: string | null | undefined,
  hareketTipi: string | null | undefined,
  hedef: string
) {
  return tur === hedef || hareketTipi === hedef
}

function faturaHareketOlusturulmali(faturaTipi: FaturaTipi) {
  return faturaTipi === "satis" || faturaTipi === "alis" || faturaTipi === "gider"
}

export async function getFinanceContext(
  supabase?: SupabaseClient
): Promise<FinanceResult<FinanceContext>> {
  return getFinanceContextInternal(supabase)
}

async function getFinanceContextInternal(
  supabase?: SupabaseClient
): Promise<FinanceResult<FinanceContext>> {
  const client = supabase ?? createClient()

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Oturum bilgisi alınamadı." }
  }

  const { data: personel, error: personelError } = await client
    .from("personeller")
    .select("id, sirket_id, ad_soyad")
    .or(`auth_id.eq.${user.id},kullanici_id.eq.${user.id}`)
    .maybeSingle()

  if (personelError || !personel?.sirket_id) {
    return { ok: false, error: "Şirket bilgisi bulunamadı." }
  }

  return {
    ok: true,
    data: {
      sirketId: personel.sirket_id,
      personelId: personel.id,
      personelAdSoyad: personel.ad_soyad ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Çekirdek hareket oluşturma
// ---------------------------------------------------------------------------

export async function createFinanceTransaction(
  input: FinanceTransactionInput,
  supabase?: SupabaseClient
): Promise<FinanceResult<FinanceTransactionResult>> {
  const client = supabase ?? createClient()
  const ctxResult = await getFinanceContext(client)

  if (!ctxResult.ok) {
    return { ok: false, error: ctxResult.error }
  }

  const ctx = ctxResult.data
  const tutar = Number(input.tutar)

  if (!tutar || tutar <= 0) {
    return { ok: false, error: "Geçerli bir tutar giriniz." }
  }

  const tur = input.tur
  const hareketTipi = input.hareket_tipi ?? tur
  const islemTarihi = input.tarih || input.islem_tarihi || bugunTarihi()

  const borcTutar =
    input.borc_tutar !== undefined
      ? input.borc_tutar
      : GIDER_TURLERI.includes(tur)
        ? tutar
        : 0

  const alacakTutar =
    input.alacak_tutar !== undefined
      ? input.alacak_tutar
      : GELIR_TURLERI.includes(tur)
        ? tutar
        : 0

  const { data, error } = await client
    .from("muhasebe_hareketleri")
    .insert({
      sirket_id: ctx.sirketId,
      personel_id: ctx.personelId,

      tarih: islemTarihi,
      islem_tarihi: input.islem_tarihi || islemTarihi,

      tur,
      hareket_tipi: hareketTipi,

      kategori_id: input.kategori_id ?? null,
      kategori_ad: input.kategori_ad ?? null,

      tutar,
      borc_tutar: borcTutar,
      alacak_tutar: alacakTutar,

      cari_id: input.cari_id ?? null,
      hesap_id: input.hesap_id ?? null,

      odeme_yontemi: input.odeme_yontemi ?? null,
      odeme_tipi: input.odeme_tipi ?? input.odeme_yontemi ?? null,

      aciklama: input.aciklama?.trim() || null,
      detay_aciklama: input.detay_aciklama?.trim() || null,
      fatura_no: input.fatura_no?.trim() || null,
      belge_no: input.belge_no?.trim() || null,

      islem_yapan_ad_soyad:
        input.islem_yapan_ad_soyad?.trim() || ctx.personelAdSoyad || null,
      masrafi_yapan_ad_soyad: input.masrafi_yapan_ad_soyad?.trim() || null,
      avans_personel_ad_soyad: input.avans_personel_ad_soyad?.trim() || null,
      masraf_yeri: input.masraf_yeri?.trim() || null,
      belge_var_mi: input.belge_var_mi ?? false,

      kaynak: input.kaynak ?? "manuel",
      kaynak_modul: input.kaynak_modul ?? "finance_service",
      kaynak_kayit_id: input.kaynak_kayit_id ?? null,

      onay_durumu: input.onay_durumu ?? "onaylandi",
      odeme_durumu: input.odeme_durumu ?? "odendi",
      durum: input.durum ?? "aktif",
    })
    .select("id")
    .single()

  if (error || !data?.id) {
    return {
      ok: false,
      error: "Muhasebe hareketi oluşturulamadı: " + (error?.message ?? "bilinmeyen hata"),
    }
  }

  return { ok: true, data: { hareketId: data.id } }
}

// ---------------------------------------------------------------------------
// Fatura
// ---------------------------------------------------------------------------

export async function createInvoice(
  input: CreateInvoiceInput,
  supabase?: SupabaseClient
): Promise<FinanceResult<CreateInvoiceResult>> {
  const client = supabase ?? createClient()
  const ctxResult = await getFinanceContext(client)

  if (!ctxResult.ok) {
    return { ok: false, error: ctxResult.error }
  }

  const ctx = ctxResult.data
  const toplamTutar = Number(input.toplam_tutar)
  const odenenTutar = Number(input.odenen_tutar ?? 0)

  if (!input.fatura_tipi) {
    return { ok: false, error: "Fatura tipi zorunludur." }
  }

  if (!toplamTutar || toplamTutar <= 0) {
    return { ok: false, error: "Geçerli bir toplam tutar giriniz." }
  }

  if (odenenTutar > toplamTutar) {
    return { ok: false, error: "Ödenen tutar toplam tutardan büyük olamaz." }
  }

  const faturaTarihi = input.fatura_tarihi || bugunTarihi()
  const faturaNoMetin = input.fatura_no?.trim() || "-"

  const { data: faturaKayit, error: faturaError } = await client
    .from("muhasebe_faturalar")
    .insert({
      sirket_id: ctx.sirketId,
      cari_id: input.cari_id || null,
      fatura_tipi: input.fatura_tipi,
      fatura_no: input.fatura_no?.trim() || null,
      fatura_tarihi: faturaTarihi,
      vade_tarihi: input.vade_tarihi || null,
      toplam_tutar: toplamTutar,
      odenen_tutar: odenenTutar,
      kalan_tutar: toplamTutar - odenenTutar,
      durum: input.durum ?? "bekliyor",
      belge_url: input.belge_url?.trim() || null,
      aciklama: input.aciklama?.trim() || null,
      kaynak_modul: input.kaynak_modul ?? "finance_service",
      kaynak_kayit_id: null,
    })
    .select("id")
    .single()

  if (faturaError || !faturaKayit?.id) {
    return {
      ok: false,
      error: "Fatura kaydı oluşturulamadı: " + (faturaError?.message ?? "bilinmeyen hata"),
    }
  }

  if (!faturaHareketOlusturulmali(input.fatura_tipi)) {
    return {
      ok: true,
      data: {
        faturaId: faturaKayit.id,
        hareketId: null,
        hareketOlusturuldu: false,
      },
    }
  }

  const isSatis = input.fatura_tipi === "satis"
  const hareketTur = isSatis ? "gelir" : "gider"

  const hareketResult = await createFinanceTransaction(
    {
      tur: hareketTur,
      hareket_tipi: hareketTur,
      tutar: toplamTutar,
      borc_tutar: isSatis ? 0 : toplamTutar,
      alacak_tutar: isSatis ? toplamTutar : 0,
      cari_id: input.cari_id ?? null,
      tarih: faturaTarihi,
      islem_tarihi: faturaTarihi,
      aciklama: isSatis
        ? "Satış faturası: " + faturaNoMetin
        : "Alış/Gider faturası: " + faturaNoMetin,
      kaynak: "fatura",
      kaynak_modul: "muhasebe_faturalar",
      kaynak_kayit_id: faturaKayit.id,
      odeme_durumu: input.durum ?? "bekliyor",
    },
    client
  )

  if (!hareketResult.ok) {
    return {
      ok: true,
      data: {
        faturaId: faturaKayit.id,
        hareketId: null,
        hareketOlusturuldu: false,
        uyari:
          "Fatura kaydedildi ancak muhasebe hareketi oluşturulamadı: " +
          hareketResult.error,
      },
    }
  }

  return {
    ok: true,
    data: {
      faturaId: faturaKayit.id,
      hareketId: hareketResult.data.hareketId,
      hareketOlusturuldu: true,
    },
  }
}

// ---------------------------------------------------------------------------
// Tahsilat / Ödeme
// ---------------------------------------------------------------------------

export async function createPayment(
  input: CreatePaymentInput,
  supabase?: SupabaseClient
): Promise<FinanceResult<CreatePaymentResult>> {
  if (!input.cari_id) {
    return { ok: false, error: "Cari seçimi zorunludur." }
  }

  if (!input.hesap_id) {
    return { ok: false, error: "Kasa / banka seçimi zorunludur." }
  }

  const isTahsilat = input.islem_tipi === "tahsilat"
  const tutar = Number(input.tutar)

  if (!tutar || tutar <= 0) {
    return { ok: false, error: "Geçerli bir tutar giriniz." }
  }

  const islemTarihi = input.tarih || bugunTarihi()

  return createFinanceTransaction(
    {
      tur: input.islem_tipi,
      hareket_tipi: input.islem_tipi,
      tutar,
      borc_tutar: isTahsilat ? 0 : tutar,
      alacak_tutar: isTahsilat ? tutar : 0,
      cari_id: input.cari_id,
      hesap_id: input.hesap_id,
      tarih: islemTarihi,
      islem_tarihi: islemTarihi,
      belge_no: input.belge_no ?? null,
      odeme_yontemi: input.odeme_yontemi ?? "nakit",
      odeme_tipi: input.odeme_yontemi ?? "nakit",
      aciklama: input.aciklama ?? null,
      kaynak: "manuel",
      kaynak_modul: input.kaynak_modul ?? "tahsilat_odeme",
    },
    supabase
  ).then((result) => {
    if (!result.ok) return result
    return { ok: true as const, data: { hareketId: result.data.hareketId } }
  })
}

// ---------------------------------------------------------------------------
// Gider / Gelir
// ---------------------------------------------------------------------------

export async function createExpense(
  input: CreateExpenseInput,
  supabase?: SupabaseClient
): Promise<FinanceResult<FinanceTransactionResult>> {
  const tutar = Number(input.tutar)

  if (!tutar || tutar <= 0) {
    return { ok: false, error: "Geçerli bir tutar giriniz." }
  }

  const islemTarihi = input.tarih || bugunTarihi()

  return createFinanceTransaction(
    {
      tur: "gider",
      hareket_tipi: "gider",
      tutar,
      borc_tutar: tutar,
      alacak_tutar: 0,
      kategori_id: input.kategori_id ?? null,
      kategori_ad: input.kategori_ad ?? null,
      odeme_yontemi: input.odeme_yontemi ?? "nakit",
      odeme_tipi: input.odeme_yontemi ?? "nakit",
      aciklama: input.aciklama ?? null,
      detay_aciklama: input.detay_aciklama ?? null,
      fatura_no: input.fatura_no ?? null,
      belge_no: input.belge_no ?? null,
      islem_yapan_ad_soyad: input.islem_yapan_ad_soyad ?? null,
      masrafi_yapan_ad_soyad: input.masrafi_yapan_ad_soyad ?? null,
      masraf_yeri: input.masraf_yeri ?? null,
      belge_var_mi: input.belge_var_mi ?? false,
      tarih: islemTarihi,
      islem_tarihi: islemTarihi,
      kaynak: "manuel",
      kaynak_modul: input.kaynak_modul ?? "manuel",
    },
    supabase
  )
}

export async function createIncome(
  input: CreateIncomeInput,
  supabase?: SupabaseClient
): Promise<FinanceResult<FinanceTransactionResult>> {
  const tutar = Number(input.tutar)

  if (!tutar || tutar <= 0) {
    return { ok: false, error: "Geçerli bir tutar giriniz." }
  }

  const islemTarihi = input.tarih || bugunTarihi()

  return createFinanceTransaction(
    {
      tur: "gelir",
      hareket_tipi: "gelir",
      tutar,
      borc_tutar: 0,
      alacak_tutar: tutar,
      kategori_id: input.kategori_id ?? null,
      kategori_ad: input.kategori_ad ?? null,
      odeme_yontemi: input.odeme_yontemi ?? "nakit",
      odeme_tipi: input.odeme_yontemi ?? "nakit",
      aciklama: input.aciklama ?? null,
      detay_aciklama: input.detay_aciklama ?? null,
      fatura_no: input.fatura_no ?? null,
      belge_no: input.belge_no ?? null,
      islem_yapan_ad_soyad: input.islem_yapan_ad_soyad ?? null,
      belge_var_mi: input.belge_var_mi ?? false,
      tarih: islemTarihi,
      islem_tarihi: islemTarihi,
      kaynak: "manuel",
      kaynak_modul: input.kaynak_modul ?? "manuel",
    },
    supabase
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function calculateDashboard(
  supabase?: SupabaseClient
): Promise<FinanceResult<FinanceDashboard>> {
  const client = supabase ?? createClient()
  const ctxResult = await getFinanceContext(client)

  const sirketId = ctxResult.ok ? ctxResult.data.sirketId : null

  const hareketSorgu = client
    .from("muhasebe_hareketleri")
    .select("tur, hareket_tipi, tutar")

  const sonHareketSorgu = client
    .from("muhasebe_hareketleri")
    .select("id, tur, hareket_tipi, tutar, kategori_ad, aciklama, created_at")
    .order("created_at", { ascending: false })
    .limit(8)

  const faturaSorgu = client.from("muhasebe_faturalar").select("id, durum")

  const sonFaturaSorgu = client
    .from("muhasebe_faturalar")
    .select("id, fatura_no, fatura_tipi, toplam_tutar, kalan_tutar, durum, created_at")
    .order("created_at", { ascending: false })
    .limit(8)

  const cariSorgu = client
    .from("muhasebe_cariler")
    .select("id", { count: "exact", head: true })
    .eq("durum", "aktif")

  const kasaBankaSorgu = client
    .from("muhasebe_kasa_banka")
    .select("id", { count: "exact", head: true })
    .eq("durum", "aktif")

  if (sirketId) {
    hareketSorgu.eq("sirket_id", sirketId)
    sonHareketSorgu.eq("sirket_id", sirketId)
    faturaSorgu.eq("sirket_id", sirketId)
    sonFaturaSorgu.eq("sirket_id", sirketId)
    cariSorgu.eq("sirket_id", sirketId)
    kasaBankaSorgu.eq("sirket_id", sirketId)
  }

  const [
    { data: hareketData },
    { data: sonHareketData },
    { data: faturaData },
    { data: sonFaturaData },
    { count: cariSayisi },
    { count: kasaBankaSayisi },
  ] = await Promise.all([
    hareketSorgu,
    sonHareketSorgu,
    faturaSorgu,
    sonFaturaSorgu,
    cariSorgu,
    kasaBankaSorgu,
  ])

  let gelir = 0
  let gider = 0
  let tahsilat = 0
  let odeme = 0

  ;(hareketData || []).forEach((item) => {
    const tutar = Number(item.tutar || 0)
    if (turEsles(item.tur, item.hareket_tipi, "gelir")) gelir += tutar
    if (turEsles(item.tur, item.hareket_tipi, "gider")) gider += tutar
    if (turEsles(item.tur, item.hareket_tipi, "tahsilat")) tahsilat += tutar
    if (turEsles(item.tur, item.hareket_tipi, "odeme")) odeme += tutar
  })

  const acikFatura = (faturaData || []).filter(
    (f) => f.durum === "bekliyor" || f.durum === "kismi_odendi"
  ).length

  return {
    ok: true,
    data: {
      gelir,
      gider,
      tahsilat,
      odeme,
      netDurum: gelir + tahsilat - gider - odeme,
      acikFatura,
      cariSayisi: cariSayisi || 0,
      kasaBankaSayisi: kasaBankaSayisi || 0,
      sonHareketler: (sonHareketData || []) as FinanceDashboard["sonHareketler"],
      sonFaturalar: (sonFaturaData || []) as FinanceDashboard["sonFaturalar"],
    },
  }
}
