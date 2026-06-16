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


def _set_month(auth_client, month="2026-06", amount="12000000"):
    return auth_client.put("/api/budgets/month", json={"month": month, "amount": amount})


def test_set_and_update_monthly_budget(auth_client):
    _fund(auth_client)
    r = _set_month(auth_client, amount="12000000")
    assert r.status_code == 200
    assert r.json()["monthly_budget"] == "12000000.00"

    r = _set_month(auth_client, amount="10000000")
    assert r.json()["monthly_budget"] == "10000000.00"


def test_monthly_budget_rejected_when_exceeds_available(auth_client):
    # no income -> available money is 0
    r = _set_month(auth_client, amount="1000000")
    assert r.status_code == 422


def test_plan_with_no_allocations(auth_client):
    _fund(auth_client)
    _set_month(auth_client, amount="12000000")
    plan = auth_client.get("/api/budgets?month=2026-06").json()
    assert plan["monthly_budget"] == "12000000.00"
    assert plan["allocated_total"] == "0.00"
    assert plan["unallocated_amount"] == "12000000.00"
    assert plan["items"] == []


def test_create_update_delete_allocation(auth_client):
    _fund(auth_client)
    _set_month(auth_client, amount="12000000")
    cid = _expense_cats(auth_client)[0]

    r = auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": cid, "amount": "3000000"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1 and items[0]["amount"] == "3000000.00"
    alloc_id = items[0]["id"]

    r = auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": cid, "amount": "4000000"})
    assert r.json()["items"][0]["amount"] == "4000000.00"
    assert r.json()["allocated_total"] == "4000000.00"

    assert auth_client.delete(f"/api/budgets/allocations/{alloc_id}").status_code == 204
    assert auth_client.get("/api/budgets?month=2026-06").json()["items"] == []


def test_allocation_rejected_without_month(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    r = auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": cid, "amount": "100000"})
    assert r.status_code == 422


def test_allocation_rejected_when_exceeds_budget(auth_client):
    _fund(auth_client)
    _set_month(auth_client, amount="1000000")
    c1, c2 = _expense_cats(auth_client)[:2]
    assert auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": c1, "amount": "800000"}).status_code == 200
    r = auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": c2, "amount": "300000"})
    assert r.status_code == 422


def test_same_category_different_months(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    _set_month(auth_client, month="2026-06", amount="5000000")
    _set_month(auth_client, month="2026-07", amount="5000000")
    assert auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": cid, "amount": "1000000"}).status_code == 200
    assert auth_client.put("/api/budgets/allocations", json={"month": "2026-07", "category_id": cid, "amount": "2000000"}).status_code == 200


def test_income_category_rejected(auth_client):
    _fund(auth_client)
    _set_month(auth_client, amount="5000000")
    income_cid = _cat(auth_client, "income")
    r = auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": income_cid, "amount": "100000"})
    assert r.status_code == 422


def test_other_users_private_category_hidden(client):
    # user A creates a private expense category
    client.post("/api/auth/register", json={"username": "usera", "password": "Password123!"})
    ta = client.post("/api/auth/login", data={"username": "usera", "password": "Password123!"}).json()["access_token"]
    ha = {"Authorization": f"Bearer {ta}"}
    private = client.post("/api/categories", json={"name": "Private", "type": "expense"}, headers=ha).json()["id"]

    # user B funds, sets a budget, and tries to allocate A's private category
    client.post("/api/auth/register", json={"username": "userb", "password": "Password123!"})
    tb = client.post("/api/auth/login", data={"username": "userb", "password": "Password123!"}).json()["access_token"]
    hb = {"Authorization": f"Bearer {tb}"}
    inc = next(c["id"] for c in client.get("/api/categories", headers=hb).json() if c["type"] == "income")
    client.post("/api/transactions", json={"type": "income", "amount": "9000000", "category_id": inc, "occurred_on": "2026-06-01", "method": "cash"}, headers=hb)
    client.put("/api/budgets/month", json={"month": "2026-06", "amount": "5000000"}, headers=hb)
    r = client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": private, "amount": "100000"}, headers=hb)
    assert r.status_code == 404


def test_total_spend_only_in_month(auth_client):
    _fund(auth_client)
    _set_month(auth_client, amount="12000000")
    cid = _expense_cats(auth_client)[0]
    _txn(auth_client, "expense", cid, "1000000", on="2026-06-15")
    _txn(auth_client, "expense", cid, "2000000", on="2026-05-31")  # outside month
    plan = auth_client.get("/api/budgets?month=2026-06").json()
    assert plan["total_spent"] == "1000000.00"


def test_category_spend_only_that_category(auth_client):
    _fund(auth_client)
    _set_month(auth_client, amount="12000000")
    c1, c2 = _expense_cats(auth_client)[:2]
    auth_client.put("/api/budgets/allocations", json={"month": "2026-06", "category_id": c1, "amount": "5000000"})
    _txn(auth_client, "expense", c1, "1500000", on="2026-06-10")
    _txn(auth_client, "expense", c2, "999999", on="2026-06-10")
    item = next(i for i in auth_client.get("/api/budgets?month=2026-06").json()["items"] if i["category_id"] == c1)
    assert item["spent"] == "1500000.00"


def test_alert_thresholds():
    limit = Decimal("1000000")
    assert _alert(Decimal("690000"), limit) == "safe"
    assert _alert(Decimal("700000"), limit) == "watch"
    assert _alert(Decimal("900000"), limit) == "tight"
    assert _alert(Decimal("1000000"), limit) == "over"


def test_copy_last_month(auth_client):
    _fund(auth_client)
    cid = _expense_cats(auth_client)[0]
    _set_month(auth_client, month="2026-05", amount="8000000")
    auth_client.put("/api/budgets/allocations", json={"month": "2026-05", "category_id": cid, "amount": "2000000"})

    r = auth_client.post("/api/budgets/copy", json={"from_month": "2026-05", "to_month": "2026-06"})
    assert r.status_code == 200
    plan = r.json()
    assert plan["monthly_budget"] == "8000000.00"
    assert len(plan["items"]) == 1 and plan["items"][0]["amount"] == "2000000.00"


def test_copy_does_not_overwrite_existing_target(auth_client):
    _fund(auth_client)
    _set_month(auth_client, month="2026-05", amount="8000000")
    _set_month(auth_client, month="2026-06", amount="3000000")
    auth_client.post("/api/budgets/copy", json={"from_month": "2026-05", "to_month": "2026-06"})
    assert auth_client.get("/api/budgets?month=2026-06").json()["monthly_budget"] == "3000000.00"
