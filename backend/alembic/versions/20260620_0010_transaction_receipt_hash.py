"""transaction.receipt_hash

Revision ID: 20260620_0010
Revises: 20260620_0009
Create Date: 2026-06-20
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260620_0010"
down_revision: str | None = "20260620_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("transaction", sa.Column("receipt_hash", sa.String(), nullable=True))
    op.create_index("ix_transaction_receipt_hash", "transaction", ["receipt_hash"])


def downgrade() -> None:
    op.drop_index("ix_transaction_receipt_hash", table_name="transaction")
    op.drop_column("transaction", "receipt_hash")
