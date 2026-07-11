# KYM İşlem ve Aksiyon Merkezi — Canlı Sürüm Kilidi

## Modül

**KYM İşlem ve Aksiyon Merkezi**

## Canlı sürüm

**V1**

## Kilit tarihi

**2026-07-11**

## Canlı route

`/portal/kym/islemler`

## Ana ekran dosyası

`app/portal/kym/islemler/page.tsx`

## SQL dosyası

`scripts/kym/011_islem_aksiyon_merkezi.sql`

## Veritabanı nesneleri

### Tablolar

- `kym_islemler`
- `kym_islem_hareketleri`

### View'lar

- `v_kym_islem_listesi`
- `v_kym_islem_dashboard_ozet`
- `v_kym_islem_hareketleri`

### RPC'ler

- `kym_islem_olustur`
- `kym_islem_durum_guncelle`
- `kym_islem_sorumlu_ata`
- `kym_islem_hedef_tarih_guncelle`
- `kym_acik_belgeler_icin_islem_olustur`
- `kym_islem_belge_durumu_senkronize_et`

## Çalışan özellikler (V1)

- İşlem listesi ve dashboard özet kartları (açık, geciken, yüksek öncelik, sorumlusuz)
- Kart ve sekme ile filtreleme
- Sayfa açılışında ilk belge işleminin otomatik seçimi
- Belge yükleme ve AI analiz merkezi (`kym-belgeleri`, `/api/kym/belge-analiz`, `kym_belge_dogrulama_kaydet`)
- Belge analiz sonucu paneli ve analiz geçmişi
- Gereksiz / Uygulanmıyor ve Gerekli geri alma
- Manuel işlem oluşturma
- İşlem durumu, sorumlu ve hedef tarih güncelleme
- Açık belgelerden otomatik işlem üretme

## Değişiklik kuralı

Bu modül **kilitli canlı V1** sürümdür. Değişiklik yalnızca şu koşullarda yapılır:

1. Açık kullanıcı onayı
2. Önce dosya yedeği alınması
3. Önce test ortamında doğrulama
4. `npm run build` başarılı olması
5. Canlı smoke test yapılması

## İzolasyon

- ARON modülleri ve diğer FeyRoute canlı modüllerinden izoledir
- Bu commit/tag, KYM İşlem Merkezi için referans geri dönüş noktasıdır

## Git referansı

- Tag: `kym-islem-aksiyon-v1-live`
- Commit mesajı: `feat(kym): işlem ve aksiyon merkezi v1 canlı sürüm`
