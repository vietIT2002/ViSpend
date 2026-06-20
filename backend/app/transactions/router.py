import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlmodel import Session

from app.core.db import get_session
from app.core.security import get_current_user
from app.intake import storage
from app.intake.classifier import suggest_category
from app.intake.parsing import parse_text
from app.models import PayMethod, TxnType, User
from app.schemas import (
    PaginatedTransactions,
    ParseRequest,
    ParseSuggestion,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from app.transactions.service import (
    create_transaction,
    delete_transaction,
    get_owned_transaction,
    list_transactions,
    set_receipt_path,
    update_transaction,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=PaginatedTransactions)
def index(
    type: TxnType | None = None,
    category_id: uuid.UUID | None = None,
    method: PayMethod | None = None,
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> PaginatedTransactions:
    items, total = list_transactions(
        session,
        current,
        type,
        category_id,
        method,
        from_date,
        to_date,
        page,
        page_size,
    )
    return PaginatedTransactions(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create(
    body: TransactionCreate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> TransactionOut:
    return create_transaction(session, current, body)


@router.post("/parse", response_model=ParseSuggestion)
def parse(
    body: ParseRequest,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> ParseSuggestion:
    fields = parse_text(body.text)
    category_id, confidence = (None, 0.0)
    if fields.note:
        category_id, confidence = suggest_category(session, current, fields.note)
    return ParseSuggestion(
        type=fields.type,
        amount=fields.amount,
        occurred_on=fields.occurred_on,
        category_id=category_id,
        note=fields.note,
        confidence=confidence,
    )


@router.post("/{txn_id}/receipt", response_model=TransactionOut)
def upload_receipt(
    txn_id: uuid.UUID,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> TransactionOut:
    if not storage.configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "receipt_storage_unconfigured")
    txn = get_owned_transaction(session, current, txn_id)
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() or "jpg"
    path = f"{current.id}/{txn.id}.{ext}"
    storage.upload_receipt(path, file.file.read(), file.content_type or "image/jpeg")
    return set_receipt_path(session, current, txn_id, path)


@router.get("/{txn_id}/receipt")
def get_receipt(
    txn_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> dict:
    txn = get_owned_transaction(session, current, txn_id)
    if not txn.receipt_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "receipt_not_found")
    return {"url": storage.signed_url(txn.receipt_path)}


@router.get("/{txn_id}", response_model=TransactionOut)
def show(
    txn_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> TransactionOut:
    return get_owned_transaction(session, current, txn_id)


@router.patch("/{txn_id}", response_model=TransactionOut)
def update(
    txn_id: uuid.UUID,
    body: TransactionUpdate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> TransactionOut:
    return update_transaction(session, current, txn_id, body)


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    txn_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> Response:
    delete_transaction(session, current, txn_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
