from app.core.security import hash_password, verify_password
from app.models import User


def test_forgot_then_reset(client, session):
    # Password reset is email-based, so seed an account that has an email.
    user = User(email="u@test.com", hashed_password=hash_password("Oldpass123!"))
    session.add(user)
    session.commit()

    r = client.post("/api/auth/forgot-password", json={"email": "u@test.com"})
    assert r.status_code == 200
    token = r.json()["reset_token"]

    r = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "Newpass123!"},
    )
    assert r.status_code == 200

    session.refresh(user)
    assert verify_password("Newpass123!", user.hashed_password) is True


def test_reset_rejects_weak_password(client, session):
    user = User(email="weak@test.com", hashed_password=hash_password("Oldpass123!"))
    session.add(user)
    session.commit()

    token = client.post("/api/auth/forgot-password", json={"email": "weak@test.com"}).json()["reset_token"]
    r = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "weakpass"},
    )
    assert r.status_code == 422
