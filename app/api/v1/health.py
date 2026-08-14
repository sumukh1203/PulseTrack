from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.database.session import get_session

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Liveness and Readiness Check",
    description=(
        "Returns API status, current environment, server timestamp, "
        "and database connection state."
    ),
)
async def check_health(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Checks application health and verifies PostgreSQL connectivity."""
    settings = get_settings()
    db_status = "healthy"

    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(UTC).isoformat(),
        "services": {
            "database": db_status,
        },
    }
