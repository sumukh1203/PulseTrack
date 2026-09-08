from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings derived from environment variables."""

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/pulsetrack"
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 600
    CORS_ALLOW_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    CORS_ALLOW_CREDENTIALS: bool = True

    NEON_AUTH_BASE_URL: str | None = None
    NEON_AUTH_JWKS_URL: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Any) -> Any:
        if isinstance(v, str):
            if "channel_binding=" in v:
                # Remove channel_binding parameter as asyncpg doesn't support it
                v = (
                    v.replace("channel_binding=require&", "")
                    .replace("&channel_binding=require", "")
                    .replace("?channel_binding=require", "")
                )
            if "sslmode=" in v:
                # Replace sslmode= with ssl= for asyncpg driver compatibility
                v = v.replace("sslmode=", "ssl=")
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @property
    def cors_allow_origins(self) -> list[str]:
        """Parses comma-separated CORS origins into a trimmed origin list."""
        return [origin.strip() for origin in self.CORS_ALLOW_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Returns cached singleton Settings instance."""
    return Settings()
