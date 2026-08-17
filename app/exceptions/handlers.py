import logging
from typing import Any

from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_ctx
from app.exceptions.base import AppException

logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handles HTTPExceptions returning formatted JSON error payload."""
    if isinstance(exc, StarletteHTTPException):
        request_id = request_id_ctx.get(None)
        if isinstance(exc.detail, dict):
            code = exc.detail.get("code", "ERROR")
            message = exc.detail.get("message", "An error occurred")
            errors = exc.detail.get("errors")
        else:
            code = "ERROR"
            message = str(exc.detail)
            errors = None

        error_content = {
            "code": code,
            "message": message,
            "request_id": request_id,
        }
        if errors is not None:
            error_content["errors"] = errors

        return JSONResponse(
            status_code=exc.status_code,
            content={"error": error_content},
        )
    return await unhandled_exception_handler(request, exc)


async def validation_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handles Pydantic request schema validation errors."""
    if isinstance(exc, RequestValidationError):
        request_id = request_id_ctx.get(None)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Schema validation failed",
                    "request_id": request_id,
                    "errors": jsonable_encoder(exc.errors()),
                }
            },
        )
    return await unhandled_exception_handler(request, exc)


async def app_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handles domain AppException errors."""
    if isinstance(exc, AppException):
        request_id = request_id_ctx.get(None)
        error_content: dict[str, Any] = {
            "code": exc.code,
            "message": exc.message,
            "request_id": request_id,
        }
        if exc.details:
            error_content["details"] = exc.details
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": error_content},
        )
    return await unhandled_exception_handler(request, exc)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unhandled server exceptions."""
    logger.error("Unhandled server exception", exc_info=exc)
    request_id = request_id_ctx.get(None)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred on the server.",
                "request_id": request_id,
            }
        },
    )
