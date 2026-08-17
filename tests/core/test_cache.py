from unittest.mock import AsyncMock, MagicMock

import pytest
from redis.asyncio import Redis

from app.core.cache import (
    generate_cache_key,
    get_cached_json,
    invalidate_cache_pattern,
    set_cached_json,
)


def test_generate_cache_key() -> None:
    """Verifies deterministic cache key generation."""
    key1 = generate_cache_key("metrics", "app_123", granularity="hour")
    key2 = generate_cache_key("metrics", "app_123", granularity="hour")
    key3 = generate_cache_key("metrics", "app_123", granularity="day")

    assert key1 == key2
    assert key1 != key3
    assert key1.startswith("cache:metrics:")


@pytest.mark.asyncio
async def test_get_and_set_cached_json() -> None:
    """Verifies get_cached_json and set_cached_json functions."""
    mock_redis = MagicMock(spec=Redis)
    mock_redis.get = AsyncMock(return_value='{"status": "ok", "count": 10}')
    mock_redis.set = AsyncMock()

    data = await get_cached_json(mock_redis, "cache:key1")
    assert data == {"status": "ok", "count": 10}
    mock_redis.get.assert_awaited_once_with("cache:key1")

    payload = {"status": "ok", "count": 10}
    await set_cached_json(mock_redis, "cache:key1", payload, ttl_seconds=60)
    mock_redis.set.assert_awaited_once_with(
        "cache:key1", '{"status": "ok", "count": 10}', ex=60
    )


@pytest.mark.asyncio
async def test_invalidate_cache_pattern() -> None:
    """Verifies invalidate_cache_pattern function."""
    mock_redis = MagicMock(spec=Redis)
    mock_redis.keys = AsyncMock(return_value=["cache:metrics:k1", "cache:metrics:k2"])
    mock_redis.delete = AsyncMock()

    await invalidate_cache_pattern(mock_redis, "cache:metrics:*")
    mock_redis.keys.assert_awaited_once_with("cache:metrics:*")
    mock_redis.delete.assert_awaited_once_with("cache:metrics:k1", "cache:metrics:k2")
