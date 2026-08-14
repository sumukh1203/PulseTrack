import logging

from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.exceptions.base import AppException

logger = logging.getLogger(__name__)


async def http_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handles HTTPExceptions returning formatted JSON detail payload."""
    if isinstance(exc, StarletteHTTPException):
        detail = (
            exc.detail
            if isinstance(exc.detail, dict)
            else {"code": "ERROR", "message": str(exc.detail)}
        )
        return JSONResponse(status_code=exc.status_code, content={"detail": detail})
    return await unhandled_exception_handler(request, exc)


async def validation_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handles Pydantic request schema validation errors."""
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": {
                    "code": "VALIDATION_ERROR",
                    "message": "Schema validation failed",
                    "errors": jsonable_encoder(exc.errors()),
                }
            },
        )
    return await unhandled_exception_handler(request, exc)


async def app_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handles domain AppException errors."""
    if isinstance(exc, AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )
    return await unhandled_exception_handler(request, exc)


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Fallback handler for unhandled server exceptions."""
    logger.error("Unhandled server exception", exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred on the server.",
            }
        },
    )
