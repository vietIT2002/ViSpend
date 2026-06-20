def test_transaction_has_receipt_flag_defaults_false(auth_client):
    cid = next(c["id"] for c in auth_client.get("/api/categories").json() if c["type"] == "expense")
    r = auth_client.post(
        "/api/transactions",
        json={"type": "expense", "amount": "10000", "category_id": cid,
              "occurred_on": "2026-06-20", "method": "cash"},
    )
    assert r.status_code == 201
    assert r.json()["has_receipt"] is False
