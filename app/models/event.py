import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.application import Application


class Event(Base):
    """Telemetry event fact entity mapping to the events table."""

    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint(
            "char_length(event_name) > 0",
            name="ck_events_event_name_not_empty",
        ),
        Index(
            "idx_events_app_name_time",
            "application_id",
            "event_name",
            text("occurred_at DESC"),
        ),
        Index(
            "idx_events_metadata_gin",
            "metadata",
            postgresql_using="gin",
        ),
        Index(
            "idx_events_app_idempotency",
            "application_id",
            "idempotency_key",
            unique=True,
            postgresql_where=text("idempotency_key IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_name: Mapped[str] = mapped_column(String(100), nullable=False)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    distinct_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # DB column is named 'metadata', mapped to Python attribute 'event_metadata'
    # to avoid SQLAlchemy Base.metadata collision
    event_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    idempotency_key: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    # Relationship to application parent
    application: Mapped["Application"] = relationship(
        "Application",
        back_populates="events",
    )
