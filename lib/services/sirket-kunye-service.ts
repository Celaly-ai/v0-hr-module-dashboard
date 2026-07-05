import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  SirketKunye,
  SirketKunyeGirisCikisKonum,
  SirketKunyeKaynak,
  SirketKunyeKontrolSonuc,
  SirketKunyePersonel,
} from "@/lib/types/sirket-kunye"

type Kayit = Record<string, unknown>

const PERSONEL_SELECT = "id, sirket_id, ad, soyad, rol, auth_id, kullanici_id, email"

function sayi(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function temizMetin(value: unknown): string | null {
  const text = String(value ?? "").trim()
  return text.length > 0 ? text : null
}

function temizSaat(value: unknown): string | null {
  const text = temizMetin(value)
  if (!text) return null
  return text.slice(0, 5)
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

function kunyeKaynaktanOlustur(
  kayit: Kayit,
  kaynak: SirketKunyeKaynak,
  sirketId?: string | null,
): SirketKunye {
  return {
    id: String(kayit.id),
    sirket_id: temizMetin(kayit.sirket_id) || sirketId || null,
    ad: temizMetin(kayit.ad),
    unvan: temizMetin(kayit.unvan),
    il: temizMetin(kayit.il),
    ilce: temizMetin(kayit.ilce),
    acik_adres: temizMetin(kayit.acik_adres),
    adres: temizMetin(kayit.adres),
    giris_cikis_lat: sayi(kayit.giris_cikis_lat),
    giris_cikis_lng: sayi(kayit.giris_cikis_lng),
    giris_cikis_mesafe_limiti: sayi(kayit.giris_cikis_mesafe_limiti),
    standart_mesai_baslangic:
      temizSaat(kayit.standart_mesai_baslangic) ??
      temizSaat(kayit.mesai_baslangic) ??
      temizSaat(kayit.calisma_baslangic_saati),
    standart_mesai_bitis:
      temizSaat(kayit.standart_mesai_bitis) ??
      temizSaat(kayit.mesai_bitis) ??
      temizSaat(kayit.calisma_bitis_saati),
    kunye_tamamlandi:
      typeof kayit.kunye_tamamlandi === "boolean" ? kayit.kunye_tamamlandi : null,
    kaynak,
  }
}

export function sirketKaydindanKunyeOlustur(
  kayit: Kayit,
  sirketId?: string | null,
  kaynak: SirketKunyeKaynak = "sirketler",
): SirketKunye {
  return kunyeKaynaktanOlustur(kayit, kaynak, sirketId)
}

export function kunyeZorunluEksikleriniBul(
  kunye: SirketKunye | null,
  sirketId?: string | null,
): string[] {
  const eksikler: string[] = []

  if (!sirketId) {
    eksikler.push("Şirket ID")
  }

  if (!kunye) {
    eksikler.push("Şirket künyesi kaydı")
    return eksikler
  }

  if (!kunye.ad && !kunye.unvan) {
    eksikler.push("Şirket adı veya ünvan")
  }

  if (!kunye.il) eksikler.push("İl")
  if (!kunye.ilce) eksikler.push("İlçe")

  if (!kunye.acik_adres && !kunye.adres) {
    eksikler.push("Açık adres")
  }

  if (kunye.giris_cikis_lat === null) eksikler.push("Giriş/çıkış enlem")
  if (kunye.giris_cikis_lng === null) eksikler.push("Giriş/çıkış boylam")
  if (kunye.giris_cikis_mesafe_limiti === null) {
    eksikler.push("Giriş/çıkış mesafe limiti")
  }

  if (!kunye.standart_mesai_baslangic) {
    eksikler.push("Standart mesai başlangıç")
  }

  if (!kunye.standart_mesai_bitis) {
    eksikler.push("Standart mesai bitiş")
  }

  return eksikler
}

export async function personelKaydiBul(
  client: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<SirketKunyePersonel | null> {
  const { data: personelListesi, error } = await client
    .from("personeller")
    .select(PERSONEL_SELECT)
    .or(`auth_id.eq.${userId},kullanici_id.eq.${userId}${email ? `,email.eq.${email}` : ""}`)
    .limit(10)

  if (error) {
    throw new Error("Personel kaydı okunamadı: " + error.message)
  }

  const personeller = (personelListesi || []) as Array<
    SirketKunyePersonel & { auth_id?: string | null; kullanici_id?: string | null; email?: string | null }
  >

  const personel =
    personeller.find((p) => p.auth_id === userId) ||
    personeller.find((p) => p.kullanici_id === userId) ||
    personeller.find((p) => normalizeEmail(p.email) === normalizeEmail(email)) ||
    personeller[0] ||
    null

  if (!personel) return null

  return {
    id: personel.id,
    sirket_id: personel.sirket_id ?? null,
    ad: personel.ad ?? null,
    soyad: personel.soyad ?? null,
    rol: personel.rol ?? null,
  }
}

export async function sirketKunyesiOku(
  client: SupabaseClient,
  sirketId: string,
): Promise<SirketKunye | null> {
  const { data: sirket, error } = await client
    .from("sirketler")
    .select("*")
    .eq("id", sirketId)
    .maybeSingle()

  if (error || !sirket) {
    return null
  }

  return sirketKaydindanKunyeOlustur(sirket as Kayit, sirketId, "sirketler")
}

export async function sirketKunyesiKontrolEt(
  client?: SupabaseClient,
  userId?: string,
  email?: string | null,
): Promise<SirketKunyeKontrolSonuc> {
  const supabase = client ?? createClient()

  let oturumUserId = userId
  let oturumEmail = email

  if (!oturumUserId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        tamam: false,
        eksikler: ["Oturum"],
        kunye: null,
        personel: null,
        hata: "Oturum bulunamadı.",
      }
    }

    oturumUserId = user.id
    oturumEmail = user.email
  }

  try {
    const personel = await personelKaydiBul(supabase, oturumUserId, oturumEmail)

    if (!personel) {
      return {
        tamam: false,
        eksikler: ["Personel kaydı"],
        kunye: null,
        personel: null,
        hata: "Bu kullanıcı için personel kaydı bulunamadı.",
      }
    }

    if (!personel.sirket_id) {
      return {
        tamam: false,
        eksikler: kunyeZorunluEksikleriniBul(null, null),
        kunye: null,
        personel,
        hata: "Personel kaydında şirket bağlantısı bulunamadı.",
      }
    }

    const kunye = await sirketKunyesiOku(supabase, personel.sirket_id)
    const eksikler = kunyeZorunluEksikleriniBul(kunye, personel.sirket_id)

    if (eksikler.length > 0) {
      return {
        tamam: false,
        eksikler,
        kunye,
        personel,
      }
    }

    return {
      tamam: true,
      kunye: kunye!,
      personel,
    }
  } catch (error: unknown) {
    return {
      tamam: false,
      eksikler: ["Şirket künyesi kontrolü"],
      kunye: null,
      personel: null,
      hata: error instanceof Error ? error.message : "Şirket künyesi kontrol edilemedi.",
    }
  }
}

export function sirketKunyesiGirisCikisKonumu(
  kunye: SirketKunye,
): SirketKunyeGirisCikisKonum | null {
  if (
    kunye.giris_cikis_lat === null ||
    kunye.giris_cikis_lat === undefined ||
    kunye.giris_cikis_lng === null ||
    kunye.giris_cikis_lng === undefined ||
    kunye.giris_cikis_mesafe_limiti === null ||
    kunye.giris_cikis_mesafe_limiti === undefined
  ) {
    return null
  }

  return {
    lat: kunye.giris_cikis_lat,
    lng: kunye.giris_cikis_lng,
    mesafeSiniri: kunye.giris_cikis_mesafe_limiti,
    kaynak: "şirket künyesi",
  }
}
