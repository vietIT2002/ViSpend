from sqlmodel import select

from app.auth import router as auth_router
from app.core.config import settings
from app.models import User


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


def test_google_login_creates_verified_user_and_returns_token(client, session, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id", raising=False)

    def fake_verify_google_access_token(token: str) -> dict:
        assert token == "valid-google-token"
        return {
            "sub": "google-sub-1",
            "email": "g.user@test.com",
            "email_verified": True,
        }

    monkeypatch.setattr(
        auth_router,
        "verify_google_access_token",
        fake_verify_google_access_token,
        raising=False,
    )

    r = client.post("/api/auth/google", json={"access_token": "valid-google-token"})

    assert r.status_code == 200
    token = r.json()["access_token"]
    assert r.json()["token_type"] == "bearer"

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "g.user@test.com"

    user = session.exec(select(User).where(User.email == "g.user@test.com")).one()
    assert user.google_sub == "google-sub-1"
    assert user.is_verified is True


def test_google_login_links_existing_email_account(client, session, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id", raising=False)
    client.post(
        "/api/auth/register",
        json={"email": "existing@test.com", "password": "password123"},
    )
    existing = session.exec(select(User).where(User.email == "existing@test.com")).one()

    def fake_verify_google_access_token(_: str) -> dict:
        return {
            "sub": "google-sub-existing",
            "email": "existing@test.com",
            "email_verified": True,
        }

    monkeypatch.setattr(
        auth_router,
        "verify_google_access_token",
        fake_verify_google_access_token,
        raising=False,
    )

    r = client.post("/api/auth/google", json={"access_token": "valid-google-token"})

    assert r.status_code == 200
    session.refresh(existing)
    assert existing.google_sub == "google-sub-existing"
    assert existing.is_verified is True
    assert session.exec(select(User).where(User.email == "existing@test.com")).all() == [existing]


def test_google_login_rejects_unverified_google_email(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id", raising=False)

    def fake_verify_google_access_token(_: str) -> dict:
        return {
            "sub": "google-sub-unverified",
            "email": "unverified@test.com",
            "email_verified": False,
        }

    monkeypatch.setattr(
        auth_router,
        "verify_google_access_token",
        fake_verify_google_access_token,
        raising=False,
    )

    r = client.post("/api/auth/google", json={"access_token": "valid-google-token"})

    assert r.status_code == 401


def test_google_login_rejects_invalid_google_token(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id", raising=False)

    def fake_verify_google_access_token(_: str) -> dict:
        raise ValueError("Invalid Google access token")

    monkeypatch.setattr(
        auth_router,
        "verify_google_access_token",
        fake_verify_google_access_token,
        raising=False,
    )

    r = client.post("/api/auth/google", json={"access_token": "bad-google-token"})

    assert r.status_code == 401
