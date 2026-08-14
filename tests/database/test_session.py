import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.database.session import (
    close_async_engine,
    get_async_engine,
    get_session_factory,
)


def test_get_async_engine() -> None:
    """Verifies async engine singleton creation."""
    engine = get_async_engine()
    assert isinstance(engine, AsyncEngine)


def test_get_session_factory() -> None:
    """Verifies session factory singleton creation."""
    factory = get_session_factory()
    assert isinstance(factory, async_sessionmaker)


@pytest.mark.asyncio
async def test_close_async_engine() -> None:
    """Verifies clean shutdown of async engine singleton."""
    engine = get_async_engine()
    assert engine is not None
    await close_async_engine()
