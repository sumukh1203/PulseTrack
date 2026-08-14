import hashlib
import json
from typing import Any

from redis.asyncio import Redis

from app.common.constants import DEFAULT_CACHE_TTL_SECONDS


def generate_cache_key(prefix: str, *args: Any, **kwargs: Any) -> str:
    """Generates a deterministic Redis cache key from a prefix and parameters."""
    raw_str = f"{args}:{sorted(kwargs.items())}"
    hashed = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()[:16]
    return f"cache:{prefix}:{hashed}"


async def get_cached_json(redis: Redis, key: str) -> Any | None:
    """Retrieves and deserializes JSON payload from Redis cache."""
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    return None


async def set_cached_json(
    redis: Redis,
    key: str,
    data: Any,
    ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS,
) -> None:
    """Serializes and caches a JSON payload in Redis with TTL expiration."""
    serialized = json.dumps(data, default=str)
    await redis.set(key, serialized, ex=ttl_seconds)


async def invalidate_cache_pattern(redis: Redis, pattern: str) -> None:
    """Invalidates all Redis cache keys matching a glob pattern."""
    keys = await redis.keys(pattern)
    if keys:
        await redis.delete(*keys)
