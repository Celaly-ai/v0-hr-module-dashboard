import type { SupabaseClient } from "@supabase/supabase-js"
import {
  efektifReferansSureDk,
  HIZMET_SURE_SELECT,
  katalogReferansSureBul,
  type HizmetSureKaydi,
} from "@/lib/services/hizmet-sure-katalogu-service"
import type { EkipOneri, HavuzIs } from "@/lib/services/akilli-atama-merkezi-service"
import { mesafeMetre } from "@/lib/services/konum-analiz-service"
import { bugunGorevTarihiTr } from "@/lib/services/operasyon-tarih-service"

export type MotorIs = {
  id: string
  fis_no?: string | null
  ilce?: string | null
  mahalle?: string | null
  enlem?: number | string | null
  boylam?: number | string | null
  is_tipi?: string | null
  gerekli_yetenek?: string | null
  gerekli_arac_sinifi?: string | null
  kritik_cagri?: boolean | null
  referans_sure_dk?: number | null
  randevu_tarihi?: string | null
  zaman_slotu?: string | null
  acik_gun?: number | null
  toplam_is_zorluk_puani?: number | null
  basvuru_notu?: string | null
}

export type MotorEkipKapasite = {
  ekip_id: string
  ekip_adi: string
  ekip_gorev?: string | null
  bolge?: string | null
  kapasite_orani?: number | string | null
  ai_genel_durum_skoru?: number | string | null
  aktiflik_durumu?: string | null
  arac_varlik_id?: string | null
}

export type EkipGunlukOzet = {
  isSayisi: number
  planlananSureDk: number
  sonIlce: string | null
  sonMahalle: string | null
  sonEnlem: number | null
  sonBoylam: number | null
}

export type MotorKontekst = {
  ekipGunluk: Map<string, EkipGunlukOzet>
}

export type SkorParcasi = {
  kod: string
  etiket: string
  puan: number
}

export type MotorOneri = EkipOneri & {
  gerekce: string
  parcalar: SkorParcasi[]
}

export type OneriUretimSonucu = {
  islenen: number
  onerilen: number
  atlanan: number
  hatalar: string[]
}

const MESAI_LIMIT_DK = 510

function norm(v: string | null | undefined) {
  return String(v ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
}

function koordinat(is: MotorIs) {
  const enlem = Number(is.enlem)
  const boylam = Number(is.boylam)
  if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) return null
  if (enlem === 0 && boylam === 0) return null
  return { enlem, boylam }
}

function bugunTr() {
  return bugunGorevTarihiTr()
}

export function ekipJokerMi(ekip: Pick<MotorEkipKapasite, "ekip_adi" | "ekip_gorev">) {
  const metin = norm(`${ekip.ekip_adi ?? ""} ${ekip.ekip_gorev ?? ""}`)
  return metin.includes("joker")
}

export function jokerOnerisiGerekliMi(is: MotorIs | HavuzIs) {
  if (is.kritik_cagri) return true

  const acikGun = Number(is.acik_gun ?? 0)
  if (acikGun >= 5) return true

  const zorluk = Number(is.toplam_is_zorluk_puani ?? 0)
  if (zorluk >= 80) return true

  const not = norm(is.basvuru_notu)
  if (
    not.includes("acil") ||
    not.includes("joker") ||
    not.includes("yonetici") ||
    not.includes("yönetici")
  ) {
    return true
  }

  return false
}

export function jokerOneriGerekce(is: MotorIs | HavuzIs) {
  if (is.kritik_cagri) return "Kritik çağrı — joker ekip değerlendirin."
  const acikGun = Number(is.acik_gun ?? 0)
  if (acikGun >= 5) return `${acikGun} gündür açık — sistem tıkanıklığı riski.`
  const zorluk = Number(is.toplam_is_zorluk_puani ?? 0)
  if (zorluk >= 80) return "Yüksek zorluk puanı — joker ekip uygun olabilir."
  const not = norm(is.basvuru_notu)
  if (not.includes("acil") || not.includes("joker")) {
    return "Operasyon notunda acil/joker işaretlemesi var."
  }
  if (not.includes("yonetici")) {
    return "Operasyon notunda yönetici talebi işaretlemesi var."
  }
  return "Joker ekip manuel olarak atanabilir."
}

function ekipGorevUygunMu(ekipGorev: string | null | undefined, gerekliYetenek: string | null | undefined) {
  const g = norm(ekipGorev)
  const y = norm(gerekliYetenek)

  if (y.includes("klima")) {
    return g.includes("klima") || g.includes("nakliye") || g.includes("montaj")
  }

  if (y.includes("beyaz") || y.includes("tv") || y.includes("nakliye")) {
    return g.includes("nakliye") || g.includes("montaj")
  }

  return true
}

function isTipiUyumu(isTipi: string | null | undefined, ekipGorev: string | null | undefined) {
  const tip = norm(isTipi)
  const gorev = norm(ekipGorev)
  if (!tip || !gorev) return 5

  const nakliye = tip.includes("nakliye")
  const montaj = tip.includes("montaj")

  if (nakliye && montaj) {
    return gorev.includes("nakliye") || gorev.includes("montaj") ? 10 : 0
  }
  if (nakliye) return gorev.includes("nakliye") ? 10 : 3
  if (montaj) return gorev.includes("montaj") ? 10 : 3
  return 5
}

function bolgeSkoru(isBolge: string | null | undefined, ekipBolge: string | null | undefined) {
  const i = norm(isBolge)
  const e = norm(ekipBolge)
  if (!i || !e) return { puan: 4, etiket: "Bölge bilgisi kısmi" }
  if (e === "genel") return { puan: 8, etiket: "Genel bölge ekip" }
  if (i === e) return { puan: 12, etiket: "İlçe tam eşleşme" }
  if (i.includes(e) || e.includes(i)) return { puan: 8, etiket: "Bölge kısmi eşleşme" }
  return { puan: 2, etiket: "Bölge uzak" }
}

function mahalleYakinlikPuani(
  is: MotorIs,
  ekip: MotorEkipKapasite,
  gunluk?: EkipGunlukOzet,
) {
  const isMahalle = norm(is.mahalle)
  const ekipMahalle = norm(gunluk?.sonMahalle)
  const ekipIlce = norm(gunluk?.sonIlce ?? ekip.bolge)

  if (isMahalle && ekipMahalle && isMahalle === ekipMahalle) {
    return { puan: 12, etiket: "Mahalle yakın (bugünkü rota)" }
  }

  const isIlce = norm(is.ilce)
  if (isIlce && ekipIlce && isIlce === ekipIlce) {
    return { puan: 6, etiket: "İlçe yakınlığı" }
  }

  return { puan: 0, etiket: "Mahalle/ilçe uzak" }
}

function mesafePuani(is: MotorIs, gunluk?: EkipGunlukOzet) {
  const hedef = koordinat(is)
  if (!hedef || gunluk?.sonEnlem == null || gunluk?.sonBoylam == null) {
    return { zaman: 0, yakit: 0, etiket: null as string | null }
  }

  const metre = mesafeMetre(
    hedef.enlem,
    hedef.boylam,
    gunluk.sonEnlem,
    gunluk.sonBoylam,
  )

  if (metre <= 3000) {
    return { zaman: 10, yakit: 8, etiket: `Mesafe ~${Math.round(metre / 1000)} km (yakın)` }
  }
  if (metre <= 8000) {
    return { zaman: 6, yakit: 5, etiket: `Mesafe ~${Math.round(metre / 1000)} km (orta)` }
  }
  if (metre <= 15000) {
    return { zaman: 3, yakit: 2, etiket: `Mesafe ~${Math.round(metre / 1000)} km` }
  }
  return { zaman: 0, yakit: 0, etiket: `Mesafe ~${Math.round(metre / 1000)} km (uzak)` }
}

function mesaiPuani(is: MotorIs, gunluk?: EkipGunlukOzet) {
  const ekSure = Number(is.referans_sure_dk ?? 60)
  const mevcut = gunluk?.planlananSureDk ?? 0
  const toplam = mevcut + ekSure

  if (toplam <= MESAI_LIMIT_DK - 60) {
    return { puan: 10, etiket: "Mesai içi uygun" }
  }
  if (toplam <= MESAI_LIMIT_DK) {
    return { puan: 5, etiket: "Mesai sınırına yakın" }
  }
  return { puan: -15, etiket: "Mesai aşımı riski" }
}

function gerekceMetni(parcalar: SkorParcasi[]) {
  return (
    parcalar
      .filter((p) => p.puan !== 0)
      .map((p) => `${p.etiket} (${p.puan > 0 ? "+" : ""}${p.puan})`)
      .join(" · ") || "Görev uyumuna göre önerildi."
  )
}

export function skorHesaplaDetayli(
  is: MotorIs,
  ekip: MotorEkipKapasite,
  kontekst?: MotorKontekst,
): MotorOneri | null {
  if (!ekipGorevUygunMu(ekip.ekip_gorev, is.gerekli_yetenek)) {
    return null
  }

  const gunluk = kontekst?.ekipGunluk.get(ekip.ekip_id)
  const parcalar: SkorParcasi[] = []
  let skor = 0

  const gorevPuani = 25 + isTipiUyumu(is.is_tipi, ekip.ekip_gorev)
  parcalar.push({ kod: "gorev_uyumu", etiket: "Görev uyumu", puan: gorevPuani })
  skor += gorevPuani

  const mahalle = mahalleYakinlikPuani(is, ekip, gunluk)
  if (mahalle.puan > 0) {
    parcalar.push({ kod: "zaman_mahalle", etiket: mahalle.etiket, puan: mahalle.puan })
    skor += mahalle.puan
  }

  const mesafe = mesafePuani(is, gunluk)
  if (mesafe.zaman > 0) {
    parcalar.push({
      kod: "zaman_mesafe",
      etiket: mesafe.etiket ?? "Mesafe avantajı",
      puan: mesafe.zaman,
    })
    skor += mesafe.zaman
  }
  if (mesafe.yakit > 0) {
    parcalar.push({
      kod: "yakit",
      etiket: "Yakıt/mesafe",
      puan: mesafe.yakit,
    })
    skor += mesafe.yakit
  }

  const kapasite = Number(ekip.kapasite_orani ?? 0)
  const kapasitePuani = Math.max(0, 20 - Math.round(kapasite * 0.8))
  parcalar.push({
    kod: "is_yuku",
    etiket: "Adil iş yükü",
    puan: kapasitePuani,
  })
  skor += kapasitePuani

  const mesai = mesaiPuani(is, gunluk)
  parcalar.push({ kod: "mesai", etiket: mesai.etiket, puan: mesai.puan })
  skor += mesai.puan

  const bolge = bolgeSkoru(is.ilce, ekip.bolge)
  parcalar.push({
    kod: "bolge",
    etiket: bolge.etiket,
    puan: bolge.puan,
  })
  skor += bolge.puan

  const aiPuani = Math.min(5, Number(ekip.ai_genel_durum_skoru ?? 0) / 20)
  if (aiPuani > 0) {
    parcalar.push({ kod: "ai_durum", etiket: "Ekip durum skoru", puan: aiPuani })
    skor += aiPuani
  }

  if (norm(ekip.aktiflik_durumu) === "musait") {
    parcalar.push({ kod: "musaitlik", etiket: "Müsait ekip", puan: 3 })
    skor += 3
  }

  if (is.gerekli_arac_sinifi === "BUYUK" && !ekip.arac_varlik_id) {
    parcalar.push({ kod: "arac_ceza", etiket: "Büyük araç eksik", puan: -30 })
    skor -= 30
  }

  if (is.kritik_cagri) {
    parcalar.push({ kod: "kritik", etiket: "Kritik çağrı önceliği", puan: 5 })
    skor += 5
  }

  const yuvarlak = Math.max(0, Math.round(skor))

  return {
    ekip_id: ekip.ekip_id,
    ekip_adi: ekip.ekip_adi,
    skor: yuvarlak,
    sira: 0,
    gerekce: gerekceMetni(parcalar),
    parcalar,
  }
}

export function top3OneriUret(
  is: MotorIs,
  ekipler: MotorEkipKapasite[],
  kontekst?: MotorKontekst,
): MotorOneri[] {
  const jokerGerekli = jokerOnerisiGerekliMi(is)

  const adaylar = ekipler
    .filter((ekip) => jokerGerekli || !ekipJokerMi(ekip))
    .map((ekip) => skorHesaplaDetayli(is, ekip, kontekst))
    .filter((x): x is MotorOneri => x !== null && x.skor > 0)
    .sort((a, b) => b.skor - a.skor)

  const benzersiz: MotorOneri[] = []
  const gorulen = new Set<string>()

  for (const aday of adaylar) {
    if (gorulen.has(aday.ekip_id)) continue
    gorulen.add(aday.ekip_id)
    benzersiz.push({ ...aday, sira: benzersiz.length + 1 })
    if (benzersiz.length >= 3) break
  }

  return benzersiz
}

export function havuzOneriGuncellemePayload(oneriler: MotorOneri[]) {
  const bir = oneriler[0]
  const iki = oneriler[1]
  const uc = oneriler[2]

  return {
    ai_oneri_1_ekip_id: bir?.ekip_id ?? null,
    ai_oneri_1_ekip_adi: bir?.ekip_adi ?? null,
    ai_oneri_1_skor: bir?.skor ?? null,
    ai_oneri_2_ekip_id: iki?.ekip_id ?? null,
    ai_oneri_2_ekip_adi: iki?.ekip_adi ?? null,
    ai_oneri_2_skor: iki?.skor ?? null,
    ai_oneri_3_ekip_id: uc?.ekip_id ?? null,
    ai_oneri_3_ekip_adi: uc?.ekip_adi ?? null,
    ai_oneri_3_skor: uc?.skor ?? null,
    ai_onerilen_ekip: bir?.ekip_id ?? null,
    ai_onerilen_ekip_adi: bir?.ekip_adi ?? null,
    ai_atama_skoru: bir?.skor ?? null,
    updated_at: new Date().toISOString(),
  }
}

export function motorIsAlani(is: HavuzIs): MotorIs {
  return {
    id: is.id,
    fis_no: is.fis_no,
    ilce: is.ilce,
    mahalle: is.mahalle,
    enlem: is.enlem,
    boylam: is.boylam,
    is_tipi: is.is_tipi,
    gerekli_yetenek: is.gerekli_yetenek,
    gerekli_arac_sinifi: is.gerekli_arac_sinifi,
    kritik_cagri: is.kritik_cagri,
    referans_sure_dk: is.referans_sure_dk,
    randevu_tarihi: is.randevu_tarihi,
    zaman_slotu: is.zaman_slotu,
    acik_gun: is.acik_gun,
    toplam_is_zorluk_puani: is.toplam_is_zorluk_puani,
    basvuru_notu: is.basvuru_notu,
  }
}

const MOTOR_IS_SELECT = `
  id,
  fis_no,
  ilce,
  mahalle,
  enlem,
  boylam,
  is_tipi,
  gerekli_yetenek,
  gerekli_arac_sinifi,
  kritik_cagri,
  referans_sure_dk,
  randevu_tarihi,
  zaman_slotu,
  acik_gun,
  toplam_is_zorluk_puani,
  basvuru_notu,
  kaynak,
  atama_gerekli
`

async function motorKontekstYukle(supabase: SupabaseClient): Promise<MotorKontekst> {
  const ekipGunluk = new Map<string, EkipGunlukOzet>()
  const tarih = bugunTr()

  const { data: zimmetler } = await supabase
    .from("operasyon_zimmetleri")
    .select("ekip_id, operasyon_id, ilce, mahalle, rota_sirasi")
    .eq("gorev_tarihi", tarih)
    .order("rota_sirasi", { ascending: true })

  const operasyonIdler = Array.from(
    new Set((zimmetler ?? []).map((z) => z.operasyon_id).filter(Boolean)),
  ) as string[]

  const koordinatMap = new Map<string, { enlem: number; boylam: number; sure: number }>()

  if (operasyonIdler.length > 0) {
    const { data: operasyonlar } = await supabase
      .from("aktif_operasyon_havuzu_v2")
      .select("id, enlem, boylam, referans_sure_dk")
      .in("id", operasyonIdler)

    for (const op of operasyonlar ?? []) {
      const enlem = Number(op.enlem)
      const boylam = Number(op.boylam)
      if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) continue
      koordinatMap.set(op.id, {
        enlem,
        boylam,
        sure: Number(op.referans_sure_dk ?? 60),
      })
    }
  }

  for (const zimmet of zimmetler ?? []) {
    if (!zimmet.ekip_id) continue

    const mevcut = ekipGunluk.get(zimmet.ekip_id) ?? {
      isSayisi: 0,
      planlananSureDk: 0,
      sonIlce: null,
      sonMahalle: null,
      sonEnlem: null,
      sonBoylam: null,
    }

    mevcut.isSayisi += 1
    const opKoord = zimmet.operasyon_id
      ? koordinatMap.get(zimmet.operasyon_id)
      : undefined
    if (opKoord) {
      mevcut.planlananSureDk += opKoord.sure
      mevcut.sonEnlem = opKoord.enlem
      mevcut.sonBoylam = opKoord.boylam
    }

    mevcut.sonIlce = zimmet.ilce ?? mevcut.sonIlce
    mevcut.sonMahalle = zimmet.mahalle ?? mevcut.sonMahalle
    ekipGunluk.set(zimmet.ekip_id, mevcut)
  }

  return { ekipGunluk }
}

export async function havuzAtamaOnerileriniUret(
  supabase: SupabaseClient,
  options?: { yalnizAron?: boolean; operasyonId?: string },
): Promise<OneriUretimSonucu> {
  const yalnizAron = options?.yalnizAron ?? true
  const sonuc: OneriUretimSonucu = {
    islenen: 0,
    onerilen: 0,
    atlanan: 0,
    hatalar: [],
  }

  let isQuery = supabase
    .from("aktif_operasyon_havuzu_v2")
    .select(MOTOR_IS_SELECT)
    .eq("atama_gerekli", true)
    .is("kesin_atanan_ekip_id", null)
    .or("operasyon_disina_alindi.is.null,operasyon_disina_alindi.eq.false")

  if (options?.operasyonId) {
    isQuery = isQuery.eq("id", options.operasyonId)
  }

  const { data: isler, error: isError } = await isQuery

  if (isError) {
    sonuc.hatalar.push(isError.message)
    return sonuc
  }

  const { data: ekipler, error: ekipError } = await supabase
    .from("ai_ekip_kapasite")
    .select(
      "ekip_id, ekip_adi, ekip_gorev, bolge, kapasite_orani, ai_genel_durum_skoru, aktiflik_durumu, arac_varlik_id",
    )
    .eq("aktiflik_durumu", "musait")

  if (ekipError) {
    sonuc.hatalar.push(ekipError.message)
    return sonuc
  }

  const kapasiteEkipler = (ekipler ?? []) as MotorEkipKapasite[]
  const kontekst = await motorKontekstYukle(supabase)

  const { data: katalogHam } = await supabase
    .from("hizmet_sure_katalogu")
    .select(HIZMET_SURE_SELECT)
    .eq("aktif", true)

  const katalog = (katalogHam ?? []) as HizmetSureKaydi[]

  for (const ham of isler ?? []) {
    const hamIs = ham as MotorIs & { kaynak?: string | null; atama_gerekli?: boolean | null }
    const katalogKaydi = katalogReferansSureBul(
      katalog,
      hamIs.is_tipi,
      hamIs.gerekli_yetenek,
    )
    const is: MotorIs = {
      ...hamIs,
      referans_sure_dk: efektifReferansSureDk(hamIs.referans_sure_dk, katalogKaydi),
    }
    sonuc.islenen += 1

    if (yalnizAron) {
      const kaynak = norm(hamIs.kaynak as string | null)
      if (kaynak && kaynak !== "aron") {
        sonuc.atlanan += 1
        continue
      }
    }

    const oneriler = top3OneriUret(is, kapasiteEkipler, kontekst)
    if (oneriler.length === 0) {
      sonuc.atlanan += 1
      continue
    }

    const payload = havuzOneriGuncellemePayload(oneriler)
    const { error: updateError } = await supabase
      .from("aktif_operasyon_havuzu_v2")
      .update(payload)
      .eq("id", is.id)

    if (updateError) {
      sonuc.hatalar.push(`${is.fis_no ?? is.id}: ${updateError.message}`)
      continue
    }

    sonuc.onerilen += 1
  }

  return sonuc
}

export function detayliOneriGerekce(is: HavuzIs, oneri: EkipOneri | undefined) {
  if (!oneri) return "Henüz ekip önerisi üretilmedi."

  const parcalar = [
    `Skor: ${oneri.skor}`,
    is.ilce ? `İlçe: ${is.ilce}` : null,
    is.mahalle ? `Mahalle: ${is.mahalle}` : null,
    is.kritik_cagri ? "Kritik çağrı önceliği" : null,
    is.referans_sure_dk ? `Ref. süre: ${is.referans_sure_dk} dk` : null,
    is.gerekli_yetenek ? `Yetenek: ${is.gerekli_yetenek}` : null,
    Number(is.acik_gun ?? 0) > 0 ? `Açık gün: ${is.acik_gun}` : null,
  ].filter(Boolean)

  return parcalar.join(" · ") || "Görev uyumu ve kapasiteye göre önerildi."
}
