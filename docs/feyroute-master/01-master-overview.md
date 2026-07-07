# FeyRoute Master Overview — Core V1

**Version:** 1.0  
**Status:** Phase-1A (Documentation)  
**Authority:** `docs/FEYROUTE_MASTER_ARCHITECTURE.md`  
**Last updated:** 2026-06-28

---

## 1. Purpose

FeyRoute is an AI-powered Service Operating System. Its long-term goal is to build **permanent corporate memory** from all operational knowledge of a service company.

ARON manages today's field operations. FeyRoute preserves, organizes, and analyzes that knowledge so AI can learn from it over many years.

**Core V1** introduces a canonical data model that sits **in parallel** to existing production modules. It does not replace them in Phase-1.

---

## 2. Fixed Core Hierarchy

This hierarchy is immutable. All new design must conform to it.

```
Phone
  ↓
Customer          (permanent customer_id)
  ↓
Product           (brand + product code + model code + serial number)
  ↓
Service Order     (installation, repair, maintenance, warranty, etc.)
  ↓
Operation Events  (append-only; never deleted)
```

### What each layer owns

| Layer | Owns | Does not own |
|-------|------|--------------|
| **Phone** | Matching key, contact history | Customer identity |
| **Customer** | Permanent `customer_id`, name, address context | Product serial numbers |
| **Product** | Physical unit identity, brand/model/serial | Service order status |
| **Service Order** | One service request instance, type, lifecycle state | Product identity definition |
| **Operation Events** | Audit trail of every significant action | Mutable operational state |

---

## 3. Relationship to Current Production System

Today, operational data flows through a **parallel legacy path**:

```
ARON (external)
  → JSON import → aron_ham_veriler
  → Validation/filter (script-level)
  → aktif_operasyon_havuzu_v2 (operational pool)
  → Operasyon Havuzu / Zimmet / AI modules
```

Core V1 adds a **second path** that runs alongside this:

```
ARON (external)
  → JSON import → aron_ham_veriler (unchanged)
  → Core V1 Ingest Adapter (Phase-1B+)
      → Identity Matching
      → core_customers / core_products / core_service_orders
      → core_operation_events (append-only)
  → Corporate Memory (Phase-2+)
```

**Phase-1 rule:** The existing pool sync (`scripts/aron-operasyon-havuzu.mjs`) continues unchanged until explicitly bridged with a feature flag.

---

## 4. Core V1 Design Principles

1. **Additive only** — New tables and services; no DROP, no column removal on production tables.
2. **Events never deleted** — Corrections are new events, not updates that erase history.
3. **AI read-only on raw ops data** — AI writes analysis/suggestions to dedicated tables only.
4. **Phone matches; ID persists** — Phone number may change; `customer_id` never changes.
5. **Product ≠ Service Order** — One product can have unlimited service orders.
6. **Human decisions final** — Assignment, cancellation, and completion require human action (or explicit system rules with event logging).

---

## 5. Phase-1 Scope Boundaries

### In scope (Phase-1)

| Phase | Deliverable |
|-------|-------------|
| **1A** | Documentation (this set of docs) |
| **1B** | Additive SQL migrations for Core V1 tables |
| **1C** | Repository + service layer (`lib/core/`) |
| **1D** | ARON ingest adapter (parallel to existing pool sync) |
| **1E** | Read-only API + connector status visibility |

### Explicitly out of scope (Phase-1)

- Rewriting Operasyon Havuzu UI
- Replacing Operasyon Zimmet Merkezi
- Migrating HR / personel modules
- Mobile app changes
- Replacing `aktif_operasyon_havuzu_v2` as the live assignment source
- AI model training or Faz-2 learning engines
- Bayi Operasyon Merkezi integration with Core V1

### Must remain untouched during Phase-1

- `app/portal/operasyon-havuzu/**`
- `app/api/operasyon/**`, `app/api/operasyon-zimmet/**`
- `scripts/aron-19-cron.mjs`, `aron-import.mjs`, `aron-operasyon-havuzu.mjs` (until dual-write flag is approved)
- HR modules: giriş-çıkış, izin, iletişim, personel paneli
- Existing Supabase table schemas (no destructive changes)

---

## 6. Document Map (Core V1)

| Document | Content |
|----------|---------|
| `docs/FEYROUTE_MASTER_ARCHITECTURE.md` | Master development prompt and global rules |
| `docs/feyroute-master/01-master-overview.md` | This file — overview and boundaries |
| `docs/feyroute-master/10-core-v1-entity-spec.md` | Customer, Product, Service Order entity definitions |
| `docs/feyroute-master/11-core-v1-event-taxonomy.md` | Event types, lifecycle, retention |
| `docs/feyroute-master/12-aron-to-core-mapping.md` | ARON JSON → Core V1 field mapping |
| `docs/feyroute-master/03-operasyon-kurallari.md` | Operational rules (N/M/NM/İ, AT, barkod) |
| `docs/feyroute-master/04-veritabani-haritasi.md` | Existing table inventory |
| `docs/feyroute-master/08-operasyon-zimmet-merkezi-v1.md` | Zimmet lifecycle (parallel product tracking) |

---

## 7. Implementation Sequence (Post Phase-1A)

```
Phase-1A  Documentation          ← current
Phase-1B  Additive DB schema
Phase-1C  lib/core/ services + repositories
Phase-1D  ARON ingest adapter (feature-flagged dual path)
Phase-1E  Read API + connector merkezi status
Phase-2   Bridge pool ↔ Core V1; AI memory consumption
```

---

## 8. Success Criteria for Phase-1

Phase-1 is complete when:

1. Core V1 tables exist and are populated from ARON ingest (additive).
2. Every ARON import produces append-only events in `core_operation_events`.
3. Customer identity is stable across phone number changes.
4. Product identity is decoupled from service orders.
5. Production operasyon havuzu and zimmet modules continue working without regression.
6. No raw operational data is modified by AI processes.

---

## 9. Glossary

| Term | Definition |
|------|------------|
| **ARON** | External service management system (Arcelik yetkiliservis); source of open ticket JSON |
| **Corporate Memory** | Long-term, append-only knowledge base derived from events and AI analysis |
| **Core V1** | Canonical entity model: Customer, Product, Service Order, Events |
| **FisNo** | ARON ticket number; external reference for service orders |
| **Operational Pool** | `aktif_operasyon_havuzu_v2`; live assignment queue (legacy path) |
| **Service Order** | One instance of a service request (install, repair, etc.) |
| **Zimmet** | Pre-dispatch product custody workflow (Operasyon Zimmet Merkezi) |
