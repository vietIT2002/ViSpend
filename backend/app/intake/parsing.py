import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from app.models import TxnType

# Number like 50,000 / 1.234.567 / 12000000 immediately before a VND marker.
_AMOUNT_RE = re.compile(
    r"(?P<sign>[+-])?\s*(?P<num>\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:vnd|đ|d)\b",
    re.IGNORECASE,
)
# Words that label the amount actually paid / the grand total (diacritic-free).
_TOTAL_HINTS = ("tra qua", "thanh toan", "thanh tien", "tong cong", "tong tien",
                "tong", "thach toan", "total", "paid")
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


def _deaccent(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("đ", "d")


def _to_decimal(raw: str) -> Decimal | None:
    digits = raw.replace(".", "").replace(",", "")
    try:
        return Decimal(digits)
    except InvalidOperation:
        return None


def _select_amount(text: str) -> tuple[Decimal | None, str | None]:
    """Pick the amount and its sign. On multi-amount receipts (fare, discount,
    total...), prefer the amount whose preceding text labels it as the total /
    amount paid; otherwise fall back to the first amount found."""
    matches = list(_AMOUNT_RE.finditer(text))
    if not matches:
        return None, None
    # Prefer a total/paid-labelled amount; if several, take the last (usually the
    # final amount charged). Look back a short window before each number.
    labelled = [
        m for m in matches
        if any(h in _deaccent(text[max(0, m.start() - 35):m.start()]) for h in _TOTAL_HINTS)
    ]
    chosen = labelled[-1] if labelled else matches[0]
    return _to_decimal(chosen.group("num")), chosen.group("sign")


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
    amount, sign = _select_amount(text)
    return ParsedFields(
        type=_detect_type(text, sign),
        amount=amount,
        occurred_on=_detect_date(text, today),
        note=_detect_note(text),
    )
