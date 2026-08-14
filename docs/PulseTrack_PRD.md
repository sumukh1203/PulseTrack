# PulseTrack — Product Requirements Document

**Project Type:** Backend Engineering Portfolio Project
**Author:** Sumukh
**Version:** 1.0
**Status:** Draft — Phase 1 In Planning
**Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Neon PostgreSQL, Upstash Redis, Render

---

## 1. Executive Summary

**PulseTrack** is a lightweight, high-performance event-collection backend for capturing custom telemetry — button clicks, page views, feature usage, and other product-analytics signals — from client applications (web, mobile, or server-side).

It exists as a scoped-down, self-hosted alternative to services like Segment, PostHog, or Mixpanel, built specifically to demonstrate production-grade backend engineering competency: schema design, async I/O, API security, caching strategy, and high-concurrency systems design.

**Why it exists:**
- **For the portfolio:** Most portfolio projects are CRUD apps. PulseTrack is deliberately an **ingestion-heavy, write-optimized system**, which forces decisions recruiters actually care about — indexing strategy, backpressure handling, idempotency, and horizontal scaling — rather than generic REST scaffolding.
- **For the architecture:** It is structured as two distinct phases so the repository itself tells a story: Phase 1 proves correctness and fundamentals; Phase 2 proves the author can identify bottlenecks and re-architect for scale under real constraints (Redis, async queues, rate limiting).

**Non-goals:** PulseTrack is not a full analytics suite. It does not include a dashboard UI, cohort analysis, funnels, or a JS SDK beyond a minimal snippet — the focus is exclusively the ingestion and aggregation backend.

---

## 2. Target Audience & Core Use Case

**Primary audience (of the deployed product):** Indie developers, small SaaS teams, and internal tools that want to self-host basic event tracking without third-party data-sharing or per-MAU pricing.

**Primary audience (of the portfolio artifact):** Recruiters and technical interviewers evaluating backend/systems-design ability.

### Core Use Case: Event Lifecycle

A user clicks a "Sign Up" button on a client's marketing site. The following sequence occurs end-to-end:

1. **Capture (Client):** A lightweight tracking snippet (or SDK call) on the frontend intercepts the click and constructs an event payload:
   ```json
   {
     "event_name": "button_click",
     "occurred_at": "2026-08-03T10:15:00Z",
     "session_id": "sess_9f8a...",
     "distinct_id": "user_42",
     "metadata": { "button_id": "cta-hero", "page": "/pricing", "variant": "B" }
   }
   ```
2. **Transmit:** The client sends `POST /v1/events` to the PulseTrack API, authenticated via an `X-API-Key` header scoped to the registered application.
3. **Authenticate & Validate (API layer):** FastAPI validates the payload against a Pydantic schema and resolves the API key to an `application_id`.
   - *Phase 1:* Key lookup hits Postgres directly.
   - *Phase 2:* Key lookup and rate-limit check hit Redis first (cache-aside), falling back to Postgres on a cache miss.
4. **Persist:**
   - *Phase 1:* The event is written synchronously to the `events` table via an async SQLAlchemy session, and the API returns `201 Created` only after the commit succeeds.
   - *Phase 2:* The event is pushed onto a Redis-backed queue and the API returns `202 Accepted` immediately (sub-10ms). A pool of **ARQ workers** consumes the queue and performs **batched inserts** into Postgres, decoupling client-perceived latency from database write throughput.
5. **Aggregate:** At any later point, the application owner calls `GET /v1/applications/{app_id}/metrics` to retrieve counts of `button_click` events grouped by day. This query hits Postgres directly in Phase 1, and a Redis-cached rollup (TTL-based) in Phase 2.

This lifecycle is the spine of the system: everything in Sections 3–6 exists to make steps 3–5 fast, correct, and resilient under load.

---

## 3. Scope & Requirements

### Phase 1 — Core MVP (Correctness First)

Goal: a fully functional, synchronously-consistent ingestion pipeline with clean architecture, proving fundamentals before optimizing for scale.

| # | Requirement | Detail |
|---|---|---|
| 1.1 | Application registration | `POST /v1/applications` creates an app record and issues a one-time-visible API key |
| 1.2 | API key authentication | Middleware validates `X-API-Key` on every protected route; keys stored as SHA-256 hashes, never in plaintext |
| 1.3 | Event ingestion (single) | `POST /v1/events`, synchronous write, Pydantic-validated payload, rejects malformed/oversized metadata |
| 1.4 | Persistence layer | SQLAlchemy 2.0 async engine + asyncpg driver against Neon Postgres; Alembic-managed migrations |
| 1.5 | Basic aggregation | `GET /v1/applications/{app_id}/metrics` — `GROUP BY` query with date-bucketing (day/hour) and event-name filtering |
| 1.6 | Structured error handling | Consistent JSON error envelope (`code`, `message`, `request_id`) across all 4xx/5xx responses |
| 1.7 | Structured logging | JSON logs with request ID, latency, status code for every request (via middleware) |
| 1.8 | Local dev environment | `docker-compose` with Postgres for local development parity |
| 1.9 | Automated tests | `pytest` + `pytest-asyncio` covering auth, ingestion, and aggregation paths |
| 1.10 | Deployment | Live on Render (web service) with Neon as managed Postgres |

**Explicitly out of scope for Phase 1:** caching, rate limiting, async queues, multi-tenant dashboards, batch ingestion.

### Phase 2 — Advanced High-Concurrency Upgrades

Goal: identify the bottlenecks Phase 1 exposes under load, and resolve them with the techniques used in production ingestion systems.

| # | Requirement | Detail |
|---|---|---|
| 2.1 | Redis-backed API key cache | Cache-aside pattern for key→application lookups; eliminates a Postgres round-trip on every ingest call |
| 2.2 | Rate limiting | Per-API-key sliding-window or token-bucket limiter implemented in Redis (Lua script for atomicity); returns `429` with `Retry-After` |
| 2.3 | Async ingestion queue | Events pushed to a Redis Stream/List on write; API responds `202 Accepted` without waiting on Postgres |
| 2.4 | Background workers (ARQ) | ARQ worker pool consumes the queue and performs **batched, bulk inserts** (e.g., `executemany` / `COPY`) to amortize write cost |
| 2.5 | Idempotency support | Optional `Idempotency-Key` header; duplicate submissions within a 24h window are deduplicated via a unique constraint |
| 2.6 | Batch ingestion endpoint | `POST /v1/events/batch` — accepts up to 500 events per request for high-frequency clients |
| 2.7 | Aggregation caching | Metrics endpoint caches rollup results in Redis with short TTL (e.g., 30–60s) and cache-busting on write-heavy windows |
| 2.8 | Table partitioning | `events` table partitioned by `RANGE (occurred_at)` (monthly) to keep indexes small and queries fast at scale |
| 2.9 | Dead-letter handling | Failed batch inserts (after N retries) are routed to a DLQ list in Redis for inspection/replay |
| 2.10 | Observability | `/metrics` endpoint (Prometheus format), correlation IDs propagated from API → worker logs |
| 2.11 | Load testing | Locust or k6 scripts demonstrating the system meets NFR targets (Section 4) under simulated load |
| 2.12 | CI/CD | GitHub Actions pipeline: lint (ruff), type-check (mypy), test, deploy-on-merge to Render |

---

## 4. Non-Functional Requirements (NFRs)

| Category | Target | Notes |
|---|---|---|
| **Ingest latency (Phase 1)** | p95 < 100ms | Synchronous DB write included |
| **Ingest latency (Phase 2)** | p95 < 50ms, p99 < 100ms | Measured at API response (write is queued, not committed) |
| **Aggregation latency** | p95 < 200ms (cache miss), p95 < 20ms (cache hit) | Phase 2 only for the cached path |
| **Throughput** | ≥ 500 events/sec sustained on a single Render instance | Target ≥ 2,000 events/sec across autoscaled replicas in Phase 2 |
| **Payload limits** | `metadata` JSONB capped at 8KB per event; batch endpoint capped at 500 events/request | Enforced at the Pydantic validation layer |
| **Availability** | 99.5% (single-region, portfolio-scale target) | No multi-region failover in scope |
| **Durability** | At-least-once delivery | Idempotency key allows consumers to de-duplicate on their end |
| **Fault tolerance** | Redis unavailability triggers graceful degradation to direct synchronous DB writes (feature-flagged fallback) | Prevents total ingestion outage from a single dependency failure |
| **Data retention** | Raw events retained 90 days by default (configurable); older partitions droppable in O(1) via `DETACH PARTITION` | Demonstrates partition-based retention strategy |
| **Security** | API keys hashed at rest (SHA-256), TLS-only in production, no PII required in `metadata` by design | Documented in README as a design constraint, not enforced at schema level |

---

## 5. Data Model

### `applications` table

```sql
CREATE TABLE applications (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  VARCHAR(255) NOT NULL,
    owner_email           VARCHAR(255) NOT NULL,
    api_key_hash          CHAR(64) NOT NULL UNIQUE,      -- SHA-256 hex digest
    api_key_prefix        VARCHAR(12) NOT NULL,          -- e.g. "pt_live_9a2f" — safe to display in UI/logs
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 600,  -- Phase 2
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_api_key_hash ON applications (api_key_hash);
```

### `events` table

```sql
CREATE TABLE events (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    event_name      VARCHAR(100) NOT NULL,               -- e.g. "button_click", "page_view"
    session_id      VARCHAR(64),                         -- client-generated, nullable
    distinct_id     VARCHAR(128),                         -- anonymous or authenticated user identifier
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- arbitrary custom properties
    occurred_at     TIMESTAMPTZ NOT NULL,                 -- client-reported event timestamp
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),   -- server receipt timestamp
    idempotency_key UUID                                  -- Phase 2, optional dedup key
) PARTITION BY RANGE (occurred_at);                       -- Phase 2: monthly partitions

-- Core aggregation index: application + event name + time, descending for recency queries
CREATE INDEX idx_events_app_name_time
    ON events (application_id, event_name, occurred_at DESC);

-- GIN index for querying inside custom metadata (e.g., WHERE metadata->>'page' = '/pricing')
CREATE INDEX idx_events_metadata_gin
    ON events USING GIN (metadata jsonb_path_ops);

-- Phase 2: enforce idempotency per application
CREATE UNIQUE INDEX idx_events_app_idempotency
    ON events (application_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
```

**Design notes:**
- `BIGINT GENERATED ALWAYS AS IDENTITY` is used over `UUID` for the primary key to preserve **insert locality** and keep the B-tree index compact under high write volume — a deliberate trade-off documented for interview discussion.
- `metadata JSONB` is intentionally schemaless to support arbitrary client-defined properties without migrations, at the cost of requiring a GIN index for efficient querying.
- Range partitioning on `occurred_at` (Phase 2) keeps per-partition indexes small, speeds up time-bounded aggregation queries, and enables cheap retention enforcement via `DETACH PARTITION` instead of a slow `DELETE`.

---

## 6. Core API Endpoints

### 6.1 Register Application & Generate API Key

```
POST /v1/applications
```

| | |
|---|---|
| **Headers** | `Content-Type: application/json` |
| **Body** | `{ "name": "My SaaS App", "owner_email": "dev@example.com" }` |

**Response `201 Created`**
```json
{
  "id": "6a1e5c2e-2f3b-4b8a-9e3d-1a2b3c4d5e6f",
  "name": "My SaaS App",
  "api_key": "pt_live_8f2a9b1c3d4e5f6a7b8c9d0e1f2a3b4c",
  "created_at": "2026-08-03T10:00:00Z"
}
```
> ⚠️ The raw `api_key` is returned **only once**, at creation. Only its SHA-256 hash and prefix are persisted.

---

### 6.2 Ingest an Event

```
POST /v1/events
```

| | |
|---|---|
| **Headers** | `X-API-Key: pt_live_...` · `Content-Type: application/json` · `Idempotency-Key: <uuid>` *(optional, Phase 2)* |
| **Body** | See payload below |

```json
{
  "event_name": "button_click",
  "occurred_at": "2026-08-03T10:15:00Z",
  "session_id": "sess_9f8a7b6c",
  "distinct_id": "user_42",
  "metadata": { "button_id": "cta-hero", "page": "/pricing" }
}
```

**Response — Phase 1 `201 Created`**
```json
{ "id": 10432, "status": "stored" }
```

**Response — Phase 2 `202 Accepted`** *(queued for async batch write)*
```json
{ "status": "queued", "trace_id": "req_f3a1c9" }
```

**Error responses:** `401 Unauthorized` (invalid/missing key) · `422 Unprocessable Entity` (schema validation) · `429 Too Many Requests` (Phase 2 rate limit, includes `Retry-After` header)

---

### 6.3 Retrieve Aggregated Metrics

```
GET /v1/applications/{app_id}/metrics?event_name=button_click&start_date=2026-08-01&end_date=2026-08-03&granularity=day
```

| | |
|---|---|
| **Headers** | `X-API-Key: pt_live_...` |
| **Query Params** | `event_name` (required), `start_date`, `end_date` (ISO 8601), `granularity` (`hour` \| `day`, default `day`) |

**Response `200 OK`**
```json
{
  "event_name": "button_click",
  "granularity": "day",
  "cache_hit": true,
  "data": [
    { "bucket": "2026-08-01", "count": 1523 },
    { "bucket": "2026-08-02", "count": 1871 },
    { "bucket": "2026-08-03", "count": 640 }
  ]
}
```

*(`cache_hit` field added in Phase 2 to make the caching layer's behavior visible/demonstrable.)*

---

### 6.4 Supporting Endpoints

| Method & Path | Purpose |
|---|---|
| `POST /v1/events/batch` | *(Phase 2)* Ingest up to 500 events in a single request |
| `POST /v1/applications/{app_id}/keys/rotate` | *(Phase 2)* Invalidate current key, issue a new one |
| `GET /v1/health` | Liveness/readiness check for Render + uptime monitoring |

---

## 7. Definition of Done

**Phase 1 is complete when:**
- [ ] All endpoints in Section 6.1–6.3 (sync variants) are implemented and pass integration tests
- [ ] Test suite (`pytest`) achieves ≥ 80% coverage on `app/` core logic, all green in CI
- [ ] Interactive OpenAPI/Swagger docs auto-generated by FastAPI are live at `/docs` and `/redoc`
- [ ] Alembic migrations run cleanly from an empty database
- [ ] Application is deployed and publicly reachable on Render, backed by Neon Postgres
- [ ] `README.md` includes architecture diagram, setup instructions, and sample `curl` requests
- [ ] Structured JSON logging is verifiable in Render's log stream

**Phase 2 is complete when:**
- [ ] Redis (Upstash) is integrated for key caching, rate limiting, and metrics caching
- [ ] ARQ worker(s) deployed as a separate Render background worker, consuming the ingestion queue
- [ ] Load test (Locust/k6) report is included in the repo, demonstrating the latency/throughput targets from Section 4 are met
- [ ] Idempotency and batch ingestion are covered by tests, including duplicate-submission scenarios
- [ ] `events` table partitioning is live with at least 2 partitions demonstrated
- [ ] `/metrics` Prometheus endpoint is exposed and documented
- [ ] CI/CD pipeline (GitHub Actions) runs lint + type-check + tests on every PR and auto-deploys `main`
- [ ] A short **"Design Decisions & Trade-offs"** doc is added to the repo explaining *why* each Phase 2 upgrade was made — this is the artifact recruiters will actually read

---

*End of document.*
