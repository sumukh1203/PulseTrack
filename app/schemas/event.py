import json
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.common.constants import MAX_METADATA_BYTES


class EventCreateRequest(BaseModel):
    """Schema for single event telemetry ingestion request."""

    event_name: str = Field(
        ..., min_length=1, max_length=100, description="Telemetry event name"
    )
    occurred_at: datetime = Field(
        ..., description="ISO 8601 timestamp when the event occurred"
    )
    session_id: str | None = Field(
        None, max_length=64, description="Optional client session identifier"
    )
    distinct_id: str | None = Field(
        None, max_length=128, description="Optional user/device identifier"
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Arbitrary JSON metadata payload"
    )

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        """Enforces 8KB size limit on serialized metadata JSON payload."""
        serialized = json.dumps(v)
        if len(serialized.encode("utf-8")) > MAX_METADATA_BYTES:
            raise ValueError(
                f"metadata size exceeds limit of {MAX_METADATA_BYTES} bytes"
            )
        return v


class EventCreateResponse(BaseModel):
    """Schema for single event ingestion response."""

    id: int | None = None
    status: str = "stored"
    idempotent_replay: bool | None = None
    request_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EventBatchCreateRequest(BaseModel):
    """Schema for batch event ingestion request."""

    events: list[dict[str, Any]]


class EventResponse(BaseModel):
    """Schema representing an ingested event."""

    id: int
    application_id: uuid.UUID
    event_name: str
    session_id: str | None
    distinct_id: str | None
    event_metadata: dict[str, Any] = Field(..., serialization_alias="metadata")
    occurred_at: datetime
    ingested_at: datetime
    idempotency_key: uuid.UUID | None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
