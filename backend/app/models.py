import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class TxnType(str, Enum):
    expense = "expense"
    income = "income"


class PayMethod(str, Enum):
    cash = "cash"
    transfer = "transfer"
    card = "card"


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    google_sub: str | None = Field(default=None, index=True, unique=True)
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=_now)


class Category(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    name: str
    type: TxnType
    icon: str | None = None
    color: str | None = None


class Transaction(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    type: TxnType
    amount: Decimal = Field(max_digits=15, decimal_places=2)
    category_id: uuid.UUID = Field(foreign_key="category.id", index=True)
    occurred_on: date = Field(index=True)
    method: PayMethod = PayMethod.cash
    note: str | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class Budget(SQLModel, table=True):
    # One monthly spending limit per (user, expense category).
    __table_args__ = (UniqueConstraint("user_id", "category_id", name="uq_budget_user_category"),)

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    category_id: uuid.UUID = Field(foreign_key="category.id", index=True)
    amount: Decimal = Field(max_digits=15, decimal_places=2)
