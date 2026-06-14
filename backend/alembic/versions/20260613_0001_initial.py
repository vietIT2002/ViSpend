"""initial schema

Revision ID: 20260613_0001
Revises:
Create Date: 2026-06-13
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260613_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    txn_type = sa.Enum("expense", "income", name="txntype")
    pay_method = sa.Enum("cash", "transfer", "card", name="paymethod")

    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_email", "user", ["email"], unique=True)

    op.create_table(
        "category",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", txn_type, nullable=False),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_category_user_id", "category", ["user_id"], unique=False)

    op.create_table(
        "transaction",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("type", txn_type, nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("method", pay_method, nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["category.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transaction_category_id", "transaction", ["category_id"], unique=False)
    op.create_index("ix_transaction_occurred_on", "transaction", ["occurred_on"], unique=False)
    op.create_index("ix_transaction_user_id", "transaction", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_transaction_user_id", table_name="transaction")
    op.drop_index("ix_transaction_occurred_on", table_name="transaction")
    op.drop_index("ix_transaction_category_id", table_name="transaction")
    op.drop_table("transaction")
    op.drop_index("ix_category_user_id", table_name="category")
    op.drop_table("category")
    op.drop_index("ix_user_email", table_name="user")
    op.drop_table("user")
    sa.Enum(name="paymethod").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="txntype").drop(op.get_bind(), checkfirst=True)
