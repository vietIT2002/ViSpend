"""budget v2: monthly plan + allocations

Revision ID: 20260616_0006
Revises: 20260616_0005
Create Date: 2026-06-16
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260616_0006"
down_revision: str | None = "20260616_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "budgetmonth",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "month", name="uq_budget_month_user_month"),
    )
    op.create_index("ix_budgetmonth_user_id", "budgetmonth", ["user_id"], unique=False)
    op.create_index("ix_budgetmonth_month", "budgetmonth", ["month"], unique=False)

    op.create_table(
        "budgetallocation",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("budget_month_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["budget_month_id"], ["budgetmonth.id"]),
        sa.ForeignKeyConstraint(["category_id"], ["category.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "budget_month_id", "category_id", name="uq_budget_allocation_month_category"
        ),
    )
    op.create_index(
        "ix_budgetallocation_budget_month_id", "budgetallocation", ["budget_month_id"], unique=False
    )
    op.create_index(
        "ix_budgetallocation_category_id", "budgetallocation", ["category_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_budgetallocation_category_id", table_name="budgetallocation")
    op.drop_index("ix_budgetallocation_budget_month_id", table_name="budgetallocation")
    op.drop_table("budgetallocation")
    op.drop_index("ix_budgetmonth_month", table_name="budgetmonth")
    op.drop_index("ix_budgetmonth_user_id", table_name="budgetmonth")
    op.drop_table("budgetmonth")
