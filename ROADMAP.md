# PulseTrack Project Roadmap

This roadmap documents the implementation progress of PulseTrack and future architectural scaling plans.

---

## Completed Roadmap Milestones

### M1: Foundation Ready (Completed)
- [x] Initial FastAPI skeletal structure, logging config, and `/health` routing.
- [x] Docker environment orchestration for local verification.
- [x] CI pipeline checking formatting (Ruff), typing (Mypy), security (Bandit), and pytest.

### M2: Authenticated Vertical Slice (Completed)
- [x] Tenant registration routes.
- [x] Secure API key generation with SHA-256 one-way hashing storage.
- [x] Context dependencies checking rate limits and verifying keys.
- [x] Cross-tenant isolation verification tests.

### M3: Ingestion & Aggregation MVP (Completed)
- [x] Synchronous `POST /v1/events` database write path.
- [x] Time-bucketed metrics aggregations (minute, hour, day).
- [x] Local frontend Vite dashboard displaying analytics graphs.

### M4: Scale-Out Infrastructure (Completed)
- [x] Redis list-backed enqueuing returning `202 Accepted`.
- [x] Redis Cache-Aside for Metrics and API Key resolutions.
- [x] ARQ background workers executing bulk transaction inserts.
- [x] Resilient fail-open rate limiting and sync direct-write fallback pipelines.
- [x] PostgreSQL Range Partitioning by month (`occurred_at`) with composite primary keys.
- [x] Prometheus `/metrics` instrumentation.
- [x] Automated Locust load-testing script and interactive traffic simulator.

---

## Future Enhancements

### 1. Materialized Rollup Tables (DB Optimization)
* **Objective:** Telemetry databases receive massive volumes of events, making aggregate metrics queries slower over time even with caching.
* **Plan:** Implement real-time PostgreSQL materialized views or aggregate rollup tables (e.g. `events_hourly_rollup`) updated via cron tasks, bypassing raw event scans for historic dashboard reads.

### 2. Distributed Message Broker (Kafka/Kinesis)
* **Objective:** As traffic grows to tens of thousands of requests per second, a simple Redis list queue can lead to memory exhaustion.
* **Plan:** Swap the Redis ingestion queue for Apache Kafka or AWS Kinesis to support multi-partition processing and persistent log storage.

### 3. Dynamic Partition Provisioning
* **Objective:** Partitions must be managed dynamically to avoid runtime crashes.
* **Plan:** Add an automated daily cron task in the worker to check, pre-provision monthly partition boundaries 2 months in advance, and prune historic records based on a retention policy.
