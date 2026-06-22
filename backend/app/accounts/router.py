import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.accounts import service
from app.core.db import get_session
from app.core.security import get_current_user
from app.models import Account, User
from app.schemas import (
    AccountCreate,
    AccountOut,
    AccountsSummary,
    AccountUpdate,
    TransferCreate,
    TransferOut,
)

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _to_out(acc: Account, balance) -> AccountOut:
    return AccountOut(
        id=acc.id,
        name=acc.name,
        type=acc.type,
        opening_balance=acc.opening_balance,
        brand=acc.brand,
        icon=acc.icon,
        color=acc.color,
        archived=acc.archived,
        balance=balance,
    )


@router.get("", response_model=AccountsSummary)
def index(
    archived: bool = Query(default=False),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> AccountsSummary:
    balances = service.account_balances(session, current)
    accounts = service.list_accounts(session, current, include_archived=archived)
    items = [_to_out(a, balances.get(a.id, a.opening_balance)) for a in accounts]
    # Net worth spans every account (even archived ones still hold money).
    total = sum(balances.values()) if balances else 0
    return AccountsSummary(total_net_worth=total, accounts=items)


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create(
    body: AccountCreate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> AccountOut:
    acc = service.create_account(session, current, body)
    return _to_out(acc, acc.opening_balance)


@router.patch("/{account_id}", response_model=AccountOut)
def update(
    account_id: uuid.UUID,
    body: AccountUpdate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> AccountOut:
    acc = service.update_account(session, current, account_id, body)
    balances = service.account_balances(session, current)
    return _to_out(acc, balances.get(acc.id, acc.opening_balance))


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(
    account_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> None:
    service.delete_account(session, current, account_id)


# ---- Transfers (internal money movement between the user's own accounts) ----
@router.get("/transfers", response_model=list[TransferOut])
def list_transfers(
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> list[TransferOut]:
    return service.list_transfers(session, current)


@router.post("/transfers", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(
    body: TransferCreate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> TransferOut:
    return service.create_transfer(session, current, body)


@router.delete("/transfers/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transfer(
    transfer_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> None:
    service.delete_transfer(session, current, transfer_id)
