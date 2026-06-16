import pytest

from app.auth import google


class _Resp:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload


def _patch(monkeypatch, resp: _Resp) -> None:
    monkeypatch.setattr(google.settings, "google_client_id", "client-123", raising=False)
    monkeypatch.setattr(google.httpx, "get", lambda *a, **k: resp)


def test_verify_access_token_returns_identity(monkeypatch):
    _patch(
        monkeypatch,
        _Resp(200, {"aud": "client-123", "sub": "sub-1", "email": "g@test.com", "email_verified": "true"}),
    )
    info = google.verify_google_access_token("token")
    assert info["sub"] == "sub-1"
    assert info["email"] == "g@test.com"
    assert info["email_verified"] is True


def test_verify_access_token_rejects_wrong_audience(monkeypatch):
    _patch(
        monkeypatch,
        _Resp(200, {"aud": "someone-else", "sub": "x", "email": "g@test.com", "email_verified": "true"}),
    )
    with pytest.raises(ValueError):
        google.verify_google_access_token("token")


def test_verify_access_token_rejects_invalid_token(monkeypatch):
    _patch(monkeypatch, _Resp(400, {"error": "invalid_token"}))
    with pytest.raises(ValueError):
        google.verify_google_access_token("token")
