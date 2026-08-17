# API Reference

PulseTrack exposes three categories of REST endpoints under version `/v1`:
1. **Tenant Provisioning:** `/v1/applications`
2. **Telemetry Ingestion:** `/v1/events` (Single & Batch)
3. **Analytics Queries:** `/v1/applications/{id}/metrics`

---

## Authentication
All telemetry and analytics endpoints require the `X-API-Key` HTTP header.
```http
X-API-Key: pt_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 1. Register Application
Registers a new tenant application and generates a secure API key.

* **URL:** `/v1/applications`
* **Method:** `POST`
* **Request Body:**
  ```json
  {
    "name": "My SaaS Platform",
    "owner_email": "admin@mycompany.com",
    "rate_limit_per_minute": 1000
  }
  ```
* **Response Status:** `201 Created`
* **Response Body:**
  ```json
  {
    "id": "e8a9cfc7-27f1-46e5-8f6d-fb85baa0c3b2",
    "name": "My SaaS Platform",
    "owner_email": "admin@mycompany.com",
    "api_key": "pt_live_e8a9cfc727f146e58f6dfb85baa0c3b2",
    "is_active": true,
    "rate_limit_per_minute": 1000,
    "created_at": "2026-08-17T10:13:00Z"
  }
  ```

---

## 2. Ingest Telemetry Event (Single)
Submits a single client telemetry event.

* **URL:** `/v1/events`
* **Method:** `POST`
* **Headers:**
  * `X-API-Key`: `pt_live_xxxxxxxxxxxxxxxxxxxxxxxx`
  * `Idempotency-Key` (Optional): Unique UUID string to prevent duplicate submissions.
* **Request Body:**
  ```json
  {
    "event_name": "button_click",
    "occurred_at": "2026-08-17T10:13:00Z",
    "session_id": "sess_f93284b1",
    "distinct_id": "user_49102",
    "metadata": {
      "element_id": "checkout-button",
      "cart_value": 49.99
    }
  }
  ```
* **Response Status:** `202 Accepted` (Enqueued)
* **Response Body:**
  ```json
  {
    "status": "queued",
    "request_id": "req_8fa66cc5f61a"
  }
  ```
  *(Returns `201 Created` if Redis is down and fallback direct DB insert succeeds).*

---

## 3. Ingest Telemetry Events in Batch
Submits a list of events (up to 500) for high-frequency write paths.

* **URL:** `/v1/events/batch`
* **Method:** `POST`
* **Headers:**
  * `X-API-Key`: `pt_live_xxxxxxxxxxxxxxxxxxxxxxxx`
* **Request Body:**
  ```json
  {
    "events": [
      {
        "event_name": "page_view",
        "occurred_at": "2026-08-17T10:13:00Z",
        "metadata": {"path": "/home"}
      },
      {
        "event_name": "click_button",
        "occurred_at": "invalid-timestamp",
        "metadata": {"element": "cta"}
      }
    ]
  }
  ```
* **Response Status:** `207 Multi-Status`
* **Response Body:**
  ```json
  {
    "accepted": 1,
    "rejected": 1,
    "errors": [
      {
        "index": 1,
        "code": "validation_error",
        "message": "occurred_at must be a valid ISO 8601 datetime with timezone"
      }
    ]
  }
  ```

---

## 4. Get Time-Bucketed Metrics
Returns aggregated event counts aggregated into time buckets (minute, hour, day).

* **URL:** `/v1/applications/{id}/metrics`
* **Method:** `GET`
* **Query Parameters:**
  * `start_date` (Required): ISO 8601 start time.
  * `end_date` (Required): ISO 8601 end time.
  * `event_name` (Optional): String filter.
  * `granularity` (Optional): `minute` | `hour` | `day` (Default: `day`).
* **Response Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "application_id": "e8a9cfc7-27f1-46e5-8f6d-fb85baa0c3b2",
    "event_name": "button_click",
    "granularity": "hour",
    "start_date": "2026-08-17T00:00:00Z",
    "end_date": "2026-08-17T23:59:59Z",
    "cache_hit": true,
    "data": [
      {
        "bucket": "2026-08-17T10:00:00Z",
        "count": 412
      },
      {
        "bucket": "2026-08-17T11:00:00Z",
        "count": 523
      }
    ]
  }
  ```
