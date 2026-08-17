import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.dependencies.repositories import get_event_repository
from app.main import app
from app.models.application import Application
from app.repositories.event import EventRepository
from app.security.auth import get_current_application, get_current_application_optional


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
async def test_get_metrics_success(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies GET /v1/applications/{id}/metrics success response."""
    mock_repo = AsyncMock(spec=EventRepository)
    now = datetime.now(UTC)
    mock_repo.get_metrics_aggregation.return_value = [
        {"timestamp": now.isoformat(), "event_name": "button_click", "count": 42}
    ]

    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_current_application_optional] = lambda: mock_app
    app.dependency_overrides[get_event_repository] = lambda: mock_repo
    try:
        response = await async_client.get(
            f"/v1/applications/{mock_app.id}/metrics",
            headers={"X-API-Key": "pt_live_validkey"},
            params={
                "start_date": "2026-08-01T00:00:00Z",
                "end_date": "2026-08-07T23:59:59Z",
                "event_name": "button_click",
                "granularity": "hour",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["application_id"] == str(mock_app.id)
        assert data["event_name"] == "button_click"
        assert data["granularity"] == "hour"
        assert data["cache_hit"] is False
        assert len(data["data"]) == 1
        assert data["data"][0]["bucket"] == now.isoformat()
        assert data["data"][0]["count"] == 42
        assert data["data"][0]["event_name"] == "button_click"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_metrics_cross_tenant_forbidden(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies 403 Forbidden on cross-tenant metrics access attempt."""
    other_app_id = uuid.uuid4()
    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_current_application_optional] = lambda: mock_app
    try:
        response = await async_client.get(
            f"/v1/applications/{other_app_id}/metrics",
            headers={"X-API-Key": "pt_live_validkey"},
            params={
                "start_date": "2026-08-01T00:00:00Z",
                "end_date": "2026-08-07T23:59:59Z",
                "event_name": "button_click",
            },
        )
        assert response.status_code == 403
        error_data = response.json()["error"]
        assert error_data["code"] == "FORBIDDEN"
        assert "request_id" in error_data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_metrics_invalid_date_range(
    async_client: AsyncClient, mock_app: Application
) -> None:
    """Verifies 400 Bad Request when start_date > end_date."""
    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_current_application_optional] = lambda: mock_app
    try:
        response = await async_client.get(
            f"/v1/applications/{mock_app.id}/metrics",
            headers={"X-API-Key": "pt_live_validkey"},
            params={
                "start_date": "2026-08-10T00:00:00Z",
                "end_date": "2026-08-01T00:00:00Z",
                "event_name": "button_click",
            },
        )
        assert response.status_code == 400
        error_data = response.json()["error"]
        assert error_data["code"] == "BAD_REQUEST"
        assert "request_id" in error_data
    finally:
        app.dependency_overrides.clear()
