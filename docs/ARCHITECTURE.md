# System Architecture & Design

PulseTrack is designed as a decoupled, asynchronous, high-throughput event collection backend. It handles telemetry streams from multiple applications (tenants) securely and aggregates them for dashboard visualizations.

---

## 1. Architectural Topology

PulseTrack follows a stateless **Producer-Consumer** pattern mediated by an in-memory queue. This isolates the hot API ingestion path from database write latencies.

```
+------------------+      (HTTP Ingest)      +----------------------------+
|  Telemetry App   | ----------------------> | FastAPI Ingestion Engine   |
+------------------+                         +----------------------------+
                                                           |
                                                           | (Atomic Rate Limit Check)
                                                           v
+------------------+                         +----------------------------+
| PostgreSQL DB    |                         | Redis Memory Queue         |
| (Monthly event   | <---------------------- | (Worker pops & batch runs) |
|   partitions)    |      (Bulk Write)       +----------------------------+
+------------------+
```

---

## 2. Decoupled Components

### Ingestion Tier (FastAPI Producer)
* **Statelessness:** The FastAPI service does not maintain local state, allowing it to scale horizontally behind a load balancer.
* **Schema Validation:** Event schemas are strictly parsed via Pydantic. Metadata payloads are limited to 8KB to protect heap memory.
* **Buffer Queue:** Once validated, events are pushed to the Redis list `pulsetrack:queue:events` in under 10ms. The API returns `202 Accepted` immediately.

### Worker Tier (ARQ Consumer)
* **Batch Processor:** The background worker runs as a separate process. Every second, it pops up to 500 events from the queue.
* **Transactional Bulk Insert:** Groups the popped events and issues a single batch insert query to PostgreSQL. This reduces transaction overhead and database lock times.
* **DLQ Routing:** If the database write fails, the worker catches the exception, serialization errors, or transient timeouts, and routes the events to a dead-letter queue (`pulsetrack:queue:dlq`) to prevent data loss.

### Storage Tier (PostgreSQL + Range Partitioning)
* **Monthly Partitions:** The `events` table is partitioned by month using range partitioning on `occurred_at`.
* **Index Locality:** Partitioning ensures database indexes (like GIN and B-Tree indexes on `occurred_at` and `metadata`) remain small, avoiding performance degradation as data volume grows.
* **Composite Primary Key:** The primary key is structured as `(id, occurred_at)` because PostgreSQL requires the partitioning key to be part of all unique constraints and primary keys.

---

## 3. Reliability Degradation Model

If Redis becomes unreachable, the FastAPI ingestion engine automatically degrades to a **synchronous fallback pipeline**:
* Bypasses the queue buffer entirely.
* Inserts the event directly into PostgreSQL via repositories.
* Returns `201 Created` to signify successful sync persistence.
* When Redis heals, the system resumes `202 Accepted` buffering automatically.
