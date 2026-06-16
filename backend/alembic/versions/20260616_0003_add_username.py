"""add username and make email nullable

Revision ID: 20260616_0003
Revises: 20260615_0002
Create Date: 2026-06-16
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260616_0003"
down_revision: str | None = "20260615_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("user", sa.Column("username", sa.String(), nullable=True))
    op.create_index("ix_user_username", "user", ["username"], unique=True)
    op.alter_column("user", "email", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column("user", "email", existing_type=sa.String(), nullable=False)
    op.drop_index("ix_user_username", table_name="user")
    op.drop_column("user", "username")
