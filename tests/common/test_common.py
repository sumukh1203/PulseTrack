from app.common.constants import (
    API_KEY_ENTROPY_BYTES,
    API_KEY_PREFIX_LIVE,
    API_KEY_PREFIX_TEST,
    MAX_BATCH_SIZE,
    MAX_METADATA_BYTES,
)
from app.common.enums import ApplicationStatus, Granularity


def test_constants_values() -> None:
    """Verifies operational constants values."""
    assert MAX_METADATA_BYTES == 8192
    assert MAX_BATCH_SIZE == 500
    assert API_KEY_PREFIX_LIVE == "pt_live_"
    assert API_KEY_PREFIX_TEST == "pt_test_"
    assert API_KEY_ENTROPY_BYTES == 32


def test_enums_values() -> None:
    """Verifies domain enum string representations."""
    assert Granularity.MINUTE == "minute"
    assert Granularity.HOUR == "hour"
    assert Granularity.DAY == "day"

    assert ApplicationStatus.ACTIVE == "active"
    assert ApplicationStatus.INACTIVE == "inactive"
    assert ApplicationStatus.SUSPENDED == "suspended"
