# FeyRoute Live Pilot Smoke Test

Pilot kullanicilari davet edilmeden once bu listeyi canli ortamda tamamlayin.

## 1. Sistem

- `/api/health` sonucu `ok: true` donuyor.
- Vercel/env degerleri tanimli:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` bos kalabilir. AI fis okuma pilotta zorunlu degildir.

## 2. Supabase

- `scripts/007_live_pilot_add_ik_role.sql` calistirildi.
- `scripts/008_live_pilot_role_permissions_patch.sql` calistirildi.
- `scripts/009_live_pilot_readiness_check.sql` sonucu tum satirlarda `ok = true`.

## 3. Login ve Yetki

- Admin kullanici `/login` ile giris yapabiliyor.
- Calisan kullanici `/login` ile giris yapabiliyor.
- Pasif personel girisi engelleniyor.
- Calisan, admin ekranlarina erisemiyor.
- Admin, personel ve rol ekranlarini gorebiliyor.

## 4. IK Akislari

- Calisan giris-cikis kaydi olusturabiliyor.
- Calisan izin talebi olusturabiliyor.
- IK/admin izin talebini onaylayabiliyor veya reddedebiliyor.
- Admin vardiya plani getirip kaydedebiliyor.
- Personel hesap olusturma ve sifre sifirlama sadece yetkili kullanicida calisiyor.

## 5. Muhasebe

- Gelir/gider kaydi eklenebiliyor.
- Muhasebe panelinde toplam gelir, gider ve net durum gorunuyor.
- Hareket listesi aciliyor ve filtrelenebiliyor.

## 6. Varliklar

- Yeni demirbas kaydi olusturulabiliyor.
- Arac kaydi sirket/tenant bilgisiyle olusturulabiliyor.
- Zimmetli personel secimi calisiyor.
- Varlik fotograf yukleme ve silme akisi test edildi.

## 7. Pilot Karari

Pilot baslatma kriteri:

- Kritik hata yok.
- `health` sonucu temiz.
- Supabase readiness temiz.
- En az 1 admin ve 1 calisan ile temel akışlar basarili.

Bu kosullar saglandiginda durum:

`Pilot gecis seviyesine ulasildi.`
