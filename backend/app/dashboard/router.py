from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.budgets import service as budget_service
from app.core.db import get_session
from app.core.security import get_current_user
from app.dashboard.service import by_category, category_spend, summary, trend
from app.models import TxnType, User
from app.schemas import BudgetPlanOut, CategorySpend, CategoryTotal, DashboardSummary, TrendPoint

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary_endpoint(
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> DashboardSummary:
    return summary(session, current, from_date, to_date)


@router.get("/by-category", response_model=list[CategoryTotal])
def by_category_endpoint(
    type: TxnType,
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> list[CategoryTotal]:
    return by_category(session, current, type, from_date, to_date)


@router.get("/categories", response_model=list[CategorySpend])
def categories_endpoint(
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> list[CategorySpend]:
    return category_spend(session, current, from_date, to_date)


@router.get("/budgets", response_model=BudgetPlanOut)
def budgets_endpoint(
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> BudgetPlanOut:
    return budget_service.get_plan(session, current, month)


@router.get("/trend", response_model=list[TrendPoint])
def trend_endpoint(
    granularity: str = Query(default="day", pattern="^(day|week|month)$"),
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> list[TrendPoint]:
    return trend(session, current, granularity, from_date, to_date)
