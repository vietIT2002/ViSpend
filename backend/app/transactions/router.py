import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlmodel import Session

from app.core.db import get_session
from app.core.security import get_current_user
from app.intake import crypto, storage
from app.intake.classifier import suggest_category
from app.intake.parsing import parse_text
from app.models import PayMethod, TxnType, User
from app.schemas import (
    DuplicateReceipt,
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
    find_by_receipt_hash,
    get_owned_transaction,
    learn_from_transaction,
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
    account_id: uuid.UUID | None = None,
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
        account_id,
        from_date,
        to_date,
        page,
        page_size,
    )
    return PaginatedTransactions(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create(
    body: TransactionCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> TransactionOut:
    txn = create_transaction(session, current, body)
    background_tasks.add_task(learn_from_transaction, txn.id, session)
    return txn


@router.post("/parse", response_model=ParseSuggestion)
def parse(
    body: ParseRequest,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> ParseSuggestion:
    fields = parse_text(body.text)
    category_id, confidence = suggest_category(session, current, body.text)
    return ParseSuggestion(
        type=fields.type,
        amount=fields.amount,
        occurred_on=fields.occurred_on,
        category_id=category_id,
        note=fields.note,
        method=fields.method,
        confidence=confidence,
    )


@router.get("/receipt-duplicate", response_model=DuplicateReceipt)
def receipt_duplicate(
    hash: str = Query(min_length=8, max_length=64),
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> DuplicateReceipt:
    existing = find_by_receipt_hash(session, current, hash)
    if existing is None:
        return DuplicateReceipt(duplicate=False)
    return DuplicateReceipt(
        duplicate=True,
        id=existing.id,
        occurred_on=existing.occurred_on,
        amount=existing.amount,
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
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "receipt_invalid_type")
    data = file.file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "receipt_too_large")
    # Encrypt before upload: the bytes at rest in Supabase are unreadable even if
    # the bucket/key is exposed. The original extension is kept in the path so we
    # can serve the right content-type after decrypting.
    path = f"{current.id}/{txn.id}.{ext}.enc"
    storage.upload_receipt(path, crypto.encrypt(data), "application/octet-stream")
    return set_receipt_path(session, current, txn_id, path)


_MIME_BY_EXT = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


@router.get("/{txn_id}/receipt")
def get_receipt(
    txn_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> Response:
    txn = get_owned_transaction(session, current, txn_id)
    if not txn.receipt_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "receipt_not_found")
    if not storage.configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "receipt_storage_unconfigured")
    try:
        blob = storage.download_receipt(txn.receipt_path)
        data = crypto.decrypt(blob) if txn.receipt_path.endswith(".enc") else blob
    except Exception:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "receipt_unavailable")
    # path looks like "<ext>.enc" or "<ext>"; pick the extension before .enc.
    parts = txn.receipt_path.removesuffix(".enc").rsplit(".", 1)
    mime = _MIME_BY_EXT.get(parts[-1].lower(), "image/jpeg") if len(parts) > 1 else "image/jpeg"
    return Response(content=data, media_type=mime, headers={"Cache-Control": "private, no-store"})


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
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> TransactionOut:
    txn = update_transaction(session, current, txn_id, body)
    background_tasks.add_task(learn_from_transaction, txn.id, session)
    return txn


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    txn_id: uuid.UUID,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> Response:
    delete_transaction(session, current, txn_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
