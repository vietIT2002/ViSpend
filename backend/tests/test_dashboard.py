def _category_id(auth_client, name):
    return next(c["id"] for c in auth_client.get("/api/categories").json() if c["name"] == name)


def test_dashboard_summary_by_category_and_trend(auth_client):
    food = _category_id(auth_client, "Food & Drink")
    salary = _category_id(auth_client, "Salary")
    auth_client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "50000",
            "category_id": food,
            "occurred_on": "2026-06-01",
            "method": "cash",
        },
    )
    auth_client.post(
        "/api/transactions",
        json={
            "type": "income",
            "amount": "1000000",
            "category_id": salary,
            "occurred_on": "2026-06-01",
            "method": "transfer",
        },
    )

    r = auth_client.get("/api/dashboard/summary?from=2026-06-01&to=2026-06-30")
    assert r.status_code == 200
    assert r.json() == {
        "total_income": "1000000.00",
        "total_expense": "50000.00",
        "balance": "950000.00",
    }

    r = auth_client.get(
        "/api/dashboard/by-category?type=expense&from=2026-06-01&to=2026-06-30"
    )
    assert r.status_code == 200
    assert r.json()[0]["category"] == "Food & Drink"
    assert r.json()[0]["total"] == "50000.00"
    assert r.json()[0]["percent"] == 100

    r = auth_client.get(
        "/api/dashboard/trend?granularity=day&from=2026-06-01&to=2026-06-30"
    )
    assert r.status_code == 200
    assert r.json()[0] == {
        "period": "2026-06-01",
        "income": "1000000.00",
        "expense": "50000.00",
    }
