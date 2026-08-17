# Reliability & Failure Recovery

PulseTrack is designed as a resilient, fail-safe system that handles system-level failures gracefully. 

---

## 1. Redis Connection Failures
* **Symptom:** Redis crashes, times out, or experiences networking partitions.
* **Resiliency Pattern (Failover DB Ingestion):** 
  * The `/v1/events` endpoint catches Redis exceptions. It logs a warning and falls back to **direct database writes** via the repository, returning a `201 Created` status code to indicate successful synchronous persistence.
  * The API continues functioning smoothly without throwing `500 Internal Server Errors`.
* **Rate Limiting Fallback:** The sliding-window rate limiter fails-open if Redis is unreachable, allowing requests through rather than locking out legitimate clients.

---

## 2. Background Worker Database Offline
* **Symptom:** PostgreSQL goes offline or locks up while the ARQ worker is running.
* **Resiliency Pattern (Dead-Letter Queue):**
  * When database writes fail, the worker catches the database exceptions.
  * Instead of discarding the events, the worker routes them to a **Redis Dead-Letter Queue (DLQ)** list at `pulsetrack:queue:dlq`.
  * The events remain safely buffered in Redis memory and can be replayed or analyzed when the database recovers.

---

## 3. Network Latency & Client Retries
* **Symptom:** Clients resubmit identical telemetry packets due to network lag, risking duplicate event counts in metrics.
* **Resiliency Pattern (Idempotency Key):**
  * Clients include the `Idempotency-Key` UUID header.
  * PulseTrack checks both the Redis cache (for active transactions) and the PostgreSQL unique index (`idx_events_app_idempotency`).
  * If a duplicate request is received within 24 hours, the backend bypasses the ingestion pipeline and returns the identical replay response (`200 OK` with `"idempotent_replay": true`).
