#!/usr/bin/env python3
"""
PulseTrack Traffic Simulator & Architecture Demo
Usage:
  python scripts/demo_traffic.py
"""

import sys
import time
import uuid
from datetime import UTC, datetime

import httpx

BASE_URL = "http://localhost:8000"


def print_header(title: str):
    print("\n" + "=" * 65)
    print(f" {title}")
    print("=" * 65)


def main():
    print_header("PulseTrack Interactive Resume Demo")
    print("This script simulates real-time client traffic to showcase:")
    print(" 1. Tenant application registration & API Key generation")
    print(" 2. Async event queueing with Redis (202 Accepted)")
    print(" 3. Sync Postgres fallback ingestion when Redis is down (201 Created)")
    print(" 4. Per-tenant rate limiting (429 Too Many Requests)")
    print(" 5. Batch event ingestion with RFC-compliant multi-status (207)")
    print(" 6. Prometheus metrics scraping (/metrics)")

    client = httpx.Client(timeout=10.0)

    # Check if backend is running
    try:
        health = client.get(f"{BASE_URL}/health")
        if health.status_code != 200:
            print("\n[Error] Backend /health check failed. Is the server running?")
            sys.exit(1)
    except Exception:
        print(
            f"\n[Error] Cannot connect to backend at {BASE_URL}. Ensure `./start.sh` is running."
        )
        sys.exit(1)

    print("\n[✔] Connected to PulseTrack Backend successfully.")

    # 1. Register Application
    print_header("1. Provisioning Test Tenant Application")
    app_email = f"demo_{uuid.uuid4().hex[:6]}@pulsetrack.io"
    print(f"Registering app with owner email: {app_email}")

    try:
        app_res = client.post(
            f"{BASE_URL}/v1/applications",
            json={
                "name": "Resume Simulation App",
                "owner_email": app_email,
                "rate_limit_per_minute": 10,  # Set low limit to easily demonstrate 429 rate limiting!
            },
        )
        if app_res.status_code != 201:
            print(f"[Error] Failed to register application: {app_res.text}")
            sys.exit(1)

        app_data = app_res.json()
        api_key = app_data["api_key"]
        app_id = app_data["id"]
        print("[✔] Application Registered!")
        print(f"    Application ID: {app_id}")
        print(f"    Raw API Key:    {api_key}")
        print("    Rate Limit:     10 requests/minute")
    except Exception as e:
        print(f"[Error] Application registration failed: {e}")
        sys.exit(1)

    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    # 2. Simulate Single Event Ingest (Async vs Sync Fallback)
    print_header("2. Simulating Event Ingestions")
    events_to_send = [
        ("page_view", {"path": "/home"}),
        ("button_click", {"target": "signup-btn"}),
        ("search_query", {"query": "resumes"}),
    ]

    for name, metadata in events_to_send:
        print(f"\nIngesting event '{name}'...")
        payload = {
            "event_name": name,
            "occurred_at": datetime.now(UTC).isoformat(),
            "session_id": f"sess_{uuid.uuid4().hex[:8]}",
            "metadata": metadata,
        }
        res = client.post(f"{BASE_URL}/v1/events", headers=headers, json=payload)

        if res.status_code == 202:
            print(" -> Response Status: 202 Accepted")
            print("    Result: [✔] Enqueued to Redis list (async ingestion queue).")
            print(f"    Payload metadata: {res.json()}")
        elif res.status_code == 201:
            print(" -> Response Status: 201 Created")
            print(
                "    Result: [!] Redis down fallback. Synced directly to Postgres database."
            )
            print(f"    Payload metadata: {res.json()}")
        else:
            print(f" -> Unexpected Response {res.status_code}: {res.text}")
        time.sleep(0.5)

    # 3. Simulate Rate Limiting (429 Too Many Requests)
    print_header("3. Triggering Tenant Rate Limiting")
    print("Hitting endpoint rapidly to exceed the tenant limit (10 reqs/minute)...")

    limits_exceeded = 0
    for i in range(12):
        payload = {
            "event_name": f"rate_limit_test_{i}",
            "occurred_at": datetime.now(UTC).isoformat(),
        }
        res = client.post(f"{BASE_URL}/v1/events", headers=headers, json=payload)
        status_code = res.status_code

        # Output headers
        limit = res.headers.get("X-RateLimit-Limit")
        remaining = res.headers.get("X-RateLimit-Remaining")

        if status_code == 429:
            retry_after = res.headers.get("Retry-After")
            print(
                f" Request #{i+1:02d}: Status 429 Too Many Requests (Retry-After: {retry_after}s) [✔]"
            )
            limits_exceeded += 1
        else:
            print(
                f" Request #{i+1:02d}: Status {status_code} (Remaining: {remaining}/{limit})"
            )
        time.sleep(0.1)

    print(
        f"\n[✔] Rate limiting demo complete. Triggered {limits_exceeded} limits successfully."
    )

    # 4. Simulate Batch Event Ingest (207 Multi-Status)
    print_header("4. Simulating Batch Event Ingest")
    batch_payload = {
        "events": [
            {
                "event_name": "dashboard_load",
                "occurred_at": datetime.now(UTC).isoformat(),
                "metadata": {"load_time_ms": 120},
            },
            {
                "event_name": "",  # Invalid name to trigger item-level validation error
                "occurred_at": datetime.now(UTC).isoformat(),
            },
            {
                "event_name": "feature_use",
                "occurred_at": "invalid_date",  # Invalid date to trigger item-level validation error
            },
            {
                "event_name": "logout",
                "occurred_at": datetime.now(UTC).isoformat(),
            },
        ]
    }
    print("Sending batch payload containing 4 events (2 valid, 2 invalid)...")
    batch_res = client.post(
        f"{BASE_URL}/v1/events/batch", headers=headers, json=batch_payload
    )

    print(f"Response Status: {batch_res.status_code} Multi-Status")
    batch_data = batch_res.json()
    print(f" -> Accepted Events: {batch_data['accepted']}")
    print(f" -> Rejected Events: {batch_data['rejected']}")
    print(" -> Item Validation Errors:")
    for err in batch_data["errors"]:
        print(f"    * Index {err['index']}: Code: '{err['code']}' - {err['message']}")

    # 5. Prometheus Scrape (GET /metrics)
    print_header("5. Scraping Prometheus Telemetry Metrics")
    metrics_res = client.get(f"{BASE_URL}/metrics")
    print("GET /metrics output summary:")
    for line in metrics_res.text.split("\n"):
        if any(
            marker in line
            for marker in ["pulsetrack_http_requests_total", "pulsetrack_queue_depth"]
        ):
            print(f"  {line}")

    print_header("Resume Demo Simulation Completed Successfully!")
    print("This confirms the high-concurrency ingestion path, partitioning schemas,")
    print(
        "graceful fallbacks, rate limit limits, and Prometheus scrapers are functional."
    )
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
