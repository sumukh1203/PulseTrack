import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException, Response
from redis.asyncio import Redis

from app.models.application import Application
from app.security.rate_limiter import check_rate_limit


@pytest.fixture
def mock_app() -> Application:
    """Fixture providing a tenant Application entity with rate limit."""
    return Application(
        id=uuid.uuid4(),
        name="Rate Limit SaaS",
        owner_email="owner@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
        is_active=True,
        rate_limit_per_minute=5,
    )


@pytest.mark.asyncio
async def test_check_rate_limit_under_limit(mock_app: Application) -> None:
    """Verifies check_rate_limit headers when under request limit."""
    mock_redis = MagicMock(spec=Redis)
    mock_pipe = MagicMock()
    mock_pipe.execute = AsyncMock(return_value=[3, True])
    mock_redis.pipeline.return_value.__aenter__.return_value = mock_pipe

    response = Response()
    app_res = await check_rate_limit(
        response=response, current_app=mock_app, redis=mock_redis
    )

    assert app_res is mock_app
    assert response.headers["X-RateLimit-Limit"] == "5"
    assert response.headers["X-RateLimit-Remaining"] == "2"
    assert "X-RateLimit-Reset" in response.headers


@pytest.mark.asyncio
async def test_check_rate_limit_exceeded(mock_app: Application) -> None:
    """Verifies 422/429 response when rate limit is exceeded."""
    mock_redis = MagicMock(spec=Redis)
    mock_pipe = MagicMock()
    mock_pipe.execute = AsyncMock(return_value=[6, True])
    mock_redis.pipeline.return_value.__aenter__.return_value = mock_pipe

    response = Response()
    with pytest.raises(HTTPException) as exc_info:
        await check_rate_limit(
            response=response, current_app=mock_app, redis=mock_redis
        )

    assert exc_info.value.status_code == 429
    assert exc_info.value.detail["code"] == "TOO_MANY_REQUESTS"
    assert "Retry-After" in exc_info.value.headers
