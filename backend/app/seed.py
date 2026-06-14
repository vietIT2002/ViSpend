from sqlmodel import Session

from app.categories.service import seed_default_categories
from app.core.db import engine


def seed() -> None:
    with Session(engine) as session:
        seed_default_categories(session)
