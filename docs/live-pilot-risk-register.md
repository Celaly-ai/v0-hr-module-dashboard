# FeyRoute Live Pilot Risk Register

Bu dosya pilot oncesi kalan riskleri kisa ve takip edilebilir tutar.

## Durum

Kod seviyesi pilot deploy icin hazir adaya geldi.

Son temiz kontrol:

```bash
npm run check
```

## Kritik Riskler

### 1. Supabase RLS ve schema uyumu

Durum: Acik.

Son preflight bulgusu:

- Tablolar mevcut.
- Tenant kolonlari mevcut.
- `ik_yoneticisi` role permission eksigi `npm run pilot:apply-roles` ile giderildi.
- `npm run pilot:supabase` basarili.

Kontrol:

- `scripts/007_live_pilot_add_ik_role.sql`
- `scripts/008_live_pilot_role_permissions_patch.sql`
- `scripts/009_live_pilot_readiness_check.sql`
- `npm run pilot:apply-roles`
- `npm run pilot:supabase`

Kapanma kriteri:

- `009` sonucunda tum satirlar `ok = true`.
- `npm run pilot:supabase` hatasiz tamamlanir.

### 2. Canli env eksigi

Durum: Acik.

Kontrol:

```bash
npm run pilot:health -- https://YOUR_DOMAIN
```

Kapanma kriteri:

- HTTP `200`
- `ok: true`
- `supabaseConfigured: true`
- `serviceRoleConfigured: true`

### 3. Auth ve rol testi

Durum: Acik.

Kontrol:

- `npm run pilot:users`
- Admin login basarili.
- Calisan login basarili.
- Pasif personel login olamiyor.
- Calisan admin ekranlarina erisemiyor.

Son kontrol:

- `npm run pilot:users` calisti.
- Mevcut Supabase ortaminda `personeller: 0` bulundu.
- Pilot baslamadan once en az 1 aktif admin/yonetici ve 1 aktif calisan kaydi olusturulmali.

Kapanma kriteri:

- En az 1 admin ve 1 calisan ile test basarili.

### 4. Tenant/sirket izolasyonu

Durum: Acik.

Kontrol:

- Yeni personel, arac, ekip kayitlari giris yapan kullanicinin `sirket_id` degeriyle olusuyor.
- Farkli sirket verisi gorunmuyor.

Kapanma kriteri:

- Pilot sirket verisiyle manuel test basarili.

### 5. Excel yukleme riski

Durum: Azaltilmis.

Mevcut koruma:

- Admin auth guard.
- Dosya tipi limiti.
- 3 MB dosya limiti.
- 500 satir limiti.

Kapanma kriteri:

- Admin disi kullanici endpoint'e erisemiyor.
- Buyuk/gecersiz dosya reddediliyor.

### 6. AI maliyet riski

Durum: Azaltilmis.

Mevcut koruma:

- AI fis okuma admin/servis yoneticisi ile sinirli.
- API key yoksa endpoint `503` doner.
- Gorsel tipi ve boyutu sinirli.
- `max_tokens` dusuruldu.

Kapanma kriteri:

- Pilot baslangicinda `ANTHROPIC_API_KEY` bos birakilabilir.

## Pilot Baslatma Karari

Pilot baslatmak icin:

- Kritik risk 1 kapandi.
- Kritik risk 2 kapandi.
- Kritik risk 3 kapandi.
- Kritik risk 4 en az temel senaryoda dogrulandi.

Karar metni:

```txt
Pilot gecis seviyesine ulasildi.
```
