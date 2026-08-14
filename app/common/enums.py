from enum import StrEnum


class Granularity(StrEnum):
    """Aggregation time-bucket resolution."""

    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"


class ApplicationStatus(StrEnum):
    """Application tenant account status."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
