def test_security_headers_are_set(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "no-referrer"


def test_login_is_rate_limited(client):
    client.post("/api/auth/register", json={"username": "ratelimit", "password": "Password123!"})
    codes = [
        client.post(
            "/api/auth/login",
            data={"username": "ratelimit", "password": "wrong"},
        ).status_code
        for _ in range(12)
    ]
    # login is capped at 10/minute → at least one 429 within 12 attempts
    assert 429 in codes


def test_cors_allows_configured_origin(client):
    r = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code in (200, 204)
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
