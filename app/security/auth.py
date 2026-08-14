from fastapi import Depends, Header, HTTPException, status

from app.dependencies.repositories import get_application_repository
from app.models.application import Application
from app.repositories.application import ApplicationRepository
from app.security.api_key import hash_api_key


async def get_current_application(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    repo: ApplicationRepository = Depends(get_application_repository),
) -> Application:
    """FastAPI dependency resolving caller Application by X-API-Key header."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Missing API key header (X-API-Key)",
            },
        )

    key_hash = hash_api_key(x_api_key)
    application = await repo.get_by_api_key_hash(key_hash)

    if not application or not application.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Invalid or inactive API key",
            },
        )

    return application
