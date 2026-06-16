import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlmodel import Session

from app.budgets import service
from app.core.db import get_session
from app.core.security import get_current_user
from app.models import User
from app.schemas import (
    BudgetAllocationUpsert,
    BudgetCopyRequest,
    BudgetPlanOut,
)

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

_MONTH = Query(pattern=r"^\d{4}-\d{2}$")


@router.get("", response_model=BudgetPlanOut)
def get_plan(
    month: str = _MONTH,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> BudgetPlanOut:
    return service.get_plan(session, current, month)


@router.put("/allocations", response_model=BudgetPlanOut)
def upsert_allocation(
    body: BudgetAllocationUpsert,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> BudgetPlanOut:
    return service.upsert_allocation(session, current, body.month, body.category_id, body.amount)


@router.delete("/allocations/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allocation(
    allocation_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> Response:
    service.delete_allocation(session, current, allocation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/copy", response_model=BudgetPlanOut)
def copy_plan(
    body: BudgetCopyRequest,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> BudgetPlanOut:
    return service.copy_plan(session, current, body.from_month, body.to_month)
