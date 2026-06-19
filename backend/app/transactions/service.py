import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.categories.service import get_accessible_category
from app.models import PayMethod, Transaction, TxnType, User
from app.schemas import TransactionCreate, TransactionUpdate

# Transactions become read-only this long after they are recorded.
EDIT_WINDOW = timedelta(hours=24)


def get_owned_transaction(session: Session, user: User, txn_id: uuid.UUID) -> Transaction:
    txn = session.get(Transaction, txn_id)
    if txn is None or txn.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    return txn


def _ensure_within_edit_window(txn: Transaction) -> None:
    created = txn.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - created > EDIT_WINDOW:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Transactions can no longer be changed 24 hours after they are recorded",
        )


def list_transactions(
    session: Session,
    user: User,
    type_: TxnType | None = None,
    category_id: uuid.UUID | None = None,
    method: PayMethod | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Transaction], int]:
    filters = [Transaction.user_id == user.id]
    if type_ is not None:
        filters.append(Transaction.type == type_)
    if category_id is not None:
        filters.append(Transaction.category_id == category_id)
    if method is not None:
        filters.append(Transaction.method == method)
    if from_date is not None:
        filters.append(Transaction.occurred_on >= from_date)
    if to_date is not None:
        filters.append(Transaction.occurred_on <= to_date)

    total = session.exec(select(func.count()).select_from(Transaction).where(*filters)).one()

    # created_at is a stable tiebreaker so same-day rows page deterministically.
    items = session.exec(
        select(Transaction)
        .where(*filters)
        .order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return items, total


def create_transaction(session: Session, user: User, body: TransactionCreate) -> Transaction:
    get_accessible_category(session, user, body.category_id, body.type)
    txn = Transaction(user_id=user.id, **body.model_dump())
    session.add(txn)
    session.commit()
    session.refresh(txn)
    return txn


def update_transaction(
    session: Session,
    user: User,
    txn_id: uuid.UUID,
    body: TransactionUpdate,
) -> Transaction:
    txn = get_owned_transaction(session, user, txn_id)
    _ensure_within_edit_window(txn)
    updates = body.model_dump(exclude_unset=True)
    next_category_id = updates.get("category_id", txn.category_id)
    get_accessible_category(session, user, next_category_id, txn.type)
    for key, value in updates.items():
        setattr(txn, key, value)
    txn.updated_at = datetime.now(timezone.utc)
    session.add(txn)
    session.commit()
    session.refresh(txn)
    return txn


def delete_transaction(session: Session, user: User, txn_id: uuid.UUID) -> None:
    txn = get_owned_transaction(session, user, txn_id)
    _ensure_within_edit_window(txn)
    session.delete(txn)
    session.commit()
