def _expense_category(auth_client):
    return next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")


def _make_account(auth_client, name="TPBank", type_="bank", opening="2000000"):
    r = auth_client.post(
        "/api/accounts",
        json={"name": name, "type": type_, "opening_balance": opening},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_create_and_list_account(auth_client):
    acc = _make_account(auth_client, opening="2000000")
    assert acc["name"] == "TPBank"
    summary = auth_client.get("/api/accounts").json()
    assert float(summary["total_net_worth"]) == 2000000
    assert any(a["id"] == acc["id"] and float(a["balance"]) == 2000000 for a in summary["accounts"])


def test_balance_reflects_expense(auth_client):
    acc = _make_account(auth_client, opening="2000000")
    cid = _expense_category(auth_client)
    auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "100000", "category_id": cid,
        "occurred_on": "2026-06-22", "account_id": acc["id"]})
    summary = auth_client.get("/api/accounts").json()
    bal = next(a["balance"] for a in summary["accounts"] if a["id"] == acc["id"])
    assert float(bal) == 1900000  # 2,000,000 − 100,000


def test_transfer_moves_balances_without_changing_net_worth(auth_client):
    bank = _make_account(auth_client, name="TPBank", type_="bank", opening="2000000")
    cash = _make_account(auth_client, name="Tiền mặt", type_="cash", opening="0")
    r = auth_client.post("/api/accounts/transfers", json={
        "from_account_id": bank["id"], "to_account_id": cash["id"],
        "amount": "500000", "occurred_on": "2026-06-22"})
    assert r.status_code == 201, r.text
    summary = auth_client.get("/api/accounts").json()
    by_id = {a["id"]: float(a["balance"]) for a in summary["accounts"]}
    assert by_id[bank["id"]] == 1500000
    assert by_id[cash["id"]] == 500000
    assert float(summary["total_net_worth"]) == 2000000  # unchanged


def test_transfer_same_account_rejected(auth_client):
    acc = _make_account(auth_client)
    r = auth_client.post("/api/accounts/transfers", json={
        "from_account_id": acc["id"], "to_account_id": acc["id"],
        "amount": "100000", "occurred_on": "2026-06-22"})
    assert r.status_code == 422


def test_delete_account_in_use_returns_409(auth_client):
    acc = _make_account(auth_client)
    cid = _expense_category(auth_client)
    auth_client.post("/api/transactions", json={
        "type": "expense", "amount": "50000", "category_id": cid,
        "occurred_on": "2026-06-22", "account_id": acc["id"]})
    r = auth_client.delete(f"/api/accounts/{acc['id']}")
    assert r.status_code == 409


def test_delete_unused_account_ok(auth_client):
    acc = _make_account(auth_client)
    assert auth_client.delete(f"/api/accounts/{acc['id']}").status_code == 204


def test_archive_hides_from_default_list(auth_client):
    acc = _make_account(auth_client)
    auth_client.patch(f"/api/accounts/{acc['id']}", json={"archived": True})
    default = auth_client.get("/api/accounts").json()
    assert all(a["id"] != acc["id"] for a in default["accounts"])
    with_archived = auth_client.get("/api/accounts?archived=true").json()
    assert any(a["id"] == acc["id"] for a in with_archived["accounts"])
