import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from app.models import TxnType

# Number like 50,000 / 1.234.567 / 12000000 immediately before a VND marker.
_AMOUNT_RE = re.compile(
    r"(?P<sign>[+-])?\s*(?P<num>\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:vnd|đ|d)\b",
    re.IGNORECASE,
)
_DATE_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{4}))?\b")
_NOTE_RE = re.compile(r"(?:nd|noi dung|ndung|content|cho)\s*[:\-]?\s*(?P<note>.+)", re.IGNORECASE)

_INCOME_HINTS = ("nhan tien", "ghi co", "tra luong", "luong", "+ ")
_EXPENSE_HINTS = ("thanh toan", "chuyen", "ghi no", "tt ", "mua")


@dataclass
class ParsedFields:
    type: TxnType
    amount: Decimal | None
    occurred_on: date
    note: str | None


def _to_decimal(raw: str) -> Decimal | None:
    digits = raw.replace(".", "").replace(",", "")
    try:
        return Decimal(digits)
    except InvalidOperation:
        return None


def _detect_type(text: str, sign: str | None) -> TxnType:
    if sign == "+":
        return TxnType.income
    if sign == "-":
        return TxnType.expense
    low = text.lower()
    if any(h in low for h in _INCOME_HINTS):
        return TxnType.income
    if any(h in low for h in _EXPENSE_HINTS):
        return TxnType.expense
    return TxnType.expense  # default


def _detect_date(text: str, today: date) -> date:
    m = _DATE_RE.search(text)
    if not m:
        return today
    day, month = int(m.group(1)), int(m.group(2))
    year = int(m.group(3)) if m.group(3) else today.year
    try:
        return date(year, month, day)
    except ValueError:
        return today


def _detect_note(text: str) -> str | None:
    m = _NOTE_RE.search(text)
    if m:
        return m.group("note").strip()[:255] or None
    return None


def parse_text(text: str, today: date | None = None) -> ParsedFields:
    today = today or date.today()
    m = _AMOUNT_RE.search(text)
    amount = _to_decimal(m.group("num")) if m else None
    sign = m.group("sign") if m else None
    return ParsedFields(
        type=_detect_type(text, sign),
        amount=amount,
        occurred_on=_detect_date(text, today),
        note=_detect_note(text),
    )
