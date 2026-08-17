import random
import uuid

from locust import HttpUser, between, task


class PulseTrackLoadUser(HttpUser):
    """Locust load test simulating client application traffic and dashboard reads."""

    wait_time = between(0.05, 0.2)  # Fast user traffic

    def on_start(self) -> None:
        """Provision a dedicated tenant application and retrieve its API key."""
        self.headers = {"Content-Type": "application/json"}
        self.app_id = None
        payload = {
            "name": f"Locust Load Test Tenant {uuid.uuid4().hex[:6]}",
            "owner_email": f"locust_{uuid.uuid4().hex[:8]}@example.com",
            "rate_limit_per_minute": 100000,  # Set high to prevent 429 limits during the benchmark
        }
        try:
            response = self.client.post("/v1/applications", json=payload)
            if response.status_code == 201:
                data = response.json()
                self.headers["X-API-Key"] = data["api_key"]
                self.app_id = data["id"]
            else:
                self.headers["X-API-Key"] = "pt_live_dummykey"
        except Exception:
            self.headers["X-API-Key"] = "pt_live_dummykey"

    @task(7)
    def ingest_single_event(self) -> None:
        """Simulate single telemetry event write (enqueued or fallback db write)."""
        payload = {
            "event_name": random.choice(
                ["click_button", "page_load", "checkout_completed", "error_triggered"]
            ),
            "occurred_at": "2026-08-17T10:13:00Z",
            "session_id": f"sess_{uuid.uuid4().hex[:8]}",
            "metadata": {
                "browser": "Chrome",
                "os": "macOS",
                "screen_width": 1920,
            },
        }
        self.client.post("/v1/events", json=payload, headers=self.headers)

    @task(2)
    def ingest_batch_events(self) -> None:
        """Simulate batch telemetry event ingestion."""
        payload = {
            "events": [
                {
                    "event_name": "scroll_page",
                    "occurred_at": "2026-08-17T10:13:00Z",
                    "metadata": {"scroll_depth": 45},
                },
                {
                    "event_name": "hover_element",
                    "occurred_at": "2026-08-17T10:13:02Z",
                    "metadata": {"element_id": "navbar-item"},
                },
            ]
        }
        self.client.post("/v1/events/batch", json=payload, headers=self.headers)

    @task(1)
    def query_metrics_dashboard(self) -> None:
        """Simulate dashboard user fetching metrics telemetry."""
        if self.app_id:
            start_str = "2026-08-17T00:00:00Z"
            end_str = "2026-08-17T23:59:59Z"
            self.client.get(
                f"/v1/applications/{self.app_id}/metrics?start_date={start_str}&end_date={end_str}&granularity=minute&metric_name=click_button",
                headers=self.headers,
            )
