import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import Granularity
from app.models.application import Application
from app.models.event import Event
from app.repositories.application import ApplicationRepository
from app.repositories.event import EventRepository


def create_mock_session() -> MagicMock:
    """Creates a mock AsyncSession with async flush/refresh/execute methods."""
    session = MagicMock(spec=AsyncSession)
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_application_repository_create() -> None:
    """Verifies ApplicationRepository create method."""
    mock_session = create_mock_session()
    repo = ApplicationRepository(mock_session)

    app = await repo.create(
        name="Test SaaS",
        owner_email="owner@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
    )

    assert app.name == "Test SaaS"
    assert app.owner_email == "owner@example.com"
    assert app.api_key_hash == "hash123"
    assert app.api_key_prefix == "pt_live_12"
    mock_session.add.assert_called_once()
    mock_session.flush.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(app)


@pytest.mark.asyncio
async def test_application_repository_queries() -> None:
    """Verifies ApplicationRepository lookups by id, hash, email."""
    mock_session = create_mock_session()
    mock_result = MagicMock()
    mock_app = Application(
        name="App 1",
        owner_email="dev@example.com",
        api_key_hash="hash_abc",
        api_key_prefix="pt_live_ab",
    )
    mock_result.scalar_one_or_none.return_value = mock_app
    mock_session.execute.return_value = mock_result

    repo = ApplicationRepository(mock_session)

    app_by_id = await repo.get_by_id(uuid.uuid4())
    assert app_by_id is mock_app

    app_by_hash = await repo.get_by_api_key_hash("hash_abc")
    assert app_by_hash is mock_app

    app_by_email = await repo.get_by_owner_email("dev@example.com")
    assert app_by_email is mock_app


@pytest.mark.asyncio
async def test_event_repository_create_and_batch() -> None:
    """Verifies EventRepository create and create_batch methods."""
    mock_session = create_mock_session()
    repo = EventRepository(mock_session)
    app_id = uuid.uuid4()
    now = datetime.now(UTC)

    event = await repo.create(
        application_id=app_id,
        event_name="click",
        occurred_at=now,
        event_metadata={"btn": "ok"},
    )

    assert event.application_id == app_id
    assert event.event_name == "click"
    assert event.event_metadata == {"btn": "ok"}
    mock_session.add.assert_called_once()
    mock_session.flush.assert_awaited_once()

    batch_events = [
        Event(application_id=app_id, event_name="e1", occurred_at=now),
        Event(application_id=app_id, event_name="e2", occurred_at=now),
    ]
    res_batch = await repo.create_batch(batch_events)
    assert len(res_batch) == 2
    mock_session.add_all.assert_called_once_with(batch_events)


@pytest.mark.asyncio
async def test_event_repository_idempotency_lookup() -> None:
    """Verifies EventRepository get_by_idempotency_key lookup."""
    mock_session = create_mock_session()
    mock_result = MagicMock()
    app_id = uuid.uuid4()
    idemp_key = uuid.uuid4()
    now = datetime.now(UTC)
    mock_event = Event(
        application_id=app_id,
        event_name="click",
        occurred_at=now,
        idempotency_key=idemp_key,
    )
    mock_result.scalar_one_or_none.return_value = mock_event
    mock_session.execute.return_value = mock_result

    repo = EventRepository(mock_session)
    res = await repo.get_by_idempotency_key(app_id, idemp_key)
    assert res is mock_event


@pytest.mark.asyncio
async def test_event_repository_metrics_aggregation() -> None:
    """Verifies EventRepository get_metrics_aggregation query execution."""
    mock_session = create_mock_session()
    mock_result = MagicMock()

    mock_row = MagicMock()
    mock_row.timestamp = datetime.now(UTC)
    mock_row.event_name = "button_click"
    mock_row.count = 42

    mock_result.all.return_value = [mock_row]
    mock_session.execute.return_value = mock_result

    repo = EventRepository(mock_session)
    app_id = uuid.uuid4()
    now = datetime.now(UTC)

    metrics = await repo.get_metrics_aggregation(
        application_id=app_id,
        start_time=now,
        end_time=now,
        granularity=Granularity.HOUR,
    )

    assert len(metrics) == 1
    assert metrics[0]["event_name"] == "button_click"
    assert metrics[0]["count"] == 42
    mock_session.execute.assert_awaited_once()
