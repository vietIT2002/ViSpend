def test_parse_returns_suggestion(auth_client):
    r = auth_client.post(
        "/api/transactions/parse",
        json={"text": "GD -50,000 VND luc 12/06/2026. ND: Highlands Coffee"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["type"] == "expense"
    assert data["amount"] == "50000"
    assert data["occurred_on"] == "2026-06-12"
    assert "highlands" in (data["note"] or "").lower()


def test_parse_requires_text(auth_client):
    assert auth_client.post("/api/transactions/parse", json={"text": ""}).status_code == 422


def test_parse_returns_method_transfer(auth_client):
    r = auth_client.post("/api/transactions/parse",
                         json={"text": "Tra qua ShopeePay 33.000d luc 19/06/2026 beBike"})
    assert r.status_code == 200
    assert r.json()["method"] == "transfer"
    assert r.json()["amount"] == "33000"
