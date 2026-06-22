from app.core.config import Settings


def test_settings_reads_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@h/db")
    monkeypatch.setenv("JWT_SECRET", "s3cret")
    monkeypatch.setenv("CORS_ORIGINS", "http://a.com,http://b.com")
    s = Settings()
    assert s.jwt_secret == "s3cret"
    assert s.access_token_expire_minutes == 30  # short-lived access token
    assert s.refresh_token_expire_minutes == 1440  # 24h refresh window
    assert s.cors_origins_list == ["http://a.com", "http://b.com"]
