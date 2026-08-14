from app.exceptions.base import AppException


def test_app_exception_defaults() -> None:
    """Verifies AppException default attributes."""
    exc = AppException()
    assert exc.code == "INTERNAL_SERVER_ERROR"
    assert exc.message == "An unexpected error occurred."
    assert exc.status_code == 500
    assert exc.details == []


def test_app_exception_custom() -> None:
    """Verifies AppException custom parameters."""
    exc = AppException(
        code="CUSTOM_ERROR",
        message="Custom message",
        status_code=400,
        details=[{"field": "test"}],
    )
    assert exc.code == "CUSTOM_ERROR"
    assert exc.message == "Custom message"
    assert exc.status_code == 400
    assert exc.details == [{"field": "test"}]
