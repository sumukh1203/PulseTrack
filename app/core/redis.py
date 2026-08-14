from collections.abc import AsyncGenerator

from redis.asyncio import Redis

from app.core.config import get_settings

_redis_client: Redis | None = None


def get_redis_client() -> Redis:
    """Returns or initializes global async Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
        )
    return _redis_client


async def close_redis_client() -> None:
    """Closes Redis connection pool on application shutdown."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


async def get_redis() -> AsyncGenerator[Redis, None]:
    """FastAPI dependency provider yielding async Redis client."""
    client = get_redis_client()
    yield client
