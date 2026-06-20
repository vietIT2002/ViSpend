from datetime import date
from decimal import Decimal

from app.intake.parsing import parse_text
from app.models import TxnType

TODAY = date(2026, 6, 20)


def test_parses_vcb_expense():
    text = "TK 0011|GD -50,000 VND luc 12/06/2026 08:30. So du 1,234,567 VND. ND: thanh toan Highlands Coffee"
    p = parse_text(text, today=TODAY)
    assert p.type == TxnType.expense
    assert p.amount == Decimal("50000")
    assert p.occurred_on == date(2026, 6, 12)
    assert "highlands" in (p.note or "").lower()


def test_parses_income_salary():
    text = "+9,000,000VND luc 05/06 09:00 | So du 12.000.000 | ND: CONG TY ABC TRA LUONG T6"
    p = parse_text(text, today=TODAY)
    assert p.type == TxnType.income
    assert p.amount == Decimal("9000000")
    assert p.occurred_on == date(2026, 6, 5)  # year filled from today


def test_parses_dotted_thousands():
    p = parse_text("Thanh toan 12.000.000d cho dien may", today=TODAY)
    assert p.amount == Decimal("12000000")
    assert p.type == TxnType.expense


def test_defaults_today_when_no_date():
    p = parse_text("mua ca phe 35,000d", today=TODAY)
    assert p.occurred_on == TODAY


def test_no_amount_returns_none():
    p = parse_text("khong co so tien o day", today=TODAY)
    assert p.amount is None
