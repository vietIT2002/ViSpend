import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.models import Account, Transaction, Transfer, TxnType, User
from app.schemas import AccountCreate, AccountUpdate, TransferCreate


def get_owned_account(session: Session, user: User, account_id: uuid.UUID) -> Account:
    acc = session.get(Account, account_id)
    if acc is None or acc.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "account_not_found")
    return acc


def account_balances(session: Session, user: User) -> dict[uuid.UUID, Decimal]:
    """Current balance per account: opening + income − expense − out + in."""
    accounts = session.exec(select(Account).where(Account.user_id == user.id)).all()
    balances: dict[uuid.UUID, Decimal] = {a.id: Decimal(a.opening_balance) for a in accounts}

    txn_rows = session.exec(
        select(Transaction.account_id, Transaction.type, func.sum(Transaction.amount))
        .where(Transaction.user_id == user.id, Transaction.account_id.is_not(None))
        .group_by(Transaction.account_id, Transaction.type)
    ).all()
    for acc_id, ttype, total in txn_rows:
        if acc_id not in balances or total is None:
            continue
        balances[acc_id] += Decimal(total) if ttype == TxnType.income else -Decimal(total)

    out_rows = session.exec(
        select(Transfer.from_account_id, func.sum(Transfer.amount))
        .where(Transfer.user_id == user.id)
        .group_by(Transfer.from_account_id)
    ).all()
    for acc_id, total in out_rows:
        if acc_id in balances and total is not None:
            balances[acc_id] -= Decimal(total)

    in_rows = session.exec(
        select(Transfer.to_account_id, func.sum(Transfer.amount))
        .where(Transfer.user_id == user.id)
        .group_by(Transfer.to_account_id)
    ).all()
    for acc_id, total in in_rows:
        if acc_id in balances and total is not None:
            balances[acc_id] += Decimal(total)

    return balances


def list_accounts(session: Session, user: User, include_archived: bool = False) -> list[Account]:
    stmt = select(Account).where(Account.user_id == user.id)
    if not include_archived:
        stmt = stmt.where(Account.archived == False)  # noqa: E712
    return list(session.exec(stmt.order_by(Account.created_at)).all())


def create_account(session: Session, user: User, body: AccountCreate) -> Account:
    acc = Account(user_id=user.id, **body.model_dump())
    session.add(acc)
    session.commit()
    session.refresh(acc)
    return acc


def update_account(session: Session, user: User, account_id: uuid.UUID, body: AccountUpdate) -> Account:
    acc = get_owned_account(session, user, account_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(acc, key, value)
    session.add(acc)
    session.commit()
    session.refresh(acc)
    return acc


def _account_in_use(session: Session, account_id: uuid.UUID) -> bool:
    used_txn = session.exec(
        select(Transaction.id).where(Transaction.account_id == account_id).limit(1)
    ).first()
    if used_txn:
        return True
    used_transfer = session.exec(
        select(Transfer.id)
        .where((Transfer.from_account_id == account_id) | (Transfer.to_account_id == account_id))
        .limit(1)
    ).first()
    return bool(used_transfer)


def delete_account(session: Session, user: User, account_id: uuid.UUID) -> None:
    acc = get_owned_account(session, user, account_id)
    if _account_in_use(session, account_id):
        # Keep history intact: an account with activity must be archived, not deleted.
        raise HTTPException(status.HTTP_409_CONFLICT, "account_in_use")
    session.delete(acc)
    session.commit()


def create_transfer(session: Session, user: User, body: TransferCreate) -> Transfer:
    get_owned_account(session, user, body.from_account_id)
    get_owned_account(session, user, body.to_account_id)
    transfer = Transfer(user_id=user.id, **body.model_dump())
    session.add(transfer)
    session.commit()
    session.refresh(transfer)
    return transfer


def list_transfers(session: Session, user: User) -> list[Transfer]:
    return list(
        session.exec(
            select(Transfer)
            .where(Transfer.user_id == user.id)
            .order_by(Transfer.occurred_on.desc(), Transfer.created_at.desc())
        ).all()
    )


def delete_transfer(session: Session, user: User, transfer_id: uuid.UUID) -> None:
    transfer = session.get(Transfer, transfer_id)
    if transfer is None or transfer.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "transfer_not_found")
    session.delete(transfer)
    session.commit()
