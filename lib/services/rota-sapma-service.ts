import {
  konumAnaliziHesapla,
  mesafeMetre,
  sayisalDeger,
  type KonumAnalizKaydi,
} from "@/lib/services/konum-analiz-service"

export type GorevLokasyonu = {
  enlem: number | string | null
  boylam: number | string | null
  tolerans_metre?: number | null
}

export type RotaSapmaRiski = {
  risk_var: boolean
  seviye: "yok" | "dusuk" | "orta" | "yuksek" | "kritik"
  baslik: string
  aciklama: string
  gorev_disinda_bekleme_dakika: number
  en_uzun_gorev_disi_bekleme_dakika: number
  gorev_lokasyonuna_uzaklik_metre: number | null
  riskli_bekleme_sayisi: number
}

export function rotaSapmaAnaliziHesapla(
  kayitlar: KonumAnalizKaydi[],
  gorevLokasyonu: GorevLokasyonu | null,
  toleransMetre = 100,
  beklemeSureDakika = 10,
): RotaSapmaRiski {
  const gorevEnlem = sayisalDeger(gorevLokasyonu?.enlem)
  const gorevBoylam = sayisalDeger(gorevLokasyonu?.boylam)

  if (gorevEnlem === null || gorevBoylam === null) {
    return {
      risk_var: false,
      seviye: "yok",
      baslik: "Görev lokasyonu yok",
      aciklama: "Görev adresi koordinatı olmadığı için rota sapma analizi yapılamadı.",
      gorev_disinda_bekleme_dakika: 0,
      en_uzun_gorev_disi_bekleme_dakika: 0,
      gorev_lokasyonuna_uzaklik_metre: null,
      riskli_bekleme_sayisi: 0,
    }
  }

  const etkinTolerans = gorevLokasyonu?.tolerans_metre || toleransMetre

  const analiz = konumAnaliziHesapla(kayitlar, 30, beklemeSureDakika)

  const riskliBeklemeler = analiz.bekleme_noktalari
    .map((b) => {
      const uzaklik = mesafeMetre(gorevEnlem, gorevBoylam, b.enlem, b.boylam)
      return {
        ...b,
        gorev_uzaklik_metre: uzaklik,
      }
    })
    .filter((b) => b.gorev_uzaklik_metre > etkinTolerans)

  const toplamGorevDisiBekleme = riskliBeklemeler.reduce(
    (sum, item) => sum + item.sure_dakika,
    0,
  )

  const enUzunGorevDisiBekleme = riskliBeklemeler.length
    ? Math.max(...riskliBeklemeler.map((item) => item.sure_dakika))
    : 0

  const sonKayit = [...kayitlar]
    .reverse()
    .map((k) => {
      const enlem = sayisalDeger(k.enlem)
      const boylam = sayisalDeger(k.boylam)
      if (enlem === null || boylam === null) return null
      return { enlem, boylam }
    })
    .find(Boolean)

  const sonUzaklik = sonKayit
    ? mesafeMetre(gorevEnlem, gorevBoylam, sonKayit.enlem, sonKayit.boylam)
    : null

  if (riskliBeklemeler.length === 0) {
    return {
      risk_var: false,
      seviye: "yok",
      baslik: "Rota sapma riski yok",
      aciklama: "Görev lokasyonu dışında kritik bekleme tespit edilmedi.",
      gorev_disinda_bekleme_dakika: 0,
      en_uzun_gorev_disi_bekleme_dakika: 0,
      gorev_lokasyonuna_uzaklik_metre: sonUzaklik,
      riskli_bekleme_sayisi: 0,
    }
  }

  let seviye: RotaSapmaRiski["seviye"] = "orta"

  if (toplamGorevDisiBekleme >= 30 || enUzunGorevDisiBekleme >= 20) {
    seviye = "kritik"
  } else if (toplamGorevDisiBekleme >= 20 || enUzunGorevDisiBekleme >= 15) {
    seviye = "yuksek"
  } else if (toplamGorevDisiBekleme >= 10) {
    seviye = "orta"
  } else {
    seviye = "dusuk"
  }

  return {
    risk_var: true,
    seviye,
    baslik: "Görev dışı bekleme tespit edildi",
    aciklama: `${riskliBeklemeler.length} noktada görev lokasyonunun ${Math.round(
      etkinTolerans,
    )} metre dışında bekleme tespit edildi.`,
    gorev_disinda_bekleme_dakika: toplamGorevDisiBekleme,
    en_uzun_gorev_disi_bekleme_dakika: enUzunGorevDisiBekleme,
    gorev_lokasyonuna_uzaklik_metre: sonUzaklik,
    riskli_bekleme_sayisi: riskliBeklemeler.length,
  }
}
