from app.core.config import settings


def verify_google_credential(credential: str) -> dict:
    if not settings.google_client_id:
        raise RuntimeError("Google sign-in is not configured")

    from google.auth.transport import requests
    from google.oauth2 import id_token

    return id_token.verify_oauth2_token(
        credential,
        requests.Request(),
        settings.google_client_id,
    )
