import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_request_id_middleware_header_generation(
    async_client: AsyncClient,
) -> None:
    """Verifies X-Request-Id header is auto-generated and returned."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert "X-Request-Id" in response.headers
    assert response.headers["X-Request-Id"].startswith("req_")


@pytest.mark.asyncio
async def test_request_id_middleware_header_echo(async_client: AsyncClient) -> None:
    """Verifies custom X-Request-Id header is echoed in response."""
    custom_id = "req_test_123456"
    response = await async_client.get("/health", headers={"X-Request-Id": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Request-Id"] == custom_id
