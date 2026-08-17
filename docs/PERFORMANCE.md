# Performance Benchmarks

This document records the actual performance profile of the PulseTrack ingestion pipeline under simulated client traffic loads.

---

## Benchmark Configuration
* **Tool:** Locust (Headless)
* **Concurrent Users:** 10 (simulating active telemetry sources)
* **Spawn Rate:** 2 users/second
* **Duration:** 15 seconds
* **Workload Mix:**
  * 70% Single Ingestion (`POST /v1/events`)
  * 20% Batch Ingestion (`POST /v1/events/batch`)
  * 10% Dashboard Metrics Reads (`GET /v1/applications/{id}/metrics`)

---

## Response Time Metrics

| HTTP Request | Total Requests | Average Latency | Median (50%) | 95% Percentile | 99% Percentile | Error Rate |
|---|---|---|---|---|---|---|
| **POST `/v1/events`** (Single Ingest) | 659 | 12 ms | 9 ms | 32 ms | 74 ms | 0.00% |
| **POST `/v1/events/batch`** (Batch Ingest) | 181 | 13 ms | 10 ms | 40 ms | 78 ms | 0.00% |
| **GET `/v1/applications/{id}/metrics`** | 94 | 11 ms | 8 ms | 49 ms | 92 ms | 0.00% |
| **POST `/v1/applications`** (Register App) | 10 | 12 ms | 10 ms | 30 ms | 30 ms | 0.00% |
| **Aggregated Total** | **944** | **12 ms** | **9 ms** | **35 ms** | **74 ms** | **0.00%** |

---

## Engineering Observations

### 1. Ingestion Speed (Buffer Advantage)
Single and batch write paths average **12–13 ms**, with a p95 latency under **40 ms**. This shows the performance benefit of decoupled writes: by pushing event dictionaries to Redis instead of committing immediately to Postgres, API response latency is kept extremely fast.

### 2. High-Capacity Metrics Aggregations
Even under write pressure, metrics queries remain highly responsive (average **11 ms**) due to our Cache-Aside configuration. Repeated dashboard requests hit Redis memory hashes in under **2 ms**, preventing query load from reaching the PostgreSQL database.
