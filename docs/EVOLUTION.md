# Engineering Evolution: Phase 1 to Phase 2

One of PulseTrack's core engineering values is its progression from a simple synchronous REST API to a scalable, decoupled, high-concurrency telemetry system.

---

## Phase 1: Synchronous Ingestion (The MVP)

In Phase 1, the client request blocks on database persistence before returning a response.

```
+--------+       POST /v1/events       +-------------+       INSERT INTO db       +---------------+
| Client | --------------------------> | FastAPI App | -------------------------> | PostgreSQL DB |
+--------+                             +-------------+                            +---------------+
    ^                                         |                                           |
    |               201 Created               |             Transaction Commit            |
    +-----------------------------------------+ <-----------------------------------------+
```

### The Bottleneck:
* **High Write Pressure:** Under a burst of 1,000 requests/sec, the database runs out of available connection pools or locks tables.
* **Network Latency Overhead:** The client's HTTP request is bound to database disk write latencies (p95 response time easily exceeds **150ms**).

---

## Phase 2: Decoupled Queued Ingestion (The Scaled Tier)

In Phase 2, writes are decoupled from the API request path, moving persistence to a background transactional queue loop.

```
+--------+       POST /v1/events       +-------------+       LPUSH (10ms)       +-------------+
| Client | --------------------------> | FastAPI App | -----------------------> | Redis Queue |
+--------+                             +-------------+                          +-------------+
    ^                                         |                                        |
    |             202 Accepted                |                                        | (ARQ Worker pops
    +-----------------------------------------+                                        |  up to 500 events)
                                                                                       v
                                                                                +-------------+
                                                                                | ARQ Worker  |
                                                                                +-------------+
                                                                                       |
                                                                                       | (Bulk Insert Transaction)
                                                                                       v
                                                                                +-------------+
                                                                                | Postgres DB |
                                                                                +-------------+
```

### Bottlenecks Resolved:

| Bottleneck Category | Phase 1 (MVP) Behavior | Phase 2 (Queued) Resolution |
|---|---|---|
| **API Latency** | Direct PostgreSQL transaction block (Avg **120ms**). | Redis push buffer (Avg **12ms**). |
| **Write Volatility** | 1,000 inserts = 1,000 database commits. | Worker batches events, running 2 commits/sec. |
| **Concurrency Locks** | High table lock contention on index inserts. | Single batch inserts minimize index adjustments. |
| **Query Latency** | Repeated heavy database scans. | Cache-aside filters with a 60s TTL absorb reads. |
| **Duplicate Packets** | DB constraint failures. | Redis idempotency verification filters duplicates. |
| **Bursts Protection** | System exhaustion / HTTP 500 crashes. | Sliding-window rate limit (429) regulates traffic. |
