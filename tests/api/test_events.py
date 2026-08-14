import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

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


@pytest.mark.asyncio
async def test_ingest_event_success(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies POST /v1/events success response."""
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
    """Verifies 422 Unprocessable Entity when metadata exceeds 10KB."""
    app.dependency_overrides[get_current_application] = lambda: mock_app
    try:
        large_metadata = {"data": "x" * 10001}
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
    finally:
        app.dependency_overrides.clear()
