export type SirketKunyeKaynak = "sirketler"

export type SirketKunye = {
  id: string
  sirket_id?: string | null
  ad?: string | null
  unvan?: string | null
  il?: string | null
  ilce?: string | null
  acik_adres?: string | null
  adres?: string | null
  giris_cikis_lat?: number | null
  giris_cikis_lng?: number | null
  giris_cikis_mesafe_limiti?: number | null
  standart_mesai_baslangic?: string | null
  standart_mesai_bitis?: string | null
  kunye_tamamlandi?: boolean | null
  kaynak: SirketKunyeKaynak
}

export type SirketKunyePersonel = {
  id: string
  sirket_id: string | null
  ad: string | null
  soyad: string | null
  rol: string | null
}

export type SirketKunyeKontrolTamam = {
  tamam: true
  kunye: SirketKunye
  personel: SirketKunyePersonel
}

export type SirketKunyeKontrolEksik = {
  tamam: false
  eksikler: string[]
  kunye: SirketKunye | null
  personel: SirketKunyePersonel | null
  hata?: string
}

export type SirketKunyeKontrolSonuc = SirketKunyeKontrolTamam | SirketKunyeKontrolEksik

export type SirketKunyeGirisCikisKonum = {
  lat: number
  lng: number
  mesafeSiniri: number
  kaynak: "şirket künyesi"
}

/** Yalnızca hata ekranı gösterimi için; gerçek işlemde kullanılmaz. */
export const KUNYE_FALLBACK_MESAFE_LIMITI_METRE = 50
