# Core V1 Entity Specification

**Version:** 1.0  
**Status:** Phase-1A (Documentation)  
**Authority:** `docs/FEYROUTE_MASTER_ARCHITECTURE.md`  
**Related:** `01-master-overview.md`, `11-core-v1-event-taxonomy.md`, `12-aron-to-core-mapping.md`

---

## 1. Entity Overview

Core V1 defines four primary entities plus two supporting structures:

```
core_customer_phones     (matching layer)
        ↓
core_customers           (permanent identity)
        ↓
core_products            (physical unit identity)
        ↓
core_service_orders      (one service request)
        ↓
core_operation_events    (append-only audit trail)
```

Supporting structures (Phase-1B):

- `core_identity_match_log` — records how ingest matched or created entities
- `core_external_references` — maps external system IDs (ARON FisNo, etc.) to Core V1 IDs

---

## 2. Phone (Matching Layer)

Phone is **not** a standalone business entity. It is the **primary matching key** for customer identity.

### Table: `core_customer_phones` (planned)

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Primary key |
| `customer_id` | UUID | FK → `core_customers.id`; required |
| `phone_normalized` | TEXT | E.164 or national normalized; indexed |
| `phone_raw` | TEXT | Original value from source |
| `is_primary` | BOOLEAN | One primary per customer at a time |
| `valid_from` | TIMESTAMPTZ | When this phone became associated |
| `valid_to` | TIMESTAMPTZ | NULL = currently active |
| `source_system` | TEXT | e.g. `ARON`, `MANUAL`, `BAYI` |
| `source_reference` | TEXT | External record reference |
| `created_at` | TIMESTAMPTZ | Immutable |
| `created_by` | UUID | NULL for system ingest |

### Phone normalization rules

1. Strip spaces, dashes, parentheses.
2. Normalize Turkish numbers: leading `0` → `+90` where applicable.
3. Store both `phone_raw` and `phone_normalized`.
4. Match on `phone_normalized` first; fallback to fuzzy match only with logged `IdentityMatchedWithReview` event.
5. Empty or invalid phone → customer created with `match_status: unmatched_phone`; event logged.

### Phone change rules

- When a customer gets a new phone: insert new row in `core_customer_phones`; set `valid_to` on old row.
- **Never** reassign `customer_id` based on phone change.
- **Never** delete phone history rows.

---

## 3. Customer

### Identity rules

| Rule | Description |
|------|-------------|
| **C-1** | System generates permanent `customer_id` (UUID) on first match or create |
| **C-2** | `customer_id` never changes, never reused |
| **C-3** | Phone is the primary matching key at ingest time |
| **C-4** | A customer can own multiple products |
| **C-5** | Name and address are attributes, not identity keys |
| **C-6** | Same phone + different name → same customer unless explicit split event |
| **C-7** | Customer records are never hard-deleted |

### Table: `core_customers` (planned)

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Permanent `customer_id`; PK |
| `display_name` | TEXT | Latest known name (e.g. ARON `Musteri`) |
| `sirket_id` | UUID | FK → tenant scope; required |
| `primary_phone_id` | UUID | FK → `core_customer_phones.id`; nullable |
| `il` | TEXT | Province |
| `ilce` | TEXT | District |
| `mahalle` | TEXT | Neighborhood |
| `adres` | TEXT | Full address text |
| `enlem` | NUMERIC | Latitude; nullable |
| `boylam` | NUMERIC | Longitude; nullable |
| `match_status` | TEXT | `matched`, `created`, `review_required` |
| `first_seen_at` | TIMESTAMPTZ | First ingest timestamp |
| `last_seen_at` | TIMESTAMPTZ | Updated on each ingest touch |
| `metadata` | JSONB | Non-identity attributes; extensible |
| `created_at` | TIMESTAMPTZ | Immutable |
| `updated_at` | TIMESTAMPTZ | Attribute updates only |

### Customer matching algorithm (Phase-1C)

```
1. Normalize phone from source
2. SELECT customer_id FROM core_customer_phones
     WHERE phone_normalized = ? AND valid_to IS NULL
3. IF found → reuse customer_id; emit IdentityMatched event
4. IF not found → INSERT core_customers; INSERT core_customer_phones
     → emit CustomerCreated + IdentityMatched events
5. IF name/address differs → UPDATE attributes; emit CustomerUpdated event
6. Log match decision in core_identity_match_log
```

---

## 4. Product

Product is the **main AI analysis object**. It represents a physical unit, not a service request.

### Identity rules

| Rule | Description |
|------|-------------|
| **P-1** | Product identity = Brand + Product Code + Model Code + Serial Number |
| **P-2** | All four fields participate in identity when available |
| **P-3** | Partial identity allowed at ingest; `identity_completeness` tracked |
| **P-4** | One product may have unlimited service orders |
| **P-5** | Service order must never be used as product identity |
| **P-6** | Product records are never hard-deleted |
| **P-7** | Same serial number + different brand → separate products (conflict event) |

### Identity key composition

```
product_identity_key = normalize(brand) + "|" +
                       normalize(product_code) + "|" +
                       normalize(model_code) + "|" +
                       normalize(serial_number)
```

When `serial_number` is empty, match on brand + model_code only; mark `identity_completeness: partial`.

### Table: `core_products` (planned)

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `customer_id` | UUID | FK → `core_customers.id`; owner |
| `brand` | TEXT | e.g. ARON `Marka` |
| `product_code` | TEXT | Product group / AnaGrup code |
| `model_code` | TEXT | e.g. ARON `MODEL_KODU`, `KUL_MODEL_KODU` |
| `serial_number` | TEXT | e.g. ARON `SERINO`; nullable at ingest |
| `product_identity_key` | TEXT | Computed; unique per sirket_id |
| `identity_completeness` | TEXT | `full`, `partial`, `minimal` |
| `urun_kategori` | TEXT | Derived category (KLIMA, BUZDOLABI, etc.) |
| `sirket_id` | UUID | Tenant scope |
| `first_seen_at` | TIMESTAMPTZ | |
| `last_seen_at` | TIMESTAMPTZ | |
| `metadata` | JSONB | Extensible |
| `created_at` | TIMESTAMPTZ | Immutable |
| `updated_at` | TIMESTAMPTZ | |

### Product ↔ legacy `cihazlar` relationship

- Phase-1: Core V1 products exist in parallel to `cihazlar`.
- Phase-2: Optional bridge via `core_external_references` (`system: cihazlar`, `external_id: cihaz.id`).
- Zimmet module continues using `cihazlar` / `operasyon_zimmet_*` until bridged.

---

## 5. Service Order

Every service request creates exactly one Service Order in Core V1.

### Service order rules

| Rule | Description |
|------|-------------|
| **SO-1** | One ARON open ticket (`FisNo`) = one service order (1:1 external ref) |
| **SO-2** | Service order types: Installation, Repair, Maintenance, Warranty, RepeatService, GasRefill, PartReplacement, Other |
| **SO-3** | Service order links to exactly one customer and one product (nullable product if unknown) |
| **SO-4** | Service order status is derived from latest relevant event, not direct overwrite |
| **SO-5** | Service orders are never hard-deleted |
| **SO-6** | If ARON deletes a ticket, FeyRoute retains the service order + full event history |
| **SO-7** | Planned vs actual operation type (N/M/NM/İ) recorded as separate event attributes |

### Service order types (enum)

| Code | TR Label | ARON source hint |
|------|----------|------------------|
| `INSTALLATION` | Montaj | BasvuruNedeni contains "montaj" |
| `DELIVERY` | Nakliye | BasvuruNedeni contains "nakliye" (without montaj) |
| `DELIVERY_INSTALLATION` | Nakliye + Montaj | "nakliye montaj" |
| `REPAIR` | Arıza / Onarım | BasvuruNedeni repair keywords |
| `MAINTENANCE` | Bakım | Maintenance keywords |
| `WARRANTY` | Garanti | Warranty keywords |
| `REPEAT_SERVICE` | Tekrar Servis | Repeat service flags |
| `GAS_REFILL` | Gaz Dolumu | Gas refill keywords |
| `PART_REPLACEMENT` | Parça Değişimi | Part replacement keywords |
| `OTHER` | Diğer | Fallback |

### Table: `core_service_orders` (planned)

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `customer_id` | UUID | FK → `core_customers.id` |
| `product_id` | UUID | FK → `core_products.id`; nullable |
| `sirket_id` | UUID | Tenant scope |
| `service_order_type` | TEXT | Enum above |
| `operation_type_code` | TEXT | N, M, NM, İ (operational result family) |
| `status` | TEXT | Derived; see event taxonomy |
| `external_system` | TEXT | `ARON` |
| `external_reference` | TEXT | `FisNo` |
| `basvuru_no` | TEXT | ARON BasvuruNo |
| `basvuru_nedeni` | TEXT | Raw application reason text |
| `basvuru_notu` | TEXT | Notes |
| `bayi` | TEXT | Dealer name |
| `randevu_tarihi` | TIMESTAMPTZ | Appointment |
| `zaman_slotu` | TEXT | Time slot |
| `acik_gun` | INTEGER | Days open |
| `assigned_teknisyen` | TEXT | Technician name (snapshot) |
| `source_ham_veri_id` | UUID | FK → `aron_ham_veriler.id` |
| `first_seen_at` | TIMESTAMPTZ | |
| `last_seen_at` | TIMESTAMPTZ | |
| `metadata` | JSONB | Pool-derived fields (sure, kategori, etc.) |
| `created_at` | TIMESTAMPTZ | Immutable |
| `updated_at` | TIMESTAMPTZ | |

### Status derivation (not direct mutation)

Status is computed from the latest event of relevant types:

| Status | Latest event(s) |
|--------|-----------------|
| `imported` | ImportedFromAron |
| `validated` | Validated |
| `pending_assignment` | IdentityMatched + no Assigned |
| `assigned` | Assigned |
| `accepted` | TechnicianAccepted |
| `in_progress` | Started |
| `arrived` | Arrived |
| `completed` | Completed |
| `survey_pending` | Completed, no SurveyCompleted |
| `archived` | Archived |
| `cancelled` | Cancelled |

---

## 6. Operation Events

See `11-core-v1-event-taxonomy.md` for full event specification.

Summary rules:

- **E-1** Events are append-only; no DELETE, no UPDATE of event payload.
- **E-2** Corrections are new events with `correlates_to_event_id`.
- **E-3** Every ingest, match, assignment, and state change produces at least one event.
- **E-4** Events reference `customer_id`, `product_id`, `service_order_id` where applicable.

---

## 7. External References

### Table: `core_external_references` (planned)

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `entity_type` | TEXT | `customer`, `product`, `service_order` |
| `entity_id` | UUID | Core V1 entity ID |
| `external_system` | TEXT | `ARON`, `CIHAZLAR`, `AKTIF_HAVUZ` |
| `external_id` | TEXT | External key |
| `created_at` | TIMESTAMPTZ | |

Enables bidirectional lookup without polluting entity identity fields.

---

## 8. Tenant Scoping

All Core V1 entities include `sirket_id` aligned with existing `personeller.sirket_id` / `sirketler` multi-tenant model.

RLS policies (Phase-1B) must mirror existing tenant isolation patterns.

---

## 9. Identity Match Log

### Table: `core_identity_match_log` (planned)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | PK |
| `ingest_batch_id` | UUID | Groups one ingest run |
| `source_system` | TEXT | ARON |
| `source_reference` | TEXT | FisNo |
| `match_type` | TEXT | `customer_phone`, `product_serial`, `service_order_external` |
| `match_result` | TEXT | `matched`, `created`, `conflict`, `skipped` |
| `input_snapshot` | JSONB | Normalized input used for match |
| `output_entity_id` | UUID | Resulting Core V1 ID |
| `decision_reason` | TEXT | Human-readable |
| `created_at` | TIMESTAMPTZ | |

---

## 10. Phase-1 Entity Boundaries

| Entity | Created in Phase-1 | Consumed by live UI in Phase-1 |
|--------|-------------------|-------------------------------|
| Customer | Yes (via ingest) | No — read-only API / connector status only |
| Product | Yes (via ingest) | No |
| Service Order | Yes (via ingest) | No |
| Events | Yes (via ingest) | No |
| Operational Pool | Unchanged | Yes (existing UI) |
