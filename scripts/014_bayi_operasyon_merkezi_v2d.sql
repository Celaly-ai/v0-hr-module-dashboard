-- =====================================================================
-- Bayii Operasyon Merkezi V2d
-- Karlılık skoru + risk analiz JSON
-- 013 sonrası calistirin.
-- =====================================================================

alter table public.bayi_kartlari
  add column if not exists karlilik_skoru integer default 0
    check (karlilik_skoru >= 0 and karlilik_skoru <= 100),
  add column if not exists risk_analiz_json jsonb;
