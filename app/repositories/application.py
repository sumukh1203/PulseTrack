import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application


class ApplicationRepository:
    """Repository handling database operations for Application tenant entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        name: str,
        owner_email: str,
        api_key_hash: str,
        api_key_prefix: str,
        rate_limit_per_minute: int = 600,
    ) -> Application:
        """Creates and persists a new Application entity."""
        app = Application(
            name=name,
            owner_email=owner_email,
            api_key_hash=api_key_hash,
            api_key_prefix=api_key_prefix,
            rate_limit_per_minute=rate_limit_per_minute,
        )
        self.session.add(app)
        await self.session.flush()
        await self.session.refresh(app)
        return app

    async def get_by_id(self, application_id: uuid.UUID) -> Application | None:
        """Retrieves an Application by its UUID primary key."""
        result = await self.session.execute(
            select(Application).where(Application.id == application_id)
        )
        return result.scalar_one_or_none()

    async def get_by_api_key_hash(self, api_key_hash: str) -> Application | None:
        """Retrieves an Application by its SHA-256 API key hash."""
        result = await self.session.execute(
            select(Application).where(Application.api_key_hash == api_key_hash)
        )
        return result.scalar_one_or_none()

    async def get_by_owner_email(self, owner_email: str) -> Application | None:
        """Retrieves an Application by owner email address."""
        result = await self.session.execute(
            select(Application).where(Application.owner_email == owner_email)
        )
        return result.scalar_one_or_none()
