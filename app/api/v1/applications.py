import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis

from app.core.redis import get_redis
from app.dependencies.repositories import (
    get_application_repository,
    get_event_repository,
)
from app.models.application import Application
from app.repositories.application import ApplicationRepository
from app.repositories.event import EventRepository
from app.schemas.application import (
    ApplicationCreateRequest,
    ApplicationCreateResponse,
    ApplicationKeyRotateResponse,
    ApplicationResponse,
)
from app.schemas.event import EventResponse
from app.security.api_key import generate_api_key
from app.security.auth import get_current_application

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApplicationCreateResponse,
    summary="Create Application Tenant",
    description="Registers a new tenant application and issues its API key.",
)
async def create_application(
    payload: ApplicationCreateRequest,
    repo: ApplicationRepository = Depends(get_application_repository),
) -> ApplicationCreateResponse:
    """Registers a new tenant application and generates an initial API key."""
    existing_app = await repo.get_by_owner_email(payload.owner_email)
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "CONFLICT",
                "message": "An application with this owner_email already exists.",
            },
        )

    raw_api_key, api_key_hash, api_key_prefix = generate_api_key(live=True)
    app = await repo.create(
        name=payload.name,
        owner_email=payload.owner_email,
        api_key_hash=api_key_hash,
        api_key_prefix=api_key_prefix,
    )

    return ApplicationCreateResponse(
        id=app.id,
        name=app.name,
        api_key=raw_api_key,
        is_active=app.is_active,
        created_at=app.created_at,
    )


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=list[ApplicationResponse],
    summary="List All Applications",
    description="Returns a list of all registered applications.",
)
async def list_applications(
    repo: ApplicationRepository = Depends(get_application_repository),
) -> list[ApplicationResponse]:
    """Lists all application tenants."""
    apps = await repo.get_all()
    return [ApplicationResponse.model_validate(app) for app in apps]


@router.get(
    "/{id}",
    status_code=status.HTTP_200_OK,
    response_model=ApplicationResponse,
    summary="Get Application Details",
    description="Returns metadata for the calling application tenant.",
)
async def get_application(
    id: uuid.UUID,
    current_app: Application = Depends(get_current_application),
    repo: ApplicationRepository = Depends(get_application_repository),
) -> ApplicationResponse:
    """Returns caller application metadata enforcing tenant isolation."""
    if current_app.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "Access denied for requested application",
            },
        )

    return ApplicationResponse.model_validate(current_app)


@router.get(
    "/{id}/events",
    status_code=status.HTTP_200_OK,
    response_model=list[EventResponse],
    summary="Get Recent Application Events",
    description="Returns a list of the most recent events for this application tenant.",
)
async def get_application_events(
    id: uuid.UUID,
    limit: int = 50,
    current_app: Application = Depends(get_current_application),
    repo: EventRepository = Depends(get_event_repository),
) -> list[EventResponse]:
    """Retrieves recent ingested events enforcing tenant isolation."""
    if current_app.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "Access denied for requested application",
            },
        )

    events = await repo.get_recent_events(application_id=id, limit=limit)
    return [EventResponse.model_validate(e) for e in events]


@router.post(
    "/{id}/keys/rotate",
    status_code=status.HTTP_201_CREATED,
    response_model=ApplicationKeyRotateResponse,
    summary="Rotate Application Ingestion API Key",
    description="Generates a new API key for the application, revoking the old one.",
)
async def rotate_application_key(
    id: uuid.UUID,
    current_app: Application = Depends(get_current_application),
    repo: ApplicationRepository = Depends(get_application_repository),
    redis: Redis = Depends(get_redis),
) -> ApplicationKeyRotateResponse:
    """Rotates application ingestion API key enforcing tenant isolation."""
    if current_app.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "Access denied for requested application key rotation",
            },
        )

    old_key_hash = current_app.api_key_hash
    raw_api_key, api_key_hash, api_key_prefix = generate_api_key(live=True)

    current_app.api_key_hash = api_key_hash
    current_app.api_key_prefix = api_key_prefix

    await repo.session.flush()

    # Invalidate cache key in Redis
    try:
        cache_key = f"auth:key:{old_key_hash}"
        await redis.delete(cache_key)
    except Exception:  # nosec B110
        pass

    return ApplicationKeyRotateResponse(
        api_key=raw_api_key,
        rotated_at=datetime.now(UTC),
    )
