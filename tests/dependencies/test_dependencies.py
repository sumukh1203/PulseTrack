from unittest.mock import MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.repositories import (
    get_application_repository,
    get_event_repository,
)
from app.repositories.application import ApplicationRepository
from app.repositories.event import EventRepository


def test_get_application_repository_dependency() -> None:
    """Verifies get_application_repository provider instantiates repository."""
    mock_session = MagicMock(spec=AsyncSession)
    repo = get_application_repository(session=mock_session)
    assert isinstance(repo, ApplicationRepository)
    assert repo.session is mock_session


def test_get_event_repository_dependency() -> None:
    """Verifies get_event_repository provider instantiates repository."""
    mock_session = MagicMock(spec=AsyncSession)
    repo = get_event_repository(session=mock_session)
    assert isinstance(repo, EventRepository)
    assert repo.session is mock_session
