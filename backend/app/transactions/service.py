import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.categories.service import get_accessible_category
from app.models import PayMethod, Transaction, TxnType, User
from app.schemas import TransactionCreate, TransactionUpdate


def get_owned_transaction(session: Session, user: User, txn_id: uuid.UUID) -> Transaction:
    txn = session.get(Transaction, txn_id)
    if txn is None or txn.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    return txn


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
    statement = select(Transaction).where(Transaction.user_id == user.id)
    if type_ is not None:
        statement = statement.where(Transaction.type == type_)
    if category_id is not None:
        statement = statement.where(Transaction.category_id == category_id)
    if method is not None:
        statement = statement.where(Transaction.method == method)
    if from_date is not None:
        statement = statement.where(Transaction.occurred_on >= from_date)
    if to_date is not None:
        statement = statement.where(Transaction.occurred_on <= to_date)
    transactions = session.exec(statement.order_by(Transaction.occurred_on.desc())).all()
    total = len(transactions)
    start = (page - 1) * page_size
    return transactions[start : start + page_size], total


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
    session.delete(txn)
    session.commit()
