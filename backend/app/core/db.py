from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings


def connect_args(url: str) -> dict:
    # Supabase's Transaction Pooler (PgBouncer) reuses server connections and
    # does not support server-side prepared statements; without this psycopg
    # raises "prepared statement _pg3_0 already exists" on startup/migration.
    # prepare_threshold=None disables psycopg's automatic statement preparation.
    if "psycopg" in url:
        return {"prepare_threshold": None}
    return {}


engine = create_engine(
    settings.database_url, echo=False, connect_args=connect_args(settings.database_url)
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
