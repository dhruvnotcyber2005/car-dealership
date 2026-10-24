"""Request and response shapes.

Registration has no role field. Extra values, including a requested role,
are ignored so a caller cannot make themselves an administrator.
"""

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _clean_text(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("This field cannot be blank")
    return value


class UserPublic(BaseModel):
    id: int
    username: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_rules(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z0-9_]{3,50}", value):
            raise ValueError(
                "Username must be 3-50 characters and use only letters, numbers, and underscores"
            )
        return value

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username")
    @classmethod
    def strip_username(cls, value: str) -> str:
        return value.strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


class VehicleData(BaseModel):
    make: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    category: str = Field(min_length=1, max_length=80)
    price: float
    quantity: int

    @field_validator("make", "model", "category")
    @classmethod
    def clean_labels(cls, value: str) -> str:
        return _clean_text(value)

    @field_validator("price")
    @classmethod
    def positive_price(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Price must be greater than zero")
        return value

    @field_validator("quantity")
    @classmethod
    def non_negative_quantity(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Quantity cannot be negative")
        return value


class VehicleUpdate(BaseModel):
    make: str | None = Field(default=None, min_length=1, max_length=80)
    model: str | None = Field(default=None, min_length=1, max_length=80)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    price: float | None = None
    quantity: int | None = None

    @field_validator("make", "model", "category")
    @classmethod
    def clean_labels(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _clean_text(value)

    @field_validator("price")
    @classmethod
    def positive_price(cls, value: float | None) -> float | None:
        if value is not None and value <= 0:
            raise ValueError("Price must be greater than zero")
        return value

    @field_validator("quantity")
    @classmethod
    def non_negative_quantity(cls, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise ValueError("Quantity cannot be negative")
        return value


class VehiclePublic(BaseModel):
    id: int
    make: str
    model: str
    category: str
    price: float
    quantity: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RestockRequest(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def positive_quantity(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Restock quantity must be greater than zero")
        return value


class Message(BaseModel):
    message: str
