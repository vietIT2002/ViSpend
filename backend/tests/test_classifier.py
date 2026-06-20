from app.intake.rules import normalize, rule_category_key


def test_normalize_strips_diacritics_and_digits():
    assert normalize("Cà Phê 35,000 GD12345") == "ca phe"


def test_rule_matches_food():
    assert rule_category_key("thanh toan Highlands Coffee") == "food_drink"


def test_rule_matches_transport():
    assert rule_category_key("Grab tu nha den cong ty") == "transport"


def test_rule_no_match_returns_none():
    assert rule_category_key("abcxyz khong khop gi") is None
