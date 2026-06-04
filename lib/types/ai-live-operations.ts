export type AiCanliOperasyonSeviye = "normal" | "uyari" | "riskli" | "kritik"

export type AiCanliOperasyonDurum =
  | "acik"
  | "bekliyor"
  | "inceleniyor"
  | "devam_ediyor"
  | "tamamlandi"
  | "gecikti"
  | "arsivlendi"
  | "iptal"

export type AiCanliOperasyonKpi = {
  aktifGorev: number
  sahadakiEkip: number
  riskliIs: number
  tamamlanan: number
}

export type AiCanliOperasyonKayit = {
  id: string
  kayit_tipi: string
  baslik: string
  aciklama: string | null
  durum: AiCanliOperasyonDurum
  seviye: AiCanliOperasyonSeviye
  personel_adi: string | null
  personel_kodu: string | null
  gorev_adresi: string | null
  planlanan_baslangic: string | null
  planlanan_bitis: string | null
  created_at: string | null
}

export type AiCanliOperasyonVeri = {
  kpi: AiCanliOperasyonKpi
  kayitlar: AiCanliOperasyonKayit[]
  uyarilar: string[]
}