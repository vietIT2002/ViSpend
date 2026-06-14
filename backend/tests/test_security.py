from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    h = hash_password("password123")
    assert h != "password123"
    assert verify_password("password123", h) is True
    assert verify_password("wrong", h) is False


def test_jwt_roundtrip():
    token = create_access_token(subject="user-uuid-1")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-uuid-1"


def test_jwt_invalid_returns_none():
    assert decode_access_token("garbage.not.valid") is None
