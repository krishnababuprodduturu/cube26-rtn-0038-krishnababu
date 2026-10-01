# System Architecture Specification — Returns Manager (RTN-0038)

**System Owner & Lead Architect**: Krishna Babu (`krishnababu`)  
**Repository**: `cube26-rtn-0038-krishnababu` · **Service Identification**: `RTN-0038`  
**Revision Date**: October 2026 · **Status**: Production Reference Architecture

---

## 1. Architectural Philosophy & Core Axioms

Returns Manager (`RTN-0038`) is designed for mission-critical reverse logistics in high-throughput fulfillment centers. The design adheres to four non-negotiable architectural axioms:

1. **Strict Decoupling of Perception and Policy (Zero Policy Hallucination)**: Large Language Models are probabilistic perception engines, not authoritative business policy arbiters. The model's responsibility is confined strictly to feature extraction (detecting visible defects, parsing labels, identifying accessories). All disposition outcomes (`restock`, `refurbish`, `liquidate`, `dispose`) are evaluated exclusively by a deterministic, zero-hallucination Python rule engine (`disposition/engine.py`).
2. **Fail-Open Resilience**: Operational failures—whether caused by network partition, corrupted image payloads, model downtime, or quota exhaustion—must never silently drop a return. The physical photos and metadata are committed to storage *before* initiating any AI inference. Ambiguous or failed evaluations automatically route to a supervisor triage queue with full diagnostic context.
3. **Native Database Tenancy Isolation**: Multi-tenancy is enforced at the database kernel level through PostgreSQL Row-Level Security (RLS), not by fragile application-level `WHERE org_id = ?` filters.
4. **Cryptographic Traceability (RFC 8785)**: Every return observation and judgment is serialized using Canonical JSON (JCS) and linked via SHA-256 hash chains, providing a verifiable, tamper-evident audit record suitable for carrier claim disputes and insurance adjudication.

---

## 2. End-to-End System Topography

The diagram below illustrates the end-to-end dataflow through the microservice:

```
                            [ Webhook / Operator Intake ]
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │       FastAPI Application Gateway             │
                 │   • API Key Authentication & RBAC (ADR-004)   │
                 │   • Payload Validation & Image Sniffing       │
                 │   • Tenant Isolation Binding (ADR-003)        │
                 └───────────────────────┬───────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
             ┌───────────────────────┐       ┌───────────────────────┐
             │ Raw Photo Store (S3)  │       │ rm.returns / rm.jobs  │
             │ SHA-256 Pre-inference │       │ Postgres RLS Enforced │
             └───────────────────────┘       └───────────┬───────────┘
                                                         │ Enqueue Job
                                                         ▼
                                             ┌───────────────────────┐
                                             │ Async Queue Worker    │
                                             │ • Circuit Breakers    │
                                             │ • Daily Quota Guards  │
                                             └───────────┬───────────┘
                                                         │
                                                         ▼
                                             ┌───────────────────────┐
                                             │ Context Assembler     │
                                             │ • Seller Catalog Item │
                                             │ • BOM Parts List      │
                                             │ • Amazon Rubric Spec  │
                                             └───────────┬───────────┘
                                                         │
                                                         ▼
                                             ┌───────────────────────┐
                                             │ Gemini Multimodal Loop│
                                             │ • Stateful Sessions   │
                                             │ • Tool Calling / OCR  │
                                             └───────────┬───────────┘
                                                         │
                                                         ▼
                                             ┌───────────────────────┐
                                             │ Perception Fusion     │
                                             │ • Dual-Anchor Match   │
                                             │ • Spatial Consistency │
                                             └───────────┬───────────┘
                                                         │
                                                         ▼
                                             ┌───────────────────────┐
                                             │ Deterministic Policy  │
                                             │ Rules Engine (R01-R14)│
                                             └───────────┬───────────┘
                                                         │
                                                         ▼
                                             ┌───────────────────────┐
                                             │ Cryptographic Ledger  │
                                             │ RFC 8785 Hash Chain   │
                                             └───────────┬───────────┘
                                                         │
                                                         ▼
                                             [ Recovery Manager (Pod 05) ]
```

---

## 3. Subsystem Breakdown

### 3.1 Ingestion & Pre-Processing Pipeline (`api/` & `storage/`)
- **MIME & Integrity Sniffing**: Ingested image bytes are verified using magic numbers rather than file extensions. Corrupted or truncated uploads fail immediately at the edge.
- **Pre-Inference Persistence**: All return metadata and photos are assigned canonical identifiers (`ret_...`, `pho_...`) and persisted to the database prior to external AI service invocation. If the inference provider fails, the customer's physical parcel record remains secure in the database.
- **Tenant Context Injection**: Inbound requests authenticate via scoped API keys. The authenticated `org_id` is bound to the database transaction via `SET LOCAL app.org_id = :org_id`.

### 3.2 Multimodal Perception & Vision Reasoning (`llm/` & `judgment/`)
- **Stateful Interaction Sessions**: Connected via Google GenAI SDK using `previous_interaction_id` to maintain coherent multi-turn reasoning across catalog comparisons and defect localization.
- **Dual-Anchor Identity Fusion (`judgment/fusion.py`)**: To avoid false-positive identity approvals, the agent enforces a dual-anchor policy:
  - Requires either **two independently matched physical product-body features** (`body_matches >= 2`) OR a **verified barcode/serial match**.
  - A single matching feature without barcode corroboration is strictly downgraded to `uncertain`.
- **Spatial Consistency Rules (`judgment/consistency.py`)**:
  - `Rule C01`: A component cannot be flagged as "missing" unless the model explicitly validates that the accessory compartment or packaging cavity was visible in the camera frame.
  - `Rule C02`: Cosmetic scuffs on protective packaging do not penalize unit condition if the product's primary factory seal remains intact.

### 3.3 The Deterministic Policy Gate (`disposition/engine.py`)
The rule engine accepts observational facts from the perception layer and computes the commercial disposition using an immutable rule hierarchy:

```
[ Observations: Identity, Completeness, Condition Grade ]
                           │
       Is Identity Mismatched or Sold-vs-Returned Disputed?
            ├── YES ──► Route: WRONG_PRODUCT / LIQUIDATE
            └── NO
                 │
       Is Identity or Physical Evidence Uncertain?
            ├── YES ──► Route: PENDING_REVIEW / SUPERVISOR
            └── NO
                 │
       Are Required Parts / Accessories Missing?
            ├── YES ──► Route: REFURBISH or LIQUIDATE (Policy-dependent)
            └── NO
                 │
       Evaluate Condition Grade:
            ├── New / Unopened       ──► RESTOCK (Full Margin)
            ├── Like New / Complete  ──► RESTOCK or REFURBISH
            ├── Very Good / Good     ──► REFURBISH or RESALE
            └── Damaged / Unusable   ──► DISPOSE / SALVAGE
```

- **Rules `R01–R05`**: Gating checks. If identity is uncertain, photos are occluded, or critical safety seals are compromised, the engine terminates early with `pending_review`.
- **Rules `R06–R14`**: Category-specific routing rules based on merchant disposition rubrics.
- **Rule `R99`**: Exhaustive fallback. If an observation tuple does not match any recognized operational rubric, it safely routes to human supervisory triage.

### 3.4 Cryptographic Audit Ledger (`contract/` & `db/`)
- **Canonical Serialization**: Uses RFC 8785 (JSON Canonicalization Scheme) to eliminate whitespace and key-ordering variance.
- **Tamper-Evident Hash Chain**: Each unit inspection contains:
  ```json
  {
    "record_id": "rec_01h9y2...",
    "unit_id": "UNIT-0038",
    "previous_record_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "record_hash": "7a35c59367189a69b7f56cf8f929d28...f0c39",
    "timestamp": "2026-10-01T21:00:00Z"
  }
  ```
- **Downstream Contract Compliance**: Conforms directly to the official inter-pod contract for handoff to **Recovery Manager (`Pod 05`)** for automated seller carrier claims.

---

## 4. Multi-Tenant Security & Isolation Model

Tenant isolation is implemented through three redundant security rings:

```
┌────────────────────────────────────────────────────────┐
│ Ring 1: API Gateway (FastAPI Middleware)               │
│ • Validates Bearer Key against rm.api_keys             │
│ • Rejects expired / revoked credentials                │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Ring 2: Session Binding (`db/tenant.py`)               │
│ • Executes SET LOCAL app.org_id = :org_id              │
│ • Scoped strictly to transaction lifetime              │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Ring 3: PostgreSQL Kernel (Row-Level Security)         │
│ • rm_app_login role has NOBYPASSRLS and NOSUPERUSER    │
│ • All tenant tables enforce:                           │
│   USING (org_id = current_setting('app.org_id'))       │
│ • Cross-tenant queries return 404 Not Found (Zero Leak)│
└────────────────────────────────────────────────────────┘
```

---

## 5. Resilience, Quota Governance & Cost Controls

1. **Free-Tier Token Quota Guard (`ADR-008`)**:
   - Tracks rolling 24-hour token expenditure and request counts.
   - When daily limits approach 90%, non-urgent background batch evaluations are throttled to preserve quota for live warehouse operator workflows.
2. **Circuit Breaker (`jobs/retry.py`)**:
   - Monitors upstream AI API latency and HTTP 429/503 response rates.
   - Automatically trips if provider errors exceed 20% over a 2-minute window, failing open to human review rather than accumulating API retries.
3. **Graceful Model Failover**:
   - If the primary judgment model (`gemini-2.5-flash`) is unavailable, jobs cleanly transition to a dedicated fallback model (`RM_JUDGMENT_FALLBACK_MODEL`) under a fresh interaction session.

---

## 6. Frontend Command Architecture & Design System

The Returns Manager frontend is built as a high-density, executive command dashboard:

- **Monochrome Executive Palette**: High-contrast pure black (`#000000`) and pure white (`#ffffff`) theme engineered for maximum legibility in industrial environments.
- **Panoramic Navigation Bar**: Top command bar with real-time operational status, RFC hash verification indicator, and P95 latency metrics.
- **Asymmetric Bento Grid**: Live telemetry cards summarizing catalog match rates, condition distributions, and top missing BOM parts.
- **Interactive Visual Comparison Station**: Side-by-side zoom visualizer comparing factory reference images against returned product photos.
- **Supervisory Triage Station**: Instant escalation drawer with one-click approval or manual overrides.

---

## 7. Dual Execution Entry Points

### 7.1 Database-Backed Service (Production)
```sh
cd agent
uv run returns-manager api serve --port 8000
uv run returns-manager worker
```
- Full persistence, RLS isolation, webhooks, and asynchronous job queuing.

### 7.2 Standalone Batch Evaluation Tool (Zero-Database)
```sh
cd agent
uv run returns-manager batch process \
  --before  manual_test_images/before.csv \
  --returned manual_test_images/returned.csv \
  --out      manual_test_images/output.csv
```
- Runs the identical Gemini vision perception loop and deterministic rules engine directly against flat CSV files for high-throughput offline batch grading.

---

## 8. Honest Engineering Boundaries & Known Constraints

In compliance with rigorous engineering standards, the following architectural constraints are explicitly stated:

1. **Tamper-Evident Ledger Scope (`ADR-007`)**: The hash chain provides cryptographic tamper-evidence *within* the database engine. It does not claim decentralized blockchain immutability.
2. **Model Input Length Handling**: Gemini multimodal API does not support JSON Schema `maxLength` constraints; string length validations are enforced locally by Pydantic validators after output parsing.
3. **Single-Perspective Photographic Occlusion**: When physical damage is hidden on an un-photographed side of a parcel, the model correctly reports `UNCERTAIN` rather than guessing.

---

**Lead Architect**: Krishna Babu (`krishnababu`)  
**Project**: Returns Manager · `RTN-0038` · Cube Buildathon Round 2
