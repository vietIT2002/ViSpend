import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import BudgetAllocation, BudgetMonth, Category, Transaction, TxnType, User
from app.schemas import BudgetAllocationStatusOut, BudgetPlanOut

ZERO = Decimal("0")


def _q(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def _month_first_day(month: str) -> date:
    year, mon = int(month[:4]), int(month[5:7])
    if not 1 <= mon <= 12:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "invalid_month")
    return date(year, mon, 1)


def _month_bounds(month: str) -> tuple[date, date]:
    first = _month_first_day(month)
    nxt = date(first.year + 1, 1, 1) if first.month == 12 else date(first.year, first.month + 1, 1)
    return first, nxt - timedelta(days=1)


def _available_money(session: Session, user_id: uuid.UUID, as_of: date) -> Decimal:
    """Net balance (income - expense) of everything up to and including `as_of`.

    Bounded to the budgeted month's last day so the figure is consistent with the
    month being viewed: income or spending dated after the month is not yet
    available to budget for that month.
    """
    txns = session.exec(
        select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.occurred_on <= as_of,
        )
    ).all()
    income = sum((t.amount for t in txns if t.type == TxnType.income), ZERO)
    expense = sum((t.amount for t in txns if t.type == TxnType.expense), ZERO)
    return income - expense


def _alert(spent: Decimal, limit: Decimal) -> str:
    if limit <= 0:
        return "safe"
    ratio = spent / limit
    if ratio >= 1:
        return "over"
    if ratio >= Decimal("0.9"):
        return "tight"
    if ratio >= Decimal("0.7"):
        return "watch"
    return "safe"


def _usage_percent(spent: Decimal, limit: Decimal) -> int:
    if limit <= 0:
        return 0
    return int(round(float(spent / limit) * 100))


def _owned_expense_category(session: Session, user_id: uuid.UUID, category_id: uuid.UUID) -> Category:
    cat = session.get(Category, category_id)
    if cat is None or (cat.user_id is not None and cat.user_id != user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "category_not_found")
    if cat.type != TxnType.expense:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "budget_expense_only"
        )
    return cat


def _get_month(session: Session, user_id: uuid.UUID, first: date) -> BudgetMonth | None:
    return session.exec(
        select(BudgetMonth).where(BudgetMonth.user_id == user_id, BudgetMonth.month == first)
    ).first()


def _get_or_create_month(session: Session, user_id: uuid.UUID, first: date) -> BudgetMonth:
    bm = _get_month(session, user_id, first)
    if bm is None:
        bm = BudgetMonth(user_id=user_id, month=first, amount=ZERO)
        session.add(bm)
        session.commit()
        session.refresh(bm)
    return bm


def _spent_by_category(session: Session, user_id: uuid.UUID, first: date, last: date) -> dict:
    totals: dict = defaultdict(lambda: ZERO)
    txns = session.exec(
        select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.type == TxnType.expense,
            Transaction.occurred_on >= first,
            Transaction.occurred_on <= last,
        )
    ).all()
    for t in txns:
        totals[t.category_id] += t.amount
    return totals


def _allocations(session: Session, budget_month_id: uuid.UUID) -> list[BudgetAllocation]:
    return list(
        session.exec(
            select(BudgetAllocation).where(BudgetAllocation.budget_month_id == budget_month_id)
        ).all()
    )


def get_plan(session: Session, user: User, month: str) -> BudgetPlanOut:
    first, last = _month_bounds(month)
    available = _available_money(session, user.id, last)
    bm = _get_month(session, user.id, first)

    spent_by_cat = _spent_by_category(session, user.id, first, last)
    total_spent = sum(spent_by_cat.values(), ZERO)

    cats = {c.id: c for c in session.exec(select(Category)).all()}
    allocations = _allocations(session, bm.id) if bm else []

    alerts_count = {"safe": 0, "watch": 0, "tight": 0, "over": 0}
    monthly_budget = ZERO
    items: list[BudgetAllocationStatusOut] = []
    for a in allocations:
        monthly_budget += a.amount
        spent = spent_by_cat.get(a.category_id, ZERO)
        alert = _alert(spent, a.amount)
        alerts_count[alert] += 1
        items.append(
            BudgetAllocationStatusOut(
                id=a.id,
                category_id=a.category_id,
                category=cats[a.category_id].name if a.category_id in cats else "Unknown",
                color=cats[a.category_id].color if a.category_id in cats else None,
                amount=_q(a.amount),
                spent=_q(spent),
                remaining=_q(a.amount - spent),
                usage_percent=_usage_percent(spent, a.amount),
                alert=alert,
            )
        )
    items.sort(key=lambda i: (i.usage_percent, i.amount), reverse=True)

    return BudgetPlanOut(
        month=month,
        monthly_budget=_q(monthly_budget),
        available_money=_q(available),
        total_spent=_q(total_spent),
        total_remaining=_q(monthly_budget - total_spent),
        total_usage_percent=_usage_percent(total_spent, monthly_budget),
        total_alert=_alert(total_spent, monthly_budget),
        alerts=alerts_count,
        items=items,
    )


def upsert_allocation(
    session: Session, user: User, month: str, category_id: uuid.UUID, amount: Decimal
) -> BudgetPlanOut:
    _owned_expense_category(session, user.id, category_id)
    first, last = _month_bounds(month)
    bm = _get_or_create_month(session, user.id, first)

    existing = _allocations(session, bm.id)
    others_total = sum((a.amount for a in existing if a.category_id != category_id), ZERO)
    if others_total + amount > _available_money(session, user.id, last):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "budget_exceeds_available"
        )

    current = next((a for a in existing if a.category_id == category_id), None)
    if current:
        current.amount = amount
        current.updated_at = datetime.now(timezone.utc)
        session.add(current)
    else:
        session.add(BudgetAllocation(budget_month_id=bm.id, category_id=category_id, amount=amount))
    session.commit()
    return get_plan(session, user, month)


def delete_allocation(session: Session, user: User, allocation_id: uuid.UUID) -> None:
    alloc = session.get(BudgetAllocation, allocation_id)
    if alloc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "allocation_not_found")
    bm = session.get(BudgetMonth, alloc.budget_month_id)
    if bm is None or bm.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "allocation_not_found")
    session.delete(alloc)
    session.commit()


def copy_plan(session: Session, user: User, from_month: str, to_month: str) -> BudgetPlanOut:
    from_first = _month_first_day(from_month)
    to_first = _month_first_day(to_month)
    src = _get_month(session, user.id, from_first)
    src_allocs = _allocations(session, src.id) if src else []
    if not src_allocs:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "budget_nothing_to_copy"
        )

    dst = _get_or_create_month(session, user.id, to_first)
    existing_cats = {a.category_id for a in _allocations(session, dst.id)}
    for a in src_allocs:
        if a.category_id not in existing_cats:
            session.add(
                BudgetAllocation(budget_month_id=dst.id, category_id=a.category_id, amount=a.amount)
            )
    session.commit()
    return get_plan(session, user, to_month)
