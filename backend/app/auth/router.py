import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.core.db import get_session
from app.core.ratelimit import limiter
from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.auth.google import verify_google_access_token
from app.models import User
from app.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    ProfileUpdate,
    RegisterRequest,
    ResetPasswordRequest,
    TokenOut,
    UserOut,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(
    request: Request, body: RegisterRequest, session: Session = Depends(get_session)
) -> User:
    exists = session.exec(select(User).where(User.username == body.username)).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
    user = User(username=body.username, hashed_password=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> TokenOut:
    user = session.exec(select(User).where(User.username == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    return TokenOut(access_token=create_access_token(subject=str(user.id)))


@router.post("/google", response_model=TokenOut)
@limiter.limit("10/minute")
def google_login(
    request: Request,
    body: GoogleLoginRequest,
    session: Session = Depends(get_session),
) -> TokenOut:
    try:
        idinfo = verify_google_access_token(body.access_token)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google token") from exc

    google_sub = idinfo.get("sub")
    email = idinfo.get("email")
    email_verified = bool(idinfo.get("email_verified"))
    if not google_sub or not email or not email_verified:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google email is not verified")

    user = session.exec(select(User).where(User.google_sub == google_sub)).first()
    if user is None:
        user = session.exec(select(User).where(User.email == email)).first()
        if user is None:
            user = User(
                email=email,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                google_sub=google_sub,
                is_verified=True,
            )
        elif user.google_sub and user.google_sub != google_sub:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email is linked to another Google account")
        else:
            user.google_sub = google_sub
            user.is_verified = True

    session.add(user)
    session.commit()
    session.refresh(user)
    return TokenOut(access_token=create_access_token(subject=str(user.id)))


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)) -> User:
    return current


@router.patch("/me", response_model=UserOut)
def update_me(
    body: ProfileUpdate,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> User:
    data = body.model_dump(exclude_unset=True)
    if "username" in data and data["username"] is not None and data["username"] != current.username:
        clash = session.exec(
            select(User).where(User.username == data["username"], User.id != current.id)
        ).first()
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
        current.username = data["username"]
    if "email" in data and data["email"] != current.email:
        if data["email"] is not None:
            clash = session.exec(
                select(User).where(User.email == data["email"], User.id != current.id)
            ).first()
            if clash:
                raise HTTPException(status.HTTP_409_CONFLICT, "Email is already in use")
        current.email = data["email"]
    session.add(current)
    session.commit()
    session.refresh(current)
    return current


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    session: Session = Depends(get_session),
    current: User = Depends(get_current_user),
) -> dict:
    if not verify_password(body.current_password, current.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    current.hashed_password = hash_password(body.new_password)
    session.add(current)
    session.commit()
    return {"detail": "Password updated"}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    session: Session = Depends(get_session),
) -> dict:
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user:
        return {"detail": "If the email exists, instructions have been sent"}
    return {"detail": "ok", "reset_token": create_reset_token(str(user.id))}


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    session: Session = Depends(get_session),
) -> dict:
    payload = decode_access_token(body.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid token")
    user = session.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.hashed_password = hash_password(body.new_password)
    session.add(user)
    session.commit()
    return {"detail": "Password has been reset"}
