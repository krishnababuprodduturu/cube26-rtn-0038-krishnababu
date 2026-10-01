# Returns Manager (RTN-0038)
### Autonomous Reverse Logistics, Multimodal Vision Inspection & Disposition Intelligence

**Developer & System Owner**: Krishna Babu · **Service Name**: `cube26-rtn-0038-krishnababu`  
**Deployment**: Render Microservice (Docker) · **Position**: Step 4 of 5 in the Autonomous Supply Chain

---

## 1. Executive Summary & Commercial Impact

When a returned parcel arrives at a warehouse or fulfillment center, operators have fewer than 15 seconds to inspect the item, verify its authenticity, assess damages, and determine its commercial destination. Traditional manual triage suffers from high labor fatigue, inconsistent condition grading, catalog mismatch fraud, and billions in unwarranted liquidation write-downs.

**Returns Manager (`RTN-0038`)** is an enterprise-grade, autonomous reverse logistics intelligence system. By fusing **multimodal visual perception (Google Gemini)** with a **deterministic, zero-hallucination policy engine**, Returns Manager extracts empirical evidence from physical return photos, grades condition against Amazon rubric standards, and computes optimal inventory disposition routes in real time.

```
       [ Customer Return Photos ]
                   │
                   ▼
┌──────────────────────────────────────┐
│  Phase 1: Visual Perception Engine   │ ◄── Google Gemini Multimodal Vision
│  • Empirical feature detection       │     (Stateful interaction chaining)
│  • Serial & barcode recognition      │
│  • Visible component extraction      │
└──────────────────┬───────────────────┘
                   │ Structured Observations
                   ▼
┌──────────────────────────────────────┐
│  Phase 2: Deterministic Policy Gate  │ ◄── Python Rules Engine (R01–R14/R99)
│  • Sold-vs-Returned catalog matching │     (Zero LLM policy hallucination)
│  • Bill-of-Materials completeness    │
│  • Published condition rubric        │
└──────────────────┬───────────────────┘
                   │ Disposition Verdict
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Cryptographic Audit Ledger & Execution                       │
│  • Tamper-evident RFC 8785 Canonical JSON SHA-256 hash chains          │
│  • Automated inventory routing (Restock / Refurbish / Liquidate)       │
│  • Multi-tenant Postgres RLS storage & Webhook notifications           │
└────────────────────────────────────────────────────────────────────────┘
```

> **The Commercial ROI**: Shifting just 3% to 5% of return volume from indiscriminate liquidation to verified restock directly increases merchant operating margin without increasing customer acquisition costs.

---

## 2. Core Operational Capabilities

The agent systematically answers four mandatory questions for every return unit:

| Pipeline Stage | Operational Question | Implementation & Ground Truth | Output Verdicts |
| :--- | :--- | :--- | :--- |
| **1. Identity** | *Is this the exact SKU/ASIN sold?* | Dual-anchor visual verification against seller catalogue & paperwork cross-checks (`judgment/fusion.py`). | `Matched`, `Mismatch`, `Uncertain` |
| **2. Completeness** | *Are all required parts present?* | Strict Bill-of-Materials verification against manufacturer parts lists with spatial tagging (`judgment/consistency.py`). | `Complete`, `Incomplete` (with missing part breakdown) |
| **3. Condition** | *What physical condition is it in?* | Evaluated strictly against published Amazon condition rubrics (`New`, `Like New`, `Very Good`, `Good`, `Acceptable`). | Standardized condition grade & observed defects |
| **4. Disposition** | *What happens to this unit next?* | Deterministic routing based on merchant category policy, completeness, and grade (`disposition/engine.py`). | `Restock`, `Refurbish`, `Liquidate`, `Dispose`, `Needs Attention` |

---

## 3. Decoupled Architecture: Perception vs. Policy

A critical flaw in legacy AI solutions is prompting Large Language Models to directly dictate operational decisions. Under unstructured prompting, LLMs suffer from policy drift, hallucinated fee waivers, and unpredictable disposition switches.

Returns Manager introduces strict **Separation of Perception and Policy**:
1. **Perception Layer (Non-Authoritative)**: The multimodal vision model is constrained strictly to reporting physical observations (visible scratches, seal integrity, visible serial numbers, accessory presence). The model's JSON output schema contains **no disposition field**.
2. **Policy Layer (Deterministic & Authoritative)**: A hardened Python rule engine (`disposition/engine.py`) takes the model's structured observations, fuses them with catalog records and seller policies, and applies rules `R01` through `R14` (with `R99` as a fallback rule gap). Every verdict is 100% deterministic, auditable, and reproducible without an AI re-run.

---

## 4. Dual Runtime Modalities

Returns Manager is engineered to run in two distinct environments:

### 4.1 Enterprise Microservice (Postgres + RLS + API)
- **FastAPI Core**: Asynchronous REST endpoints for batch intake, unit inspection, evidence retrieval, and telemetry.
- **Tenancy Isolation via Postgres RLS**: Tenant boundaries are enforced natively at the database layer using Row-Level Security (`org_id = current_setting('app.org_id')`). The application connects as `rm_app_login` (`NOBYPASSRLS`).
- **Resilient Worker Queue**: Background worker with circuit breakers, daily Gemini free-tier quota guards, and automated fail-open routing to the supervisor review queue (`jobs/worker.py`).

### 4.2 Standalone Batch Processing CLI (Zero-Database)
- An offline, high-throughput CLI tool (`batch/runner.py`) for processing bulk CSV intake files without requiring Supabase or external persistence.
- Evaluates sold-vs-returned datasets, builds synthetic product cards, invokes the vision judgment pipeline, and exports RFC-compliant verification CSVs.

---

## 5. Executive White & Black Command Hub

The platform features a custom-engineered, executive monochrome interface designed for high-contrast visibility and cognitive clarity in fast-paced logistics environments:

- **Executive Navigation**: Horizontal command header with telemetry pulse, workspace switcher, and quick review counters.
- **Bento Grid Analytics**: Real-time distribution charts, condition grade volume, identity mismatch telemetry, and SLA tracking.
- **Side-by-Side Visual Dossier**: High-resolution inspector view with side-by-side catalog vs. returned photo comparison and zoom inspection.
- **Supervisor Triage & Review Queue**: Dedicated escalation station for cases flagged as `Uncertain`, damaged, or mismatched.
- **Unit Digital Passport**: Complete end-to-end lifecycle inspection history with tamper-evident cryptographic hash links.

---

## 6. Cryptographic Auditability & Traceability

Returns Manager serves as Step 4 in the unified supply chain, producing evidence records consumed downstream by the **Recovery Manager**:

- **RFC 8785 Canonical JSON Hashing**: Every observation, image hash, and check result is serialized into Canonical JSON (JCS) and hashed with SHA-256 to ensure byte-level determinism across different programming languages and JSON parsers.
- **Tamper-Evident Hash Chaining**: Successive return events for each unit are linked via cryptographic hash pointers (`previous_record_hash`), guaranteeing verifiable audit trails for carrier claims and dispute resolution.
- **Four-Eyes Operator Override**: Human supervisor overrides are explicitly recorded as append-only superseding versions (`ADR-001`, `ADR-007`), preserving the original machine observation intact.

---

## 7. Technology Stack

- **Backend Runtime**: Python 3.12, UV package manager, FastAPI, Pydantic v2
- **Vision & LLM**: Google Gemini 2.5 Flash via Google GenAI SDK (Stateful session chaining via `previous_interaction_id`)
- **Database & Security**: PostgreSQL 15+ (Supabase), Row-Level Security (RLS), RFC 8785 JCS, SHA-256
- **Frontend Architecture**: React 19, TypeScript, Vite, TailwindCSS & Vanilla CSS design tokens, Lucide Icons, Recharts, Framer Motion
- **DevOps & Deployment**: Docker multi-stage build, Render PaaS (`cube26-rtn-0038-krishnababu`), GitHub Actions

---

## 8. Quickstart & Local Setup

### 8.1 Backend API & Worker
```sh
# Navigate to agent directory
cd agent

# Sync Python virtual environment & dependencies
uv sync

# Launch local Supabase / Postgres (Docker required)
npx supabase start

# Apply database migrations and seed demo fixtures
uv run returns-manager db migrate
uv run returns-manager seed demo

# Run development verification suite (Lint, Typecheck, Tests, Boundary rules)
uv run returns-manager dev check

# Start background queue worker
uv run returns-manager worker

# Start FastAPI application server
uv run returns-manager api serve --port 8000
```

### 8.2 Frontend Web Console
```sh
# Navigate to UI directory
cd ui

# Install node dependencies
npm install

# Start local development server
npm run dev

# Compile production bundle
npm run build
```

### 8.3 Running the Offline Batch Tool
```sh
cd agent
uv run returns-manager batch process \
  --before  ../data/before_sample.csv \
  --returned ../data/returned_sample.csv \
  --out      ../data/output_inspection.csv
```

---

## 9. Render Deployment Configuration

The repository includes a ready-to-deploy [`render.yaml`](render.yaml) specification:

```yaml
services:
  - type: web
    name: cube26-rtn-0038-krishnababu
    runtime: docker
    plan: free
    region: oregon
    dockerfilePath: ./Dockerfile
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 8000
      - key: RM_MODEL_PROVIDER
        value: gemini
      - key: RM_JUDGMENT_MODEL
        value: gemini-2.5-flash
```

Pushing to `main` or `krishnababu` triggers an automated Docker image build, schema validation, and zero-downtime deployment.

---

## 10. Architectural Decisions Records (ADRs)

Key architectural choices are formally documented in the [`decisions/`](decisions/) directory:
- [`ADR-001`](decisions/ADR-001-data-model-and-ids.md): Typed entity prefixes (`ret_`, `pho_`, `rec_`) and RFC 8785 canonical hashing.
- [`ADR-002`](decisions/ADR-002-rule-2-batch-inspection.md): Batch inspection execution boundary and memory limits.
- [`ADR-003`](decisions/ADR-003-tenancy-mechanism.md): Strict Postgres RLS tenancy isolation via tenant transactions.
- [`ADR-004`](decisions/ADR-004-identity-and-auth.md): Dual-role authentication (`operator` vs `supervisor`) and API key scoping.
- [`ADR-005`](decisions/ADR-005-cross-pod-evidence-contract.md): Cross-manager interoperability contract for downstream Recovery Manager consumption.
- [`ADR-007`](decisions/ADR-007-hash-chain-scope-and-honest-claim-wording.md): Honest claim boundary: Tamper-evident within database, not immutable.
- [`ADR-008`](decisions/ADR-008-cost-guards-and-sampling-rates.md): Daily token quota guards and fallback model failover.

---

## 11. Project & Engineering Credentials

- **Engineer**: Krishna Babu (`krishnababu`)
- **Repository**: [`krishnababuprodduturu/cube26-rtn-0038-krishnababu`](https://github.com/krishnababuprodduturu/cube26-rtn-0038-krishnababu)
- **Specification ID**: `RTN-0038` · Cube Buildathon Round 2
- **License**: MIT
