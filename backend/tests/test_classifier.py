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
