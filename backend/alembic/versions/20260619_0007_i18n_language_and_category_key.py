"""i18n: user.language + category.key with default-category backfill

Revision ID: 20260619_0007
Revises: 20260616_0006
Create Date: 2026-06-19
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260619_0007"
down_revision: str | None = "20260616_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (name, type, key) for the seeded default categories.
DEFAULT_CATEGORY_KEYS = [
    ("Food & Drink", "expense", "food_drink"),
    ("Transport", "expense", "transport"),
    ("Shopping", "expense", "shopping"),
    ("Bills", "expense", "bills"),
    ("Health", "expense", "health"),
    ("Entertainment", "expense", "entertainment"),
    ("Family", "expense", "family"),
    ("Other", "expense", "other_expense"),
    ("Salary", "income", "salary"),
    ("Bonus", "income", "bonus"),
    ("Other", "income", "other_income"),
]


def upgrade() -> None:
    # New users default to English; existing rows are backfilled to "en".
    op.add_column(
        "user",
        sa.Column("language", sa.String(), nullable=False, server_default="en"),
    )
    op.add_column("category", sa.Column("key", sa.String(), nullable=True))
    op.create_index("ix_category_key", "category", ["key"])

    # Backfill stable keys onto the shared default categories (user_id IS NULL).
    category = sa.table(
        "category",
        sa.column("name", sa.String()),
        sa.column("type", sa.String()),
        sa.column("key", sa.String()),
        sa.column("user_id", sa.Uuid()),
    )
    for name, type_, key in DEFAULT_CATEGORY_KEYS:
        op.execute(
            category.update()
            .where(category.c.user_id.is_(None))
            .where(category.c.name == name)
            .where(category.c.type == type_)
            .values(key=key)
        )


def downgrade() -> None:
    op.drop_index("ix_category_key", table_name="category")
    op.drop_column("category", "key")
    op.drop_column("user", "language")
