"""Application dependency injection package."""

from app.dependencies.repositories import (
    get_application_repository,
    get_event_repository,
)

__all__ = [
    "get_application_repository",
    "get_event_repository",
]
