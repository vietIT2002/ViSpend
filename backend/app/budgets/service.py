import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Budget, Category, TxnType


def _owned_expense_category(session: Session, user_id: uuid.UUID, category_id: uuid.UUID) -> Category:
    cat = session.get(Category, category_id)
    if cat is None or (cat.user_id is not None and cat.user_id != user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    if cat.type != TxnType.expense:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Budgets apply to expense categories only"
        )
    return cat


def list_for_user(session: Session, user_id: uuid.UUID) -> list[Budget]:
    return list(session.exec(select(Budget).where(Budget.user_id == user_id)).all())


def upsert(session: Session, user_id: uuid.UUID, category_id: uuid.UUID, amount: Decimal) -> Budget:
    _owned_expense_category(session, user_id, category_id)
    existing = session.exec(
        select(Budget).where(Budget.user_id == user_id, Budget.category_id == category_id)
    ).first()
    if existing:
        existing.amount = amount
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    budget = Budget(user_id=user_id, category_id=category_id, amount=amount)
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


def delete(session: Session, user_id: uuid.UUID, category_id: uuid.UUID) -> None:
    existing = session.exec(
        select(Budget).where(Budget.user_id == user_id, Budget.category_id == category_id)
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
