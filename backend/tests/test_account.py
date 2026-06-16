from app.core.security import hash_password
from app.models import User


def test_update_username(auth_client):
    r = auth_client.patch("/api/auth/me", json={"username": "renamed"})
    assert r.status_code == 200
    assert r.json()["username"] == "renamed"


def test_update_email(auth_client):
    r = auth_client.patch("/api/auth/me", json={"email": "me@test.com"})
    assert r.status_code == 200
    assert r.json()["email"] == "me@test.com"


def test_update_username_conflict(auth_client, session):
    session.add(User(username="taken", hashed_password=hash_password("Password123!")))
    session.commit()
    r = auth_client.patch("/api/auth/me", json={"username": "taken"})
    assert r.status_code == 409


def test_update_username_invalid(auth_client):
    r = auth_client.patch("/api/auth/me", json={"username": "Bad Name!"})
    assert r.status_code == 422


def test_change_password(auth_client):
    r = auth_client.post(
        "/api/auth/change-password",
        json={"current_password": "Password123!", "new_password": "Newpass123!"},
    )
    assert r.status_code == 200

    login = auth_client.post(
        "/api/auth/login",
        data={"username": "atester", "password": "Newpass123!"},
    )
    assert login.status_code == 200


def test_change_password_wrong_current(auth_client):
    r = auth_client.post(
        "/api/auth/change-password",
        json={"current_password": "Wrongpass1!", "new_password": "Newpass123!"},
    )
    assert r.status_code == 400


def test_change_password_weak_new(auth_client):
    r = auth_client.post(
        "/api/auth/change-password",
        json={"current_password": "Password123!", "new_password": "weak"},
    )
    assert r.status_code == 422
