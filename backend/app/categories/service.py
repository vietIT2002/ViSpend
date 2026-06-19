import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Category, Transaction, TxnType, User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

# (name, type, icon, color, key). `key` is a stable identifier the frontend uses
# to localize default category names.
DEFAULT_CATEGORIES = [
    ("Food & Drink", TxnType.expense, "utensils", "#ef4444", "food_drink"),
    ("Transport", TxnType.expense, "bus", "#f97316", "transport"),
    ("Shopping", TxnType.expense, "shopping-bag", "#eab308", "shopping"),
    ("Bills", TxnType.expense, "receipt", "#3b82f6", "bills"),
    ("Health", TxnType.expense, "heart-pulse", "#22c55e", "health"),
    ("Entertainment", TxnType.expense, "film", "#a855f7", "entertainment"),
    ("Family", TxnType.expense, "users", "#ec4899", "family"),
    ("Other", TxnType.expense, "circle", "#64748b", "other_expense"),
    ("Salary", TxnType.income, "wallet", "#16a34a", "salary"),
    ("Bonus", TxnType.income, "sparkles", "#14b8a6", "bonus"),
    ("Other", TxnType.income, "circle", "#0f766e", "other_income"),
]


def seed_default_categories(session: Session) -> None:
    existing = session.exec(select(Category).where(Category.user_id.is_(None))).all()
    existing_by_name = {(c.name, c.type): c for c in existing}
    for name, type_, icon, color, key in DEFAULT_CATEGORIES:
        current = existing_by_name.get((name, type_))
        if current is None:
            session.add(Category(name=name, type=type_, icon=icon, color=color, key=key))
        elif current.key != key:
            # Backfill keys on rows seeded before keys existed.
            current.key = key
            session.add(current)
    session.commit()


def category_to_out(category: Category) -> CategoryOut:
    return CategoryOut(
        id=category.id,
        name=category.name,
        type=category.type,
        icon=category.icon,
        color=category.color,
        key=category.key,
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
        raise HTTPException(status.HTTP_404_NOT_FOUND, "category_not_found")
    if type_ is not None and category.type != type_:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "category_type_mismatch")
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
        raise HTTPException(status.HTTP_404_NOT_FOUND, "category_not_found")
    if category.user_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "default_category_immutable")
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
        raise HTTPException(status.HTTP_404_NOT_FOUND, "category_not_found")
    if category.user_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "default_category_immutable")
    used = session.exec(
        select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.category_id == category_id,
        )
    ).first()
    if used:
        raise HTTPException(status.HTTP_409_CONFLICT, "category_in_use")
    session.delete(category)
    session.commit()
