import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.event import Event


class Application(Base, TimestampMixin):
    """Application tenant entity mapping to the applications table."""

    __tablename__ = "applications"
    __table_args__ = (
        CheckConstraint(
            "rate_limit_per_minute > 0",
            name="ck_applications_rate_limit_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    api_key_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    api_key_prefix: Mapped[str] = mapped_column(String(12), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        nullable=False, default=True, server_default=text("true")
    )
    rate_limit_per_minute: Mapped[int] = mapped_column(
        nullable=False, default=600, server_default=text("600")
    )

    # Relationship to events
    events: Mapped[list["Event"]] = relationship(
        "Event",
        back_populates="application",
        cascade="all, delete-orphan",
    )
