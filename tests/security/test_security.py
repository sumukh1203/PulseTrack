from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.models.application import Application
from app.repositories.application import ApplicationRepository
from app.security.api_key import generate_api_key, hash_api_key
from app.security.auth import get_current_application


def test_generate_api_key() -> None:
    """Verifies API key generation, hashing, and prefix extraction."""
    raw_key, key_hash, prefix = generate_api_key(live=True)
    assert raw_key.startswith("pt_live_")
    assert prefix == raw_key[:12]
    assert len(key_hash) == 64
    assert hash_api_key(raw_key) == key_hash

    test_raw_key, _, test_prefix = generate_api_key(live=False)
    assert test_raw_key.startswith("pt_test_")
    assert test_prefix == test_raw_key[:12]


@pytest.mark.asyncio
async def test_get_current_application_missing_header() -> None:
    """Verifies 401 response when X-API-Key header is missing."""
    mock_repo = AsyncMock(spec=ApplicationRepository)
    with pytest.raises(HTTPException) as exc_info:
        await get_current_application(x_api_key=None, repo=mock_repo)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_get_current_application_invalid_key() -> None:
    """Verifies 401 response when API key is not found in database."""
    mock_repo = AsyncMock(spec=ApplicationRepository)
    mock_repo.get_by_api_key_hash.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        await get_current_application(x_api_key="pt_live_invalidkey", repo=mock_repo)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_get_current_application_inactive() -> None:
    """Verifies 401 response when application is_active is False."""
    mock_repo = AsyncMock(spec=ApplicationRepository)
    inactive_app = Application(
        name="Inactive App",
        owner_email="inactive@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
        is_active=False,
    )
    mock_repo.get_by_api_key_hash.return_value = inactive_app

    with pytest.raises(HTTPException) as exc_info:
        await get_current_application(x_api_key="pt_live_validkey", repo=mock_repo)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_application_success() -> None:
    """Verifies successful authentication returns active Application entity."""
    mock_repo = AsyncMock(spec=ApplicationRepository)
    active_app = Application(
        name="Active App",
        owner_email="active@example.com",
        api_key_hash="hash123",
        api_key_prefix="pt_live_12",
        is_active=True,
    )
    mock_repo.get_by_api_key_hash.return_value = active_app

    app = await get_current_application(x_api_key="pt_live_validkey", repo=mock_repo)
    assert app is active_app
