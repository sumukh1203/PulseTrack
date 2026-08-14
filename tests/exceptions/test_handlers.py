import pytest

from app.exceptions.base import AppException
from app.exceptions.handlers import (
    app_exception_handler,
    unhandled_exception_handler,
)


def test_app_exception_defaults() -> None:
    """Verifies AppException default attributes."""
    exc = AppException()
    assert exc.code == "INTERNAL_SERVER_ERROR"
    assert exc.message == "An unexpected error occurred."
    assert exc.status_code == 500
    assert exc.details == []


@pytest.mark.asyncio
async def test_unhandled_exception_handler() -> None:
    """Verifies unhandled 500 exception handler output."""
    res = await unhandled_exception_handler(None, Exception("Boom"))
    assert res.status_code == 500
    data = res.body.decode("utf-8")
    assert "INTERNAL_SERVER_ERROR" in data


@pytest.mark.asyncio
async def test_app_exception_handler() -> None:
    """Verifies domain AppException handler output."""
    exc = AppException(
        code="DOMAIN_ERROR", message="Domain error occurred", status_code=400
    )
    res = await app_exception_handler(None, exc)
    assert res.status_code == 400
    data = res.body.decode("utf-8")
    assert "DOMAIN_ERROR" in data
