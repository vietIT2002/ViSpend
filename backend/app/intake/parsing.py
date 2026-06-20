import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from app.intake.rules import merchant_label
from app.models import PayMethod, TxnType

# Number before a VND marker (app/e-wallet screenshots).
_AMOUNT_RE = re.compile(
    r"(?P<sign>[+-])?\s*(?P<num>\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:vnd|đ|d)\b",
    re.IGNORECASE,
)
# Grand-total / amount-paid line — number may be bare (paper receipts). Run on
# deaccented text. Take the LAST match (totals sit at the bottom).
_PAID_RE = re.compile(
    r"(?:tong tien thanh toan|tong thanh toan|thanh toan|tra qua|tong cong|thanh tien)"
    r"[^\d\n]{0,30}(?P<num>\d{1,3}(?:[.,]\d{3})+|\d{4,})",
    re.IGNORECASE,
)
_DATE_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{4}))?\b")
_NOTE_RE = re.compile(r"(?:nd|noi dung|ndung|content|cho)\s*[:\-]?\s*(?P<note>.+)", re.IGNORECASE)

_INCOME_HINTS = ("nhan tien", "ghi co", "tra luong", "luong", "+ ")
_EXPENSE_HINTS = ("thanh toan", "chuyen", "ghi no", "tt ", "mua")

# Word-boundary anchored so short bank codes don't match inside ordinary words
# (e.g. "acb" must not match "macbook", "qr" must not match "square").
_METHOD_TRANSFER_RE = re.compile(
    r"\b(?:shopeepay|momo|zalopay|vnpay|viettel money|viettelpay|moca|chuyen khoan|ck|"
    r"internet banking|ibanking|napas|qr|vietcombank|vcb|techcombank|mbbank|acb|bidv|"
    r"vietinbank|vpbank|tpbank|sacombank|agribank)\b"
)
_METHOD_CARD_RE = re.compile(r"\b(?:the tin dung|credit|visa|mastercard|the ghi no|debit)\b")
_METHOD_CASH_RE = re.compile(r"\b(?:tien mat|cash|cod)\b")


@dataclass
class ParsedFields:
    type: TxnType
    amount: Decimal | None
    occurred_on: date
    note: str | None
    method: PayMethod


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
    # 1. Total/paid line (handles bare paper-receipt numbers). Last match = grand total.
    paid = list(_PAID_RE.finditer(_deaccent(text)))
    if paid:
        return _to_decimal(paid[-1].group("num")), None
    # 2. First currency-suffixed amount (app/e-wallet single-amount messages).
    matches = list(_AMOUNT_RE.finditer(text))
    if matches:
        return _to_decimal(matches[0].group("num")), matches[0].group("sign")
    return None, None


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


def detect_method(text: str) -> PayMethod:
    d = _deaccent(text)
    if _METHOD_TRANSFER_RE.search(d):
        return PayMethod.transfer
    if _METHOD_CARD_RE.search(d):
        return PayMethod.card
    if _METHOD_CASH_RE.search(d):
        return PayMethod.cash
    return PayMethod.cash  # default


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
        note = m.group("note").strip()[:255]
        if note:
            return note
    return merchant_label(text)  # fallback: known brand name


def parse_text(text: str, today: date | None = None) -> ParsedFields:
    today = today or date.today()
    amount, sign = _select_amount(text)
    return ParsedFields(
        type=_detect_type(text, sign),
        amount=amount,
        occurred_on=_detect_date(text, today),
        note=_detect_note(text),
        method=detect_method(text),
    )
