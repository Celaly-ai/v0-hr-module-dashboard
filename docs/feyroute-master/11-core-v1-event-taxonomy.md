# Core V1 Event Taxonomy & Lifecycle

**Version:** 1.0  
**Status:** Phase-1A (Documentation)  
**Authority:** `docs/FEYROUTE_MASTER_ARCHITECTURE.md`  
**Related:** `10-core-v1-entity-spec.md`, `01-master-overview.md`

---

## 1. Event Model Principles

| Principle | Rule |
|-----------|------|
| **Append-only** | Events are INSERT-only. No UPDATE. No DELETE. |
| **Immutable payload** | `event_payload` JSONB is written once and never modified |
| **Correction via supersession** | Errors corrected by new event with `correlates_to_event_id` |
| **Full traceability** | Every state transition has a corresponding event |
| **AI separation** | AI-generated events use `actor_type: ai` and write to suggestion/analysis tables separately |
| **Human authority** | Operational decisions use `actor_type: human` or `actor_type: system` with explicit rule reference |

---

## 2. Event Table Schema (planned)

### Table: `core_operation_events`

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | PK |
| `event_type` | TEXT | From taxonomy below; indexed |
| `event_version` | INTEGER | Schema version for payload; default 1 |
| `occurred_at` | TIMESTAMPTZ | When the action happened (source time if available) |
| `recorded_at` | TIMESTAMPTZ | When FeyRoute recorded it; default NOW() |
| `sirket_id` | UUID | Tenant scope |
| `customer_id` | UUID | Nullable FK |
| `product_id` | UUID | Nullable FK |
| `service_order_id` | UUID | Nullable FK |
| `source_system` | TEXT | `ARON`, `FEYROUTE`, `BAYI`, `MOBILE`, `AI` |
| `source_reference` | TEXT | External ID (FisNo, etc.) |
| `actor_type` | TEXT | `system`, `human`, `ai`, `connector` |
| `actor_id` | UUID | personel_id if human; NULL for system |
| `actor_label` | TEXT | Display name snapshot |
| `event_payload` | JSONB | Type-specific data |
| `correlates_to_event_id` | UUID | For corrections/supersession |
| `ingest_batch_id` | UUID | Groups connector run events |
| `idempotency_key` | TEXT | Unique per event type + source; prevents duplicates |

**Unique constraint:** `(idempotency_key)` where not null.

---

## 3. Event Type Taxonomy

### 3.1 Ingest & Validation

| Event Type | When emitted | Required payload fields |
|------------|--------------|------------------------|
| `ImportedFromAron` | Raw ARON record ingested into Core V1 path | `ham_veri_id`, `fis_no`, `raw_hash`, `imported_fields_count` |
| `ImportSkipped` | Record filtered out (e.g. unsupported is_tipi) | `fis_no`, `skip_reason` |
| `Validated` | Record passed Core V1 validation rules | `fis_no`, `validation_result`, `warnings[]` |
| `ValidationFailed` | Record failed validation | `fis_no`, `errors[]` |

### 3.2 Identity Matching

| Event Type | When emitted | Required payload fields |
|------------|--------------|------------------------|
| `CustomerCreated` | New customer_id generated | `customer_id`, `phone_normalized`, `display_name` |
| `CustomerUpdated` | Customer attributes changed | `customer_id`, `changed_fields[]`, `previous_values{}` |
| `CustomerPhoneAdded` | New phone linked to customer | `customer_id`, `phone_id`, `phone_normalized` |
| `CustomerPhoneRetired` | Phone marked inactive | `customer_id`, `phone_id`, `valid_to` |
| `ProductCreated` | New product identity | `product_id`, `identity_key`, `identity_completeness` |
| `ProductUpdated` | Product attributes changed | `product_id`, `changed_fields[]` |
| `ProductIdentityConflict` | Serial/brand mismatch detected | `product_id`, `conflict_details{}` |
| `ServiceOrderCreated` | New service order | `service_order_id`, `external_reference`, `service_order_type` |
| `ServiceOrderUpdated` | Service order attributes from re-ingest | `service_order_id`, `changed_fields[]` |
| `IdentityMatched` | Existing entity matched | `entity_type`, `entity_id`, `match_key`, `match_method` |
| `IdentityMatchReviewRequired` | Ambiguous match needs human review | `entity_type`, `candidates[]`, `reason` |

### 3.3 AI Analysis (read-only recommendations)

| Event Type | When emitted | Required payload fields |
|------------|--------------|------------------------|
| `AiRiskCalculated` | AI risk score computed | `risk_score`, `risk_factors[]`, `model_version` |
| `AiTeamSuggested` | AI team/personnel suggestion | `suggestions[]`, `model_version` |
| `AiRouteSuggested` | AI route suggestion | `route_plan{}`, `model_version` |
| `AiAnalysisRejected` | Human rejected AI suggestion | `rejected_event_id`, `reason` |
| `AiAnalysisAccepted` | Human accepted AI suggestion | `accepted_event_id`, `action_taken` |

**AI rule:** These events record that analysis occurred. They do **not** mutate `core_service_orders.status` directly. Human/system events follow acceptance.

### 3.4 Assignment & Field Operations

| Event Type | When emitted | Required payload fields |
|------------|--------------|------------------------|
| `Assigned` | Job assigned to team/technician | `assignee_type`, `assignee_id`, `assignee_label` |
| `AssignmentApproved` | Manager approved assignment | `approved_by`, `assignment_event_id` |
| `TechnicianAccepted` | Technician accepted job | `technician_id`, `accepted_at` |
| `Started` | Work started | `started_at`, `location{}` |
| `Arrived` | Arrived at customer address (AT) | `arrived_at`, `location{}`, `address_observations{}` |
| `Completed` | Operation completed | `completed_at`, `planned_type`, `actual_type`, `notes` |
| `Cancelled` | Operation cancelled | `cancelled_at`, `cancel_reason` (required) |
| `SurveyCompleted` | Post-service survey done | `survey_id`, `survey_result{}` |
| `Archived` | Moved to corporate memory archive | `archived_at`, `archive_reason` |

### 3.5 Zimmet & Product Custody (bridge events, Phase-2)

| Event Type | When emitted | Required payload fields |
|------------|--------------|------------------------|
| `ProductCustodyTaken` | Product taken into team custody | `zimmet_id`, `barcode_verified`, `serial_verified` |
| `ProductCustodyTransferred` | Custody transferred | `from_location`, `to_location`, `zimmet_id` |
| `ProductDeliveredToCustomer` | Product delivered | `delivered_at`, `location{}` |

Phase-1: Defined but emitted only when zimmet bridge is implemented.

### 3.6 System & Connector

| Event Type | When emitted | Required payload fields |
|------------|--------------|------------------------|
| `ConnectorRunStarted` | Ingest batch started | `connector_name`, `batch_id` |
| `ConnectorRunCompleted` | Ingest batch finished | `batch_id`, `stats{}` |
| `ConnectorRunFailed` | Ingest batch failed | `batch_id`, `error` |
| `DualWriteToPool` | Core V1 also wrote to legacy pool | `fis_no`, `pool_row_id` |
| `AronTicketRemovedExternally` | ARON no longer returns ticket | `fis_no`, `last_seen_at` |

---

## 4. Event Lifecycle Flow

### 4.1 ARON ingest lifecycle

```
ImportedFromAron
    ↓
Validated (or ValidationFailed → STOP)
    ↓
IdentityMatched / CustomerCreated / ProductCreated / ServiceOrderCreated
    ↓
[Optional] AiRiskCalculated, AiTeamSuggested (parallel, non-blocking)
    ↓
Assigned → TechnicianAccepted → Started → Arrived → Completed
    ↓
SurveyCompleted → Archived
```

Cancellation can occur at any point after `Validated`:

```
(any state) → Cancelled → Archived
```

### 4.2 Re-ingest lifecycle

When the same `FisNo` appears in a subsequent ARON import:

```
ImportedFromAron (idempotency_key prevents duplicate)
    ↓
ServiceOrderUpdated / CustomerUpdated (only if attributes changed)
    ↓
New event only if material change detected
```

No duplicate `ServiceOrderCreated` for same `FisNo`.

### 4.3 ARON external deletion

When ARON removes a ticket from open list:

```
AronTicketRemovedExternally
    ↓
Service order remains in Core V1
    ↓
Full event history preserved (corporate memory rule)
```

---

## 5. Idempotency Keys

Format: `{event_type}:{source_system}:{source_reference}[:{sub_key}]`

Examples:

```
ImportedFromAron:ARON:12345678
ServiceOrderCreated:ARON:12345678
IdentityMatched:ARON:12345678:customer
Assigned:ARON:12345678:2026-06-28T10:00:00Z
```

Prevents duplicate events from cron re-runs and connector retries.

---

## 6. Data Retention Rules

| Data class | Retention | Deletion |
|------------|-----------|----------|
| `core_operation_events` | **Permanent** | Never deleted |
| `core_customers` | **Permanent** | Never hard-deleted; soft-archive via `Archived` event |
| `core_products` | **Permanent** | Never hard-deleted |
| `core_service_orders` | **Permanent** | Never hard-deleted; remains even if ARON deletes ticket |
| `core_customer_phones` | **Permanent** | History preserved via `valid_to`; never deleted |
| `core_identity_match_log` | **Permanent** | Never deleted |
| `aron_ham_veriler` | **Permanent** | Raw JSON preserved (existing rule) |
| AI suggestion tables (`ai_*`) | Permanent | Analysis history preserved |
| Operational pool (`aktif_operasyon_havuzu_v2`) | Operational | Upsert model; Core V1 is source of truth for history |

### Corporate memory rule

> Even if ARON deletes a service order, FeyRoute keeps the history forever.

Implementation:

1. `AronTicketRemovedExternally` event recorded.
2. `core_service_orders` row remains.
3. All prior events remain queryable.
4. Phase-2 AI memory engines read from events, not from ARON.

---

## 7. AI Read-Only Recommendation Rule

### What AI may do

| Allowed | Target |
|---------|--------|
| Read | All Core V1 entities, events, raw ARON JSON, operational pool (read-only) |
| Write | `ai_*` tables (suggestions, scores, analysis) |
| Write | `core_operation_events` with `actor_type: ai` for analysis events only |
| Write | Dedicated `ai_suggestions` payload within event (recommendation record) |

### What AI must NOT do

| Forbidden | Examples |
|-----------|----------|
| UPDATE raw operational data | Changing `core_service_orders.status` directly |
| DELETE any record | Any entity or event |
| INSERT assignment without human event | `Assigned` with `actor_type: ai` alone is not sufficient |
| MODIFY `aron_ham_veriler` | Raw data is immutable after insert |
| OVERWRITE pool rows silently | Dual-write requires explicit `DualWriteToPool` event |

### Acceptance flow

```
AiTeamSuggested (actor_type: ai)
    ↓
Human reviews in Operasyon Havuzu / AI Görev Merkezi
    ↓
AssignmentApproved + Assigned (actor_type: human)
```

---

## 8. Event Payload Versioning

- `event_version` starts at `1` for Phase-1.
- Payload schema changes increment version.
- Consumers must check `event_version` when parsing `event_payload`.
- Old events are never migrated; new version coexists.

---

## 9. Phase-1 Event Boundaries

### Events emitted in Phase-1 (via ingest adapter)

- `ImportedFromAron`
- `ImportSkipped`
- `Validated` / `ValidationFailed`
- `CustomerCreated`, `CustomerUpdated`, `CustomerPhoneAdded`
- `ProductCreated`, `ProductUpdated`
- `ServiceOrderCreated`, `ServiceOrderUpdated`
- `IdentityMatched`
- `IdentityMatchReviewRequired`
- `ConnectorRunStarted`, `ConnectorRunCompleted`, `ConnectorRunFailed`
- `AronTicketRemovedExternally` (when detected)

### Events deferred to Phase-2 (bridge with live ops)

- `Assigned`, `TechnicianAccepted`, `Started`, `Arrived`, `Completed`, `Cancelled`
- `AiRiskCalculated`, `AiTeamSuggested` (bridge from existing AI services)
- `ProductCustodyTaken`, `ProductCustodyTransferred`
- `SurveyCompleted`, `Archived`
- `DualWriteToPool`

Phase-2 bridge will emit these events when operasyon/zimmet modules write state, without changing their UI in Phase-1.
