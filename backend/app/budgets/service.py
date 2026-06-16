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
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid month")
    return date(year, mon, 1)


def _month_bounds(month: str) -> tuple[date, date]:
    first = _month_first_day(month)
    nxt = date(first.year + 1, 1, 1) if first.month == 12 else date(first.year, first.month + 1, 1)
    return first, nxt - timedelta(days=1)


def _available_money(session: Session, user_id: uuid.UUID) -> Decimal:
    txns = session.exec(select(Transaction).where(Transaction.user_id == user_id)).all()
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
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    if cat.type != TxnType.expense:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Budgets apply to expense categories only"
        )
    return cat


def _get_month(session: Session, user_id: uuid.UUID, first: date) -> BudgetMonth | None:
    return session.exec(
        select(BudgetMonth).where(BudgetMonth.user_id == user_id, BudgetMonth.month == first)
    ).first()


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


def get_plan(session: Session, user: User, month: str) -> BudgetPlanOut:
    first, last = _month_bounds(month)
    available = _available_money(session, user.id)
    bm = _get_month(session, user.id, first)
    monthly_budget = bm.amount if bm else ZERO

    spent_by_cat = _spent_by_category(session, user.id, first, last)
    total_spent = sum(spent_by_cat.values(), ZERO)

    cats = {c.id: c for c in session.exec(select(Category)).all()}
    allocations = (
        session.exec(select(BudgetAllocation).where(BudgetAllocation.budget_month_id == bm.id)).all()
        if bm
        else []
    )

    alerts_count = {"safe": 0, "watch": 0, "tight": 0, "over": 0}
    allocated_total = ZERO
    items: list[BudgetAllocationStatusOut] = []
    for a in allocations:
        allocated_total += a.amount
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
        allocated_total=_q(allocated_total),
        unallocated_amount=_q(monthly_budget - allocated_total),
        total_spent=_q(total_spent),
        total_remaining=_q(monthly_budget - total_spent),
        total_usage_percent=_usage_percent(total_spent, monthly_budget),
        total_alert=_alert(total_spent, monthly_budget),
        alerts=alerts_count,
        items=items,
    )


def upsert_month(session: Session, user: User, month: str, amount: Decimal) -> BudgetPlanOut:
    if amount > _available_money(session, user.id):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Budget cannot exceed your available money."
        )
    first = _month_first_day(month)
    bm = _get_month(session, user.id, first)
    if bm:
        bm.amount = amount
        bm.updated_at = datetime.now(timezone.utc)
    else:
        bm = BudgetMonth(user_id=user.id, month=first, amount=amount)
    session.add(bm)
    session.commit()
    return get_plan(session, user, month)


def upsert_allocation(
    session: Session, user: User, month: str, category_id: uuid.UUID, amount: Decimal
) -> BudgetPlanOut:
    first = _month_first_day(month)
    bm = _get_month(session, user.id, first)
    if bm is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Set a monthly budget before allocating to categories.",
        )
    _owned_expense_category(session, user.id, category_id)

    existing_allocs = session.exec(
        select(BudgetAllocation).where(BudgetAllocation.budget_month_id == bm.id)
    ).all()
    others_total = sum((a.amount for a in existing_allocs if a.category_id != category_id), ZERO)
    if others_total + amount > bm.amount:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Allocations cannot exceed the monthly budget."
        )

    existing = next((a for a in existing_allocs if a.category_id == category_id), None)
    if existing:
        existing.amount = amount
        existing.updated_at = datetime.now(timezone.utc)
        session.add(existing)
    else:
        session.add(BudgetAllocation(budget_month_id=bm.id, category_id=category_id, amount=amount))
    session.commit()
    return get_plan(session, user, month)


def delete_allocation(session: Session, user: User, allocation_id: uuid.UUID) -> None:
    alloc = session.get(BudgetAllocation, allocation_id)
    if alloc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Allocation not found")
    bm = session.get(BudgetMonth, alloc.budget_month_id)
    if bm is None or bm.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Allocation not found")
    session.delete(alloc)
    session.commit()


def copy_plan(session: Session, user: User, from_month: str, to_month: str) -> BudgetPlanOut:
    from_first = _month_first_day(from_month)
    to_first = _month_first_day(to_month)
    src = _get_month(session, user.id, from_first)
    if src is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "There is no budget in the source month to copy."
        )

    dst = _get_month(session, user.id, to_first)
    if dst is None:
        dst = BudgetMonth(user_id=user.id, month=to_first, amount=src.amount)
        session.add(dst)
        session.commit()
        session.refresh(dst)

    existing_cats = {
        a.category_id
        for a in session.exec(
            select(BudgetAllocation).where(BudgetAllocation.budget_month_id == dst.id)
        ).all()
    }
    for a in session.exec(
        select(BudgetAllocation).where(BudgetAllocation.budget_month_id == src.id)
    ).all():
        if a.category_id not in existing_cats:
            session.add(
                BudgetAllocation(budget_month_id=dst.id, category_id=a.category_id, amount=a.amount)
            )
    session.commit()
    return get_plan(session, user, to_month)
