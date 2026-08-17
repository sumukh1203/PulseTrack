import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from fastapi.responses import JSONResponse
from redis.asyncio import Redis

from app.core.logging import request_id_ctx
from app.core.redis import get_redis
from app.dependencies.repositories import get_event_repository
from app.models.application import Application
from app.models.event import Event
from app.repositories.event import EventRepository
from app.schemas.event import (
    EventBatchCreateRequest,
    EventCreateRequest,
    EventCreateResponse,
)
from app.security.rate_limiter import check_rate_limit

router = APIRouter(prefix="/events", tags=["Events"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=EventCreateResponse,
    summary="Ingest Telemetry Event",
    description="Ingests a single event for the authenticated tenant application.",
)
async def ingest_event(
    payload: EventCreateRequest,
    response: Response,
    idempotency_key: uuid.UUID | None = Header(None, alias="Idempotency-Key"),
    current_app: Application = Depends(check_rate_limit),
    repo: EventRepository = Depends(get_event_repository),
    redis: Redis = Depends(get_redis),
) -> EventCreateResponse:
    """Ingests a telemetry event with Redis-backed queueing and idempotency checks."""
    request_id = request_id_ctx.get("req_unknown")

    # 1. Idempotency Check in Redis and PostgreSQL
    if idempotency_key:
        redis_idemp_key = f"idempotency:{current_app.id}:{idempotency_key}"
        try:
            cached_val = await redis.get(redis_idemp_key)
            if cached_val:
                response.status_code = status.HTTP_200_OK
                return EventCreateResponse(
                    id=int(cached_val) if cached_val.isdigit() else None,
                    status="stored",
                    idempotent_replay=True,
                )
        except Exception:  # nosec B110
            pass

        existing_event = await repo.get_by_idempotency_key(
            application_id=current_app.id,
            idempotency_key=idempotency_key,
        )
        if existing_event:
            response.status_code = status.HTTP_200_OK
            return EventCreateResponse(
                id=existing_event.id,
                status="stored",
                idempotent_replay=True,
            )

    # Construct the event dictionary for queueing
    event_dict = {
        "application_id": str(current_app.id),
        "event_name": payload.event_name,
        "occurred_at": payload.occurred_at.isoformat(),
        "session_id": payload.session_id,
        "distinct_id": payload.distinct_id,
        "metadata": payload.metadata,
        "idempotency_key": str(idempotency_key) if idempotency_key else None,
    }

    # Try enqueuing to Redis List
    try:
        await redis.rpush("pulsetrack:queue:events", json.dumps(event_dict))  # type: ignore[misc]

        if idempotency_key:
            redis_idemp_key = f"idempotency:{current_app.id}:{idempotency_key}"
            await redis.set(redis_idemp_key, "1", ex=86400)

        response.status_code = status.HTTP_202_ACCEPTED
        return EventCreateResponse(
            status="queued",
            request_id=request_id,
        )
    except Exception:
        # Redis connection failure - fall back to synchronous Postgres write path
        event = await repo.create(
            application_id=current_app.id,
            event_name=payload.event_name,
            occurred_at=payload.occurred_at,
            session_id=payload.session_id,
            distinct_id=payload.distinct_id,
            event_metadata=payload.metadata,
            idempotency_key=idempotency_key,
        )
        response.status_code = status.HTTP_201_CREATED
        return EventCreateResponse(
            id=event.id,
            status="stored",
        )


@router.post(
    "/batch",
    status_code=status.HTTP_207_MULTI_STATUS,
    summary="Ingest Telemetry Events in Batch",
    description="Ingests a batch of events (up to 500), validating and reporting per-item failures.",
)
async def ingest_batch_events(
    payload: EventBatchCreateRequest,
    current_app: Application = Depends(check_rate_limit),
    redis: Redis = Depends(get_redis),
    repo: EventRepository = Depends(get_event_repository),
) -> JSONResponse:
    """Ingests a batch of events with independent item validation and enqueuing."""
    events = payload.events
    if not events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "BAD_REQUEST",
                "message": "Batch events list cannot be empty.",
            },
        )
    if len(events) > 500:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "PAYLOAD_TOO_LARGE",
                "message": "Batch size exceeds limit of 500 events.",
            },
        )

    valid_events = []
    errors = []

    for i, item in enumerate(events):
        try:
            event_name = item.get("event_name")
            if (
                not event_name
                or not isinstance(event_name, str)
                or len(event_name) > 100
            ):
                raise ValueError(
                    "event_name must be a non-empty string <= 100 characters"
                )

            occurred_at_str = item.get("occurred_at")
            if not occurred_at_str:
                raise ValueError("occurred_at is required")
            try:
                occurred_at_dt = datetime.fromisoformat(
                    occurred_at_str.replace("Z", "+00:00")
                )
            except Exception as e:
                raise ValueError(
                    "occurred_at must be a valid ISO 8601 datetime with timezone"
                ) from e

            session_id = item.get("session_id")
            if session_id and (not isinstance(session_id, str) or len(session_id) > 64):
                raise ValueError("session_id must be a string <= 64 characters")

            distinct_id = item.get("distinct_id")
            if distinct_id and (
                not isinstance(distinct_id, str) or len(distinct_id) > 128
            ):
                raise ValueError("distinct_id must be a string <= 128 characters")

            metadata = item.get("metadata") or {}
            if not isinstance(metadata, dict):
                raise ValueError("metadata must be a dictionary")
            if len(json.dumps(metadata).encode("utf-8")) > 8192:
                raise ValueError("metadata size exceeds limit of 8KB")

            valid_events.append(
                {
                    "application_id": str(current_app.id),
                    "event_name": event_name,
                    "occurred_at": occurred_at_dt.isoformat(),
                    "session_id": session_id,
                    "distinct_id": distinct_id,
                    "metadata": metadata,
                    "idempotency_key": None,
                }
            )
        except Exception as e:
            errors.append(
                {
                    "index": i,
                    "code": "validation_error",
                    "message": str(e),
                }
            )

    if valid_events:
        try:
            await redis.rpush(
                "pulsetrack:queue:events", *[json.dumps(e) for e in valid_events]
            )  # type: ignore[misc]
        except Exception:
            # Fallback to direct DB bulk insert
            try:
                db_events = [
                    Event(
                        application_id=current_app.id,
                        event_name=e["event_name"],
                        session_id=e["session_id"],
                        distinct_id=e["distinct_id"],
                        event_metadata=e["metadata"],
                        occurred_at=datetime.fromisoformat(e["occurred_at"]),
                    )
                    for e in valid_events
                ]
                await repo.create_batch(db_events)
                await repo.session.commit()
            except Exception as db_err:
                errors.append(
                    {
                        "index": -1,
                        "code": "database_error",
                        "message": f"Sync database fallback write failed: {db_err}",
                    }
                )
                valid_events = []

    return JSONResponse(
        status_code=status.HTTP_207_MULTI_STATUS,
        content={
            "accepted": len(valid_events),
            "rejected": len(errors),
            "errors": errors,
        },
    )
