# Security Design Document

**Project:** PulseTrack - Event-Collection & Telemetry Backend  
**Author:** Sumukh  
**Version:** 1.0  
**Status:** Draft - Pre-Implementation Security Blueprint  
**Purpose:** Define the security model, threats, controls, and component responsibilities for PulseTrack before implementation begins, while remaining consistent with the PRD, SRD, API Design Document, Architecture Document, and documented backend folder structure.

---

## Table of Contents

1. [Security Goals](#1-security-goals)
2. [System Assets](#2-system-assets)
3. [Security Scope and Trust Boundaries](#3-security-scope-and-trust-boundaries)
4. [Threat Model](#4-threat-model)
5. [Authentication and API Key Security](#5-authentication-and-api-key-security)
6. [Authorization and Tenant Isolation](#6-authorization-and-tenant-isolation)
7. [Input Validation and Payload Security](#7-input-validation-and-payload-security)
8. [Data Protection](#8-data-protection)
9. [Database Security](#9-database-security)
10. [Redis, Queue, and Worker Security](#10-redis-queue-and-worker-security)
11. [Rate Limiting and Abuse Protection](#11-rate-limiting-and-abuse-protection)
12. [Transport and Network Security](#12-transport-and-network-security)
13. [Secrets and Configuration Management](#13-secrets-and-configuration-management)
14. [Logging, Monitoring, and Auditability](#14-logging-monitoring-and-auditability)
15. [Error Handling and Failure Modes](#15-error-handling-and-failure-modes)
16. [Application Lifecycle Security](#16-application-lifecycle-security)
17. [Component Security Responsibilities](#17-component-security-responsibilities)
18. [Security Test Plan](#18-security-test-plan)
19. [Residual Risks and Accepted Trade-Offs](#19-residual-risks-and-accepted-trade-offs)
20. [Security Implementation Checklist](#20-security-implementation-checklist)

---

## 1. Security Goals

PulseTrack is an ingestion-heavy backend that receives telemetry events from client applications and stores them under a registered application tenant. Its security posture must protect API keys, tenant data, write-path availability, and operational integrity without adding technologies outside the documented stack.

### 1.1 Confidentiality

PulseTrack must prevent unauthorized disclosure of API keys, application records, event data, metadata, database credentials, Redis credentials, and operational logs.

This matters because API keys are bearer credentials. Anyone with a valid key can submit events and read metrics for the associated application. Event metadata is intentionally schemaless JSONB and may contain sensitive client-defined values even though PulseTrack does not require PII by design.

### 1.2 Integrity

PulseTrack must preserve the correctness of application records, event records, metrics responses, idempotency behavior, and audit-relevant logs.

This matters because PulseTrack's primary product value is trustworthy telemetry. Unauthorized writes, duplicate events, cross-tenant reads, malformed timestamps, or corrupted aggregation results would make the system unreliable even if it remains available.

### 1.3 Availability

PulseTrack must continue accepting valid ingestion traffic during expected dependency degradation where the architecture explicitly supports fallback.

This matters because `POST /v1/events` is the critical path. In Phase 2, Redis improves latency, caching, rate limiting, and queueing, but Redis unavailability must degrade ingestion to the direct PostgreSQL write path rather than causing a broad outage, as defined in the SRD and architecture.

### 1.4 Least Privilege

Every component must use only the access it needs:

- Client runtimes authenticate only through API keys scoped to one application.
- API routes must access only the authenticated application's data.
- Workers consume validated queued events and write event rows; they do not expose public endpoints.
- GitHub Actions, Render services, Neon PostgreSQL, and Upstash Redis credentials must be scoped to the minimum practical environment and service role.

This matters because PulseTrack is intentionally stateless and horizontally scalable. Least privilege prevents one compromised key, process, or route from becoming system-wide access.

### 1.5 Defense in Depth

PulseTrack must not rely on a single control. API key hashing, constant-time comparison, query-level tenant scoping, Pydantic validation, database constraints, TLS, structured error envelopes, rate limiting, and log redaction all protect different layers.

This matters because ingestion systems are exposed to high-volume machine traffic. Any one control can be bypassed by implementation defects, operational mistakes, or malformed input.

### 1.6 Zero Trust Principles

PulseTrack must treat every external request, client-supplied identifier, timestamp, metadata object, header, and idempotency key as untrusted. In Phase 2, worker processes must also treat queue payloads as data requiring defensive parsing because Redis is an internal dependency, not a security boundary.

This matters because clients may be browsers, mobile apps, backend services, scripts, or SDKs outside PulseTrack's administrative control.

### 1.7 Fail Secure

When authentication, authorization, payload validation, database writes, or tenant-scope checks fail, the request must fail closed with a structured error. No request may proceed with an unknown application identity.

This matters because a telemetry backend has high write volume; permissive failure behavior in auth or validation would quickly create polluted data or cross-tenant exposure.

### 1.8 Secure by Default

The default implementation must be safe without special operator intervention:

- API keys are generated with a CSPRNG.
- Raw API keys are returned only once.
- API keys are stored only as SHA-256 hashes plus a display-safe prefix.
- Production traffic is TLS-only.
- Structured logs exclude raw credentials.
- Application data is isolated by authenticated `application_id`.
- Phase 1 does not expose Redis-dependent controls that belong to Phase 2.

---

## 2. System Assets

### 2.1 Credential Assets

| Asset | Description | Required Protection |
|---|---|---|
| Raw API keys | Bearer credentials returned once during application creation or key rotation | Never stored, never logged, shown only once |
| API key hashes | SHA-256 hex digests persisted in `applications.api_key_hash` | Protected as credential-equivalent data |
| API key prefixes | Short display-safe prefixes, e.g. `pt_live_8f` or 8-12 characters | Safe for logs/UI, but not sufficient for auth |
| `DATABASE_URL` | Render-provided Neon PostgreSQL connection string | Secret; environment variable only |
| `REDIS_URL` | Render-provided Upstash Redis connection string, Phase 2 | Secret; environment variable only |
| GitHub Actions deploy secrets | CI/CD credentials for test/deploy pipeline | Stored only in GitHub secret storage |

### 2.2 Application and Tenant Assets

| Asset | Description | Required Protection |
|---|---|---|
| `applications.id` | Tenant identifier used for scoping | Must not authorize access by itself |
| `applications.owner_email` | Application owner contact email | Protected from cross-tenant reads and unnecessary logging |
| `applications.name` | Client-defined application name | Validated and tenant-scoped |
| `applications.is_active` | Determines whether a key/application may be used | Enforced on every protected request |
| `applications.rate_limit_per_minute` | Phase 2 per-application rate limit | Protected from unauthorized modification |

### 2.3 Event and Metrics Assets

| Asset | Description | Required Protection |
|---|---|---|
| `events` rows | Telemetry events for each application | Tenant-isolated, validated, retained per policy |
| `metadata` JSONB | Client-defined event properties, capped at 8KB | Validated for size and treated as potentially sensitive |
| `session_id` | Optional client-supplied session identifier | Tenant-scoped and length-limited |
| `distinct_id` | Optional opaque actor identifier | Tenant-scoped; may be sensitive if clients put PII in it |
| `occurred_at` | Client-reported timestamp | Validated for timezone-aware ISO 8601 format |
| `ingested_at` | Server-generated receipt timestamp | Generated server-side only |
| Metrics aggregation results | Time-bucketed event counts | Tenant-scoped; cache keys must include `application_id` |
| Idempotency keys | Optional Phase 2 duplicate-protection tokens | Scoped by `application_id`, retained for the deduplication window |

### 2.4 Operational Assets

| Asset | Description | Required Protection |
|---|---|---|
| Structured logs | JSON request logs with request ID, route, status, latency | No raw API keys; minimal sensitive payload data |
| Error responses | Machine-parseable error envelopes | No stack traces or secrets |
| `/v1/health` | Health endpoint for Render and uptime monitors | Must not expose credentials or detailed internals |
| `/metrics` | Phase 2 Prometheus-format operational endpoint | Internal/operator only |
| Redis queue | Phase 2 event buffer | Accepts only server-validated payloads from API process |
| Redis DLQ | Phase 2 failed-event inspection/replay buffer | Protected because failed payloads may contain event metadata |
| Alembic migrations | Database schema evolution history | Reviewed and executed through controlled pipeline |

---

## 3. Security Scope and Trust Boundaries

### 3.1 In Scope

This document covers:

- Public REST/JSON API behavior.
- API key generation, storage, verification, rotation, and deactivation.
- Tenant isolation for application, event, and metrics routes.
- Event payload validation and metadata size control.
- PostgreSQL persistence and schema constraints.
- Phase 2 Redis cache, queue, rate-limit state, and DLQ security.
- ARQ worker security responsibilities.
- Render deployment configuration and environment secret handling.
- GitHub Actions security expectations for lint, type-check, test, and deploy-on-merge.
- Logging, observability, health checks, and error handling.

### 3.2 Out of Scope

The following are intentionally outside PulseTrack's documented scope and are not introduced by this SDD:

- OAuth2, OpenID Connect, user login, SSO, or delegated authorization.
- A dashboard UI, admin console, analytics UI, or multi-tenant frontend.
- Kubernetes, service mesh, self-hosted Redis, self-managed PostgreSQL, or multi-region failover.
- Full PII detection or data-loss-prevention scanning inside `metadata`.
- A raw event export endpoint.
- WebSocket, gRPC, streaming ingestion, or webhook delivery.

### 3.3 Trust Boundaries

| Boundary | Crossing | Security Requirement |
|---|---|---|
| Client runtime to FastAPI | HTTPS request with headers and JSON body | TLS, API key auth, Pydantic validation, rate limiting in Phase 2 |
| FastAPI to Neon PostgreSQL | SQL over managed database connection | Environment-secret connection string, parameterized ORM queries, migrations only |
| FastAPI to Upstash Redis | Cache, rate-limit, and queue operations, Phase 2 | Secret URL, pooled connections, namespaced keys, safe fallback |
| Redis queue to ARQ worker | Internal queued event payload | Defensive parsing, retry limits, DLQ routing |
| GitHub Actions to Render | CI/CD deployment | Secret storage, gated tests, controlled deploy triggers |
| Operator to logs/metrics | Render logs, `/metrics`, dashboards | Credential redaction, limited operational exposure |

---

## 4. Threat Model

PulseTrack's core threats are organized using STRIDE. The mitigation design uses only the documented architecture and stack.

### 4.1 Spoofing

| Threat | Scenario | Mitigation |
|---|---|---|
| Missing or forged API key | Caller submits ingestion or metrics request without a valid `X-API-Key` | Authenticate every protected route; return `401` with structured error |
| Stolen API key | Attacker obtains a raw key from client code, logs, or operator mishandling | Never store/log raw keys; support Phase 2 key rotation; rate-limit per application |
| Inactive application key reuse | Caller uses a key after application deactivation | Check `is_active` during key resolution; invalidate Redis key cache on deactivation |
| Tenant ID spoofing | Caller sends another `application_id` in the path | Resolve tenant from API key and compare against path ID; return `403` on mismatch |

### 4.2 Tampering

| Threat | Scenario | Mitigation |
|---|---|---|
| Malformed event payload | Client sends missing, oversized, or type-invalid fields | Pydantic request models; explicit field length and metadata size limits |
| Duplicate event from retry | Client retries after timeout and creates duplicate rows | Phase 2 `Idempotency-Key` plus unique `(application_id, idempotency_key)` constraint |
| Queue payload modification | Internal queued message is malformed or unexpected | Worker validates/parses payload defensively before insert |
| Schema drift | Manual database changes bypass application assumptions | Alembic-only migrations; CI migration checks |

### 4.3 Repudiation

| Threat | Scenario | Mitigation |
|---|---|---|
| Client disputes request outcome | Caller reports an error without traceability | Return `X-Request-Id` and include `request_id` in error envelope and logs |
| Key rotation lacks traceability | Owner rotates keys but operation cannot be audited | Log application creation and key rotation using application ID and key prefix only |
| Worker failures hidden | Async persistence fails after API returns `202` | Retry, then move failed batches to Redis DLQ and log correlated failure details |

### 4.4 Information Disclosure

| Threat | Scenario | Mitigation |
|---|---|---|
| API key leaked through logs | Middleware logs request headers without redaction | Strip or hash sensitive headers; log only key prefix where useful |
| Cross-tenant metrics disclosure | Valid key queries another application's metrics | Query-layer scoping by resolved `application_id`; integration tests |
| Sensitive metadata exposed operationally | Full payloads appear in logs or error messages | Avoid logging full request bodies or metadata by default |
| Stack traces returned to clients | Unhandled exception exposes internals | Standard error envelope; detailed exception only in server logs |
| Health endpoint leaks internals | `/v1/health` returns connection strings or provider details | Return coarse component status only |

### 4.5 Denial of Service

| Threat | Scenario | Mitigation |
|---|---|---|
| High request volume | Client floods ingestion endpoint | Phase 2 Redis fixed-window rate limiting per `application_id` |
| Oversized metadata | Client sends very large JSON payload | 8KB serialized `metadata` cap; request body parsing limits where supported |
| Batch abuse | Client submits excessive batch size | Phase 2 batch endpoint capped at 500 events |
| Redis outage | Cache/queue/rate-limit dependency unavailable | Fall back to direct PostgreSQL path, log degraded mode |
| Worker backlog | Queue grows faster than workers can insert | Queue depth metrics; scale ARQ workers; DLQ after retry exhaustion |

### 4.6 Elevation of Privilege

| Threat | Scenario | Mitigation |
|---|---|---|
| Route trusts client-supplied application ID | Caller accesses another tenant by editing path | Derive authorization from API key identity, not request body/path alone |
| Worker inserts unscoped events | Queue message includes arbitrary `application_id` | API enqueues only resolved application ID; worker validates shape before insert |
| CI/CD secret misuse | Build pipeline exposes deploy credentials | GitHub secret storage; do not print secrets; keep deployment steps minimal |

---

## 5. Authentication and API Key Security

### 5.1 Authentication Model

PulseTrack uses static API keys passed in the `X-API-Key` request header. This is a deliberate documented decision because PulseTrack clients are server-to-server systems, browser snippets, mobile apps, or backend services submitting telemetry on behalf of one application. There is no delegated user authorization model that requires OAuth2 or JWTs.

Protected endpoints:

- `POST /v1/events`
- `POST /v1/events/batch` in Phase 2
- `GET /v1/applications/{id}`
- `PATCH /v1/applications/{id}` in Phase 2
- `POST /v1/applications/{id}/keys/rotate` in Phase 2
- `GET /v1/applications/{id}/metrics`

Unauthenticated endpoints:

- `POST /v1/applications` for bootstrap registration
- `GET /v1/health`

The Phase 2 `/metrics` operational endpoint is not part of the public product API and must be internal/operator only.

### 5.2 API Key Format and Generation

API keys must follow the documented format:

```text
pt_live_ + 32 lowercase hex characters
```

Keys must be generated with a cryptographically secure random source and must satisfy the project's documented entropy requirement before implementation is finalized. The current source documents state both `pt_live_` plus 32 lowercase hex characters and at least 256 bits of entropy; because 32 hex characters represent 128 bits, implementation must reconcile this by either extending the generated hex portion or explicitly updating the API contract before coding. The raw key must be returned only in:

- `POST /v1/applications`
- `POST /v1/applications/{id}/keys/rotate` in Phase 2

No other endpoint may return a raw key.

### 5.3 Storage

The `applications` table persists:

- `api_key_hash`: SHA-256 hex digest of the raw key.
- `api_key_prefix`: display-safe prefix for identification in logs and owner-facing responses.

The database must never store the raw API key. API key hashes are still credential-equivalent and must be protected from unauthorized database access.

### 5.4 Verification

For each protected request:

1. Read `X-API-Key`.
2. Reject if missing or malformed.
3. Compute SHA-256 hash.
4. Resolve the hash to an active `applications` row.
5. Attach the resolved `application_id` to the request context.
6. Use that `application_id` for all downstream authorization and data access.

The comparison of candidate and stored hashes should use constant-time comparison behavior available in Python's standard library to avoid avoidable timing leakage.

### 5.5 Rotation and Deactivation

Phase 2 key rotation must:

- Authenticate the caller with the current valid key.
- Generate a new key.
- Atomically replace the persisted hash and prefix.
- Return the new raw key exactly once.
- Immediately invalidate the previous key.
- Invalidate any Redis key-cache entry associated with the old key hash.
- Log the rotation event using application ID and safe key prefix only.

Application deactivation must set `is_active=false` without deleting historical events. Once inactive, the application's key must not authenticate protected requests.

---

## 6. Authorization and Tenant Isolation

### 6.1 Tenant Identity

The authenticated tenant is the `application_id` resolved from the API key. Client-supplied path parameters, request bodies, query strings, metadata, or event fields must never be treated as proof of tenant identity.

### 6.2 Query-Layer Enforcement

Every database query that reads or writes tenant-owned data must include the resolved `application_id` where applicable.

Required patterns:

- Event inserts set `events.application_id` from the authenticated context.
- Metrics queries filter by the authenticated `application_id`.
- Application reads compare `{id}` from the route with the authenticated `application_id`.
- Cross-tenant application ID mismatch returns `403 Forbidden`.
- Invalid or missing key returns `401 Unauthorized`.

### 6.3 Metrics Isolation

`GET /v1/applications/{id}/metrics` must only return counts for the authenticated application. It must not accept `application_id` as a query parameter, and the path `{id}` must be checked against the resolved key identity.

Phase 2 metrics cache keys must include at least:

- `application_id`
- `event_name`
- `start_date`
- `end_date`
- `granularity`

This prevents cache entries from one tenant being served to another.

### 6.4 Batch Isolation

For `POST /v1/events/batch` in Phase 2, the API must authenticate the request once and apply the same resolved `application_id` to every accepted event in the batch. The client must not be allowed to supply per-event tenant IDs.

---

## 7. Input Validation and Payload Security

### 7.1 General Request Rules

All public request bodies must be JSON using `Content-Type: application/json`. Field names use `snake_case`. The API does not support XML, multipart, or form-encoded inputs.

FastAPI and Pydantic schemas are the primary validation layer. Validation failures must return `422 Unprocessable Entity` using the standard error envelope.

### 7.2 Application Registration Validation

`POST /v1/applications` must validate:

| Field | Rule |
|---|---|
| `name` | Required, 1-255 characters |
| `owner_email` | Required, valid email, unique across applications |

Duplicate `owner_email` must return `409 Conflict` using the structured error envelope.

### 7.3 Event Validation

`POST /v1/events` must validate:

| Field | Rule |
|---|---|
| `event_name` | Required, non-empty, max 100 characters |
| `occurred_at` | Required, ISO 8601 timestamp with explicit timezone |
| `session_id` | Optional, max 64 characters |
| `distinct_id` | Optional, max 128 characters |
| `metadata` | Optional object, serialized size max 8KB |

`ingested_at` must be generated by the server and must not be accepted from the client.

### 7.4 Batch Validation

`POST /v1/events/batch` in Phase 2 must:

- Accept at most 500 events per request.
- Validate each event using the same schema as the single-event endpoint.
- Report per-item validation failures.
- Avoid all-or-nothing failure for mixed valid/invalid batches, consistent with the API design's `207 Multi-Status` response.
- Avoid inserting invalid events into the queue or database.

### 7.5 Metadata Handling

The `metadata` field is intentionally schemaless JSONB. Security requirements:

- Enforce the 8KB serialized size cap before persistence or queueing.
- Treat metadata as untrusted data.
- Do not evaluate metadata as code.
- Do not interpolate metadata directly into SQL.
- Do not log full metadata payloads by default.
- Document that clients are responsible for avoiding PII because PulseTrack does not enforce PII detection at the schema level.

### 7.6 Timestamp Handling

`occurred_at` is client-reported and must include timezone information. PulseTrack must not silently accept naive local timestamps. `ingested_at` is server-generated to preserve a trustworthy receipt time.

---

## 8. Data Protection

### 8.1 Data Classification

| Data | Classification | Rationale |
|---|---|---|
| Raw API key | Secret | Bearer credential |
| API key hash | Sensitive | Can be abused if brute force or implementation errors occur |
| Owner email | Sensitive personal/contact data | Identifies application owner |
| Event metadata | Potentially sensitive | Client-defined and may include business or user data |
| Distinct ID/session ID | Potentially sensitive | May map to user/session identity in client systems |
| Metrics counts | Tenant confidential | Reveals product usage volume and patterns |
| Request IDs | Operational | Useful for support; not secret by itself |

### 8.2 Data at Rest

PulseTrack relies on managed storage from Neon PostgreSQL and Upstash Redis. Application-layer requirements:

- Store only SHA-256 API key hashes, never raw API keys.
- Store event data only after validation.
- Store tenant-owned rows with explicit `application_id`.
- Store idempotency keys only when supplied and scoped to the application.
- Retain raw events for 90 days by default, with Phase 2 partitioning enabling efficient retention operations.

### 8.3 Data in Transit

All production client traffic must use HTTPS. The documented production API must reject or redirect plaintext HTTP rather than silently serving it.

Database and Redis connections use provider-supported secure connection mechanisms through Render-injected connection strings.

### 8.4 Data Minimization

PulseTrack does not require PII fields. `metadata`, `session_id`, and `distinct_id` are optional and opaque. The README and API documentation should clearly state that integrating clients control what they send and should avoid PII unless they have their own legal and privacy basis.

### 8.5 Retention

Raw events are retained for 90 days by default. In Phase 2, monthly range partitioning on `occurred_at` supports efficient retention through partition detach/drop operations rather than row-by-row deletion.

---

## 9. Database Security

### 9.1 Database Role

Neon PostgreSQL is the system of record for:

- `applications`
- `events`

The API and worker connect through SQLAlchemy 2.0 async engine with `asyncpg`. No blocking database calls should exist on the request path.

### 9.2 Schema Controls

Required database controls:

- `applications.id` as UUID primary key.
- `applications.api_key_hash` as unique `CHAR(64)`.
- Index on `applications.api_key_hash` for efficient key resolution.
- `events.application_id` foreign key referencing `applications.id`.
- Index on `(application_id, event_name, occurred_at DESC)` for tenant-scoped aggregation.
- GIN index on `metadata jsonb_path_ops` where metadata querying is supported.
- Phase 2 unique partial index on `(application_id, idempotency_key)` where `idempotency_key IS NOT NULL`.
- Phase 2 range partitioning of `events` by `occurred_at`.

### 9.3 Query Safety

SQL must be generated through SQLAlchemy ORM/core constructs or parameterized queries. No request field, metadata value, event name, or date string may be concatenated into raw SQL.

Metrics queries must:

- Filter by authenticated `application_id`.
- Filter by validated `event_name`.
- Filter by validated date range.
- Return bucketed counts in ascending chronological order.

### 9.4 Migration Safety

All schema changes must be managed through Alembic. Manual DDL against Neon is not part of the supported workflow.

CI should verify:

- Migrations apply from an empty database.
- Migrations are reversible where practical.
- ORM models and migrations do not drift.

---

## 10. Redis, Queue, and Worker Security

Redis and ARQ are Phase 2 components only.

### 10.1 Redis Roles

Upstash Redis is used for:

- API key cache.
- Metrics aggregation cache.
- Per-application rate-limit counters.
- Ingestion queue.
- Dead-letter queue.

Redis is not the system of record. Neon PostgreSQL remains authoritative for application and event data.

### 10.2 Key Cache

The key-resolution cache must use cache-aside:

1. Hash incoming API key.
2. Check Redis for hash-to-application mapping.
3. On miss, query PostgreSQL.
4. Populate Redis with bounded TTL not exceeding 5 minutes.

Security requirements:

- Cache entries must not store raw API keys.
- Cache entries must include enough state to reject inactive applications.
- Rotation and deactivation must invalidate affected cache entries immediately.

### 10.3 Metrics Cache

Metrics cache entries must be scoped by authenticated `application_id` and query parameters. Cache TTL should remain short, 30-60 seconds, as documented.

The `cache_hit` response field is acceptable from Phase 2 onward because it exposes cache behavior without exposing tenant data.

### 10.4 Queue Security

The Phase 2 async ingestion path queues validated events after authentication. Queue payloads must include the server-resolved `application_id`, not a client-supplied tenant ID.

The worker must:

- Parse queue payloads defensively.
- Reject or DLQ malformed payloads.
- Preserve `request_id` or equivalent correlation ID when available.
- Write using the shared SQLAlchemy database layer.
- Avoid logging full metadata payloads by default.

### 10.5 DLQ Security

The dead-letter queue contains failed event batches and may include sensitive metadata. DLQ inspection and replay must be treated as operator-only functionality. DLQ entries should include enough context for debugging without exposing raw API keys.

### 10.6 Redis Failure

If Redis is unavailable:

- Phase 2 key cache misses must fall back to PostgreSQL.
- Metrics cache misses must fall back to PostgreSQL.
- Ingestion must degrade to the Phase 1 synchronous database-write path when the feature-flagged fallback is enabled.
- Rate limiting may fail open as documented, but this degraded state must be logged and monitored.

---

## 11. Rate Limiting and Abuse Protection

Rate limiting is Phase 2 functionality.

### 11.1 Scope

Limits are enforced per `application_id`, not per IP address. This matches the API key authentication model and avoids punishing clients with multiple legitimate deployments.

### 11.2 Algorithm

The documented design uses a fixed-window counter in Redis:

- Increment request count for the application's current window.
- Set or preserve expiration for that window key.
- Compare count against `applications.rate_limit_per_minute`.
- Return rate-limit headers on responses.
- Return `429 Too Many Requests` with `Retry-After` when exceeded.

The increment-and-check operation must be atomic, implemented with Redis Lua or an equivalent atomic Redis operation.

### 11.3 Abuse Controls

PulseTrack must control common ingestion abuse patterns through:

- Required API key on protected routes.
- Metadata size cap.
- Batch size cap.
- Event field length limits.
- Per-application rate limiting in Phase 2.
- Structured logging of repeated `401`, `403`, `422`, and `429` responses by request ID and application/key prefix where available.

### 11.4 Fail-Open Trade-Off

When Redis is unavailable, rate limiting is bypassed to preserve ingestion availability. This is an explicit availability-over-abuse-prevention trade-off from the architecture. The degraded mode must be visible in logs and operational metrics because it temporarily weakens abuse protection.

---

## 12. Transport and Network Security

### 12.1 Public API Transport

Production traffic must be HTTPS-only. Render terminates TLS at the edge. Plain HTTP must be redirected or rejected; the API must not silently serve plaintext traffic in production.

### 12.2 Internal Service Communication

The API web service and ARQ worker are separate Render services sharing a codebase and accessing the same managed dependencies. The worker has no public HTTP port.

### 12.3 Database and Redis Connectivity

Connections to Neon PostgreSQL and Upstash Redis must use provider connection strings injected through Render environment variables. Application logs must not print these URLs.

### 12.4 Health and Metrics Endpoints

`GET /v1/health` returns coarse service status only:

```json
{ "status": "ok", "database": "connected", "redis": "connected" }
```

It must not return credentials, hostnames, database names, stack traces, or detailed provider errors.

The Phase 2 `/metrics` endpoint is operational, unversioned, and internal/operator only. It must not expose raw API keys, owner emails, event metadata, or tenant-specific payloads.

---

## 13. Secrets and Configuration Management

### 13.1 Secret Storage

Secrets must be provided through environment variables in Render and GitHub Actions secret storage. They must not be committed to the repository.

Expected secret/config values include:

- `DATABASE_URL`
- `REDIS_URL` in Phase 2
- Deployment credentials used by CI/CD
- Any environment-specific settings required by `app/core/config.py`

### 13.2 Configuration Ownership

The documented backend folder structure assigns configuration to `app/core/config.py`. This module must:

- Read configuration from environment variables.
- Avoid hardcoded secrets.
- Validate required production settings at startup.
- Distinguish local development settings from production settings.
- Avoid printing secret values during validation failures.

### 13.3 Secret Handling in Logs and Errors

Logs and client-facing errors must redact:

- `X-API-Key`
- Raw API keys returned by creation or rotation routes
- `DATABASE_URL`
- `REDIS_URL`
- Authorization-like headers if later added

If an API key needs to be identified operationally, log only the stored safe prefix.

### 13.4 Local Development

Local development uses `docker-compose` with PostgreSQL for parity. Local `.env` files, if used, must be ignored by version control. Test fixtures must use generated test keys, not production-like secrets.

---

## 14. Logging, Monitoring, and Auditability

### 14.1 Structured Request Logging

Every request must emit a structured JSON log with:

- `request_id`
- HTTP method
- Path or route template
- Status code
- Latency
- Authenticated `application_id` when available
- Safe API key prefix when useful

Logs must not include raw API keys or full event metadata by default.

### 14.2 Request Correlation

Error responses use the standard envelope:

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid or has been revoked.",
    "request_id": "req_f3a1c9"
  }
}
```

The same request ID must be available in the response header `X-Request-Id` and in server logs.

### 14.3 Security-Relevant Events

The system should log security-relevant events without sensitive payloads:

- Application created.
- API key rotated.
- Application deactivated.
- Invalid API key attempt.
- Cross-tenant access attempt.
- Rate limit exceeded.
- Redis fallback activated.
- Worker retry exhausted and DLQ entry created.
- Migration failure in CI or deployment.

### 14.4 Metrics

Phase 2 `/metrics` should expose operational metrics such as:

- Request counts by route/status.
- Latency histograms.
- Queue depth.
- Worker failure/retry counts.
- Rate-limit rejections.
- Redis fallback events.

Metrics must remain operational and aggregate-level; they must not expose event metadata, owner email, or raw credentials.

---

## 15. Error Handling and Failure Modes

### 15.1 Standard Error Behavior

All errors must use the documented structured envelope with a stable machine-readable `code`, human-readable `message`, and `request_id`.

Expected security-related statuses:

| Status | Meaning |
|---|---|
| `400` | Semantically invalid request, such as `start_date > end_date` |
| `401` | Missing, malformed, inactive, or unknown API key |
| `403` | Valid key but unauthorized for requested application ID |
| `409` | Duplicate owner email or non-idempotency uniqueness conflict |
| `422` | Schema or payload validation failure |
| `429` | Phase 2 rate limit exceeded |
| `500` | Unhandled server fault with no leaked internals |

### 15.2 Fail-Closed Conditions

The request must fail closed when:

- API key is missing or invalid.
- API key resolves to inactive application.
- Route path application ID does not match authenticated application.
- Payload validation fails.
- Metadata exceeds 8KB.
- Batch request exceeds 500 events.
- Idempotency key is malformed.
- Database write fails in Phase 1 and no successful commit occurred.

### 15.3 Degraded-but-Serving Conditions

The system may remain available with degraded behavior when:

- Redis cache is unavailable and PostgreSQL fallback succeeds.
- Redis queue is unavailable and synchronous write fallback is enabled.
- Redis rate limiting is unavailable and the system temporarily fails open.
- Redis is unavailable for health status but the API and database remain functional.

These cases should return success only if the requested operation actually succeeds through fallback.

### 15.4 Server Error Safety

Unhandled exceptions must not expose:

- Stack traces.
- Environment variables.
- SQL queries with parameters.
- Database or Redis URLs.
- Raw API keys.
- Full event payloads.

---

## 16. Application Lifecycle Security

### 16.1 Application Creation

`POST /v1/applications` is unauthenticated by design because it bootstraps the first credential for an application. Security requirements:

- Validate `name` and `owner_email`.
- Enforce unique `owner_email`.
- Generate a high-entropy API key.
- Persist only hash and prefix.
- Return raw key once.
- Log creation without raw key.

### 16.2 Application Read and Update

Application metadata reads must be authenticated and limited to the calling application. Phase 2 updates are limited to documented fields such as `is_active` and `rate_limit_per_minute`.

No hard-delete endpoint exists by design. Deactivation is soft and preserves historical telemetry.

### 16.3 Key Rotation

Key rotation is Phase 2. It must immediately invalidate the prior key and produce a new one-time-visible raw key. The operation should be atomic so a failure does not leave the application without a valid key or with two unintended valid keys.

### 16.4 Event Ingestion

Phase 1 ingestion commits synchronously to PostgreSQL and returns `201 Created` only after a successful commit.

Phase 2 ingestion validates, queues, and returns `202 Accepted` when persistence is deferred. The response must not imply the row has already been committed. Worker behavior must provide at-least-once delivery with idempotency support for client retries.

### 16.5 Metrics Retrieval

Metrics are read-only and must be scoped to the authenticated application. Phase 2 cached metrics may be briefly stale because the documented architecture accepts short-lived eventual consistency for aggregation reads.

---

## 17. Component Security Responsibilities

### 17.1 FastAPI Web Service

Primary responsibilities:

- Terminate application-level request handling after Render TLS termination.
- Generate or propagate request IDs.
- Enforce authentication on protected routes.
- Resolve API keys to active applications.
- Apply tenant authorization checks.
- Validate request payloads using Pydantic schemas.
- Apply Phase 2 rate limiting before expensive processing.
- Dispatch synchronous writes in Phase 1.
- Enqueue validated events in Phase 2.
- Return structured success and error responses.
- Avoid logging secrets or full sensitive payloads.

### 17.2 `app/main.py`

Security responsibilities:

- Instantiate the FastAPI application with production-safe defaults.
- Register routers under the documented `/v1` API version.
- Register exception handlers that enforce the standard error envelope.
- Register middleware for request ID, logging, and authentication where implemented globally.

### 17.3 `app/api/v1/`

Security responsibilities:

- Keep route handlers thin and explicit.
- Require authentication dependencies on protected routes.
- Pass resolved application identity to service-layer functions.
- Never trust path IDs without comparing them to authenticated identity.
- Return only documented response fields.

Relevant route modules:

- `applications.py`
- `events.py`
- `metrics.py`

### 17.4 `app/core/security.py`

Security responsibilities:

- Generate API keys using a cryptographically secure random source.
- Hash API keys with SHA-256.
- Verify hashes safely.
- Provide API key prefix helpers.
- Avoid returning raw keys except to creation and rotation flows.

### 17.5 `app/core/config.py`

Security responsibilities:

- Load settings from environment variables.
- Validate required secrets at startup.
- Separate local development and production configuration.
- Prevent secret values from being printed in logs or exceptions.

### 17.6 `app/core/logging.py`

Security responsibilities:

- Produce structured JSON logs.
- Attach request IDs.
- Redact sensitive headers and configuration values.
- Avoid default full-body logging.

### 17.7 `app/db/session.py`

Security responsibilities:

- Configure SQLAlchemy async engine.
- Reuse database connections safely.
- Avoid blocking database I/O in async request paths.
- Keep connection strings out of logs.

### 17.8 `app/db/models.py`

Security responsibilities:

- Define schema constraints that support application security.
- Enforce uniqueness of API key hashes.
- Define tenant relationship between applications and events.
- Define Phase 2 idempotency uniqueness.
- Define indexes that make secure query patterns efficient enough to use consistently.

### 17.9 `app/services/ingestion.py`

Security responsibilities:

- Use authenticated `application_id` for event creation.
- Reject invalid or oversized payloads before persistence or queueing.
- Generate `ingested_at` server-side.
- Apply idempotency behavior in Phase 2.
- Avoid accepting tenant identity from the event payload.

### 17.10 `app/services/aggregation.py`

Security responsibilities:

- Scope every metrics query by authenticated `application_id`.
- Validate date ranges.
- Build cache keys that include tenant identity and query parameters.
- Avoid raw SQL string interpolation.

### 17.11 `app/services/rate_limit.py`

Security responsibilities, Phase 2:

- Enforce per-application fixed-window limits.
- Use atomic Redis operations.
- Return rate-limit metadata and `Retry-After`.
- Log fail-open Redis degradation.

### 17.12 `app/workers/arq_worker.py`

Security responsibilities, Phase 2:

- Consume only from the configured Redis queue.
- Parse queued events defensively.
- Batch database inserts safely.
- Retry failed batches according to policy.
- Move exhausted failures to DLQ.
- Preserve request correlation where available.
- Avoid logging raw metadata or credentials.

### 17.13 `schemas/`

Security responsibilities:

- Define strict request and response models.
- Enforce field length and type limits.
- Prevent response models from accidentally including sensitive fields such as `api_key_hash`.
- Include raw `api_key` only in creation and rotation response schemas.

### 17.14 Alembic

Security responsibilities:

- Track all schema changes.
- Add and preserve security-relevant constraints and indexes.
- Support repeatable deployment and test setup.

### 17.15 Tests

Security responsibilities:

- Verify authentication and authorization behavior.
- Verify tenant isolation.
- Verify validation failures.
- Verify idempotency behavior in Phase 2.
- Verify Redis fallback paths.
- Verify no raw API keys appear in logs.

---

## 18. Security Test Plan

### 18.1 Authentication Tests

| Test | Expected Result |
|---|---|
| Missing `X-API-Key` on protected route | `401` |
| Malformed key | `401` |
| Unknown key | `401` |
| Inactive application key | `401` |
| Valid key | Request proceeds under resolved application |
| Raw API key not persisted | Database contains only hash and prefix |
| Raw API key not logged | Log audit contains no full key |

### 18.2 Authorization Tests

| Test | Expected Result |
|---|---|
| Key for app A queries app A metrics | `200` |
| Key for app A queries app B metrics path | `403` |
| Key for app A reads app B metadata | `403` |
| Event insert attempts to set app B ID in payload | Payload tenant ignored or rejected; event belongs to app A |
| Metrics query always filters by app A | No app B data returned |

### 18.3 Validation Tests

| Test | Expected Result |
|---|---|
| Missing `event_name` | `422` |
| Empty `event_name` | `422` |
| `event_name` over 100 chars | `422` |
| `metadata` over 8KB | `422` |
| Naive timestamp | `422` |
| `session_id` over 64 chars | `422` |
| `distinct_id` over 128 chars | `422` |
| `start_date > end_date` | `400` |
| Batch over 500 events, Phase 2 | `422` or documented validation error |

### 18.4 Database and Integrity Tests

| Test | Expected Result |
|---|---|
| Duplicate API key hash insert | Database rejects |
| Event references nonexistent application | Database rejects |
| Duplicate `(application_id, idempotency_key)` in Phase 2 | Original event returned as idempotent replay |
| Alembic upgrade from empty DB | Success |
| Alembic downgrade where supported | Success |

### 18.5 Redis and Worker Tests, Phase 2

| Test | Expected Result |
|---|---|
| Key cache hit | Auth succeeds without Postgres lookup |
| Key cache miss | Falls back to Postgres and populates cache |
| Key rotation | Old cache entry invalidated |
| Redis unavailable for cache | Request falls back to Postgres |
| Redis unavailable for queue | Ingestion falls back to synchronous write when enabled |
| Worker insert fails 3 times | Batch moved to DLQ |
| Queue payload malformed | Worker rejects or DLQs without crashing |
| Rate limit exceeded | `429` with `Retry-After` |

### 18.6 Logging and Error Tests

| Test | Expected Result |
|---|---|
| Validation error | Structured envelope with request ID |
| Unhandled exception | No stack trace or secret in response |
| Request logging | Includes request ID, route, status, latency |
| API key in request | Full key redacted from logs |
| Metadata in request | Full metadata not logged by default |

---

## 19. Residual Risks and Accepted Trade-Offs

### 19.1 Static API Keys

Static API keys are simpler than OAuth2 and correct for PulseTrack's documented client model, but they are bearer credentials. If leaked, they can be used until rotated or deactivated. Mitigations are one-time display, hashed storage, log redaction, Phase 2 rate limiting, and key rotation.

### 19.2 SHA-256 Without Per-Key Salt

The project documents require SHA-256 hashed API keys. Because generated API keys have high entropy, unsalted SHA-256 is acceptable for lookup simplicity: the hash can be indexed and resolved efficiently. This would not be acceptable for low-entropy user passwords.

### 19.3 Redis Fail-Open Behavior

Redis failure may temporarily bypass rate limiting and caching. This is accepted because the architecture prioritizes ingestion availability and explicitly defines direct PostgreSQL fallback. The risk must be visible through logs and metrics.

### 19.4 Metadata PII

PulseTrack does not require PII, but it also does not inspect or prevent PII inside `metadata`, `session_id`, or `distinct_id`. The integrating client is responsible for what it sends. PulseTrack mitigates with documentation, data minimization, tenant isolation, retention policy, and avoiding payload logs.

### 19.5 Single-Region Availability

The documented availability target is 99.5% for a single-region portfolio-scale deployment. Multi-region failover is out of scope. Neon, Upstash, and Render outages may affect availability.

### 19.6 Eventual Consistency in Phase 2

Phase 2 async ingestion returns `202 Accepted` before database commit, and metrics caching may briefly return stale results. This is acceptable because the documented read path does not require read-after-write consistency.

### 19.7 Fixed-Window Rate Limiting

Fixed-window rate limiting allows boundary bursts across window edges. The trade-off is accepted for O(1) memory and simple atomic Redis operations at the project's scale.

---

## 20. Security Implementation Checklist

### Phase 1

- [ ] Generate API keys with a CSPRNG.
- [ ] Return raw API key only during application creation.
- [ ] Persist only SHA-256 hash and safe prefix.
- [ ] Authenticate protected routes using `X-API-Key`.
- [ ] Reject missing, malformed, inactive, or unknown keys with `401`.
- [ ] Derive `application_id` from the key, not request data.
- [ ] Enforce tenant isolation on application and metrics routes.
- [ ] Validate event payloads with Pydantic.
- [ ] Enforce 8KB metadata cap.
- [ ] Generate `ingested_at` server-side.
- [ ] Use SQLAlchemy async database access only.
- [ ] Use Alembic migrations for all schema changes.
- [ ] Enforce unique API key hash and event foreign key constraints.
- [ ] Return standard error envelopes.
- [ ] Emit structured request logs with request IDs.
- [ ] Redact raw API keys and secrets from logs.
- [ ] Serve production traffic over HTTPS only.
- [ ] Store `DATABASE_URL` only as an environment secret.
- [ ] Add integration tests for auth, ingestion, aggregation, validation, and tenant isolation.

### Phase 2

- [ ] Add Redis key cache with bounded TTL.
- [ ] Invalidate key cache on rotation and deactivation.
- [ ] Add key rotation endpoint with one-time raw key return.
- [ ] Add per-application Redis rate limiting.
- [ ] Use atomic Redis operations for rate-limit counters.
- [ ] Return `429` and `Retry-After` when rate limited.
- [ ] Add async ingestion queue.
- [ ] Deploy ARQ worker as separate Render background worker.
- [ ] Batch inserts in worker.
- [ ] Add DLQ after retry exhaustion.
- [ ] Add idempotency key support with unique database constraint.
- [ ] Add batch ingestion with 500-event cap and per-item errors.
- [ ] Add metrics cache with tenant-scoped keys and short TTL.
- [ ] Add event table partitioning and retention operations.
- [ ] Expose internal/operator-only Prometheus `/metrics`.
- [ ] Add Redis fallback tests.
- [ ] Add worker retry and DLQ tests.
- [ ] Add load tests for documented latency and throughput targets.

---

*End of document.*
