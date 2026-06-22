"""accounts, transfers, transaction.account_id (+ backfill from method)

Revision ID: 20260622_0012
Revises: 20260621_0011
Create Date: 2026-06-22
"""
import uuid as _uuid
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260622_0012"
down_revision: str | None = "20260621_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

account_type = sa.Enum("cash", "bank", "ewallet", "credit", name="accounttype")


def upgrade() -> None:
    op.create_table(
        "account",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", account_type, nullable=False),
        sa.Column("opening_balance", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("archived", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_account_user_id", "account", ["user_id"], unique=False)
    op.create_index("ix_account_archived", "account", ["archived"], unique=False)

    op.create_table(
        "transfer",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("from_account_id", sa.Uuid(), nullable=False),
        sa.Column("to_account_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["from_account_id"], ["account.id"]),
        sa.ForeignKeyConstraint(["to_account_id"], ["account.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transfer_user_id", "transfer", ["user_id"], unique=False)
    op.create_index("ix_transfer_from_account_id", "transfer", ["from_account_id"], unique=False)
    op.create_index("ix_transfer_to_account_id", "transfer", ["to_account_id"], unique=False)
    op.create_index("ix_transfer_occurred_on", "transfer", ["occurred_on"], unique=False)

    op.add_column("transaction", sa.Column("account_id", sa.Uuid(), nullable=True))
    op.create_index("ix_transaction_account_id", "transaction", ["account_id"], unique=False)
    op.create_foreign_key(
        "fk_transaction_account_id", "transaction", "account", ["account_id"], ["id"]
    )

    _backfill_accounts()


def _backfill_accounts() -> None:
    # Give every existing transaction an account derived from its old `method`,
    # creating one default account per (user, method) so balances start working.
    conn = op.get_bind()
    names = {"cash": "Tiền mặt", "transfer": "Ngân hàng", "card": "Thẻ"}
    types = {"cash": "cash", "transfer": "bank", "card": "credit"}
    rows = conn.execute(
        sa.text("SELECT DISTINCT user_id, CAST(method AS VARCHAR) FROM transaction WHERE account_id IS NULL")
    ).fetchall()
    for user_id, method in rows:
        m = method or "cash"
        acc_id = _uuid.uuid4()
        conn.execute(
            sa.text(
                "INSERT INTO account (id, user_id, name, type, opening_balance, archived, created_at) "
                "VALUES (:id, :uid, :name, CAST(:atype AS accounttype), 0, false, NOW())"
            ),
            {"id": acc_id, "uid": user_id, "name": names.get(m, "Ví"), "atype": types.get(m, "cash")},
        )
        conn.execute(
            sa.text(
                "UPDATE transaction SET account_id = :aid "
                "WHERE user_id = :uid AND CAST(method AS VARCHAR) = :m AND account_id IS NULL"
            ),
            {"aid": acc_id, "uid": user_id, "m": m},
        )


def downgrade() -> None:
    op.drop_constraint("fk_transaction_account_id", "transaction", type_="foreignkey")
    op.drop_index("ix_transaction_account_id", table_name="transaction")
    op.drop_column("transaction", "account_id")
    op.drop_index("ix_transfer_occurred_on", table_name="transfer")
    op.drop_index("ix_transfer_to_account_id", table_name="transfer")
    op.drop_index("ix_transfer_from_account_id", table_name="transfer")
    op.drop_index("ix_transfer_user_id", table_name="transfer")
    op.drop_table("transfer")
    op.drop_index("ix_account_archived", table_name="account")
    op.drop_index("ix_account_user_id", table_name="account")
    op.drop_table("account")
    account_type.drop(op.get_bind(), checkfirst=True)
