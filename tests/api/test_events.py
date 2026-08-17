import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.core.redis import get_redis
from app.dependencies.repositories import get_event_repository
from app.main import app
from app.models.application import Application
from app.models.event import Event
from app.repositories.event import EventRepository
from app.security.auth import get_current_application


@pytest.fixture
def mock_app() -> Application:
    """Fixture providing an active Application entity."""
    return Application(
        id=uuid.uuid4(),
        name="Test SaaS App",
        owner_email="owner@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
        is_active=True,
    )


async def mock_redis_connection_error():
    """Simulates Redis connection failure to test graceful fallback."""
    mock = AsyncMock()
    mock.rpush.side_effect = Exception("Redis is down")
    mock.get.side_effect = Exception("Redis is down")
    yield mock


async def mock_redis_healthy():
    """Simulates a healthy Redis client."""
    mock = AsyncMock()
    mock.rpush.return_value = 1
    mock.get.return_value = None
    yield mock


@pytest.mark.asyncio
async def test_ingest_event_success_fallback(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies POST /v1/events success response (fallback synchronous DB write when Redis is down)."""
    mock_repo = AsyncMock(spec=EventRepository)
    created_event = Event(
        id=101,
        application_id=mock_app.id,
        event_name="button_click",
        occurred_at=datetime.now(UTC),
    )
    mock_repo.create.return_value = created_event

    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_event_repository] = lambda: mock_repo
    app.dependency_overrides[get_redis] = mock_redis_connection_error
    try:
        response = await async_client.post(
            "/v1/events",
            headers={"X-API-Key": "pt_live_validkey"},
            json={
                "event_name": "button_click",
                "occurred_at": "2026-08-07T12:00:00Z",
                "session_id": "sess_123",
                "metadata": {"page": "/checkout"},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 101
        assert data["status"] == "stored"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ingest_event_enqueued_success(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies POST /v1/events enqueues event successfully with 202 Accepted when Redis is healthy."""
    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_redis] = mock_redis_healthy
    try:
        response = await async_client.post(
            "/v1/events",
            headers={"X-API-Key": "pt_live_validkey"},
            json={
                "event_name": "button_click",
                "occurred_at": "2026-08-07T12:00:00Z",
                "session_id": "sess_123",
                "metadata": {"page": "/checkout"},
            },
        )
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "queued"
        assert "request_id" in data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ingest_event_idempotent_replay(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies 200 OK replay when Idempotency-Key is resubmitted."""
    mock_repo = AsyncMock(spec=EventRepository)
    idemp_key = uuid.uuid4()
    existing_event = Event(
        id=101,
        application_id=mock_app.id,
        event_name="button_click",
        occurred_at=datetime.now(UTC),
        idempotency_key=idemp_key,
    )
    mock_repo.get_by_idempotency_key.return_value = existing_event

    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_event_repository] = lambda: mock_repo
    app.dependency_overrides[get_redis] = mock_redis_connection_error
    try:
        response = await async_client.post(
            "/v1/events",
            headers={
                "X-API-Key": "pt_live_validkey",
                "Idempotency-Key": str(idemp_key),
            },
            json={
                "event_name": "button_click",
                "occurred_at": "2026-08-07T12:00:00Z",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 101
        assert data["status"] == "stored"
        assert data["idempotent_replay"] is True
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ingest_event_metadata_payload_too_large(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies 422 Unprocessable Entity when metadata exceeds 8KB."""
    app.dependency_overrides[get_current_application] = lambda: mock_app
    try:
        large_metadata = {"data": "x" * 8192}
        response = await async_client.post(
            "/v1/events",
            headers={"X-API-Key": "pt_live_validkey"},
            json={
                "event_name": "button_click",
                "occurred_at": "2026-08-07T12:00:00Z",
                "metadata": large_metadata,
            },
        )
        assert response.status_code == 422
        error_data = response.json()["error"]
        assert error_data["code"] == "VALIDATION_ERROR"
        assert "request_id" in error_data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ingest_batch_events_success(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies POST /v1/events/batch enqueues batch successfully with 207 Multi-Status."""
    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_redis] = mock_redis_healthy
    try:
        response = await async_client.post(
            "/v1/events/batch",
            headers={"X-API-Key": "pt_live_validkey"},
            json={
                "events": [
                    {
                        "event_name": "click",
                        "occurred_at": "2026-08-07T12:00:00Z",
                    },
                    {
                        "event_name": "view",
                        "occurred_at": "2026-08-07T12:01:00Z",
                    },
                ]
            },
        )
        assert response.status_code == 207
        data = response.json()
        assert data["accepted"] == 2
        assert data["rejected"] == 0
        assert len(data["errors"]) == 0
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint(async_client: AsyncClient) -> None:
    """Verifies GET /metrics endpoint returns standard Prometheus scrape format."""
    response = await async_client.get("/metrics")
    assert response.status_code == 200
    assert "pulsetrack_queue_depth" in response.text
