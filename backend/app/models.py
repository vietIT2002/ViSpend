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
    # username for password accounts; email for Google accounts. Either may be
    # null, both are unique when present.
    username: str | None = Field(default=None, index=True, unique=True)
    email: str | None = Field(default=None, index=True, unique=True)
    hashed_password: str
    full_name: str | None = None
    phone: str | None = None
    google_sub: str | None = Field(default=None, index=True, unique=True)
    language: str = Field(default="en")  # UI language: "en" or "vi"
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=_now)

    @property
    def is_google(self) -> bool:
        return self.google_sub is not None


class Category(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    name: str
    type: TxnType
    icon: str | None = None
    color: str | None = None
    # Stable identifier for default (seeded) categories so the UI can localize
    # their names. Null for user-created categories.
    key: str | None = Field(default=None, index=True)


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


class BudgetMonth(SQLModel, table=True):
    # One total spending budget per (user, calendar month).
    __table_args__ = (UniqueConstraint("user_id", "month", name="uq_budget_month_user_month"),)

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    month: date = Field(index=True)  # always the first day of the month
    amount: Decimal = Field(max_digits=15, decimal_places=2)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class BudgetAllocation(SQLModel, table=True):
    # Optional category limit inside a monthly budget.
    __table_args__ = (
        UniqueConstraint("budget_month_id", "category_id", name="uq_budget_allocation_month_category"),
    )

    id: uuid.UUID = Field(default_factory=_uuid, primary_key=True)
    budget_month_id: uuid.UUID = Field(foreign_key="budgetmonth.id", index=True)
    category_id: uuid.UUID = Field(foreign_key="category.id", index=True)
    amount: Decimal = Field(max_digits=15, decimal_places=2)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
