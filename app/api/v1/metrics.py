import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis

from app.core.cache import generate_cache_key, get_cached_json, set_cached_json
from app.core.redis import get_redis
from app.dependencies.repositories import get_event_repository
from app.models.application import Application
from app.repositories.event import EventRepository
from app.schemas.metrics import MetricBucket, MetricsQuery, MetricsResponse
from app.security.auth import get_current_application

router = APIRouter(prefix="/applications", tags=["Metrics"])


@router.get(
    "/{id}/metrics",
    status_code=status.HTTP_200_OK,
    response_model=MetricsResponse,
    summary="Get Aggregated Event Metrics",
    description="Returns time-bucketed event counts for application tenant.",
)
async def get_metrics(
    id: uuid.UUID,
    query: MetricsQuery = Depends(),
    current_app: Application = Depends(get_current_application),
    repo: EventRepository = Depends(get_event_repository),
    redis: Redis = Depends(get_redis),
) -> MetricsResponse:
    """Returns time-bucketed event aggregation metrics enforcing tenant isolation with cache-aside."""
    if current_app.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "Access denied for requested application metrics",
            },
        )

    if query.start_date > query.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "BAD_REQUEST",
                "message": "start_date must be less than or equal to end_date",
            },
        )

    # Generate deterministic tenant-isolated cache key
    cache_key = generate_cache_key(
        "metrics",
        application_id=str(id),
        event_name=query.event_name,
        start_date=query.start_date.isoformat()
        if hasattr(query.start_date, "isoformat")
        else str(query.start_date),
        end_date=query.end_date.isoformat()
        if hasattr(query.end_date, "isoformat")
        else str(query.end_date),
        granularity=query.granularity.value,
    )

    # Try cache check
    try:
        cached_data = await get_cached_json(redis, cache_key)
        if cached_data:
            data = [MetricBucket.model_validate(item) for item in cached_data]
            return MetricsResponse(
                application_id=id,
                event_name=query.event_name,
                granularity=query.granularity,
                start_date=query.start_date,
                end_date=query.end_date,
                cache_hit=True,
                data=data,
            )
    except Exception:  # nosec B110
        pass

    # Cache miss or Redis connection issue, query DB
    aggregated_rows = await repo.get_metrics_aggregation(
        application_id=id,
        start_time=query.start_date,
        end_time=query.end_date,
        event_name=query.event_name,
        granularity=query.granularity,
    )

    data = [
        MetricBucket(
            bucket=row["timestamp"],
            count=row["count"],
            event_name=row.get("event_name"),
        )
        for row in aggregated_rows
    ]

    # Save to Redis with 60 seconds TTL (FR-AGG-05)
    try:
        cache_data = [item.model_dump(mode="json") for item in data]
        await set_cached_json(redis, cache_key, cache_data, ttl_seconds=60)
    except Exception:  # nosec B110
        pass

    return MetricsResponse(
        application_id=id,
        event_name=query.event_name,
        granularity=query.granularity,
        start_date=query.start_date,
        end_date=query.end_date,
        cache_hit=False,
        data=data,
    )
