import re
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import PayMethod, TxnType

USERNAME_RE = re.compile(r"^[a-z0-9]{3,20}$")


def _validate_username(value: str) -> str:
    if not USERNAME_RE.match(value):
        raise ValueError("Username must be 3-20 characters, lowercase letters and digits only")
    return value


def _validate_password(value: str) -> str:
    if (
        len(value) < 8
        or not re.search(r"[A-Z]", value)
        or not re.search(r"[a-z]", value)
        or not re.search(r"\d", value)
        or not re.search(r"[^A-Za-z0-9]", value)
    ):
        raise ValueError(
            "Password must be at least 8 characters and include an uppercase letter, "
            "a lowercase letter, a number, and a special character"
        )
    return value


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=8, max_length=128)

    _check_username = field_validator("username")(_validate_username)
    _check_password = field_validator("password")(_validate_password)


class GoogleLoginRequest(BaseModel):
    access_token: str = Field(min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str | None
    email: EmailStr | None
    full_name: str | None
    phone: str | None
    language: str
    is_verified: bool
    is_google: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    _check_password = field_validator("new_password")(_validate_password)


class ProfileUpdate(BaseModel):
    # Email is fixed and intentionally not editable here.
    username: str | None = None
    full_name: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=20)
    language: Literal["en", "vi"] | None = None

    @field_validator("username")
    @classmethod
    def _check_username(cls, value: str | None) -> str | None:
        return value if value is None else _validate_username(value)

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, value: str | None) -> str | None:
        if not value:
            return value
        if not re.match(r"^[0-9+\-\s]{6,20}$", value):
            raise ValueError("Enter a valid phone number")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

    _check_new_password = field_validator("new_password")(_validate_password)


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    type: TxnType
    icon: str | None = None
    color: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    icon: str | None = None
    color: str | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: TxnType
    icon: str | None
    color: str | None
    key: str | None
    is_default: bool


class TransactionCreate(BaseModel):
    type: TxnType
    amount: Decimal = Field(gt=0, max_digits=15, decimal_places=2)
    category_id: uuid.UUID
    occurred_on: date
    method: PayMethod = PayMethod.cash
    note: str | None = Field(default=None, max_length=255)


class TransactionUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=15, decimal_places=2)
    category_id: uuid.UUID | None = None
    occurred_on: date | None = None
    method: PayMethod | None = None
    note: str | None = Field(default=None, max_length=255)


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: TxnType
    amount: Decimal
    category_id: uuid.UUID
    occurred_on: date
    method: PayMethod
    note: str | None
    created_at: datetime


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int


class DashboardSummary(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal


class CategoryTotal(BaseModel):
    category: str
    total: Decimal
    percent: int


class TrendPoint(BaseModel):
    period: str
    income: Decimal
    expense: Decimal


class CategorySpend(BaseModel):
    category_id: uuid.UUID
    category: str
    color: str | None
    total: Decimal
    percent: int
    prev_total: Decimal


BudgetAlert = Literal["safe", "watch", "tight", "over"]


class BudgetAllocationUpsert(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    category_id: uuid.UUID
    amount: Decimal = Field(gt=0, max_digits=15, decimal_places=2)


class BudgetCopyRequest(BaseModel):
    from_month: str = Field(pattern=r"^\d{4}-\d{2}$")
    to_month: str = Field(pattern=r"^\d{4}-\d{2}$")


class BudgetAllocationStatusOut(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category: str
    color: str | None
    amount: Decimal
    spent: Decimal
    remaining: Decimal
    usage_percent: int
    alert: BudgetAlert


class BudgetPlanOut(BaseModel):
    month: str
    monthly_budget: Decimal  # sum of category budgets for the month
    available_money: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    total_usage_percent: int
    total_alert: BudgetAlert
    alerts: dict[str, int]
    items: list[BudgetAllocationStatusOut]
