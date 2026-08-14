import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ApplicationCreateRequest(BaseModel):
    """Schema for registering a new application tenant."""

    name: str = Field(..., min_length=1, max_length=255, description="Application name")
    owner_email: EmailStr = Field(..., description="Owner email address")


class ApplicationCreateResponse(BaseModel):
    """Schema returned once upon initial registration containing plaintext API key."""

    id: uuid.UUID
    name: str
    api_key: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationResponse(BaseModel):
    """Schema representing application metadata for GET endpoints."""

    id: uuid.UUID
    name: str
    api_key_prefix: str
    is_active: bool
    rate_limit_per_minute: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
