import json
import logging
import uuid
from datetime import datetime
from typing import Any

from arq import cron
from arq.connections import RedisSettings

from app.core.config import get_settings
from app.core.redis import close_redis_client, get_redis_client
from app.database.session import (
    close_async_engine,
    get_async_engine,
    get_session_factory,
)
from app.models.event import Event
from app.repositories.event import EventRepository

logger = logging.getLogger(__name__)


async def startup(ctx: dict[str, Any]) -> None:
    """Worker startup hook initializing database engine and Redis client."""
    get_async_engine()
    ctx["redis"] = get_redis_client()
    logger.info("ARQ background worker initialized database and Redis client")


async def shutdown(ctx: dict[str, Any]) -> None:
    """Worker shutdown hook releasing database and Redis client resources."""
    await close_async_engine()
    await close_redis_client()
    logger.info("ARQ background worker released database and Redis client")


async def process_event_batch_task(
    ctx: dict[str, Any], events_data: list[dict[str, Any]]
) -> int:
    """ARQ background task for processing and persisting batched telemetry events."""
    if not events_data:
        return 0

    async with get_session_factory()() as session:
        repo = EventRepository(session)
        event_models = []
        for item in events_data:
            occurred_at = item["occurred_at"]
            if isinstance(occurred_at, str):
                occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))

            event_models.append(
                Event(
                    application_id=(
                        uuid.UUID(item["application_id"])
                        if isinstance(item.get("application_id"), str)
                        else (item.get("application_id") or uuid.uuid4())
                    ),
                    event_name=item["event_name"],
                    session_id=item.get("session_id"),
                    distinct_id=item.get("distinct_id"),
                    event_metadata=item.get("metadata")
                    or item.get("event_metadata")
                    or {},
                    occurred_at=occurred_at,
                    idempotency_key=(
                        uuid.UUID(item["idempotency_key"])
                        if item.get("idempotency_key")
                        and isinstance(item["idempotency_key"], str)
                        else item.get("idempotency_key")
                    ),
                )
            )
        await repo.create_batch(event_models)
        await session.commit()

    return len(events_data)


async def process_queued_events(ctx: dict[str, Any]) -> int:
    """Scheduled cron task popping queued events from Redis list and bulk inserting them."""
    redis = ctx.get("redis")
    if redis is None:
        redis = get_redis_client()

    events_data = []
    # Pop up to 500 events from the queue
    for _ in range(500):
        val = await redis.lpop("pulsetrack:queue:events")  # type: ignore[misc]
        if not val:
            break
        try:
            events_data.append(json.loads(val))
        except Exception as e:
            logger.error("Failed to parse JSON for queued event, skipping", exc_info=e)

    if not events_data:
        return 0

    try:
        return await process_event_batch_task(ctx, events_data)
    except Exception as e:
        logger.error("Failed to persist batched events, routing to DLQ", exc_info=e)
        try:
            # Route to dead-letter queue
            for item in events_data:
                await redis.rpush("pulsetrack:queue:dlq", json.dumps(item))  # type: ignore[misc]
        except Exception as dlq_err:
            logger.critical("Failed to write to Redis DLQ list!", exc_info=dlq_err)
        raise e


def get_arq_redis_settings() -> RedisSettings:
    """Parses ARQ RedisSettings from application configuration."""
    settings = get_settings()
    return RedisSettings.from_dsn(settings.REDIS_URL)


class WorkerSettings:
    """ARQ background worker configuration settings."""

    functions = [process_event_batch_task]
    cron_jobs = [cron(process_queued_events, second=set(range(60)))]
    redis_settings = get_arq_redis_settings()
    on_startup = startup
    on_shutdown = shutdown
