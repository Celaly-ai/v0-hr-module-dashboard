import type { SupabaseClient } from "@supabase/supabase-js"

export type GorevPersonelContext = {
  personelId: string
  personelAd: string
  ekipIds: string[]
  birincilEkipId: string | null
  birincilEkipAdi: string | null
  /** Genel operasyon ekranları için; Görevlerim listesinde bypass kullanılmaz. */
  operasyonYoneticisiMi: boolean
}

type GorevYetkiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }

/**
 * FeyRoute operasyon zimmet aksiyonlarında tam yetki.
 * hr-sidebar OPERASYON_ROLLERI + portal ceo rolü ile uyumlu.
 */
const OPERASYON_YONETICI_ROLLERI = new Set([
  "admin",
  "ceo",
  "servis_yoneticisi",
  "urun_sorumlusu",
])

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

function normalizeRol(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

export function operasyonYoneticisiMi(rol?: string | null) {
  return OPERASYON_YONETICI_ROLLERI.has(normalizeRol(rol))
}

async function personelKaydiBul(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
) {
  const personelSelect = "id, ad, soyad, rol, email, auth_id, kullanici_id"

  const { data: authEslesme, error: authError } = await supabase
    .from("personeller")
    .select(personelSelect)
    .eq("auth_id", userId)
    .limit(1)

  if (authError) {
    return { error: "Personel kaydı okunamadı: " + authError.message }
  }

  let personel = (authEslesme || [])[0] as
    | {
        id: string
        ad: string | null
        soyad: string | null
        rol: string | null
        email: string | null
      }
    | undefined

  if (!personel) {
    const { data: kullaniciEslesme, error: kullaniciError } = await supabase
      .from("personeller")
      .select(personelSelect)
      .eq("kullanici_id", userId)
      .limit(1)

    if (kullaniciError) {
      return { error: "Personel kaydı okunamadı: " + kullaniciError.message }
    }

    personel = (kullaniciEslesme || [])[0]
  }

  if (!personel && email) {
    const normalizedEmail = normalizeEmail(email)

    const { data: emailEslesme, error: emailError } = await supabase
      .from("personeller")
      .select(personelSelect)
      .ilike("email", normalizedEmail)
      .limit(5)

    if (emailError) {
      return { error: "Personel kaydı okunamadı: " + emailError.message }
    }

    personel = (emailEslesme || []).find(
      (kayit) => normalizeEmail(kayit.email) === normalizedEmail,
    )
  }

  if (!personel?.id) {
    return { error: "Bu kullanıcı için personel kaydı bulunamadı." }
  }

  return { personel }
}

async function ekipIliskileriniBul(
  supabase: SupabaseClient,
  personelId: string,
) {
  const { data: uyelikler, error: uyelikError } = await supabase
    .from("ekip_uyeleri")
    .select("ekip_id, rol, durum")
    .eq("personel_id", personelId)
    .eq("durum", "aktif")

  if (uyelikError) {
    return { error: "Ekip üyeliği okunamadı: " + uyelikError.message }
  }

  const uyelikEkipIds = (uyelikler || [])
    .map((u) => u.ekip_id)
    .filter(Boolean) as string[]

  const { data: liderEkipleri, error: liderError } = await supabase
    .from("ekipler")
    .select("id, ekip_adi")
    .eq("lider_personel_id", personelId)

  if (liderError) {
    return { error: "Ekip bilgisi okunamadı: " + liderError.message }
  }

  const { data: sorumluEkipleri, error: sorumluError } = await supabase
    .from("ekipler")
    .select("id, ekip_adi")
    .eq("sorumlu_personel_id", personelId)

  if (sorumluError) {
    return { error: "Ekip bilgisi okunamadı: " + sorumluError.message }
  }

  const liderEkipIds = (liderEkipleri || []).map((e) => e.id).filter(Boolean)
  const sorumluEkipIds = (sorumluEkipleri || []).map((e) => e.id).filter(Boolean)

  const ekipIds = Array.from(
    new Set([...uyelikEkipIds, ...liderEkipIds, ...sorumluEkipIds]),
  )

  let birincilEkipId = uyelikEkipIds[0] ?? liderEkipIds[0] ?? sorumluEkipIds[0] ?? null
  let birincilEkipAdi: string | null = null

  if (birincilEkipId) {
    const { data: ekipKayitlari } = await supabase
      .from("ekipler")
      .select("id, ekip_adi")
      .eq("id", birincilEkipId)
      .limit(1)

    birincilEkipAdi = (ekipKayitlari || [])[0]?.ekip_adi ?? null
  } else if ((liderEkipleri || []).length > 0) {
    birincilEkipId = liderEkipleri![0].id
    birincilEkipAdi = liderEkipleri![0].ekip_adi ?? null
  } else if ((sorumluEkipleri || []).length > 0) {
    birincilEkipId = sorumluEkipleri![0].id
    birincilEkipAdi = sorumluEkipleri![0].ekip_adi ?? null
  }

  return { ekipIds, birincilEkipId, birincilEkipAdi }
}

export async function getGorevPersonelContext(
  supabase: SupabaseClient,
): Promise<GorevYetkiResult<GorevPersonelContext>> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: "Oturum bulunamadı.", status: 401 }
  }

  const personelSonuc = await personelKaydiBul(supabase, user.id, user.email)

  if ("error" in personelSonuc && personelSonuc.error) {
    return {
      ok: false,
      error: personelSonuc.error,
      status: personelSonuc.error.includes("bulunamadı") ? 404 : 500,
    }
  }

  const personel = personelSonuc.personel!

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const profilRol =
    typeof profile?.role === "string" && profile.role
      ? profile.role
      : personel.rol

  const ekipSonuc = await ekipIliskileriniBul(supabase, personel.id)

  if ("error" in ekipSonuc && ekipSonuc.error) {
    return { ok: false, error: ekipSonuc.error, status: 500 }
  }

  return {
    ok: true,
    data: {
      personelId: personel.id,
      personelAd:
        `${personel.ad || ""} ${personel.soyad || ""}`.trim() || "Personel",
      ekipIds: ekipSonuc.ekipIds ?? [],
      birincilEkipId: ekipSonuc.birincilEkipId ?? null,
      birincilEkipAdi: ekipSonuc.birincilEkipAdi ?? null,
      operasyonYoneticisiMi: operasyonYoneticisiMi(profilRol),
    },
  }
}

/**
 * Görevlerim kişisel ekranı için filtre.
 * Yönetici rolleri dahil herkes yalnız kendi ekip kapsamını görür.
 */
export function zimmetYetkiFiltresi(
  ctx: GorevPersonelContext,
): string | null {
  const parcalar = [`lider_personel_id.eq.${ctx.personelId}`]

  if (ctx.ekipIds.length > 0) {
    parcalar.push(`ekip_id.in.(${ctx.ekipIds.join(",")})`)
  }

  return parcalar.join(",")
}

export function personelGorevKapsamindaMi(
  ctx: GorevPersonelContext,
  zimmet: { ekip_id?: string | null; lider_personel_id?: string | null },
) {
  return (
    zimmet.lider_personel_id === ctx.personelId ||
    (zimmet.ekip_id != null &&
      ctx.ekipIds.includes(String(zimmet.ekip_id)))
  )
}

export async function kullaniciZimmeteYetkiliMi(
  supabase: SupabaseClient,
  zimmetId: string,
  ctx?: GorevPersonelContext,
): Promise<GorevYetkiResult<boolean>> {
  let personelCtx: GorevYetkiResult<GorevPersonelContext>

  if (ctx) {
    personelCtx = { ok: true, data: ctx }
  } else {
    personelCtx = await getGorevPersonelContext(supabase)
  }

  if (!personelCtx.ok) {
    return personelCtx
  }

  const { data: zimmet, error } = await supabase
    .from("operasyon_zimmetleri")
    .select("id, ekip_id, lider_personel_id")
    .eq("id", zimmetId)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message, status: 500 }
  }

  if (!zimmet) {
    return { ok: false, error: "Operasyon zimmeti bulunamadı.", status: 404 }
  }

  if (personelCtx.data.operasyonYoneticisiMi) {
    return { ok: true, data: true }
  }

  if (!personelGorevKapsamindaMi(personelCtx.data, zimmet)) {
    return {
      ok: false,
      error: "Bu görev için işlem yetkiniz yok.",
      status: 403,
    }
  }

  return { ok: true, data: true }
}

export async function kullaniciDetayaYetkiliMi(
  supabase: SupabaseClient,
  detayId: string,
  ctx?: GorevPersonelContext,
): Promise<GorevYetkiResult<boolean>> {
  const { data: detay, error } = await supabase
    .from("operasyon_zimmet_detaylari")
    .select("id, operasyon_zimmet_id")
    .eq("id", detayId)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message, status: 500 }
  }

  if (!detay?.operasyon_zimmet_id) {
    return { ok: false, error: "Ürün detayı bulunamadı.", status: 404 }
  }

  return kullaniciZimmeteYetkiliMi(
    supabase,
    String(detay.operasyon_zimmet_id),
    ctx,
  )
}
