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


def test_picks_total_paid_over_fare_on_multiamount_receipt():
    # beBike-style receipt: gross fare first, real amount paid labelled "Tra qua".
    text = (
        "Chi tiet chuyen di\nThanh toan\n"
        "Cuoc phi 42.000d\nGiam den 20% -9.000d\n"
        "Dung 2.000 xu beOne -2.000d\nBao hiem chuyen di 2.000d\n"
        "Tra qua ShopeePay 33.000d\n"
        "Ma chuyen di: 1415044345  19/06/2026 15:37  beBike"
    )
    p = parse_text(text, today=TODAY)
    assert p.amount == Decimal("33000")  # not the 42.000 gross fare
    assert p.type == TxnType.expense
    assert p.occurred_on == date(2026, 6, 19)


from app.models import PayMethod


def test_paper_receipt_total_without_currency_suffix():
    text = ("WinMart PHIEU TINH TIEN\nNam Duong Sot 20,200\nMoc Chau Sua 40,700\n"
            "TONG GIA TRI DON 76,400\nTONG TIEN GIAM -3,100\nTONG TIEN THANH TOAN 73,300")
    p = parse_text(text, today=TODAY)
    assert p.amount == Decimal("73300")  # the paid total, bare number, no đ


def test_detect_method_transfer_and_card_and_cash():
    assert parse_text("Tra qua ShopeePay 33.000d", today=TODAY).method == PayMethod.transfer
    assert parse_text("Thanh toan the Visa 500.000d", today=TODAY).method == PayMethod.card
    assert parse_text("Tra tien mat 50.000d", today=TODAY).method == PayMethod.cash
    assert parse_text("mua ca phe 35.000d", today=TODAY).method == PayMethod.cash  # default


def test_method_no_substring_false_positive():
    # "acb"/"qr" must not match inside ordinary words; plain currency amount still parses.
    p = parse_text("mua macbook 25.000.000d", today=TODAY)
    assert p.method == PayMethod.cash
    assert p.amount == Decimal("25000000")


def test_note_fallback_to_merchant():
    p = parse_text("WinMart PHIEU TINH TIEN ... TONG TIEN THANH TOAN 73,300", today=TODAY)
    assert p.note == "WinMart"
