# PulseTrack — API Design Document

**Project:** PulseTrack — Event-Collection & Telemetry Backend
**Author:** Sumukh
**Version:** 1.0
**Companion Documents:** `PulseTrack_PRD.md` (business scope), `PulseTrack_SRD.md` (functional/non-functional requirements)
**Scope of this document:** The binding interface contract — conventions, resource specs, error taxonomy, and versioning policy an implementer or API consumer needs, independent of internal architecture.

---

## 1. Design Principles

| Principle | Application in PulseTrack |
|---|---|
| **Resource-oriented** | `applications` and `events` are nouns; actions are HTTP verbs on them, not verb-shaped endpoints (`/createEvent` is avoided in favor of `POST /events`) |
| **Stateless** | No server-side session; every request is fully authenticated and interpretable on its own via `X-API-Key` |
| **Explicit over implicit** | No magic defaults that change behavior silently — e.g. `granularity` on the metrics endpoint must be passed, not inferred from date range size |
| **Idempotent where the domain allows it** | Writes that are likely to be retried by flaky clients (`POST /events`) support an idempotency key; reads are naturally idempotent |
| **Fail loud, fail structured** | Every error returns a machine-parseable code, not just an HTTP status and a prose message |
| **Additive evolution** | New optional fields and endpoints don't bump the version; only breaking changes do (Section 10) |

---

## 2. Base URL & Versioning

```
https://api.pulsetrack.dev/v1
```

- Versioning is **URI-based** (`/v1`), chosen over header-based versioning for visibility — anyone reading a log line or a `curl` command can see which contract they're against without inspecting headers.
- All endpoints in this document are implicitly prefixed with `/v1` unless stated otherwise.

---

## 3. Authentication

| | |
|---|---|
| **Scheme** | Static API key, passed via `X-API-Key` header |
| **Key format** | `pt_live_` + 32 lowercase hex characters (e.g. `pt_live_8f2a9b1c3d4e5f6a7b8c9d0e1f2a3b4c`) |
| **Entropy** | ≥256 bits, generated via a CSPRNG at application-creation time |
| **Storage** | Only the SHA-256 hash and an 8–12 character prefix are persisted server-side; the raw key is shown exactly once, at creation or rotation |
| **Transport** | HTTPS only — the API rejects plaintext HTTP in production (redirect or 400, not a silent downgrade) |
| **Scope** | A key is scoped to exactly one application; it cannot read or write another application's data (enforced at the query layer, not just the route layer) |

**Why a static key instead of OAuth2/JWT:** PulseTrack's clients are server-to-server or embedded SDKs, not third-party apps acting on a user's behalf — there's no delegation use case that justifies OAuth's added complexity. A rotate-on-demand static key is the simpler, correct-for-context choice, and is documented here as a deliberate trade-off rather than an oversight.

---

## 4. Request / Response Conventions

### 4.1 Format
- `Content-Type: application/json` for all request and response bodies. No form-encoding, no XML.
- Field names are `snake_case`.
- Timestamps are ISO 8601 with explicit UTC offset (`2026-08-03T10:15:00Z`) — never naive/local timestamps.
- Response bodies are **flat resource representations** — no `{ "data": ... }` wrapper — since PulseTrack has no need for the multi-resource envelope patterns (included pagination metadata, sideloaded relations) that justify one.

### 4.2 Standard Error Envelope
Every 4xx/5xx response uses the same shape:

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key is invalid or has been revoked.",
    "request_id": "req_f3a1c9"
  }
}
```

`request_id` matches the trace ID emitted in structured logs (FR-OBS-01), so a client-reported error can be located in server logs in one step.

### 4.3 HTTP Status Code Usage

| Code | Meaning in PulseTrack | Example |
|---|---|---|
| `200 OK` | Successful read, or idempotent replay of a write | `GET /metrics`, duplicate `Idempotency-Key` |
| `201 Created` | Resource created, synchronous write confirmed | `POST /applications`, `POST /events` (Phase 1) |
| `202 Accepted` | Write accepted, persistence deferred | `POST /events` (Phase 2 async path) |
| `400 Bad Request` | Structurally valid JSON but semantically invalid (e.g. `start_date > end_date`) | `GET /metrics?start_date=...` |
| `401 Unauthorized` | Missing or invalid `X-API-Key` | Any authenticated endpoint |
| `403 Forbidden` | Valid key, but not authorized for the requested resource | Cross-tenant `application_id` access attempt |
| `404 Not Found` | Referenced resource doesn't exist | `GET /applications/{id}` with unknown ID |
| `409 Conflict` | Uniqueness violation outside the idempotency path | Duplicate `owner_email` on creation |
| `422 Unprocessable Entity` | Schema validation failure | Missing `event_name`, oversized `metadata` |
| `429 Too Many Requests` | Rate limit exceeded | Phase 2 only |
| `500 Internal Server Error` | Unhandled server fault | Logged with `request_id` for correlation |

### 4.4 Standard Headers

| Header | Direction | Purpose |
|---|---|---|
| `X-API-Key` | Request | Authentication |
| `Idempotency-Key` | Request | Optional dedup token on `POST /events` (Phase 2) |
| `X-Request-Id` | Response | Echoes/generates the trace ID for correlation with logs |
| `X-RateLimit-Limit` | Response | Requests allowed in the current window (Phase 2) |
| `X-RateLimit-Remaining` | Response | Requests left in the current window (Phase 2) |
| `X-RateLimit-Reset` | Response | Unix timestamp when the window resets (Phase 2) |
| `Retry-After` | Response (429 only) | Seconds to wait before retrying |

---

## 5. Resource: Applications

| Endpoint | Method | Auth | Phase |
|---|---|---|---|
| `/applications` | `POST` | None (bootstrap) | 1 |
| `/applications/{id}` | `GET` | API Key | 1 |
| `/applications/{id}` | `PATCH` | API Key | 2 |
| `/applications/{id}/keys/rotate` | `POST` | API Key | 2 |

### `POST /applications`
Creates a new application and issues its API key.

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | 1–255 chars |
| `owner_email` | string | yes | valid email, unique across applications |

**Response `201 Created`**
```json
{
  "id": "6a1e5c2e-2f3b-4b8a-9e3d-1a2b3c4d5e6f",
  "name": "My SaaS App",
  "api_key": "pt_live_8f2a9b1c3d4e5f6a7b8c9d0e1f2a3b4c",
  "is_active": true,
  "created_at": "2026-08-03T10:00:00Z"
}
```
> The `api_key` field is present **only** in this response and in the key-rotation response — it is never returned by `GET`.

### `GET /applications/{id}`
Returns the calling application's own metadata (never another tenant's — enforced by matching `id` against the resolved key's `application_id`).

**Response `200 OK`**
```json
{
  "id": "6a1e5c2e-2f3b-4b8a-9e3d-1a2b3c4d5e6f",
  "name": "My SaaS App",
  "api_key_prefix": "pt_live_8f",
  "is_active": true,
  "rate_limit_per_minute": 600,
  "created_at": "2026-08-03T10:00:00Z",
  "updated_at": "2026-08-03T10:00:00Z"
}
```

### `PATCH /applications/{id}` — Phase 2
Partial update, currently limited to `is_active` and `rate_limit_per_minute`. Deactivation is soft — event history is retained (FR-APP-06); PulseTrack has **no hard-delete endpoint** for applications by design, since destroying a tenant's telemetry history is a destructive action with no legitimate low-friction use case.

**Request body** (all fields optional, at least one required)
```json
{ "is_active": false }
```
**Response `200 OK`** — the updated application object, same shape as `GET`.

### `POST /applications/{id}/keys/rotate` — Phase 2
Invalidates the current key and issues a new one atomically.

**Response `201 Created`**
```json
{ "api_key": "pt_live_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d", "rotated_at": "2026-08-03T10:20:00Z" }
```

---

## 6. Resource: Events

| Endpoint | Method | Auth | Phase |
|---|---|---|---|
| `/events` | `POST` | API Key | 1 |
| `/events/batch` | `POST` | API Key | 2 |

### `POST /events`

**Headers:** `X-API-Key` (required), `Idempotency-Key` (optional, Phase 2)

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `event_name` | string | yes | 1–100 chars |
| `occurred_at` | string (ISO 8601) | yes | must include timezone |
| `session_id` | string | no | ≤64 chars |
| `distinct_id` | string | no | ≤128 chars |
| `metadata` | object | no | ≤8KB serialized |

```json
{
  "event_name": "button_click",
  "occurred_at": "2026-08-03T10:15:00Z",
  "session_id": "sess_9f8a7b6c",
  "distinct_id": "user_42",
  "metadata": { "button_id": "cta-hero", "page": "/pricing" }
}
```

**Response — Phase 1, `201 Created`**
```json
{ "id": 10432, "status": "stored" }
```

**Response — Phase 2, `202 Accepted`**
```json
{ "status": "queued", "request_id": "req_f3a1c9" }
```

**Idempotent replay — `200 OK`** *(Phase 2, same `Idempotency-Key` resubmitted within 24h)*
```json
{ "id": 10432, "status": "stored", "idempotent_replay": true }
```

**Design note on idempotency:** the client generates a UUID v4 and sends it as `Idempotency-Key`. The server enforces uniqueness via `UNIQUE (application_id, idempotency_key)` (see SRD §8). On a constraint violation, the server does **not** return a `409` — it looks up and returns the original event with `200 OK`, because from the client's perspective a retried request that already succeeded should look like success, not a new failure to handle.

### `POST /events/batch` — Phase 2
Accepts up to 500 events; validates and reports per-item, so one malformed event doesn't fail the whole batch.

**Request body**
```json
{ "events": [ { "event_name": "page_view", "occurred_at": "2026-08-03T10:15:00Z" }, { "...": "..." } ] }
```

**Response `207 Multi-Status`**
```json
{
  "accepted": 498,
  "rejected": 2,
  "errors": [
    { "index": 17, "code": "validation_error", "message": "event_name is required" },
    { "index": 245, "code": "payload_too_large", "message": "metadata exceeds 8KB" }
  ]
}
```
> `207 Multi-Status` is used deliberately instead of `200`/`201` — it's the correct code for "the request as a whole was processed, but individual items had mixed outcomes," and it signals to API consumers that they must inspect the body rather than assume all-or-nothing success.

---

## 7. Resource: Metrics

| Endpoint | Method | Auth | Phase |
|---|---|---|---|
| `/applications/{id}/metrics` | `GET` | API Key | 1 |

### `GET /applications/{id}/metrics`

**Query parameters**

| Param | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `event_name` | string | yes | — | must match an ingested event name |
| `start_date` | string (date) | yes | — | ISO 8601 date |
| `end_date` | string (date) | yes | — | must be ≥ `start_date` |
| `granularity` | enum | no | `day` | `hour` \| `day` |

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
`cache_hit` is included from Phase 2 onward so the caching layer's effect is directly observable in the response — useful both operationally and as a demo point.

---

## 8. System / Operational Endpoints

| Endpoint | Method | Auth | Phase | Purpose |
|---|---|---|---|---|
| `/health` | `GET` | None | 1 | Liveness + DB connectivity check, for uptime monitors and Render health checks |
| `/metrics` *(root, not `/v1`)* | `GET` | Internal/operator only | 2 | Prometheus-format scrape endpoint — deliberately unversioned and outside `/v1` since it's an ops interface, not a product API |

**`GET /health` response `200 OK`**
```json
{ "status": "ok", "database": "connected", "redis": "connected" }
```
A degraded-but-serving state (e.g. Redis down, Postgres fallback active per FR-CACHE-02) returns `200` with `"redis": "unreachable"` rather than `503` — the API is still functionally up, and callers should keep sending traffic.

---

## 9. Rate Limiting Design — Phase 2

- **Algorithm:** Fixed-window counter in Redis (`INCR` + `EXPIRE`), not a sliding-window log. This is a deliberate trade-off: a fixed window is O(1) memory per key and one round-trip per request, while a sliding-window log needs a sorted set and is O(n) in requests-per-window. The cost is boundary bursting (a client can send `2×limit` requests across a window edge) — acceptable for a portfolio-scale system, and called out explicitly rather than hidden.
- **Atomicity:** The increment-and-check is done as a single Lua script server-side, so concurrent requests from the same key can't race past the limit.
- **Scope:** Per-`application_id`, not per-IP — an application's traffic is rate-limited as a whole regardless of which client instance sends it.
- **Response on limit:** `429` with `Retry-After` set to the remaining window duration in seconds.

---

## 10. Pagination Convention (Forward-Looking)

No current endpoint returns a list long enough to require pagination. This convention is documented now so any future list endpoint (e.g. a hypothetical `GET /events` raw export) adopts it without a later breaking change:

- Cursor-based, not offset-based (offset pagination degrades on high-write tables like `events`).
- `?limit=50&cursor=<opaque_token>` — `limit` capped at 200.
- Response includes `next_cursor: string | null`.

---

## 11. Versioning & Deprecation Policy

| Change type | Action |
|---|---|
| New optional request field | No version bump |
| New endpoint | No version bump |
| New response field | No version bump (clients must ignore unknown fields) |
| Removing/renaming a field, changing a type, changing error semantics | Version bump (`/v2`) |
| Deprecating an old version | `Deprecation: true` and `Sunset: <date>` headers (RFC 8594) added for a minimum 90-day window before removal |

---

## Appendix A: OpenAPI 3.0 Snippet

FastAPI auto-generates the full spec at `/openapi.json` and renders it at `/docs`; the fragment below is the hand-authored source of truth for the two highest-traffic endpoints, kept in the repo as a design reference independent of the running app.

```yaml
openapi: 3.0.3
info:
  title: PulseTrack API
  version: "1.0"
paths:
  /v1/events:
    post:
      summary: Ingest a telemetry event
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [event_name, occurred_at]
              properties:
                event_name: { type: string, maxLength: 100 }
                occurred_at: { type: string, format: date-time }
                session_id: { type: string, maxLength: 64 }
                distinct_id: { type: string, maxLength: 128 }
                metadata: { type: object }
      responses:
        "201": { description: Stored synchronously (Phase 1) }
        "202": { description: Queued for async persistence (Phase 2) }
        "401": { description: Invalid or missing API key }
        "422": { description: Validation error }
  /v1/applications/{id}/metrics:
    get:
      summary: Retrieve aggregated event counts
      security:
        - ApiKeyAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
        - { name: event_name, in: query, required: true, schema: { type: string } }
        - { name: start_date, in: query, required: true, schema: { type: string, format: date } }
        - { name: end_date, in: query, required: true, schema: { type: string, format: date } }
        - { name: granularity, in: query, required: false, schema: { type: string, enum: [hour, day], default: day } }
      responses:
        "200": { description: Aggregated metrics }
        "400": { description: Invalid date range }
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

---

## Appendix B: End-to-End `curl` Walkthrough

```bash
# 1. Register an application
curl -X POST https://api.pulsetrack.dev/v1/applications \
  -H "Content-Type: application/json" \
  -d '{"name": "My SaaS App", "owner_email": "dev@example.com"}'
# → save the returned api_key

# 2. Ingest an event
curl -X POST https://api.pulsetrack.dev/v1/events \
  -H "X-API-Key: pt_live_8f2a9b1c3d4e5f6a7b8c9d0e1f2a3b4c" \
  -H "Content-Type: application/json" \
  -d '{"event_name": "button_click", "occurred_at": "2026-08-03T10:15:00Z", "metadata": {"button_id": "cta-hero"}}'

# 3. Query aggregated metrics
curl "https://api.pulsetrack.dev/v1/applications/6a1e5c2e-2f3b-4b8a-9e3d-1a2b3c4d5e6f/metrics?event_name=button_click&start_date=2026-08-01&end_date=2026-08-03&granularity=day" \
  -H "X-API-Key: pt_live_8f2a9b1c3d4e5f6a7b8c9d0e1f2a3b4c"
```

---

*End of document.*
