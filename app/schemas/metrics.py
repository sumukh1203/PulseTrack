import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import Granularity


class MetricBucket(BaseModel):
    """Single aggregated time bucket data point."""

    bucket: str
    count: int
    event_name: str | None = None


class MetricsQuery(BaseModel):
    """Query parameters schema for GET /metrics endpoint."""

    start_date: datetime = Field(..., description="Start of aggregation window")
    end_date: datetime = Field(..., description="End of aggregation window")
    event_name: str | None = Field(
        default=None, description="Optional event name filter"
    )
    granularity: Granularity = Field(
        Granularity.DAY, description="Aggregation time-bucket resolution"
    )


class MetricsResponse(BaseModel):
    """Schema for GET /metrics response."""

    application_id: uuid.UUID
    event_name: str | None = None
    granularity: Granularity
    start_date: datetime
    end_date: datetime
    cache_hit: bool = False
    data: list[MetricBucket]

    model_config = ConfigDict(from_attributes=True)
