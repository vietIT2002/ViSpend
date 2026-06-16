"""add full_name and phone to users

Revision ID: 20260616_0004
Revises: 20260616_0003
Create Date: 2026-06-16
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260616_0004"
down_revision: str | None = "20260616_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("user", sa.Column("full_name", sa.String(), nullable=True))
    op.add_column("user", sa.Column("phone", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "phone")
    op.drop_column("user", "full_name")
