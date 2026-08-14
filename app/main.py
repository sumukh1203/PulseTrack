import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.redis import close_redis_client
from app.database.session import close_async_engine, get_async_engine
from app.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.middleware.request_id import RequestIDMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI application lifespan manager for startup and shutdown events."""
    settings = get_settings()
    configure_logging(log_level=settings.LOG_LEVEL)
    logger.info(
        "Initializing PulseTrack API backend",
        extra={
            "extra_fields": {
                "environment": settings.ENVIRONMENT,
                "log_level": settings.LOG_LEVEL,
            }
        },
    )

    # Initialize async database engine
    get_async_engine()

    yield

    # Shutdown lifecycle
    logger.info("Shutting down PulseTrack API backend")
    await close_async_engine()
    await close_redis_client()


app = FastAPI(
    title="PulseTrack API",
    description="High-performance event-collection & telemetry backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Register Middlewares
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Exception Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

import os
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Include Routers
app.include_router(health_router)  # Mounted at /health
app.include_router(api_v1_router)  # Mounted at /v1/health, etc.

# Serve Frontend SPA
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_spa() -> FileResponse:
        return FileResponse(os.path.join(frontend_dist, "index.html"))

