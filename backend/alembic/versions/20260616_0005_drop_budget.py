"""drop the budget table

Revision ID: 20260616_0005
Revises: 20260616_0004
Create Date: 2026-06-16
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260616_0005"
down_revision: str | None = "20260616_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_budget_user_id", table_name="budget")
    op.drop_index("ix_budget_category_id", table_name="budget")
    op.drop_table("budget")


def downgrade() -> None:
    op.create_table(
        "budget",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["category.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "category_id", name="uq_budget_user_category"),
    )
    op.create_index("ix_budget_category_id", "budget", ["category_id"], unique=False)
    op.create_index("ix_budget_user_id", "budget", ["user_id"], unique=False)
