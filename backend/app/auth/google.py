import httpx

from app.core.config import settings

TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def verify_google_access_token(access_token: str) -> dict:
    """Verify a Google OAuth access token via the tokeninfo endpoint and return
    the identity. Raises RuntimeError if unconfigured, ValueError if invalid."""
    if not settings.google_client_id:
        raise RuntimeError("Google sign-in is not configured")

    try:
        resp = httpx.get(TOKENINFO_URL, params={"access_token": access_token}, timeout=10)
    except httpx.HTTPError as exc:
        raise ValueError("Could not reach Google to verify the token") from exc

    if resp.status_code != 200:
        raise ValueError("Invalid Google access token")

    data = resp.json()
    # The token must have been issued for THIS app, not a different client.
    if data.get("aud") != settings.google_client_id:
        raise ValueError("Google token was issued for a different client")

    return {
        "sub": data.get("sub"),
        "email": data.get("email"),
        "email_verified": str(data.get("email_verified")).lower() == "true",
    }
