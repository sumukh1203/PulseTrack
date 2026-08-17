import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.dependencies.repositories import (
    get_application_repository,
    get_event_repository,
)
from app.main import app
from app.models.application import Application
from app.repositories.application import ApplicationRepository
from app.repositories.event import EventRepository
from app.security.auth import get_current_application, get_current_application_optional


@pytest.mark.asyncio
async def test_create_application_success(async_client: AsyncClient) -> None:
    """Verifies POST /v1/applications success response."""
    mock_repo = AsyncMock(spec=ApplicationRepository)
    mock_repo.get_by_owner_email.return_value = None

    mock_app = Application(
        id=uuid.uuid4(),
        name="My SaaS",
        owner_email="new_owner@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
        is_active=True,
        created_at=datetime.now(UTC),
    )
    mock_repo.create.return_value = mock_app

    app.dependency_overrides[get_application_repository] = lambda: mock_repo
    try:
        response = await async_client.post(
            "/v1/applications",
            json={"name": "My SaaS", "owner_email": "new_owner@example.com"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "My SaaS"
        assert data["api_key"].startswith("pt_live_")
        assert "id" in data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_application_duplicate_email(async_client: AsyncClient) -> None:
    """Verifies 409 Conflict when owner_email already exists."""
    mock_repo = AsyncMock(spec=ApplicationRepository)
    mock_repo.get_by_owner_email.return_value = Application(
        name="Existing", owner_email="existing@example.com"
    )

    app.dependency_overrides[get_application_repository] = lambda: mock_repo
    try:
        response = await async_client.post(
            "/v1/applications",
            json={"name": "Duplicate App", "owner_email": "existing@example.com"},
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "CONFLICT"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_application_success(async_client: AsyncClient) -> None:
    """Verifies GET /v1/applications/{id} success response."""
    app_id = uuid.uuid4()
    mock_app = Application(
        id=app_id,
        name="My SaaS",
        owner_email="owner@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
        is_active=True,
        rate_limit_per_minute=600,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_current_application_optional] = lambda: mock_app
    try:
        response = await async_client.get(
            f"/v1/applications/{app_id}",
            headers={"X-API-Key": "pt_live_validkey"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(app_id)
        assert data["name"] == "My SaaS"
        assert data["api_key_prefix"] == "pt_live_12"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_application_cross_tenant_forbidden(
    async_client: AsyncClient,
) -> None:
    """Verifies 403 Forbidden on cross-tenant access attempt."""
    auth_app_id = uuid.uuid4()
    other_app_id = uuid.uuid4()

    mock_app = Application(
        id=auth_app_id,
        name="My SaaS",
        owner_email="owner@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
        is_active=True,
    )

    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_current_application_optional] = lambda: mock_app
    try:
        response = await async_client.get(
            f"/v1/applications/{other_app_id}",
            headers={"X-API-Key": "pt_live_validkey"},
        )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_applications_success(async_client: AsyncClient) -> None:
    """Verifies GET /v1/applications successfully lists all applications."""
    mock_repo = AsyncMock(spec=ApplicationRepository)
    mock_app = Application(
        id=uuid.uuid4(),
        name="App One",
        owner_email="one@example.com",
        api_key_hash="hash1",
        api_key_prefix="pt_live_11",
        is_active=True,
        rate_limit_per_minute=600,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    mock_repo.get_all.return_value = [mock_app]

    app.dependency_overrides[get_application_repository] = lambda: mock_repo
    try:
        response = await async_client.get("/v1/applications")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "App One"
        assert data[0]["api_key_prefix"] == "pt_live_11"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_application_events_success(async_client: AsyncClient) -> None:
    """Verifies GET /v1/applications/{id}/events successfully retrieves recent events."""
    from app.models.event import Event

    mock_app = Application(
        id=uuid.uuid4(),
        name="App One",
        owner_email="one@example.com",
        api_key_hash="hash1",
        api_key_prefix="pt_live_11",
        is_active=True,
    )
    mock_event = Event(
        id=101,
        application_id=mock_app.id,
        event_name="click",
        session_id="sess123",
        distinct_id="user1",
        event_metadata={"button": "blue"},
        occurred_at=datetime.now(UTC),
        ingested_at=datetime.now(UTC),
    )
    mock_event_repo = AsyncMock(spec=EventRepository)
    mock_event_repo.get_recent_events.return_value = [mock_event]

    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_current_application_optional] = lambda: mock_app
    app.dependency_overrides[get_event_repository] = lambda: mock_event_repo
    try:
        response = await async_client.get(
            f"/v1/applications/{mock_app.id}/events",
            headers={"X-API-Key": "pt_live_validkey"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == 101
        assert data[0]["event_name"] == "click"
        assert data[0]["metadata"] == {"button": "blue"}
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_application_unauthenticated_fails(async_client: AsyncClient) -> None:
    """Verifies GET /v1/applications/{id} fails with 401 when no key header is sent."""
    app_id = uuid.uuid4()
    response = await async_client.get(f"/v1/applications/{app_id}")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_rotate_application_key_success(async_client: AsyncClient) -> None:
    """Verifies POST /v1/applications/{id}/keys/rotate success response."""
    app_id = uuid.uuid4()
    mock_app = Application(
        id=app_id,
        name="My SaaS",
        owner_email="owner@example.com",
        api_key_hash="oldhash",
        api_key_prefix="pt_live_12",
        is_active=True,
    )

    mock_repo = AsyncMock(spec=ApplicationRepository)
    mock_repo.session = AsyncMock()

    app.dependency_overrides[get_current_application] = lambda: mock_app
    app.dependency_overrides[get_application_repository] = lambda: mock_repo
    try:
        response = await async_client.post(
            f"/v1/applications/{app_id}/keys/rotate",
            headers={"X-API-Key": "pt_live_validkey"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "api_key" in data
        assert data["api_key"].startswith("pt_live_")
        assert "rotated_at" in data
    finally:
        app.dependency_overrides.clear()
