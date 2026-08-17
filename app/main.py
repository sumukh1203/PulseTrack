import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.exceptions import RequestValidationError
from prometheus_client import CONTENT_TYPE_LATEST, Gauge, generate_latest
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.redis import close_redis_client, get_redis_client
from app.database.session import close_async_engine, get_async_engine
from app.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.middleware.metrics import PrometheusMiddleware
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
app.add_middleware(PrometheusMiddleware)
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

# Include Routers
app.include_router(health_router)  # Mounted at /health
app.include_router(api_v1_router)  # Mounted at /v1/health, etc.


QUEUE_DEPTH = Gauge(
    "pulsetrack_queue_depth", "Current depth of the async event queue in Redis"
)


@app.get("/metrics", include_in_schema=False)
async def prometheus_metrics() -> Response:
    """Prometheus scrape endpoint reporting system metrics and queue depth."""
    try:
        redis = get_redis_client()
        length = await redis.llen("pulsetrack:queue:events")  # type: ignore[misc]
        QUEUE_DEPTH.set(length)
    except Exception:
        QUEUE_DEPTH.set(0)

    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
