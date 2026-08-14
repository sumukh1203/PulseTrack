import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.repositories import get_event_repository
from app.models.application import Application
from app.repositories.event import EventRepository
from app.schemas.metrics import MetricBucket, MetricsQuery, MetricsResponse
from app.security.auth import get_current_application

router = APIRouter(prefix="/applications", tags=["Metrics"])


@router.get(
    "/{id}/metrics",
    status_code=status.HTTP_200_OK,
    response_model=MetricsResponse,
    summary="Get Aggregated Event Metrics",
    description="Returns time-bucketed event counts for application tenant.",
)
async def get_metrics(
    id: uuid.UUID,
    query: MetricsQuery = Depends(),
    current_app: Application = Depends(get_current_application),
    repo: EventRepository = Depends(get_event_repository),
) -> MetricsResponse:
    """Returns time-bucketed event aggregation metrics enforcing tenant isolation."""
    if current_app.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": "Access denied for requested application metrics",
            },
        )

    if query.start_date > query.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "BAD_REQUEST",
                "message": "start_date must be less than or equal to end_date",
            },
        )

    aggregated_rows = await repo.get_metrics_aggregation(
        application_id=id,
        start_time=query.start_date,
        end_time=query.end_date,
        event_name=query.event_name,
        granularity=query.granularity,
    )

    data = [
        MetricBucket(
            timestamp=row["timestamp"],
            event_name=row["event_name"],
            count=row["count"],
        )
        for row in aggregated_rows
    ]

    return MetricsResponse(
        application_id=id,
        granularity=query.granularity,
        start_date=query.start_date,
        end_date=query.end_date,
        data=data,
    )
