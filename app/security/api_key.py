import hashlib
import secrets

from app.common.constants import (
    API_KEY_ENTROPY_BYTES,
    API_KEY_PREFIX_LIVE,
    API_KEY_PREFIX_TEST,
)


def generate_api_key(live: bool = True) -> tuple[str, str, str]:
    """Generates a CSPRNG API key, SHA-256 hash, and prefix.

    Returns:
        tuple[str, str, str]: (raw_api_key, api_key_hash, api_key_prefix)
    """
    prefix_base = API_KEY_PREFIX_LIVE if live else API_KEY_PREFIX_TEST
    random_hex = secrets.token_hex(API_KEY_ENTROPY_BYTES)  # 64 hex chars
    raw_api_key = f"{prefix_base}{random_hex}"
    api_key_prefix = raw_api_key[:12]
    api_key_hash = hash_api_key(raw_api_key)

    return raw_api_key, api_key_hash, api_key_prefix


def hash_api_key(api_key: str) -> str:
    """Computes SHA-256 hash of an API key."""
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()
