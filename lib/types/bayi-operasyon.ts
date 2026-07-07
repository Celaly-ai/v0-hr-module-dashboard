export type BayiTalepTuru =
  | "montaj"
  | "ariza"
  | "acil"
  | "tekrar_servis"
  | "randevu_sorgu"
  | "randevu_degisiklik"
  | "adres_guncelle"
  | "telefon_guncelle"
  | "musteri_bilgi"
  | "sikayet"

export type BayiTalepDurum =
  | "alindi"
  | "inceleniyor"
  | "planlandi"
  | "atandi"
  | "yolda"
  | "tamamlandi"
  | "ulasilamadi"
  | "kapandi"
  | "iptal"

export type BayiTalepOncelik = "normal" | "acil" | "kritik"

export type BayiSorumluDepartman =
  | "operasyon"
  | "depo"
  | "muhasebe"
  | "teknik_destek"
  | "yonetici"
  | "bayi_iliskileri"

export type BayiKart = {
  id: string
  sirket_id: string
  bayi_cari_id: string | null
  bayi_adi: string
  yetkili_kisi: string | null
  telefon: string | null
  whatsapp: string | null
  email: string | null
  magaza_adresi: string | null
  depo_adresi: string | null
  son_ziyaret_tarihi: string | null
  son_gorusme_tarihi: string | null
  son_sikayet: string | null
  son_tesekkur: string | null
  sadakat_skoru: number | null
  risk_skoru: number | null
  risk_seviyesi: string | null
  aylik_is_hacmi: number | null
  performans_puani: number | null
  karlilik_skoru?: number | null
  risk_analiz_json?: Record<string, unknown> | null
  durum: string | null
  created_at: string | null
}

export type BayiTalep = {
  id: string
  sirket_id: string
  bayi_kart_id: string | null
  bayi_cari_id: string | null
  talep_no: string | null
  talep_turu: BayiTalepTuru
  durum: BayiTalepDurum
  oncelik: BayiTalepOncelik
  musteri_adi: string | null
  telefon: string | null
  alternatif_telefon: string | null
  adres: string | null
  il: string | null
  ilce: string | null
  mahalle: string | null
  urun_turu: string | null
  model: string | null
  seri_no: string | null
  satis_tarihi: string | null
  aciklama: string | null
  personel_notu: string | null
  ai_analiz_json: Record<string, unknown> | null
  ai_guven_skoru: number | null
  sorumlu_departman: BayiSorumluDepartman | null
  sla_hedef_dk: number | null
  sla_asildi_mi: boolean | null
  kaynak: string | null
  olusturan_kisi: string | null
  olusturan_personel_id: string | null
  operasyon_fis_no?: string | null
  operasyon_aktarildi_mi?: boolean | null
  operasyon_aktarim_tarihi?: string | null
  ilgili_is_emri_id?: string | null
  created_at: string | null
  updated_at: string | null
}

export type BayiOperasyonDashboard = {
  bekleyenMontaj: number
  bekleyenAriza: number
  bugunkuRandevu: number
  gecikenIs: number
  tamamlananIs: number
  acilTalep: number
  ulasilamayanIs: number
  tekrarServis: number
  acikTalep: number
  bayiSayisi: number
  ortalamaPerformans: number | null
  ortalamaRisk: number | null
  sonTalepler: BayiTalep[]
}

export type BayiTalepMesaj = {
  id: string
  sirket_id: string
  bayi_talep_id: string
  gonderen_tip: BayiMesajGonderenTip
  gonderen_ad: string | null
  gonderen_personel_id: string | null
  mesaj_icerik: string
  ai_analiz_json: Record<string, unknown> | null
  created_at: string | null
}

export type BayiMesajGonderenTip = "bayi" | "personel" | "sistem" | "ai"

export type CreateBayiTalepMesajInput = {
  mesaj_icerik: string
  gonderen_tip?: BayiMesajGonderenTip
}

export type BayiMesajMerkeziOzet = {
  talep: BayiTalep
  son_mesaj: BayiTalepMesaj | null
  mesaj_sayisi: number
}

export type CreateBayiTalepInput = {
  talep_turu: BayiTalepTuru
  bayi_kart_id?: string | null
  musteri_adi?: string
  telefon?: string
  alternatif_telefon?: string
  adres?: string
  il?: string
  ilce?: string
  mahalle?: string
  urun_turu?: string
  model?: string
  seri_no?: string
  satis_tarihi?: string
  aciklama?: string
  personel_notu?: string
  ai_analiz_json?: Record<string, unknown> | null
  ai_guven_skoru?: number | null
}

export type BayiGorselOcrAlanlari = {
  musteri_adi: string | null
  telefon: string | null
  alternatif_telefon: string | null
  adres: string | null
  il: string | null
  ilce: string | null
  mahalle: string | null
  urun_turu: string | null
  model: string | null
  seri_no: string | null
  satis_tarihi: string | null
  aciklama: string | null
}

export type BayiGorselAnalizSonuc = {
  mode: "ai" | "stub"
  alanlar: BayiGorselOcrAlanlari
  guven_skoru: number
  ham_metin?: string | null
  mesaj?: string | null
}

export type BayiTalepBelge = {
  id: string
  sirket_id: string
  bayi_talep_id: string
  storage_bucket: string
  storage_path: string
  public_url: string | null
  dosya_adi: string | null
  mime_type: string | null
  ocr_json: Record<string, unknown> | null
  created_at: string | null
}

export type BayiTalepFiltre = {
  durum?: string
  talep_turu?: string
  oncelik?: string
  arama?: string
  bayi_kart_id?: string
  sorumlu_departman?: string
}

export type CreateBayiKartInput = {
  bayi_adi: string
  yetkili_kisi?: string
  telefon?: string
  whatsapp?: string
  email?: string
  magaza_adresi?: string
  depo_adresi?: string
}

export type BayiYonetimPaneli = {
  acikTalep: number
  slaAsildi: number
  acilBekleyen: number
  operasyonBekleyen: number
  operasyonAktarilmamis: number
  sikayetBekleyen: number
  kritikBayi: number
  okunmamisSlaUyari: number
  talepler: BayiTalep[]
}

export type BayiKartOzet = BayiKart & {
  acik_talep: number
  tamamlanan_talep: number
  sikayet_sayisi: number
}

export type BayiOperasyonAktarimDurum = "bekliyor" | "aktarildi" | "hata"

export type BayiTalepOperasyonBekleyen = {
  id: string
  sirket_id: string
  bayi_talep_id: string
  fis_no: string
  havuz_payload: Record<string, unknown>
  durum: BayiOperasyonAktarimDurum
  operasyon_havuzu_id: string | null
  hata_mesaji: string | null
  aktaran_personel_id: string | null
  created_at: string | null
  updated_at: string | null
}

export type BayiSlaUyariTipi = "sla_asildi" | "acil_bekleyen" | "kritik_bayi"

export type BayiSlaUyari = {
  id: string
  sirket_id: string
  bayi_talep_id: string
  uyari_tipi: BayiSlaUyariTipi
  mesaj: string
  okundu_mi: boolean
  created_at: string | null
}

export type BayiSlaUyariOzet = BayiSlaUyari & {
  talep: Pick<BayiTalep, "id" | "talep_no" | "musteri_adi" | "talep_turu" | "durum" | "telefon">
}

export type BayiOperasyonAktarimSonuc = {
  bekleyen: BayiTalepOperasyonBekleyen
  havuz_id: string | null
  havuz_hatasi: string | null
}

export type BayiCariOzet = {
  id: string
  cari_adi: string
  telefon: string | null
  email: string | null
  adres: string | null
  zaten_bagli: boolean
}

export type WhatsAppTalepStubInput = {
  mesaj: string
  telefon?: string
  bayi_adi?: string
  gonderen_ad?: string
  sirket_id?: string
  bayi_kart_id?: string
  meta_message_id?: string
}

export type BayiAiYanitOneri = {
  mode: "ai" | "stub"
  ozet: string
  oneriler: string[]
  oncelikli_aksiyon: string | null
  guven_skoru: number
}

export type BayiZiyaretAiPlan = {
  mode: "ai" | "stub"
  ozet: string
  oncelik: "dusuk" | "orta" | "yuksek"
  sorular: string[]
  aksiyonlar: string[]
  guven_skoru: number
}

export type BilgilendirmeIslemSonuc = {
  whatsapp_mod: "stub" | "meta"
  sms_saglayici: "stub" | "netgsm" | "iletimerkezi" | "twilio"
  kanal_tercihi: "auto" | "whatsapp" | "sms"
  kontrol_edilen: number
  gonderildi: number
  hata: number
  detaylar: Array<{
    id: string
    durum: "gonderildi" | "hata"
    kanal?: string
    dis_ref?: string | null
    hata?: string
  }>
}

export type BayiZiyaretTipi = "saha" | "telefon" | "magaza" | "online"

export type BayiZiyaret = {
  id: string
  sirket_id: string
  bayi_kart_id: string
  ziyaret_tarihi: string
  ziyaret_tipi: BayiZiyaretTipi
  personel_id: string | null
  personel_adi: string | null
  notlar: string | null
  aksiyonlar: Record<string, unknown> | null
  created_at: string | null
}

export type CreateBayiZiyaretInput = {
  bayi_kart_id: string
  ziyaret_tarihi?: string
  ziyaret_tipi?: BayiZiyaretTipi
  notlar?: string
}

export type BayiZiyaretMerkeziOzet = {
  ziyaret_bekleyen: number
  bu_ay_ziyaret: number
  son_ziyaretler: (BayiZiyaret & { bayi_adi: string | null })[]
  ziyaret_bekleyen_bayiler: Pick<BayiKart, "id" | "bayi_adi" | "son_ziyaret_tarihi" | "risk_seviyesi">[]
}

export type BayiBilgilendirmeKanal = "portal" | "whatsapp" | "sms"

export type BayiBilgilendirmeDurum = "bekliyor" | "gonderildi" | "hata" | "iptal"

export type BayiBilgilendirme = {
  id: string
  sirket_id: string
  bayi_talep_id: string | null
  bayi_kart_id: string | null
  kanal: BayiBilgilendirmeKanal
  alici: string | null
  mesaj: string
  durum: BayiBilgilendirmeDurum
  hata_mesaji: string | null
  dis_ref: string | null
  created_at: string | null
  gonderim_tarihi: string | null
}

export type BayiBilgilendirmeOzet = BayiBilgilendirme & {
  talep_no: string | null
  musteri_adi: string | null
}

export type BayiOperasyonSenkronSonuc = {
  kontrol_edilen: number
  guncellenen: number
  detaylar: { talep_id: string; eski_durum: string; yeni_durum: string; fis_no: string }[]
}
