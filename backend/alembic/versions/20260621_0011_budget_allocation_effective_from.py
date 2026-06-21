"""budget allocation effective from

Revision ID: 20260621_0011
Revises: 20260620_0010
Create Date: 2026-06-21
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260621_0011"
down_revision: str | None = "20260620_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("budgetallocation", sa.Column("effective_from", sa.Date(), nullable=True))
    op.execute(
        """
        UPDATE budgetallocation
        SET effective_from = (
            SELECT budgetmonth.month
            FROM budgetmonth
            WHERE budgetmonth.id = budgetallocation.budget_month_id
        )
        """
    )
    with op.batch_alter_table("budgetallocation") as batch_op:
        batch_op.alter_column("effective_from", existing_type=sa.Date(), nullable=False)
    op.create_index(
        "ix_budgetallocation_effective_from",
        "budgetallocation",
        ["effective_from"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_budgetallocation_effective_from", table_name="budgetallocation")
    op.drop_column("budgetallocation", "effective_from")
