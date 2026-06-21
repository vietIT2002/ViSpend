from decimal import Decimal

from app.budgets.service import _alert


def _cat(auth_client, type_: str) -> str:
    cats = auth_client.get("/api/categories").json()
    return next(c["id"] for c in cats if c["type"] == type_)


def _expense_cats(auth_client) -> list[str]:
    return [c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense"]


def _txn(auth_client, type_, cid, amount, on="2026-06-10"):
    return auth_client.post(
        "/api/transactions",
        json={"type": type_, "amount": amount, "category_id": cid, "occurred_on": on, "method": "cash"},
    )


def _fund(auth_client, amount="50000000"):
    _txn(auth_client, "income", _cat(auth_client, "income"), amount, "2026-06-01")


def _allocate(auth_client, cid, amount, month="2026-06", effective_from=None):
    payload = {"month": month, "category_id": cid, "amount": amount}
    if effective_from:
        payload["effective_from"] = effective_from
    return auth_client.put(
        "/api/budgets/allocations", json=payload
    )


def test_category_budget_creates_plan(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    r = _allocate(auth_client, cid, "3000000")
    assert r.status_code == 200
    plan = r.json()
    assert plan["monthly_budget"] == "3000000.00"
    assert len(plan["items"]) == 1 and plan["items"][0]["amount"] == "3000000.00"


def test_monthly_budget_is_sum_of_categories(auth_client):
    _fund(auth_client)
    c1, c2 = _expense_cats(auth_client)[:2]
    _allocate(auth_client, c1, "3000000")
    plan = _allocate(auth_client, c2, "2000000").json()
    assert plan["monthly_budget"] == "5000000.00"


def test_plan_empty_when_no_allocations(auth_client):
    _fund(auth_client)
    plan = auth_client.get("/api/budgets?month=2026-06").json()
    assert plan["monthly_budget"] == "0.00"
    assert plan["items"] == []


def test_update_and_delete_allocation(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    r = _allocate(auth_client, cid, "3000000")
    alloc_id = r.json()["items"][0]["id"]

    r = _allocate(auth_client, cid, "4000000")
    assert r.json()["monthly_budget"] == "4000000.00"

    assert auth_client.delete(f"/api/budgets/allocations/{alloc_id}").status_code == 204
    assert auth_client.get("/api/budgets?month=2026-06").json()["items"] == []


def test_allocation_rejected_when_exceeds_available(auth_client):
    _txn(auth_client, "income", _cat(auth_client, "income"), "5000000", "2026-06-01")
    c1, c2 = _expense_cats(auth_client)[:2]
    assert _allocate(auth_client, c1, "3000000").status_code == 200
    assert _allocate(auth_client, c2, "3000000").status_code == 422  # 3M + 3M > 5M available


def test_allocation_rejected_without_available_money(auth_client):
    cid = _expense_cats(auth_client)[0]
    assert _allocate(auth_client, cid, "100000").status_code == 422


def test_income_category_rejected(auth_client):
    _fund(auth_client)
    assert _allocate(auth_client, _cat(auth_client, "income"), "100000").status_code == 422


def test_other_users_private_category_hidden(client):
    client.post("/api/auth/register", json={"username": "usera", "password": "Password123!"})
    ta = client.post("/api/auth/login", data={"username": "usera", "password": "Password123!"}).json()["access_token"]
    ha = {"Authorization": f"Bearer {ta}"}
    private = client.post("/api/categories", json={"name": "Private", "type": "expense"}, headers=ha).json()["id"]

    client.post("/api/auth/register", json={"username": "userb", "password": "Password123!"})
    tb = client.post("/api/auth/login", data={"username": "userb", "password": "Password123!"}).json()["access_token"]
    hb = {"Authorization": f"Bearer {tb}"}
    inc = next(c["id"] for c in client.get("/api/categories", headers=hb).json() if c["type"] == "income")
    client.post("/api/transactions", json={"type": "income", "amount": "9000000", "category_id": inc, "occurred_on": "2026-06-01", "method": "cash"}, headers=hb)
    r = client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": private, "amount": "100000"}, headers=hb)
    assert r.status_code == 404


def test_same_category_different_months(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    assert _allocate(auth_client, cid, "1000000", month="2026-06").status_code == 200
    assert _allocate(auth_client, cid, "2000000", month="2026-07").status_code == 200


def test_total_spend_only_in_month(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    _allocate(auth_client, cid, "5000000")
    _txn(auth_client, "expense", cid, "1000000", on="2026-06-15")
    _txn(auth_client, "expense", cid, "2000000", on="2026-05-31")  # outside month
    assert auth_client.get("/api/budgets?month=2026-06").json()["total_spent"] == "1000000.00"


def test_category_spend_only_that_category(auth_client):
    _fund(auth_client)
    c1, c2 = _expense_cats(auth_client)[:2]
    _allocate(auth_client, c1, "5000000")
    _txn(auth_client, "expense", c1, "1500000", on="2026-06-10")
    _txn(auth_client, "expense", c2, "999999", on="2026-06-10")
    item = next(i for i in auth_client.get("/api/budgets?month=2026-06").json()["items"] if i["category_id"] == c1)
    assert item["spent"] == "1500000.00"


def test_allocation_effective_from_counts_only_remaining_period(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    _txn(auth_client, "expense", cid, "900000", on="2026-06-10")

    r = _allocate(auth_client, cid, "700000", effective_from="2026-06-21")

    assert r.status_code == 200
    item = r.json()["items"][0]
    assert item["effective_from"] == "2026-06-21"
    assert item["spent"] == "0.00"
    assert item["spent_before_effective"] == "900000.00"
    assert item["remaining"] == "700000.00"


def test_allocation_effective_from_counts_later_spending(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    _allocate(auth_client, cid, "700000", effective_from="2026-06-21")
    _txn(auth_client, "expense", cid, "100000", on="2026-06-20")
    _txn(auth_client, "expense", cid, "250000", on="2026-06-21")
    _txn(auth_client, "expense", cid, "50000", on="2026-06-30")

    item = auth_client.get("/api/budgets?month=2026-06").json()["items"][0]

    assert item["spent"] == "300000.00"
    assert item["spent_before_effective"] == "100000.00"
    assert item["remaining"] == "400000.00"


def test_allocation_effective_from_must_be_inside_month(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]

    assert _allocate(auth_client, cid, "700000", effective_from="2026-07-01").status_code == 422


def test_available_money_excludes_income_after_the_month(auth_client):
    # Income lands in July; viewing June must not count it as available.
    _txn(auth_client, "income", _cat(auth_client, "income"), "50000000", on="2026-07-01")
    plan = auth_client.get("/api/budgets?month=2026-06").json()
    assert plan["available_money"] == "0.00"


def test_available_money_counts_income_through_end_of_month(auth_client):
    # Income earlier in the year is available when budgeting a later month.
    _txn(auth_client, "income", _cat(auth_client, "income"), "9000000", on="2026-05-10")
    plan = auth_client.get("/api/budgets?month=2026-06").json()
    assert plan["available_money"] == "9000000.00"


def test_allocation_rejected_when_income_is_after_the_month(auth_client):
    # Funds exist all-time, but not yet as of the budgeted month -> rejected.
    _txn(auth_client, "income", _cat(auth_client, "income"), "50000000", on="2026-07-01")
    cid = _expense_cats(auth_client)[0]
    assert _allocate(auth_client, cid, "1000000", month="2026-06").status_code == 422


def test_alert_thresholds():
    limit = Decimal("1000000")
    assert _alert(Decimal("690000"), limit) == "safe"
    assert _alert(Decimal("700000"), limit) == "watch"
    assert _alert(Decimal("900000"), limit) == "tight"
    assert _alert(Decimal("1000000"), limit) == "over"


def test_copy_last_month(auth_client):
    # Fund in May so the May budget has money available as of that month.
    _txn(auth_client, "income", _cat(auth_client, "income"), "50000000", on="2026-05-01")
    cid = _expense_cats(auth_client)[0]
    _allocate(auth_client, cid, "2000000", month="2026-05")
    r = auth_client.post("/api/budgets/copy", json={"from_month": "2026-05", "to_month": "2026-06"})
    assert r.status_code == 200
    plan = r.json()
    assert plan["monthly_budget"] == "2000000.00"
    assert len(plan["items"]) == 1


def test_copy_rejected_when_nothing_to_copy(auth_client):
    _fund(auth_client)
    r = auth_client.post("/api/budgets/copy", json={"from_month": "2026-05", "to_month": "2026-06"})
    assert r.status_code == 422
