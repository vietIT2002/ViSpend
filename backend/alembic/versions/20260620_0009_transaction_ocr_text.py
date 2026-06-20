"""transaction.ocr_text

Revision ID: 20260620_0009
Revises: 20260620_0008
Create Date: 2026-06-20
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260620_0009"
down_revision: str | None = "20260620_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("transaction", sa.Column("ocr_text", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("transaction", "ocr_text")
