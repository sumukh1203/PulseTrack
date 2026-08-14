import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import Granularity


class MetricBucket(BaseModel):
    """Single aggregated time bucket data point."""

    timestamp: str
    event_name: str
    count: int


class MetricsQuery(BaseModel):
    """Query parameters schema for GET /metrics endpoint."""

    start_date: datetime = Field(..., description="Start of aggregation window")
    end_date: datetime = Field(..., description="End of aggregation window")
    event_name: str | None = Field(None, description="Optional event name filter")
    granularity: Granularity = Field(
        Granularity.HOUR, description="Aggregation time-bucket resolution"
    )


class MetricsResponse(BaseModel):
    """Schema for GET /metrics response."""

    application_id: uuid.UUID
    granularity: Granularity
    start_date: datetime
    end_date: datetime
    data: list[MetricBucket]

    model_config = ConfigDict(from_attributes=True)
