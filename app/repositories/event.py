import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import Granularity
from app.models.event import Event


class EventRepository:
    """Repository handling database operations for Event telemetry fact entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        application_id: uuid.UUID,
        event_name: str,
        occurred_at: datetime,
        session_id: str | None = None,
        distinct_id: str | None = None,
        event_metadata: dict[str, Any] | None = None,
        idempotency_key: uuid.UUID | None = None,
    ) -> Event:
        """Creates and persists a single telemetry Event entity."""
        event = Event(
            application_id=application_id,
            event_name=event_name,
            occurred_at=occurred_at,
            session_id=session_id,
            distinct_id=distinct_id,
            event_metadata=event_metadata or {},
            idempotency_key=idempotency_key,
        )
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def create_batch(self, events: list[Event]) -> list[Event]:
        """Persists a list of Event entities in a single batch operation."""
        self.session.add_all(events)
        await self.session.flush()
        return events

    async def get_by_idempotency_key(
        self, application_id: uuid.UUID, idempotency_key: uuid.UUID
    ) -> Event | None:
        """Looks up an event by application_id and idempotency_key for deduplication."""
        result = await self.session.execute(
            select(Event).where(
                Event.application_id == application_id,
                Event.idempotency_key == idempotency_key,
            )
        )
        return result.scalar_one_or_none()

    async def get_metrics_aggregation(
        self,
        application_id: uuid.UUID,
        start_time: datetime,
        end_time: datetime,
        event_name: str | None = None,
        granularity: Granularity = Granularity.HOUR,
    ) -> list[dict[str, Any]]:
        """Aggregates event counts grouped by date bucket and event name."""
        bucket_expr = func.date_trunc(granularity.value, Event.occurred_at)
        query = (
            select(
                bucket_expr.label("timestamp"),
                Event.event_name,
                func.count().label("count"),
            )
            .where(
                Event.application_id == application_id,
                Event.occurred_at >= start_time,
                Event.occurred_at <= end_time,
            )
            .group_by(bucket_expr, Event.event_name)
            .order_by(bucket_expr.asc())
        )

        if event_name:
            query = query.where(Event.event_name == event_name)

        result = await self.session.execute(query)
        rows = result.all()
        return [
            {
                "timestamp": (
                    row.timestamp.isoformat()
                    if hasattr(row.timestamp, "isoformat")
                    else str(row.timestamp)
                ),
                "event_name": row.event_name,
                "count": row.count,
            }
            for row in rows
        ]
