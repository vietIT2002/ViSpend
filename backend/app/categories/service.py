import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Category, Transaction, TxnType, User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

DEFAULT_CATEGORIES = [
    ("Food & Drink", TxnType.expense, "utensils", "#ef4444"),
    ("Transport", TxnType.expense, "bus", "#f97316"),
    ("Shopping", TxnType.expense, "shopping-bag", "#eab308"),
    ("Bills", TxnType.expense, "receipt", "#3b82f6"),
    ("Health", TxnType.expense, "heart-pulse", "#22c55e"),
    ("Entertainment", TxnType.expense, "film", "#a855f7"),
    ("Family", TxnType.expense, "users", "#ec4899"),
    ("Other", TxnType.expense, "circle", "#64748b"),
    ("Salary", TxnType.income, "wallet", "#16a34a"),
    ("Bonus", TxnType.income, "sparkles", "#14b8a6"),
    ("Other", TxnType.income, "circle", "#0f766e"),
]


def seed_default_categories(session: Session) -> None:
    existing = session.exec(select(Category).where(Category.user_id.is_(None))).all()
    existing_keys = {(c.name, c.type) for c in existing}
    for name, type_, icon, color in DEFAULT_CATEGORIES:
        if (name, type_) not in existing_keys:
            session.add(Category(name=name, type=type_, icon=icon, color=color))
    session.commit()


def category_to_out(category: Category) -> CategoryOut:
    return CategoryOut(
        id=category.id,
        name=category.name,
        type=category.type,
        icon=category.icon,
        color=category.color,
        is_default=category.user_id is None,
    )


def list_categories(session: Session, user: User) -> list[CategoryOut]:
    seed_default_categories(session)
    categories = session.exec(
        select(Category).where((Category.user_id == None) | (Category.user_id == user.id))
    ).all()
    return [category_to_out(c) for c in categories]


def get_accessible_category(
    session: Session,
    user: User,
    category_id: uuid.UUID,
    type_: TxnType | None = None,
) -> Category:
    category = session.get(Category, category_id)
    if category is None or category.user_id not in (None, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    if type_ is not None and category.type != type_:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Category type mismatch")
    return category


def create_category(session: Session, user: User, body: CategoryCreate) -> CategoryOut:
    category = Category(
        user_id=user.id,
        name=body.name,
        type=body.type,
        icon=body.icon,
        color=body.color,
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category_to_out(category)


def update_category(
    session: Session,
    user: User,
    category_id: uuid.UUID,
    body: CategoryUpdate,
) -> CategoryOut:
    category = session.get(Category, category_id)
    if category is None or category.user_id not in (None, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    if category.user_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Default categories cannot be modified")
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(category, key, value)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category_to_out(category)


def delete_category(session: Session, user: User, category_id: uuid.UUID) -> None:
    category = session.get(Category, category_id)
    if category is None or category.user_id not in (None, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    if category.user_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Default categories cannot be deleted")
    used = session.exec(
        select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.category_id == category_id,
        )
    ).first()
    if used:
        raise HTTPException(status.HTTP_409_CONFLICT, "Category is in use")
    session.delete(category)
    session.commit()
