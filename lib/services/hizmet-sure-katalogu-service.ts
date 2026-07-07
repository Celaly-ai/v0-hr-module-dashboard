export type HizmetSureKaydi = {
  id: string
  hizmet_kodu: string
  hizmet_adi: string
  is_tipi: string | null
  gerekli_yetenek: string | null
  referans_sure_dk: number
  zorluk_katsayisi: number | string | null
  aktif: boolean | null
  kaynak: string | null
  aciklama: string | null
  created_at?: string | null
  updated_at?: string | null
}

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

export function isTipindenKod(isTipi: string | null | undefined) {
  const t = String(isTipi ?? "").toUpperCase()
  const nakliye = t.includes("NAKLIYE") || t.includes("NAKLİYE")
  const montaj = t.includes("MONTAJ")
  if (nakliye && montaj) return "NM"
  if (nakliye) return "N"
  if (montaj) return "M"
  return null
}

export function katalogReferansSureBul(
  katalog: HizmetSureKaydi[],
  isTipi: string | null | undefined,
  gerekliYetenek?: string | null,
): HizmetSureKaydi | null {
  const aktifKayitlar = katalog.filter((k) => k.aktif !== false)
  const kod = isTipindenKod(isTipi)
  const yetenek = norm(gerekliYetenek)

  if (kod && yetenek) {
    const ozel = aktifKayitlar.find((k) => {
      const kYetenek = norm(k.gerekli_yetenek)
      return (
        norm(k.is_tipi) === norm(kod) &&
        kYetenek &&
        (yetenek.includes(kYetenek) || kYetenek.includes(yetenek))
      )
    })
    if (ozel) return ozel
  }

  if (kod) {
    const genel = aktifKayitlar.find(
      (k) => norm(k.is_tipi) === norm(kod) && !norm(k.gerekli_yetenek),
    )
    if (genel) return genel
  }

  return null
}

export function efektifReferansSureDk(
  havuzReferans: number | null | undefined,
  katalogKaydi: HizmetSureKaydi | null,
) {
  if (Number.isFinite(Number(havuzReferans)) && Number(havuzReferans) > 0) {
    return Number(havuzReferans)
  }
  if (katalogKaydi) {
    const katsayi = Number(katalogKaydi.zorluk_katsayisi ?? 1)
    return Math.round(Number(katalogKaydi.referans_sure_dk) * katsayi)
  }
  return 60
}

export const HIZMET_SURE_SELECT = `
  id,
  hizmet_kodu,
  hizmet_adi,
  is_tipi,
  gerekli_yetenek,
  referans_sure_dk,
  zorluk_katsayisi,
  aktif,
  kaynak,
  aciklama,
  created_at,
  updated_at
`
