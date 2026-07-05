export type KymBelgeDurumu =
  | "yok"
  | "yuklendi_incelemede"
  | "dogrulandi_guncel"
  | "suresi_yaklasiyor"
  | "yanlis_belge"
  | "eksik_bilgi_var"
  | "suresi_doldu"
  | "manuel_inceleme_gerekli"
  | "basvuru_yapildi"
  | "uygulanmiyor"

export type KymGorevDurumu =
  | "bekliyor"
  | "devam_ediyor"
  | "tamamlandi"
  | "iptal"

export type KymOncelik = "P1" | "P2" | "P3" | "P4" | "P5"

export type KymBelgeDogrulamaKaynak =
  | "ai"
  | "manuel"
  | "sistem"

export type KymBelgeDogrulamaSonucu =
  | "dogrulandi"
  | "eksik"
  | "gecersiz"
  | "inceleme_gerekli"

export type KymIsletme = {
  id: string
  isletme_adi: string
  vergi_no?: string | null
  sehir?: string | null
  ilce?: string | null
  sirket_turu?: string | null
  faaliyet_alani?: string | null
  personel_sayisi?: number | null
  arac_sayisi?: number | null
  depo_var_mi?: boolean | null
  yetkili_servis_mi?: boolean | null
  aktif?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type KymModul = {
  id: string
  kod: string
  ad: string
  aciklama?: string | null
  sira?: number | null
  aktif?: boolean | null
  created_at?: string | null
}

export type KymYukumluluk = {
  id: string
  modul_id?: string | null
  kod: string
  baslik: string
  kategori: string
  alt_kategori?: string | null
  yukumluluk_tipi?: string | null
  hukuki_dayanak?: string | null
  denetleyen_kurum?: string | null
  aciklama?: string | null
  risk_puani: number
  oncelik: KymOncelik | string
  aktif?: boolean | null
  created_at?: string | null
}

export type KymBelgeTanim = {
  id: string
  yukumluluk_id?: string | null
  kod: string
  ad: string
  kategori: string
  alt_kategori?: string | null
  basvuru_yeri?: string | null
  yenileme_periyodu?: string | null
  aciklama?: string | null
  aktif?: boolean | null
  created_at?: string | null
}

export type KymIsletmeBelgesi = {
  id: string
  isletme_id: string
  belge_tanim_id: string
  durum: KymBelgeDurumu
  mevcut_mu: boolean
  gecerlilik_baslangic?: string | null
  gecerlilik_bitis?: string | null
  fiziksel_arsiv_yeri?: string | null
  notlar?: string | null
  son_kontrol_tarihi?: string | null

  son_dosya_id?: string | null
  ai_son_kontrol_tarihi?: string | null
  ai_guven_skoru?: number | null
  ai_ozet?: string | null
  ai_eksikler?: string[] | null
  ai_cikarilan_veriler?: Record<string, unknown> | null

  created_at?: string | null
  updated_at?: string | null
}

export type KymBelgeDosyasi = {
  id: string
  isletme_belge_id: string
  dosya_url: string
  dosya_adi?: string | null
  dosya_tipi?: string | null
  yukleyen_kullanici?: string | null
  created_at?: string | null
}

export type KymBelgeDogrulama = {
  id: string
  isletme_belge_id: string
  belge_dosya_id?: string | null

  kaynak: KymBelgeDogrulamaKaynak
  sonuc: KymBelgeDogrulamaSonucu

  onceki_durum?: KymBelgeDurumu | null
  yeni_durum: KymBelgeDurumu

  guven_skoru?: number | null
  belge_turu_tahmini?: string | null
  belge_sahibi?: string | null
  belge_numarasi?: string | null
  belge_tarihi?: string | null
  gecerlilik_baslangic?: string | null
  gecerlilik_bitis?: string | null

  ozet?: string | null
  eksikler?: string[] | null
  uyumsuzluklar?: string[] | null
  cikarilan_veriler?: Record<string, unknown> | null
  ham_ai_cevabi?: Record<string, unknown> | null

  created_at?: string | null
}

export type KymBelgeSatiri = {
  isletme_belge_id: string
  isletme_id: string
  belge_kodu: string
  belge_adi: string
  yukumluluk_kodu: string
  yukumluluk_basligi: string
  kategori: string
  alt_kategori?: string | null
  risk_puani: number
  oncelik: string
  basvuru_yeri?: string | null
  durum: KymBelgeDurumu
  gecerlilik_bitis?: string | null
  notlar?: string | null

  ai_guven_skoru?: number | null
  ai_ozet?: string | null
  ai_eksikler?: string[] | null
}

export type KymDashboardOzet = {
  isletme_id: string
  toplam_belge: number
  guncel_belge: number
  eksik_belge: number
  eksik_veya_hatali_belge: number
  suresi_dolan_belge: number
  otuz_gun_icinde_dolacak: number
  inceleme_bekleyen_belge?: number
  uyum_puani: number
}

export type KymOzelYukumluluk = {
  id: string
  isletme_id: string
  isletme_adi?: string | null

  kaynak_tipi: string
  kaynak_aciklama?: string | null

  kayit_tipi: string
  baslik: string
  kategori: string
  alt_kategori?: string | null

  zorunluluk_tipi: string
  hukuki_dayanak?: string | null
  denetleyen_kurum?: string | null

  basvuru_yeri?: string | null
  yenileme_periyodu?: string | null

  aciklama?: string | null
  risk_puani: number
  oncelik: KymOncelik | string

  ai_ogrenme_havuzuna_alinsin: boolean
  aktif: boolean

  created_at?: string | null
  updated_at?: string | null
}

export type KymOzelYukumlulukInput = {
  isletme_id: string

  kaynak_tipi?: string
  kaynak_aciklama?: string | null

  kayit_tipi?: string
  baslik: string
  kategori: string
  alt_kategori?: string | null

  zorunluluk_tipi?: string
  hukuki_dayanak?: string | null
  denetleyen_kurum?: string | null

  basvuru_yeri?: string | null
  yenileme_periyodu?: string | null

  aciklama?: string | null
  risk_puani?: number
  oncelik?: KymOncelik | string

  ai_ogrenme_havuzuna_alinsin?: boolean
  aktif?: boolean
}

export type KymBelgeDogrulamaInput = {
  isletmeBelgeId: string
  belgeDosyaId?: string | null

  kaynak?: KymBelgeDogrulamaKaynak
  sonuc: KymBelgeDogrulamaSonucu
  yeniDurum: KymBelgeDurumu

  guvenSkoru?: number | null
  belgeTuruTahmini?: string | null
  belgeSahibi?: string | null
  belgeNumarasi?: string | null
  belgeTarihi?: string | null
  gecerlilikBaslangic?: string | null
  gecerlilikBitis?: string | null

  ozet?: string | null
  eksikler?: string[]
  uyumsuzluklar?: string[]
  cikarilanVeriler?: Record<string, unknown>
  hamAiCevabi?: Record<string, unknown>
}