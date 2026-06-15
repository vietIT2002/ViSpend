"""add google subject to users

Revision ID: 20260615_0002
Revises: 20260613_0001
Create Date: 2026-06-15
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260615_0002"
down_revision: str | None = "20260613_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("user", sa.Column("google_sub", sa.String(), nullable=True))
    op.create_index("ix_user_google_sub", "user", ["google_sub"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_user_google_sub", table_name="user")
    op.drop_column("user", "google_sub")
