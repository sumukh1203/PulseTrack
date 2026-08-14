from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.repositories.application import ApplicationRepository
from app.repositories.event import EventRepository


def get_application_repository(
    session: AsyncSession = Depends(get_session),
) -> ApplicationRepository:
    """Dependency provider injecting ApplicationRepository bound to request session."""
    return ApplicationRepository(session)


def get_event_repository(
    session: AsyncSession = Depends(get_session),
) -> EventRepository:
    """Dependency provider injecting EventRepository bound to request session."""
    return EventRepository(session)
