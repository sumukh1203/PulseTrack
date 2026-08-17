import json
import uuid

from fastapi import Depends, Header, HTTPException, status
from redis.asyncio import Redis

from app.core.redis import get_redis
from app.dependencies.repositories import get_application_repository
from app.models.application import Application
from app.repositories.application import ApplicationRepository
from app.security.api_key import hash_api_key


async def get_current_application(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    repo: ApplicationRepository = Depends(get_application_repository),
    redis: Redis = Depends(get_redis),
) -> Application:
    """FastAPI dependency resolving caller Application by X-API-Key header with cache-aside."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Missing API key header (X-API-Key)",
            },
        )

    key_hash = hash_api_key(x_api_key)
    cache_key = f"auth:key:{key_hash}"

    # Try cache check first
    try:
        cached_data = await redis.get(cache_key)
        if cached_data:
            app_dict = json.loads(cached_data)
            # Check if active
            if not app_dict.get("is_active"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "code": "UNAUTHORIZED",
                        "message": "Invalid or inactive API key",
                    },
                )
            # Reconstruct transient Application model
            return Application(
                id=uuid.UUID(app_dict["id"]),
                name=app_dict["name"],
                owner_email=app_dict["owner_email"],
                api_key_hash=app_dict["api_key_hash"],
                api_key_prefix=app_dict["api_key_prefix"],
                is_active=app_dict["is_active"],
                rate_limit_per_minute=app_dict["rate_limit_per_minute"],
            )
    except HTTPException:
        raise
    except Exception:  # nosec B110
        # Fallback to database on Redis issues
        pass

    # Cache miss or Redis failure, fetch from db
    application = await repo.get_by_api_key_hash(key_hash)

    if not application or not application.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Invalid or inactive API key",
            },
        )

    # Cache successful key resolution for 5 minutes (300s)
    try:
        app_dict = {
            "id": str(application.id),
            "name": application.name,
            "owner_email": application.owner_email,
            "api_key_hash": application.api_key_hash,
            "api_key_prefix": application.api_key_prefix,
            "is_active": application.is_active,
            "rate_limit_per_minute": application.rate_limit_per_minute,
        }
        await redis.set(cache_key, json.dumps(app_dict), ex=300)
    except Exception:  # nosec B110
        pass

    return application


async def get_current_application_optional(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    repo: ApplicationRepository = Depends(get_application_repository),
    redis: Redis = Depends(get_redis),
) -> Application | None:
    """FastAPI dependency resolving caller Application optionally by X-API-Key header."""
    if not x_api_key:
        return None
    return await get_current_application(x_api_key, repo, redis)
