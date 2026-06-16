import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.core.db import get_session
from app.core.ratelimit import limiter
from app.main import app


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Rate-limit storage is process-global; clear it before each test so one
    test's request volume can't trip another test's limits."""
    try:
        limiter.reset()
    except Exception:
        pass
    yield


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session):
    def _get_session_override():
        return session

    app.dependency_overrides[get_session] = _get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client):
    """Client already registered + logged in, with the Authorization header set."""
    client.post("/api/auth/register", json={"username": "atester", "password": "Password123!"})
    r = client.post(
        "/api/auth/login",
        data={"username": "atester", "password": "Password123!"},
    )
    token = r.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
