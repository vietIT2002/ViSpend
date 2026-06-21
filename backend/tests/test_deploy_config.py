from pathlib import Path


def test_procfile_runs_database_migrations_before_starting_api():
    procfile = Path(__file__).resolve().parents[1] / "Procfile"

    command = procfile.read_text(encoding="utf-8").strip()

    assert "python -m alembic upgrade head" in command
    assert command.index("python -m alembic upgrade head") < command.index("uvicorn")
