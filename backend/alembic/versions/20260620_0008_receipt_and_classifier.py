"""receipt_path on transaction + category_classifier table

Revision ID: 20260620_0008
Revises: 20260619_0007
Create Date: 2026-06-20
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260620_0008"
down_revision: str | None = "20260619_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("transaction", sa.Column("receipt_path", sa.String(), nullable=True))
    op.create_table(
        "categoryclassifier",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("model_blob", sa.LargeBinary(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("categoryclassifier")
    op.drop_column("transaction", "receipt_path")
