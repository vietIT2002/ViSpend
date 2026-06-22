from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://vispend:vispend@localhost:5432/vispend"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720  # 12h session (no refresh-token flow)
    cors_origins: str = "http://localhost:5173"
    google_client_id: str = "486347902494-mruf16d1kl8n3u8hqv5qtohtd850ib6j.apps.googleusercontent.com"
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_bucket: str = "receipts"
    # Optional dedicated Fernet key for receipt-image encryption. If empty, a key
    # is derived from jwt_secret so encryption works with no extra setup.
    receipt_encryption_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
