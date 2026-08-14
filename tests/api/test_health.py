import pytest
from httpx import AsyncClient
from starlette import status


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient) -> None:
    """Verifies that GET /health returns HTTP 200 OK and expected structure."""
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "status" in data
    assert data["status"] in ["ok", "degraded"]
    assert "environment" in data
    assert "timestamp" in data
    assert "services" in data
    assert "database" in data["services"]


@pytest.mark.asyncio
async def test_v1_health_check_endpoint(async_client: AsyncClient) -> None:
    """Verifies that GET /v1/health returns HTTP 200 OK."""
    response = await async_client.get("/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] in ["ok", "degraded"]
