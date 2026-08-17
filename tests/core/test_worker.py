import uuid

import pytest
from arq.connections import RedisSettings

from app.core.worker import (
    WorkerSettings,
    get_arq_redis_settings,
    process_event_batch_task,
)
from app.repositories.application import ApplicationRepository


def test_get_arq_redis_settings() -> None:
    """Verifies parsing of RedisSettings for ARQ connection pool."""
    redis_settings = get_arq_redis_settings()
    assert isinstance(redis_settings, RedisSettings)


@pytest.mark.asyncio
async def test_process_event_batch_task(real_db_session) -> None:
    """Verifies process_event_batch_task execution with database persistence."""
    app_repo = ApplicationRepository(real_db_session)
    # Register a real test application to avoid foreign key violations
    test_app = await app_repo.create(
        name="Test Ingestion App",
        owner_email=f"test_worker_owner_{uuid.uuid4().hex[:8]}@example.com",
        api_key_hash=f"hash_worker_{uuid.uuid4().hex[:12]}",
        api_key_prefix="pt_live_12",
    )
    await real_db_session.commit()

    events = [
        {
            "application_id": str(test_app.id),
            "event_name": "click",
            "occurred_at": "2026-08-07T12:00:00Z",
        },
        {
            "application_id": str(test_app.id),
            "event_name": "view",
            "occurred_at": "2026-08-07T12:01:00Z",
        },
    ]
    result = await process_event_batch_task(ctx={}, events_data=events)
    assert result == 2


def test_worker_settings() -> None:
    """Verifies WorkerSettings configuration."""
    assert process_event_batch_task in WorkerSettings.functions
    assert isinstance(WorkerSettings.redis_settings, RedisSettings)
