from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from sqlmodel import Session, select

from app.models import Budget, Category, Transaction, TxnType, User
from app.schemas import CategorySpend, CategoryTotal, DashboardSummary, TrendPoint


def _period_transactions(
    session: Session,
    user: User,
    from_date: date,
    to_date: date,
) -> list[Transaction]:
    return session.exec(
        select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.occurred_on >= from_date,
            Transaction.occurred_on <= to_date,
        )
    ).all()


def summary(session: Session, user: User, from_date: date, to_date: date) -> DashboardSummary:
    total_income = Decimal("0")
    total_expense = Decimal("0")
    for txn in _period_transactions(session, user, from_date, to_date):
        if txn.type == TxnType.income:
            total_income += txn.amount
        else:
            total_expense += txn.amount
    return DashboardSummary(
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
    )


def by_category(
    session: Session,
    user: User,
    type_: TxnType,
    from_date: date,
    to_date: date,
) -> list[CategoryTotal]:
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    category_names = {c.id: c.name for c in session.exec(select(Category)).all()}
    for txn in _period_transactions(session, user, from_date, to_date):
        if txn.type == type_:
            totals[category_names.get(txn.category_id, "Unknown")] += txn.amount
    grand_total = sum(totals.values(), Decimal("0"))
    if grand_total == 0:
        return []
    return [
        CategoryTotal(
            category=name,
            total=total,
            percent=int(round((total / grand_total) * 100)),
        )
        for name, total in sorted(totals.items())
    ]


def _expense_totals_by_category(
    session: Session, user: User, from_date: date, to_date: date
) -> dict:
    totals: dict = defaultdict(lambda: Decimal("0"))
    for txn in _period_transactions(session, user, from_date, to_date):
        if txn.type == TxnType.expense:
            totals[txn.category_id] += txn.amount
    return totals


def category_spend(
    session: Session, user: User, from_date: date, to_date: date
) -> list[CategorySpend]:
    """Expense per category for the period, with budget and previous-period total.
    Sorted by spend (highest first) so the biggest spends surface at the top."""
    length = (to_date - from_date).days + 1
    prev_to = from_date - timedelta(days=1)
    prev_from = prev_to - timedelta(days=length - 1)

    current = _expense_totals_by_category(session, user, from_date, to_date)
    previous = _expense_totals_by_category(session, user, prev_from, prev_to)

    cats = {c.id: c for c in session.exec(select(Category)).all()}
    budgets = {
        b.category_id: b.amount
        for b in session.exec(select(Budget).where(Budget.user_id == user.id)).all()
    }
    grand_total = sum(current.values(), Decimal("0"))

    rows = [
        CategorySpend(
            category_id=cid,
            category=cats[cid].name if cid in cats else "Unknown",
            color=cats[cid].color if cid in cats else None,
            total=total,
            percent=int(round((total / grand_total) * 100)) if grand_total else 0,
            budget=budgets.get(cid),
            prev_total=previous.get(cid, Decimal("0")),
        )
        for cid, total in current.items()
    ]
    rows.sort(key=lambda r: r.total, reverse=True)
    return rows


def trend(
    session: Session,
    user: User,
    granularity: str,
    from_date: date,
    to_date: date,
) -> list[TrendPoint]:
    buckets: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: {"income": Decimal("0"), "expense": Decimal("0")}
    )
    for txn in _period_transactions(session, user, from_date, to_date):
        if granularity == "month":
            period = txn.occurred_on.strftime("%Y-%m")
        elif granularity == "week":
            year, week, _ = txn.occurred_on.isocalendar()
            period = f"{year}-W{week:02d}"
        else:
            period = txn.occurred_on.isoformat()
        buckets[period][txn.type.value] += txn.amount
    return [
        TrendPoint(period=period, income=values["income"], expense=values["expense"])
        for period, values in sorted(buckets.items())
    ]
