# ARON to Core V1 Mapping Specification

**Version:** 1.0  
**Status:** Phase-1A (Documentation)  
**Authority:** `docs/FEYROUTE_MASTER_ARCHITECTURE.md`  
**Related:** `10-core-v1-entity-spec.md`, `11-core-v1-event-taxonomy.md`  
**Source reference:** `scripts/aron-import.mjs`, `scripts/aron-operasyon-havuzu.mjs`

---

## 1. Overview

ARON provides open-ticket JSON via scrape or file import. The current production path stores raw JSON in `aron_ham_veriler` and transforms it into `aktif_operasyon_havuzu_v2`.

Core V1 introduces a **parallel mapping** from the same source into canonical entities:

```
ARON JSON (ham_json)
    → core_customers      (via phone match)
    → core_products       (via brand/model/serial)
    → core_service_orders (via FisNo)
    → core_operation_events (append-only)
```

This document defines field-level mapping. Implementation is Phase-1C/D.

---

## 2. ARON Source Structure

### 2.1 Raw storage (`aron_ham_veriler`)

Populated by `scripts/aron-import.mjs`:

| DB column | Source |
|-----------|--------|
| `kaynak` | `"ARON"` |
| `kaynak_tip` | `"web_json"` |
| `veri_tipi` | `"acik_fis_listesi"` |
| `referans_no` | `String(FisNo)` |
| `ham_json` | Full ARON ticket object |
| `ham_veri` | Duplicate of ham_json |
| `veri_ozeti` | Computed summary string |
| `islendimi` | `false` on insert |
| `islem_durumu` | `"bekliyor"` |
| `kaynak_id` | `String(FisNo)` |

### 2.2 ARON JSON fields (observed in production scripts)

Fields read by `aron-operasyon-havuzu.mjs` from `ham_json`:

| ARON field | Usage in legacy pool |
|------------|---------------------|
| `FisNo` | Primary ticket ID → `fis_no` |
| `BasvuruNo` | Application number → `basvuru_no` |
| `Musteri` | Customer name → `musteri_adi` |
| `Telefon`, `IrtibatTelefon`, `Telefon2`, `Telefon3` | Phone → `telefon` |
| `IL` | Province → `il` |
| `ILCE` | District → `ilce` |
| `Mahalle`, `MAHALLE` | Neighborhood → `mahalle` |
| `ADRES`, `SchedulingAddress` | Address → `adres` |
| `ENLEM`, `BOYLAM` | Coordinates → `enlem`, `boylam` |
| `Bayi` | Dealer → `bayi` |
| `BasvuruNedeni` | Application reason → drives `is_tipi`, `urun_kategori` |
| `BASVURU_NOTU`, `YORUM` | Notes → `basvuru_notu` |
| `AnaGrup` | Product group → `urun_grubu`, `urun_adi` |
| `MODEL_KODU`, `KUL_MODEL_KODU` | Model code → `urun_model_kodu` |
| `SERINO` | Serial number → `seri_no` |
| `Marka` | Brand → `marka` |
| `Teknisyen` | Assigned technician → `teknisyen` |
| `RANDEVU_TARIHI`, `Randevu`, `TOA_RANDEVU_TARIHI` | Appointment → `randevu_tarihi` |
| `ZAMAN_SLOT` | Time slot → `zaman_slotu` |
| `AcikGun` | Days open → `acik_gun` |

---

## 3. Mapping: ARON → Customer

| Core V1 field | ARON source | Transform |
|---------------|-------------|-----------|
| `display_name` | `Musteri` | `trim()` |
| `phone_normalized` | `Telefon` → fallback `IrtibatTelefon` → `Telefon2` → `Telefon3` | Normalize; first non-empty |
| `phone_raw` | Same as above | Store original |
| `il` | `IL` | `trim()` |
| `ilce` | `ILCE` | `trim()` |
| `mahalle` | `Mahalle` or `MAHALLE` | `trim()` |
| `adres` | `ADRES` or `SchedulingAddress` | `trim()`; reject URL-only values |
| `enlem` | `ENLEM` | Parse float; null if 0 or NaN |
| `boylam` | `BOYLAM` | Parse float; null if 0 or NaN |
| `match_status` | — | `matched` if phone found; `review_required` if no phone |

### Customer matching key

```
PRIMARY: phone_normalized
FALLBACK: none in Phase-1 (manual review event if phone empty)
```

---

## 4. Mapping: ARON → Product

| Core V1 field | ARON source | Transform |
|---------------|-------------|-----------|
| `brand` | `Marka` | `trim()` |
| `product_code` | `AnaGrup` | `trim()`; product group code |
| `model_code` | `MODEL_KODU` → fallback `KUL_MODEL_KODU` | `trim()` |
| `serial_number` | `SERINO` | `trim()`; empty allowed |
| `urun_kategori` | Derived from `BasvuruNedeni` | Same logic as `urunKategorisi()` in pool script |
| `identity_completeness` | Computed | `full` if brand+model+serial; `partial` if serial empty; `minimal` if only category |

### Product identity key

```
product_identity_key =
  normalize(Marka) + "|" +
  normalize(AnaGrup) + "|" +
  normalize(MODEL_KODU || KUL_MODEL_KODU) + "|" +
  normalize(SERINO)
```

### Product category derivation (from BasvuruNedeni)

Replicate existing production logic for consistency:

| Keyword in BasvuruNedeni | urun_kategori |
|--------------------------|---------------|
| klima | KLIMA |
| buzdolabı | BUZDOLABI |
| çm, çamaşır | CAMASIR_MAKINESI |
| bul.mak, bulaşık | BULASIK_MAKINESI |
| tv | TV |
| fırın | FIRIN |
| ocak | OCAK |
| derin dondurucu | DERIN_DONDURUCU |
| su sebili | SU_SEBILI |
| termosifon | TERMOSIFON |
| küçük ev | KUCUK_EV_ALETLERI |
| (default) | GENEL |

---

## 5. Mapping: ARON → Service Order

| Core V1 field | ARON source | Transform |
|---------------|-------------|-----------|
| `external_reference` | `FisNo` | `trim()`; required |
| `basvuru_no` | `BasvuruNo` | `trim()` |
| `basvuru_nedeni` | `BasvuruNedeni` | `trim()` |
| `basvuru_notu` | `BASVURU_NOTU` or `YORUM` | `trim()` |
| `bayi` | `Bayi` | `trim()` |
| `service_order_type` | Derived from `BasvuruNedeni` | See §5.1 |
| `operation_type_code` | Derived from `BasvuruNedeni` | N, M, NM (see §5.2) |
| `randevu_tarihi` | `RANDEVU_TARIHI` / `Randevu` / `TOA_RANDEVU_TARIHI` | Parse ISO date |
| `zaman_slotu` | `ZAMAN_SLOT` | `trim()` |
| `acik_gun` | `AcikGun` | Integer; default 0 |
| `assigned_teknisyen` | `Teknisyen` | Empty if contains "atanmamış" |
| `source_ham_veri_id` | `aron_ham_veriler.id` | FK from ingest row |
| `external_system` | Constant | `"ARON"` |

### 5.1 Service order type derivation

| BasvuruNedeni pattern | service_order_type |
|-----------------------|-------------------|
| Contains "nakliye montaj" | `DELIVERY_INSTALLATION` |
| Contains "montaj" (not nakliye montaj) | `INSTALLATION` |
| Contains "nakliye" | `DELIVERY` |
| Contains "arıza", "ariza" | `REPAIR` |
| Contains "bakım", "bakim" | `MAINTENANCE` |
| Contains "garanti" | `WARRANTY` |
| Contains "tekrar" | `REPEAT_SERVICE` |
| Contains "gaz" | `GAS_REFILL` |
| Contains "parça", "parca" | `PART_REPLACEMENT` |
| Default | `OTHER` |

### 5.2 Operation type code (legacy N/M/NM alignment)

Replicate `isTipiBelirle()` from pool script:

| BasvuruNedeni pattern | operation_type_code | Pool is_tipi |
|-----------------------|---------------------|--------------|
| "nakliye montaj" | `NM` | NAKLIYE_MONTAJ |
| "montaj" | `M` | MONTAJ |
| "nakliye" | `N` | NAKLIYE |
| No match | — | Record `ImportSkipped` event |

**Phase-1 ingest filter:** Same filter as production — records without N/M/NM classification are skipped for Core V1 with `ImportSkipped` event (consistent with pool behavior).

### 5.3 Metadata (pool-derived, stored in service order metadata JSONB)

These fields remain in `core_service_orders.metadata` for operational context but do not define identity:

| metadata key | ARON / derived source |
|--------------|----------------------|
| `gerekli_arac_sinifi` | Derived from category + BasvuruNedeni |
| `gerekli_yetenek` | Derived from category + is_tipi |
| `klima_cift_unite` | category === KLIMA |
| `referans_sure_dk` | Derived from BasvuruNedeni |
| `kat_bilgisi` | Parsed from address |
| `kat_zam_orani` | Derived from kat + category |
| `kat_zamli_sure_dk` | Computed |
| `riskli_sure_dk` | Computed |
| `kritik_cagri` | acik_gun >= 4 |
| `atama_gerekli` | No technician assigned |
| `operasyon_durumu` | atama_bekliyor / atanmis_izlemede |

---

## 6. Mapping: ARON → Events

For each successfully processed ARON record, emit events in order:

| Step | Event | idempotency_key |
|------|-------|-----------------|
| 1 | `ImportedFromAron` | `ImportedFromAron:ARON:{FisNo}` |
| 2 | `Validated` or `ValidationFailed` | `Validated:ARON:{FisNo}` |
| 3 | `CustomerCreated` or `CustomerUpdated` + `IdentityMatched` | `IdentityMatched:ARON:{FisNo}:customer` |
| 4 | `CustomerPhoneAdded` (if new phone) | `CustomerPhoneAdded:ARON:{FisNo}:{phone_normalized}` |
| 5 | `ProductCreated` or `ProductUpdated` + `IdentityMatched` | `IdentityMatched:ARON:{FisNo}:product` |
| 6 | `ServiceOrderCreated` or `ServiceOrderUpdated` | `ServiceOrderCreated:ARON:{FisNo}` |
| 7 | Log to `core_identity_match_log` | — |

Skipped records:

| Condition | Event |
|-----------|-------|
| No N/M/NM classification | `ImportSkipped` with `skip_reason: unsupported_is_tipi` |
| Missing FisNo | `ImportSkipped` with `skip_reason: missing_fis_no` |
| Validation errors | `ValidationFailed` |

---

## 7. Legacy Pool Mapping (reference only)

For traceability, the current `aktif_operasyon_havuzu_v2` upsert mapping (unchanged in Phase-1) is documented here as the **legacy target**. Core V1 does not replace this in Phase-1.

| Pool column | Source |
|-------------|--------|
| `fis_no` | FisNo |
| `musteri_adi` | Musteri |
| `telefon` | Telefon / IrtibatTelefon / Telefon2 / Telefon3 |
| `is_tipi` | isTipiBelirle(BasvuruNedeni) |
| `operasyon_durumu` | atama_gerekli ? atama_bekliyor : atanmis_izlemede |
| `kaynak_ham_veri_id` | aron_ham_veriler.id |

Phase-2: `core_external_references` links `service_order_id` ↔ `fis_no` ↔ pool row.

---

## 8. Ingest Processing Order

```
FOR each aron_ham_veriler row WHERE veri_tipi = 'acik_fis_listesi' AND kaynak = 'ARON':

  1. Parse ham_json
  2. IF missing FisNo → emit ImportSkipped; CONTINUE
  3. Emit ImportedFromAron
  4. Validate required fields → emit Validated or ValidationFailed
  5. IF isTipiBelirle returns null → emit ImportSkipped; CONTINUE
  6. Match/create Customer by phone
  7. Match/create Product by identity key
  8. Match/create ServiceOrder by FisNo (external_reference)
  9. Write core_identity_match_log
  10. (Phase-2) Optional DualWriteToPool with feature flag
```

### Batch boundaries

- One connector run = one `ingest_batch_id`.
- Emit `ConnectorRunStarted` at start, `ConnectorRunCompleted` at end.
- Failed batch → `ConnectorRunFailed`.

---

## 9. Data Retention for ARON Mapping

| Artifact | Retention |
|----------|-----------|
| `aron_ham_veriler.ham_json` | Permanent; never modified after insert |
| Core V1 entities created from ARON | Permanent |
| Events from ARON ingest | Permanent; append-only |
| Legacy pool rows | Upserted; Core V1 preserves full history regardless |

When ARON ticket disappears from open list:

1. Detect by comparing previous FisNo set vs current import.
2. Emit `AronTicketRemovedExternally` for each missing FisNo.
3. Do not delete Core V1 service order or events.

---

## 10. Validation Rules (Core V1 ingest)

| Rule | Severity | Action |
|------|----------|--------|
| FisNo present | Error | ValidationFailed if missing |
| BasvuruNedeni present | Warning | Validated with warning |
| Phone present | Warning | CustomerCreated with match_status review_required |
| Serial number present | Warning | Product identity_completeness partial |
| Coordinates valid | Warning | Null coords allowed |
| Duplicate FisNo same batch | Info | ServiceOrderUpdated instead of Created |

---

## 11. Phase-1 Mapping Boundaries

| Mapping | Phase-1 | Notes |
|---------|---------|-------|
| ARON → aron_ham_veriler | Existing (unchanged) | `aron-import.mjs` |
| ARON → aktif_operasyon_havuzu_v2 | Existing (unchanged) | `aron-operasyon-havuzu.mjs` |
| ARON → Core V1 entities | Phase-1C/D | New adapter |
| Core V1 → pool dual-write | Phase-2 | Feature flag |
| Zimmet → Core V1 events | Phase-2 | Custody bridge |
| AI → Core V1 events | Phase-2 | AiRiskCalculated etc. |

---

## 12. Example Mapping

### Input (ARON ham_json excerpt)

```json
{
  "FisNo": "2026012345",
  "BasvuruNo": "BN-9988",
  "Musteri": "Ahmet Yılmaz",
  "Telefon": "0532 111 22 33",
  "IL": "İstanbul",
  "ILCE": "Kadıköy",
  "Mahalle": "Caferağa",
  "ADRES": "Moda Cad. No:5 Kat:3",
  "ENLEM": "40.987",
  "BOYLAM": "29.026",
  "BasvuruNedeni": "Buzdolabı Nakliye Montaj",
  "Marka": "Arçelik",
  "AnaGrup": "BUZDOLABI",
  "MODEL_KODU": "BD-450",
  "SERINO": "SN123456789",
  "Bayi": "Kadıköy Bayi",
  "Teknisyen": "Atanmamış",
  "AcikGun": 2
}
```

### Resulting Core V1 records (conceptual)

**Customer:** matched/created by phone `+905321112233`  
**Product:** identity_key `arcelik|buzdolabi|bd-450|sn123456789`  
**Service Order:** external_reference `2026012345`, type `DELIVERY_INSTALLATION`, operation_type_code `NM`  
**Events:** ImportedFromAron → Validated → CustomerCreated → ProductCreated → ServiceOrderCreated

**Legacy pool:** Same record continues to upsert to `aktif_operasyon_havuzu_v2` unchanged.
