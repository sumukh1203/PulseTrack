import pytest
from arq.connections import RedisSettings

from app.core.worker import (
    WorkerSettings,
    get_arq_redis_settings,
    process_event_batch_task,
)


def test_get_arq_redis_settings() -> None:
    """Verifies parsing of RedisSettings for ARQ connection pool."""
    redis_settings = get_arq_redis_settings()
    assert isinstance(redis_settings, RedisSettings)


@pytest.mark.asyncio
async def test_process_event_batch_task() -> None:
    """Verifies process_event_batch_task execution."""
    events = [
        {"event_name": "click", "occurred_at": "2026-08-07T12:00:00Z"},
        {"event_name": "view", "occurred_at": "2026-08-07T12:01:00Z"},
    ]
    result = await process_event_batch_task(ctx={}, events_data=events)
    assert result == 2


def test_worker_settings() -> None:
    """Verifies WorkerSettings configuration."""
    assert process_event_batch_task in WorkerSettings.functions
    assert isinstance(WorkerSettings.redis_settings, RedisSettings)
