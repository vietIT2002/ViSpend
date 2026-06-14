def test_register_then_login(client):
    r = client.post(
        "/api/auth/register",
        json={"email": "u@test.com", "password": "password123"},
    )
    assert r.status_code == 201
    assert r.json()["email"] == "u@test.com"

    r = client.post(
        "/api/auth/login",
        data={"username": "u@test.com", "password": "password123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "u@test.com", "password": "password123"},
    )
    r = client.post(
        "/api/auth/login",
        data={"username": "u@test.com", "password": "wrong"},
    )
    assert r.status_code == 401


def test_register_duplicate_email(client):
    client.post(
        "/api/auth/register",
        json={"email": "u@test.com", "password": "password123"},
    )
    r = client.post(
        "/api/auth/register",
        json={"email": "u@test.com", "password": "other123"},
    )
    assert r.status_code == 409


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(auth_client):
    r = auth_client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "a@test.com"
