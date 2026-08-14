import uuid

from fastapi import APIRouter, Depends, Header, Response, status

from app.dependencies.repositories import get_event_repository
from app.models.application import Application
from app.repositories.event import EventRepository
from app.schemas.event import EventCreateRequest, EventCreateResponse
from app.security.auth import get_current_application

router = APIRouter(prefix="/events", tags=["Events"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=EventCreateResponse,
    summary="Ingest Telemetry Event",
    description="Ingests a single event for the authenticated tenant application.",
)
async def ingest_event(
    payload: EventCreateRequest,
    response: Response,
    idempotency_key: uuid.UUID | None = Header(None, alias="Idempotency-Key"),
    current_app: Application = Depends(get_current_application),
    repo: EventRepository = Depends(get_event_repository),
) -> EventCreateResponse:
    """Ingests a telemetry event with optional idempotency replay handling."""
    if idempotency_key:
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

    event = await repo.create(
        application_id=current_app.id,
        event_name=payload.event_name,
        occurred_at=payload.occurred_at,
        session_id=payload.session_id,
        distinct_id=payload.distinct_id,
        event_metadata=payload.metadata,
        idempotency_key=idempotency_key,
    )

    return EventCreateResponse(
        id=event.id,
        status="stored",
    )
