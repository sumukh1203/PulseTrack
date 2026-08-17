"""Global constants for PulseTrack backend."""

# Payload limits
MAX_METADATA_BYTES: int = 8192  # 8 KB limit on event metadata JSONB
MAX_BATCH_SIZE: int = 500  # Maximum events allowed in single batch POST

# API Key Constants (256-bit entropy)
API_KEY_PREFIX_LIVE: str = "pt_live_"
API_KEY_PREFIX_TEST: str = "pt_test_"
API_KEY_ENTROPY_BYTES: int = 32  # 32 bytes CSPRNG = 64 hex characters

# Cache & Rate Limiting Defaults
DEFAULT_CACHE_TTL_SECONDS: int = 300  # 5 minutes
METRICS_CACHE_TTL_SECONDS: int = 60  # 60 seconds rollup cache
DEFAULT_RATE_LIMIT_PER_MINUTE: int = 600
