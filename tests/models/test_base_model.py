from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class SampleModel(Base, TimestampMixin):
    """Concrete model subclass for testing DeclarativeBase and mixins."""

    __tablename__ = "sample_models"

    id: Mapped[int] = mapped_column(primary_key=True)


def test_base_model_metadata() -> None:
    """Verifies Base declarative metadata registry."""
    assert Base.metadata is not None
    assert "created_at" in TimestampMixin.__annotations__
    assert "updated_at" in TimestampMixin.__annotations__
