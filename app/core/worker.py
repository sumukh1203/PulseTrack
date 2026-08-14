from typing import Any

from arq.connections import RedisSettings

from app.core.config import get_settings


async def process_event_batch_task(
    ctx: dict[str, Any], events_data: list[dict[str, Any]]
) -> int:
    """ARQ background task for processing and persisting batched telemetry events."""
    # Process event payload batch
    return len(events_data)


def get_arq_redis_settings() -> RedisSettings:
    """Parses ARQ RedisSettings from application configuration."""
    settings = get_settings()
    return RedisSettings.from_dsn(settings.REDIS_URL)


class WorkerSettings:
    """ARQ background worker configuration settings."""

    functions = [process_event_batch_task]
    redis_settings = get_arq_redis_settings()
