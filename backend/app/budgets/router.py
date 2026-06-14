import uuid

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.budgets import service
from app.core.db import get_session
from app.core.security import get_current_user
from app.models import User
from app.schemas import BudgetOut, BudgetUpsert

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> list:
    return service.list_for_user(session, current.id)


@router.put("/{category_id}", response_model=BudgetOut)
def upsert_budget(
    category_id: uuid.UUID,
    body: BudgetUpsert,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
):
    return service.upsert(session, current.id, category_id, body.amount)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    category_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> None:
    service.delete(session, current.id, category_id)
