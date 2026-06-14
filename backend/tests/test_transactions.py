from decimal import Decimal


def _category_id(auth_client, name="Food & Drink"):
    return next(c["id"] for c in auth_client.get("/api/categories").json() if c["name"] == name)


def test_create_list_get_update_delete_transaction(auth_client):
    category_id = _category_id(auth_client)
    r = auth_client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "50000",
            "category_id": category_id,
            "occurred_on": "2026-06-13",
            "method": "cash",
            "note": "lunch",
        },
    )
    assert r.status_code == 201
    txn = r.json()
    assert Decimal(txn["amount"]) == Decimal("50000")

    r = auth_client.get("/api/transactions")
    assert r.status_code == 200
    assert r.json()["total"] == 1

    r = auth_client.get(f"/api/transactions/{txn['id']}")
    assert r.status_code == 200
    assert r.json()["note"] == "lunch"

    r = auth_client.patch(f"/api/transactions/{txn['id']}", json={"amount": "75000"})
    assert r.status_code == 200
    assert Decimal(r.json()["amount"]) == Decimal("75000")

    assert auth_client.delete(f"/api/transactions/{txn['id']}").status_code == 204
    assert auth_client.get("/api/transactions").json()["total"] == 0


def test_transaction_filters_by_type_and_date(auth_client):
    category_id = _category_id(auth_client)
    salary_id = _category_id(auth_client, "Salary")
    auth_client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "10000",
            "category_id": category_id,
            "occurred_on": "2026-06-01",
            "method": "cash",
        },
    )
    auth_client.post(
        "/api/transactions",
        json={
            "type": "income",
            "amount": "1000000",
            "category_id": salary_id,
            "occurred_on": "2026-06-13",
            "method": "transfer",
        },
    )

    r = auth_client.get("/api/transactions?type=expense&from=2026-06-01&to=2026-06-30")
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["type"] == "expense"


def test_cannot_use_other_users_category(client):
    client.post("/api/auth/register", json={"email": "a@test.com", "password": "password123"})
    r = client.post("/api/auth/login", data={"username": "a@test.com", "password": "password123"})
    client.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    r = client.post("/api/categories", json={"name": "Private", "type": "expense"})
    private_category_id = r.json()["id"]

    client.headers.clear()
    client.post("/api/auth/register", json={"email": "b@test.com", "password": "password123"})
    r = client.post("/api/auth/login", data={"username": "b@test.com", "password": "password123"})
    client.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    r = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "10000",
            "category_id": private_category_id,
            "occurred_on": "2026-06-13",
            "method": "cash",
        },
    )
    assert r.status_code == 404
