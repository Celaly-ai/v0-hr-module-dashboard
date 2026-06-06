export type KonumAnalizKaydi = {
  id?: string | null
  enlem: number | string | null
  boylam: number | string | null
  hiz?: number | string | null
  dogruluk?: number | string | null
  created_at?: string | null
  kayit_zamani?: string | null
}

export type BeklemeNoktasi = {
  baslangic_zamani: string | null
  bitis_zamani: string | null
  sure_dakika: number
  enlem: number
  boylam: number
  kayit_sayisi: number
}

export type KonumAnalizSonucu = {
  toplam_kayit: number
  koordinatli_kayit: number
  toplam_mesafe_metre: number
  sure_dakika: number
  ortalama_hiz_kmh: number
  maksimum_hiz_ms: number
  bekleme_noktalari: BeklemeNoktasi[]
  toplam_bekleme_dakika: number
  en_uzun_bekleme_dakika: number
}

export function sayisalDeger(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function mesafeMetre(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function konumAnaliziHesapla(
  kayitlar: KonumAnalizKaydi[],
  beklemeMesafeMetre = 30,
  beklemeSureDakika = 10,
): KonumAnalizSonucu {
  const koordinatliKayitlar = kayitlar
    .map((k) => {
      const enlem = sayisalDeger(k.enlem)
      const boylam = sayisalDeger(k.boylam)
      const zamanMetni = k.created_at || k.kayit_zamani || null
      const zaman = zamanMetni ? new Date(zamanMetni).getTime() : NaN

      if (enlem === null || boylam === null || !Number.isFinite(zaman)) return null

      return {
        ...k,
        enlem,
        boylam,
        zaman,
        zamanMetni,
      }
    })
    .filter(Boolean) as Array<KonumAnalizKaydi & {
      enlem: number
      boylam: number
      zaman: number
      zamanMetni: string | null
    }>

  let toplamMesafe = 0

  for (let i = 1; i < koordinatliKayitlar.length; i++) {
    const onceki = koordinatliKayitlar[i - 1]
    const simdiki = koordinatliKayitlar[i]
    toplamMesafe += mesafeMetre(onceki.enlem, onceki.boylam, simdiki.enlem, simdiki.boylam)
  }

  const ilk = koordinatliKayitlar[0]
  const son = koordinatliKayitlar[koordinatliKayitlar.length - 1]

  const sureDakika =
    ilk && son ? Math.max(0, Math.floor((son.zaman - ilk.zaman) / 60000)) : 0

  const hizlar = kayitlar
    .map((k) => sayisalDeger(k.hiz))
    .filter((v): v is number => v !== null && v > 0)

  const maksimumHiz = hizlar.length ? Math.max(...hizlar) : 0
  const ortalamaHiz = sureDakika > 0 ? (toplamMesafe / 1000) / (sureDakika / 60) : 0

  const beklemeNoktalari: BeklemeNoktasi[] = []
  let grup: typeof koordinatliKayitlar = []

  for (const kayit of koordinatliKayitlar) {
    if (grup.length === 0) {
      grup = [kayit]
      continue
    }

    const merkez = grup[0]
    const uzaklik = mesafeMetre(merkez.enlem, merkez.boylam, kayit.enlem, kayit.boylam)

    if (uzaklik <= beklemeMesafeMetre) {
      grup.push(kayit)
    } else {
      const ilkGrup = grup[0]
      const sonGrup = grup[grup.length - 1]
      const sure = Math.floor((sonGrup.zaman - ilkGrup.zaman) / 60000)

      if (sure >= beklemeSureDakika) {
        beklemeNoktalari.push({
          baslangic_zamani: ilkGrup.zamanMetni,
          bitis_zamani: sonGrup.zamanMetni,
          sure_dakika: sure,
          enlem: ilkGrup.enlem,
          boylam: ilkGrup.boylam,
          kayit_sayisi: grup.length,
        })
      }

      grup = [kayit]
    }
  }

  if (grup.length > 0) {
    const ilkGrup = grup[0]
    const sonGrup = grup[grup.length - 1]
    const sure = Math.floor((sonGrup.zaman - ilkGrup.zaman) / 60000)

    if (sure >= beklemeSureDakika) {
      beklemeNoktalari.push({
        baslangic_zamani: ilkGrup.zamanMetni,
        bitis_zamani: sonGrup.zamanMetni,
        sure_dakika: sure,
        enlem: ilkGrup.enlem,
        boylam: ilkGrup.boylam,
        kayit_sayisi: grup.length,
      })
    }
  }

  const toplamBekleme = beklemeNoktalari.reduce((sum, item) => sum + item.sure_dakika, 0)
  const enUzunBekleme = beklemeNoktalari.length
    ? Math.max(...beklemeNoktalari.map((item) => item.sure_dakika))
    : 0

  return {
    toplam_kayit: kayitlar.length,
    koordinatli_kayit: koordinatliKayitlar.length,
    toplam_mesafe_metre: toplamMesafe,
    sure_dakika: sureDakika,
    ortalama_hiz_kmh: ortalamaHiz,
    maksimum_hiz_ms: maksimumHiz,
    bekleme_noktalari: beklemeNoktalari,
    toplam_bekleme_dakika: toplamBekleme,
    en_uzun_bekleme_dakika: enUzunBekleme,
  }
}
