import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.repositories import get_application_repository
from app.models.application import Application
from app.repositories.application import ApplicationRepository
from app.schemas.application import (
    ApplicationCreateRequest,
    ApplicationCreateResponse,
    ApplicationResponse,
)
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
    "/{id}",
    status_code=status.HTTP_200_OK,
    response_model=ApplicationResponse,
    summary="Get Application Details",
    description="Returns metadata for the calling application tenant.",
)
async def get_application(
    id: uuid.UUID,
    current_app: Application = Depends(get_current_application),
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
