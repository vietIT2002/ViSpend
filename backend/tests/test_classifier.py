import uuid
from datetime import date

from app.intake import classifier
from app.intake.rules import normalize, rule_category_key
from app.models import Category, Transaction, TxnType, User
from app.core.security import hash_password


def test_normalize_strips_diacritics_and_digits():
    assert normalize("Cà Phê 35,000 GD12345") == "ca phe"


def test_rule_matches_food():
    assert rule_category_key("thanh toan Highlands Coffee") == "food_drink"


def test_rule_matches_transport():
    assert rule_category_key("Grab tu nha den cong ty") == "transport"


def test_rule_no_match_returns_none():
    assert rule_category_key("abcxyz khong khop gi") is None


def _user(session) -> User:
    u = User(username="learner", hashed_password=hash_password("Password123!"))
    session.add(u); session.commit(); session.refresh(u)
    return u


def _expense_cat(session, user, name) -> Category:
    c = Category(user_id=user.id, name=name, type=TxnType.expense)
    session.add(c); session.commit(); session.refresh(c)
    return c


def _txn(session, user, cat, note):
    t = Transaction(user_id=user.id, type=TxnType.expense, amount=10000,
                    category_id=cat.id, occurred_on=date(2026, 6, 1), note=note)
    session.add(t); session.commit()


def test_history_exact_match_wins(session):
    u = _user(session)
    coffee = _expense_cat(session, u, "Coffee")
    _txn(session, u, coffee, "Highlands Coffee")
    # Same merchant words, plus a noisy amount/code that normalize() strips -> exact match.
    cid, conf = classifier.suggest_category(session, u, "Highlands Coffee 99,000d GD123456")
    assert cid == coffee.id
    assert conf >= 0.9


def test_rules_used_when_no_history(session):
    u = _user(session)
    # A category carrying the default key the rules map to (no history, no model yet).
    food = Category(user_id=u.id, name="Food", type=TxnType.expense, key="food_drink")
    session.add(food); session.commit(); session.refresh(food)
    cid, conf = classifier.suggest_category(session, u, "thanh toan KFC")
    assert cid == food.id
    assert 0 < conf < 0.9  # rules are a weak signal, below history/ML confidence


def test_ml_generalizes_after_training(session):
    u = _user(session)
    food = _expense_cat(session, u, "Food")
    transport = _expense_cat(session, u, "Transport")
    for note in ["pho bo", "com tam", "bun cha", "banh mi"]:
        _txn(session, u, food, note)
        classifier.learn(session, u, note, food.id)
    for note in ["grab bike", "taxi mai linh", "xe bus", "gui xe"]:
        _txn(session, u, transport, note)
        classifier.learn(session, u, note, transport.id)
    # Shares the "com"/"tam" tokens with the food examples -> ML generalizes to food.
    cid, conf = classifier.suggest_category(session, u, "com tam ga")
    assert cid == food.id


def test_create_transaction_trains_model(auth_client):
    cats = auth_client.get("/api/categories").json()
    food = next(c for c in cats if c["type"] == "expense")
    other = next(c for c in cats if c["type"] == "expense" and c["id"] != food["id"])
    for note in ["pho bo", "com tam", "bun cha"]:
        auth_client.post("/api/transactions", json={
            "type": "expense", "amount": "30000", "category_id": food["id"],
            "occurred_on": "2026-06-10", "method": "cash", "note": note})
    for note in ["grab bike", "taxi", "xe bus"]:
        auth_client.post("/api/transactions", json={
            "type": "expense", "amount": "20000", "category_id": other["id"],
            "occurred_on": "2026-06-10", "method": "cash", "note": note})
    r = auth_client.post("/api/transactions/parse", json={"text": "ND: com tam suon nuong"})
    assert r.json()["category_id"] == food["id"]


from app.intake.rules import merchant_label


def test_winmart_is_shopping():
    assert rule_category_key("WinMart PHIEU TINH TIEN") == "shopping"


def test_merchant_label_known_brands():
    assert merchant_label("Tra qua ShopeePay") == "ShopeePay"
    assert merchant_label("WinMart PHIEU TINH TIEN") == "WinMart"
    assert merchant_label("beBike Ga Ben Thanh") == "beBike"


def test_merchant_label_unknown_returns_none():
    assert merchant_label("cua hang abcxyz la") is None


def test_learns_from_ocr_text_when_note_empty(session):
    from datetime import date as _date
    from app.models import Category, Transaction, TxnType, User
    from app.core.security import hash_password
    from app.intake import classifier as clf

    u = User(username="ocrlearner", hashed_password=hash_password("Password123!"))
    session.add(u); session.commit(); session.refresh(u)
    food = Category(user_id=u.id, name="Food", type=TxnType.expense); session.add(food)
    trans = Category(user_id=u.id, name="Transport", type=TxnType.expense); session.add(trans)
    session.commit(); session.refresh(food); session.refresh(trans)

    def scan(ocr, cat):
        t = Transaction(user_id=u.id, type=TxnType.expense, amount=10000,
                        category_id=cat.id, occurred_on=_date(2026, 6, 1), note=None, ocr_text=ocr)
        session.add(t); session.commit()
        clf.learn(session, u, t.ocr_text or (t.note or ""), t.category_id)

    for ocr in ["WinMart sieu thi rau cu", "Bach Hoa Xanh thit ca trung", "Co.opmart gia vi"]:
        scan(ocr, food)
    for ocr in ["beBike chuyen di Ga", "Grab bike di lam", "Be car ve nha"]:
        scan(ocr, trans)

    cid, conf = clf.suggest_category(session, u, "WinMart mua rau")
    assert cid == food.id  # learned from OCR text even though note was empty
