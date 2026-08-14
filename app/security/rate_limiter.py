import time

from fastapi import Depends, HTTPException, Response, status
from redis.asyncio import Redis

from app.core.redis import get_redis
from app.models.application import Application
from app.security.auth import get_current_application


async def check_rate_limit(
    response: Response,
    current_app: Application = Depends(get_current_application),
    redis: Redis = Depends(get_redis),
) -> Application:
    """FastAPI dependency enforcing per-tenant rate limits via Redis counters."""
    limit = current_app.rate_limit_per_minute
    current_time = int(time.time())
    window_start = current_time // 60
    reset_time = (window_start + 1) * 60
    ttl_seconds = max(1, reset_time - current_time)

    redis_key = f"rate_limit:{current_app.id}:{window_start}"

    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(redis_key)
        pipe.expire(redis_key, ttl_seconds + 5)
        results = await pipe.execute()

    current_count = int(results[0])
    remaining = max(0, limit - current_count)

    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(reset_time)

    if current_count > limit:
        response.headers["Retry-After"] = str(ttl_seconds)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "TOO_MANY_REQUESTS",
                "message": "Rate limit exceeded. Try again later.",
            },
            headers={"Retry-After": str(ttl_seconds)},
        )

    return current_app
