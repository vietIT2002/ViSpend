def _make_category(client, name="Food", type_="expense") -> str:
    return client.post("/api/categories", json={"name": name, "type": type_}).json()["id"]


def test_upsert_list_delete_budget(auth_client):
    cid = _make_category(auth_client)
    r = auth_client.put(f"/api/budgets/{cid}", json={"amount": "2000000"})
    assert r.status_code == 200
    assert r.json()["category_id"] == cid

    # upsert again updates, not duplicates
    auth_client.put(f"/api/budgets/{cid}", json={"amount": "3000000"})
    budgets = auth_client.get("/api/budgets").json()
    assert len(budgets) == 1
    assert budgets[0]["amount"] == "3000000.00"

    assert auth_client.delete(f"/api/budgets/{cid}").status_code == 204
    assert auth_client.get("/api/budgets").json() == []


def test_budget_rejected_on_income_category(auth_client):
    cid = _make_category(auth_client, name="Salary", type_="income")
    assert auth_client.put(f"/api/budgets/{cid}", json={"amount": "1000"}).status_code == 422


def test_budget_isolated_per_user(client):
    # user A creates an expense category + budget
    client.post("/api/auth/register", json={"email": "a@test.com", "password": "password123"})
    ta = client.post("/api/auth/login", data={"username": "a@test.com", "password": "password123"}).json()["access_token"]
    ha = {"Authorization": f"Bearer {ta}"}
    cid = client.post("/api/categories", json={"name": "Food", "type": "expense"}, headers=ha).json()["id"]
    client.put(f"/api/budgets/{cid}", json={"amount": "500000"}, headers=ha)

    # user B cannot budget A's private category, and sees no budgets
    client.post("/api/auth/register", json={"email": "b@test.com", "password": "password123"})
    tb = client.post("/api/auth/login", data={"username": "b@test.com", "password": "password123"}).json()["access_token"]
    hb = {"Authorization": f"Bearer {tb}"}
    assert client.put(f"/api/budgets/{cid}", json={"amount": "1"}, headers=hb).status_code == 404
    assert client.get("/api/budgets", headers=hb).json() == []


def test_dashboard_categories_with_budget_and_prev(auth_client):
    cid = _make_category(auth_client, name="Food")
    auth_client.put(f"/api/budgets/{cid}", json={"amount": "300000"})
    # current month (June 2026) spend
    auth_client.post("/api/transactions", json={"type": "expense", "amount": "120000", "category_id": cid, "occurred_on": "2026-06-10"})
    auth_client.post("/api/transactions", json={"type": "expense", "amount": "80000", "category_id": cid, "occurred_on": "2026-06-12"})
    # previous month spend (the 30 days before June 1)
    auth_client.post("/api/transactions", json={"type": "expense", "amount": "50000", "category_id": cid, "occurred_on": "2026-05-20"})

    rows = auth_client.get("/api/dashboard/categories?from=2026-06-01&to=2026-06-30").json()
    assert len(rows) == 1
    row = rows[0]
    assert row["total"] == "200000.00"
    assert row["budget"] == "300000.00"
    assert row["prev_total"] == "50000.00"
    assert row["percent"] == 100
    assert row["category"] == "Food"
