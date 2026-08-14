# Changelog

All notable changes to the **PulseTrack** backend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Guiding Principles & Change Categories

Every release entry is structured into standard Keep a Changelog categories:

- **`Added`** for new features, endpoints, design specifications, or infrastructure.
- **`Changed`** for changes in existing functionality, interfaces, or configurations.
- **`Deprecated`** for soon-to-be-removed features or legacy contract elements.
- **`Removed`** for now-removed features, dead code, or obsolete dependencies.
- **`Fixed`** for any bug fixes, defect resolutions, or patch updates.
- **`Security`** for vulnerability fixes, security enhancements, or credential updates.

---

## Release History Overview

```
Completed Planning & Architecture Releases:
  [0.1.0] -> [0.2.0] -> [0.3.0] -> [0.4.0] (Current Documentation Milestone)

Planned Development & Roadmap Releases:
  Phase 1 MVP:      [0.5.0] -> [0.6.0] -> [0.7.0] -> [0.8.0] -> [0.9.0] -> [1.0.0]
  Phase 2 Advanced: [1.1.0] -> [1.2.0] -> [1.3.0] -> [1.4.0] -> [2.0.0]
```

---

## Completed Releases

### [0.4.0] - 2026-08-05 — Operational Readiness

**Status:** Completed (Design Deliverable)  
**Summary:** Established the production operational manual, observability architecture, and enterprise risk management framework.

#### Added
- **Deployment Guide (`PulseTrack_Deployment_Guide.md`):** Complete operational manual detailing Docker multi-stage builds, Render deployment topology (`render.yaml`), Neon PostgreSQL branching, Upstash Redis provisioning, environment variable matrix, rollbacks, and operational checklists.
- **Monitoring & Logging Design (`PulseTrack_Monitoring_and_Logging_Design.md`):** Observability blueprint defining 100% structured JSON logging, `X-Request-ID` and `correlation_id` tracing, Prometheus metrics exposition (`GET /metrics`), health probes (`GET /v1/health`), 7 core dashboards, 13 alerting rules, and 9 SRE runbooks.
- **Risk Register & Management (`PulseTrack_Risk_Register.md`):** Official risk register with quantitative $5 \times 5$ scoring methodology, 25+ named risks (RSK-01 to RSK-25), 8 disaster contingency runbooks, and RACI ownership matrix.

---

### [0.3.0] - 2026-08-05 — Engineering Standards & Specifications

**Status:** Completed (Design Deliverable)  
**Summary:** Defined coding standards, internal folder layering, security controls, sequence diagrams, architecture decision records, and testing strategy.

#### Added
- **Backend Folder Structure (`PulseTrack_Folder_Structure.md`):** Strict 17-module layered layout enforcing inward dependency flow (`api → dependencies → services → repositories → models/database`).
- **Security Design Document (`Security_Design_Document.md`):** Threat model, CSPRNG API key generation (`pt_live_`/`pt_test_`), SHA-256 key hashing at rest, constant-time verification (`secrets.compare_digest`), query-layer tenant scoping (`application_id`), and payload size caps (1MB body, 10KB metadata).
- **Sequence Diagram Document (`Sequence_Diagram_Design_Document.md`):** Mermaid sequence diagrams mapping synchronous ingestion, async queueing, metrics aggregation, key rotation, fail-open fallbacks, and worker DLQ execution.
- **Architecture Decision Records (`architecture.md` §13):** Documented ADR-001 through ADR-009 (e.g., `BIGINT IDENTITY` for `events.id`, synchronous MVP deferral, fixed-window rate limiting, static API keys, ARQ over Celery).
- **Testing Strategy (`PulseTrack_Testing_Strategy.md`):** Testing blueprint defining unit/integration/API testing tiers, Pytest configuration, 80%+ test coverage floor, and transaction-per-test isolation.
- **Coding Standards (`PulseTrack_Coding_Standards.md`):** Enterprise Python 3.12+ style guide, FastAPI router conventions, SQLAlchemy 2.0 async standards, static analysis rules (`mypy --strict`, `ruff`, `bandit`), anti-patterns, and code review checklists.

---

### [0.2.0] - 2026-08-05 — System Design Specifications

**Status:** Completed (Design Deliverable)  
**Summary:** Formalized system requirements, API contracts, logical component architecture, and relational database schema.

#### Added
- **Software Requirements Specification (`PulseTrack_SRD.md`):** Functional and non-functional requirements (NFR-PERF-01 <50ms p95 ingest, NFR-REL-02 fail-open Redis fallback, NFR-SCAL-01 500–2,000 events/sec).
- **API Design Document (`PulseTrack_API_Design.md`):** HTTP interface specifications for `/v1/applications`, `/v1/events`, `/v1/events/batch`, `/v1/applications/{id}/metrics`, and `/v1/health`, including standard error envelopes.
- **Architecture Document (`architecture.md`):** High-level component architecture, request flows, technology stack rationales, and Render deployment topology.
- **Database Design Document (`PulseTrack_Database_Design.md`):** PostgreSQL DDL schema for `applications` and `events` tables, monthly range partitioning, B-tree indexes, GIN index on `metadata`, and migration strategies.

---

### [0.1.0] - 2026-08-05 — Project Initialization

**Status:** Completed (Design Deliverable)  
**Summary:** Project kickoff, initial product requirements definition, repository setup, and development roadmap planning.

#### Added
- **Product Requirements Document (`PulseTrack_PRD.md`):** Initial product vision, business goals, core capabilities, target personas, and scope boundaries.
- **Development Roadmap (`PulseTrack_Development_Roadmap.md`):** Phase-by-phase implementation plan detailing Phase 1 (Synchronous MVP) and Phase 2 (High-Volume Asynchronous Queueing).
- **Repository Setup:** Version control initialization, initial directory structure, `.gitignore`, and project license.

---

## Planned Releases (Roadmap Execution)

The following releases represent planned software implementation milestones defined in `PulseTrack_Development_Roadmap.md`.

---

### [0.5.0] — Foundation & Core Infrastructure

**Status:** Planned (Roadmap Phase 1)  
**Target:** Project Foundation Setup

#### Planned Changes
- **Added:** Python 3.12+ project configuration in `pyproject.toml` with pinned dependencies (`fastapi`, `sqlalchemy`, `asyncpg`, `pydantic-settings`, `alembic`).
- **Added:** Multi-stage `Dockerfile` and `docker-compose.yml` for local PostgreSQL 16 and Redis 7 container development.
- **Added:** Core configuration loader (`app/core/config.py`) using `pydantic-settings` to parse `.env` files.
- **Added:** Structured JSON logging setup in `app/core/logging.py`.
- **Added:** Async database engine and session factory in `app/database/session.py`.
- **Added:** Alembic database migration environment in `alembic/`.

---

### [0.6.0] — Authentication & Tenant Management

**Status:** Planned (Roadmap Phase 1)  
**Target:** Application Tenant & Security Domain

#### Planned Changes
- **Added:** `Application` ORM model (`app/models/application.py`) and Pydantic schemas (`app/schemas/application.py`).
- **Added:** CSPRNG API Key generation (`pt_live_...`, `pt_test_...`) and SHA-256 key hashing in `app/security/api_key.py`.
- **Added:** `ApplicationRepository` with methods for key resolution, creation, and soft deletion.
- **Added:** `ApplicationService` implementing tenant creation and key rotation logic.
- **Added:** `get_current_application` FastAPI dependency in `app/dependencies/auth.py` for API key verification using `secrets.compare_digest`.
- **Added:** Tenant management endpoints: `POST /v1/applications`, `GET /v1/applications/{id}`, `POST /v1/applications/{id}/rotate-key`.

---

### [0.7.0] — Synchronous Event Ingestion

**Status:** Planned (Roadmap Phase 1)  
**Target:** Core Ingestion Engine (Phase 1 Sync Path)

#### Planned Changes
- **Added:** `Event` ORM model (`app/models/event.py`) with `BIGINT IDENTITY` primary key and `metadata` JSONB column.
- **Added:** Event Pydantic schemas (`EventCreate`, `EventIngestResponse`) with payload validation rules.
- **Added:** `EventRepository` with single event `create()` method.
- **Added:** `IngestionService` implementing synchronous database write path returning `201 Created`.
- **Added:** Ingestion endpoint: `POST /v1/events`.
- **Added:** `Idempotency-Key` header parsing to prevent duplicate event inserts.

---

### [0.8.0] — Metrics & Query Aggregation

**Status:** Planned (Roadmap Phase 1)  
**Target:** Telemetry Aggregation Engine

#### Planned Changes
- **Added:** Metrics Pydantic schemas (`MetricsQuery`, `MetricsResponse`, `MetricBucket`) in `app/schemas/metrics.py`.
- **Added:** Date-truncation utility functions in `app/utils/time_buckets.py` for `minute`, `hour`, and `day` granularities.
- **Added:** `AggregationService` and repository query methods to execute bucketed SQL `GROUP BY` aggregations.
- **Added:** Metrics endpoint: `GET /v1/applications/{id}/metrics`.

---

### [0.9.0] — Quality Assurance & CI/CD Automation

**Status:** Planned (Roadmap Phase 1)  
**Target:** Testing & Deployment Readiness

#### Planned Changes
- **Added:** Comprehensive test suite in `tests/` utilizing `pytest`, `pytest-asyncio`, and `httpx.AsyncClient`.
- **Added:** `GET /v1/health` deep health check endpoint in `app/api/v1/health.py`.
- **Added:** GitHub Actions CI workflow (`.github/workflows/ci.yml`) enforcing linting (`ruff`), strict typing (`mypy --strict`), security scanning (`bandit`), and 80%+ test coverage.

---

### [1.0.0] — Production-Ready MVP Release

**Status:** Planned (Roadmap Phase 1 Milestone)  
**Target:** Phase 1 Public Release Candidate

#### Planned Changes
- **Added:** Initial production deployment to Render Web Service connected to Neon PostgreSQL.
- **Added:** Complete production verification, OpenAPI documentation (`/docs`), and release tag `v1.0.0`.

---

### [1.1.0] — Asynchronous Queueing & Worker Pool

**Status:** Planned (Roadmap Phase 2)  
**Target:** High-Throughput Async Ingestion Path

#### Planned Changes
- **Added:** Upstash Redis async client factory in `app/cache/client.py`.
- **Added:** Redis queue abstraction (`app/queue/event_queue.py`) for push/pop event buffer management.
- **Added:** ARQ Worker process configuration in `app/workers/worker_settings.py` and task handler `workers/tasks/ingest_batch.py`.
- **Added:** Bulk insert repository method (`EventRepository.bulk_insert()`) executing batched SQL inserts of up to 500 rows.
- **Changed:** `POST /v1/events` to return `202 Accepted` (queued) when Redis queueing is active.
- **Added:** Batch event ingestion endpoint: `POST /v1/events/batch`.

---

### [1.2.0] — Resiliency & Fail-Open Fallback

**Status:** Planned (Roadmap Phase 2)  
**Target:** Fault Tolerance & Data Loss Prevention

#### Planned Changes
- **Added:** Automated **Fail-Open Resiliency** (NFR-REL-02): If Redis is unavailable, `IngestionService` catches `RedisError` and seamlessly falls back to synchronous PostgreSQL insertion (`201 Created`).
- **Added:** ARQ worker retry policy (3 attempts with exponential backoff) and Dead-Letter Queue (`dlq:events`) routing for permanently failing batches.

---

### [1.3.0] — Rate Limiting & High-Volume Caching

**Status:** Planned (Roadmap Phase 2)  
**Target:** Ingestion Abuse Protection & Read Acceleration

#### Planned Changes
- **Added:** Atomic fixed-window rate limiter (`app/rate_limiting/limiter.py`) using Upstash Redis Lua scripts keyed by `application_id`.
- **Added:** Cache-aside helper (`app/cache/cache_aside.py`) for API Key resolution (TTL 300s) and aggregation metrics caching (TTL 60s).
- **Added:** `HTTP 429 Too Many Requests` error response envelope on rate limit breaches.

---

### [1.4.0] — Prometheus Telemetry & Observability

**Status:** Planned (Roadmap Phase 2)  
**Target:** SRE Observability Exposition

#### Planned Changes
- **Added:** Prometheus metrics exporter (`app/observability/prometheus.py`) mounting `GET /metrics`.
- **Added:** Metrics counters and histograms: request throughput, p50/p95/p99 latency, event ingestion mode counters, worker queue depth gauge, and DB pool usage gauge.

---

### [2.0.0] — Scale & Enterprise Production Release

**Status:** Planned (Roadmap Phase 2 Milestone)  
**Target:** High-Scale Production Release

#### Planned Changes
- **Added:** Automated monthly range-partition creation script (`app/scripts/create_next_partition.py`).
- **Changed:** Optimized bulk database insert parameters and worker concurrency for sub-50ms p95 ingestion under 2,000 events/sec load.
- **Added:** Final Phase 2 production release tag `v2.0.0`.

---

## Versioning Rules & Governance

PulseTrack strictly adheres to **Semantic Versioning 2.0.0**:

$$\text{MAJOR}.\text{MINOR}.\text{PATCH} \quad (\text{e.g., } 1.2.3)$$

### 1. MAJOR Version Bumps (`X.0.0`)
A MAJOR bump occurs when incompatible, breaking changes are introduced:
- Breaking changes to the public HTTP API contract (`/v1/events` request or response envelope structure).
- Removal of supported API endpoints or breaking authentication protocol changes.
- Incompatible database schema migrations requiring offline downtime.

### 2. MINOR Version Bumps (`0.Y.0` / `1.Y.0`)
A MINOR bump occurs when backwards-compatible functionality is added:
- Addition of new API endpoints, query parameters, or optional payload fields.
- Performance optimizations, new background worker tasks, or rate-limiting features.
- Addition of new observability metrics or non-breaking database schema additions.

### 3. PATCH Version Bumps (`0.0.Z` / `1.0.Z`)
A PATCH bump occurs when backwards-compatible bug fixes are released:
- Fixing unexpected application crashes or edge-case handling bugs.
- Security patch updates for third-party dependencies in `pyproject.toml`.
- Documentation or inline code comment updates that do not alter runtime contracts.

### 4. Deprecation Policy
- Feature or endpoint deprecations MUST be announced at least **one Minor version** prior to removal.
- Deprecated endpoints return a standard HTTP header: `Sunset: <Date>` and `Deprecation: true`.

---

## Contribution Rules for CHANGELOG

Contributors and maintainers must follow these rules when submitting Pull Requests:

1. **Mandatory Entry:** Every PR introducing functional changes, bug fixes, security patches, or major documentation MUST include an entry in `CHANGELOG.md` under the `[Unreleased]` header or the target version section.
2. **Category Compliance:** Place changes strictly within official categories (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`).
3. **No Unsubstantiated Claims:** Do not move planned features into completed release sections until code is merged to `main` and verified by CI tests.
4. **Link Issues & PRs:** Where applicable, reference GitHub PR or Issue numbers (e.g., `- Fix memory leak in async session pool (#42)`).

---

*End of document.*
