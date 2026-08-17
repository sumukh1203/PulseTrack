# Security & Isolation Design

PulseTrack enforces strict security and tenant-isolation constraints on all read/write paths.

---

## 1. Multi-Tenant Isolation
Each application registered represents an isolated tenant.
* **Key Scopes:** Telemetry event ingestion and metrics aggregations are strictly partitioned by application ID.
* **Enforced Verification:** Dependencies dynamically resolve the API key to retrieve the authenticated `Application` tenant.
* **Metrics Protection:** The endpoint `/v1/applications/{id}/metrics` checks that the requested application ID matches the authenticated key's application ID:
  ```python
  if current_app.id != id:
      raise HTTPException(status_code=403, detail="Access denied")
  ```

---

## 2. API Key Management
* **Prefix Exposure:** Keys are generated as `pt_live_` followed by 32 bytes of secure random hex characters. The API exposes only the first 12 characters to the user as a prefix (e.g. `pt_live_abcd12`).
* **One-Way Hashing:** The backend never stores the raw API key in the database. Instead, it stores a one-way cryptographically secure SHA-256 hash of the key.
* **Verification caching:** Key hashes are verified against Redis cache-aside pools (5-minute TTL) to shield PostgreSQL from authentication lookup overhead on the hot path.

---

## 3. Payload Protection & Threat Model
* **Metadata Size Ceiling:** JSON metadata blocks are capped at **8KB** via schema constraints. Attempts to ingest larger payloads trigger `422 Unprocessable Entity` immediately, protecting worker memory from Heap exhaustion.
* **SQL Injection Prevention:** All database operations are mediated by the SQLAlchemy ORM using parameterized queries to prevent SQL injections.
* **Range limits:** Limits batch sizes strictly to **500 events** per call.
