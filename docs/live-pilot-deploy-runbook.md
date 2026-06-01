# FeyRoute Live Pilot Deploy Runbook

Bu dosya canli pilot deploy sirasinda izlenecek kisa siradir.

## 1. Kod Kontrolu

Lokal veya CI ortaminda:

```bash
npm run check
npm run pilot:status
npm run pilot:supabase
npm run pilot:users
```

Beklenen sonuc:

- ESLint hatasi yok
- TypeScript hatasi yok
- Production build basarili

## 2. Supabase SQL Sirasi

Supabase SQL Editor uzerinde sirayla calistir:

1. `scripts/007_live_pilot_add_ik_role.sql`
2. `scripts/008_live_pilot_role_permissions_patch.sql`
3. `scripts/009_live_pilot_readiness_check.sql`

`009` sonucunda tum satirlar `ok = true` olmali.

Ek komut:

```bash
npm run pilot:apply-roles
npm run pilot:supabase
npm run pilot:users
```

Bu komut `ik_yoneticisi` dahil role permission satirlarini da kontrol eder.

## 3. Vercel Env

Production ortaminda bu degerler olmali:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Opsiyonel:

```txt
ANTHROPIC_API_KEY
```

Pilot baslangicinda AI fis okuma zorunlu degildir. Bu key bos kalabilir.

## 4. Deploy

Vercel uzerinden production deploy baslat.

Deploy bittikten sonra:

```txt
https://YOUR_DOMAIN/api/health
```

Komutla kontrol:

```bash
npm run pilot:health -- https://YOUR_DOMAIN
npm run pilot:public -- https://YOUR_DOMAIN
```

Beklenen sonuc:

```json
{
  "ok": true,
  "supabaseConfigured": true,
  "serviceRoleConfigured": true
}
```

Beklenen HTTP status: `200`.

Eksik kritik env varsa endpoint `503` doner ve pilot baslatilmaz.

## 5. Smoke Test

Canli ortamda su dosyadaki listeyi uygula:

```txt
docs/live-pilot-smoke-test.md
```

Minimum test kullanicilari:

- 1 admin
- 1 calisan

`npm run pilot:users` komutu `No personel records found.` derse once pilot sirketi icin en az 1 aktif admin/yonetici ve 1 aktif calisan personel kaydi olustur. Bu kayitlarda `email`, `auth_id` veya `kullanici_id`, `rol`, `durum` ve `sirket_id` dolu olmali.

## 6. Pilot Karari

Pilot baslat:

- `/api/health` temizse
- Supabase readiness temizse
- Admin login basariliysa
- Calisan login basariliysa
- IK, muhasebe ve varlik temel akislari calisiyorsa

Durum metni:

```txt
Pilot gecis seviyesine ulasildi.
```

## Geri Donus Plani

Kritik hata olursa:

- Yeni kullanici davetini durdur.
- Vercel'de bir onceki basarili deployment'a rollback yap.
- Supabase tarafinda sadece son calistirilan SQL patch'i ve hata mesajini not al.
- Kullanici verisi silme veya tablo drop islemi yapma.
