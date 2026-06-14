import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlmodel import Session

from app.categories.service import (
    create_category,
    delete_category,
    list_categories,
    update_category,
)
from app.core.db import get_session
from app.core.security import get_current_user
from app.models import User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def index(
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> list[CategoryOut]:
    return list_categories(session, current)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create(
    body: CategoryCreate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> CategoryOut:
    return create_category(session, current, body)


@router.patch("/{category_id}", response_model=CategoryOut)
def update(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> CategoryOut:
    return update_category(session, current, category_id, body)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    category_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> Response:
    delete_category(session, current, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
