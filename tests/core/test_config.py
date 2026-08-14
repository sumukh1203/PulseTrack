from app.core.config import Settings, get_settings


def test_settings_default_values() -> None:
    """Verifies default values and singleton behavior of Settings."""
    settings = get_settings()
    assert isinstance(settings, Settings)
    assert settings.ENVIRONMENT in ["development", "testing", "production"]
    assert settings.DATABASE_URL.startswith("postgresql+asyncpg://")
    assert settings.REDIS_URL.startswith("redis://")
    assert settings.RATE_LIMIT_DEFAULT_PER_MINUTE > 0


def test_get_settings_cached() -> None:
    """Verifies that get_settings returns a cached instance."""
    settings1 = get_settings()
    settings2 = get_settings()
    assert settings1 is settings2
