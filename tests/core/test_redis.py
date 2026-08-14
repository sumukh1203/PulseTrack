import pytest
from redis.asyncio import Redis

from app.core.redis import close_redis_client, get_redis, get_redis_client


def test_get_redis_client() -> None:
    """Verifies Redis client singleton creation."""
    client = get_redis_client()
    assert isinstance(client, Redis)


@pytest.mark.asyncio
async def test_close_redis_client() -> None:
    """Verifies clean shutdown of Redis client singleton."""
    client = get_redis_client()
    assert client is not None
    await close_redis_client()


@pytest.mark.asyncio
async def test_get_redis_dependency() -> None:
    """Verifies get_redis dependency generator."""
    gen = get_redis()
    client = await gen.__anext__()
    assert isinstance(client, Redis)
    await gen.aclose()
