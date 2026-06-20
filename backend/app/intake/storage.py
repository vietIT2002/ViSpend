import httpx

from app.core.config import settings


def configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key)


def _headers() -> dict[str, str]:
    # Supabase Storage wants both apikey and Authorization; sending both works
    # for legacy service_role JWTs and the new sb_secret_ keys alike.
    return {
        "apikey": settings.supabase_service_key,
        "Authorization": f"Bearer {settings.supabase_service_key}",
    }


def upload_receipt(path: str, data: bytes, content_type: str) -> None:
    url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{path}"
    r = httpx.post(
        url,
        headers={**_headers(), "Content-Type": content_type, "x-upsert": "true"},
        content=data,
        timeout=30,
    )
    r.raise_for_status()


def signed_url(path: str, expires_in: int = 3600) -> str:
    url = f"{settings.supabase_url}/storage/v1/object/sign/{settings.supabase_bucket}/{path}"
    r = httpx.post(url, headers=_headers(), json={"expiresIn": expires_in}, timeout=30)
    r.raise_for_status()
    return f"{settings.supabase_url}/storage/v1{r.json()['signedURL']}"
