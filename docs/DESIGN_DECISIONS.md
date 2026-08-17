# Architectural Design Decisions (ADRs)

This document details the critical architectural choices made during the development of PulseTrack, outlining alternatives considered, trade-offs, and final decisions.

---

## 1. Primary Key Design for Telemetry Data
* **Problem:** Telemetry tables receive highly sustained, sequential inserts. UUIDs as primary keys trigger heavy indexing overhead (B-Tree splits) due to random insert distributions.
* **Options Considered:**
  * **Option A:** Random UUIDs (UUIDv4)
  * **Option B:** Sequential BIGINT Auto-incrementing IDs + composite timestamp keys.
* **Chosen Approach:** **Option B (BIGINT + occurred_at composite primary key)**
* **Why:** In PostgreSQL, range-partitioned tables require the partition key (`occurred_at`) to be part of the primary key. Pairing a fast, auto-incrementing BIGINT with `occurred_at` preserves B-Tree write-locality, allowing index blocks to append sequentially, optimizing write speeds.

---

## 2. Ingestion Queue Worker: Celery vs. ARQ
* **Problem:** We need a queue buffer to execute async writes.
* **Options Considered:**
  * **Option A:** Celery (powerful, heavy configuration, relies on AMQP/Redis)
  * **Option B:** ARQ (lightweight, async-first, uses Redis `blpop` loop natively)
* **Chosen Approach:** **Option B (ARQ)**
* **Why:** PulseTrack is built using asyncio (FastAPI + AsyncPG). ARQ runs natively within the Python asyncio loop, avoiding threaded worker overhead. It uses Redis lists and Lua scripts for job queuing, providing high efficiency and minimal setup footprint.

---

## 3. Caching Strategy: Write-Through vs. Cache-Aside
* **Problem:** Metrics aggregations are database-heavy queries that are frequently repeated by dashboards.
* **Options Considered:**
  * **Option A:** Write-through cache (caching events as they arrive)
  * **Option B:** Cache-aside (lazy loading metrics on demand, invalidating on write or time-to-live expiration)
* **Chosen Approach:** **Option B (Cache-Aside with TTL)**
* **Why:** Write-through caching at 1,000+ events/sec would exhaust memory pools. Cache-aside with a 60-second TTL for metrics queries allows us to absorb dashboard refresh bursts, while a 5-minute TTL for hashed API keys shields Postgres from authenticating the hot path on every request.

---

## 4. Rate Limiting: Sliding-Window Log vs. Sliding-Window Counter
* **Problem:** Rate limits must be checked atomically to prevent race conditions.
* **Options Considered:**
  * **Option A:** Redis Sorted Sets (sliding-window log) - precise but memory-intensive.
  * **Option B:** Sliding-window counters (Redis transactions/Lua) - approximate, highly memory-efficient.
* **Chosen Approach:** **Option B (Sliding-window counters)**
* **Why:** Sorted sets store every request timestamp, consuming significant Redis memory under load. Incrementing a simple minute-window key with an expiry (`EXPIRE`) via an atomic pipeline provides high-performance rate limiting with near-zero memory footprint.
