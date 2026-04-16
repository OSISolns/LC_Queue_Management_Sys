"""
env.py — Alembic migration environment
Configured to use the LC Queue Management System database engine and models.
"""
__author__ = "Valery Structure"
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Make the project root importable ─────────────────────────────────────────
# env.py lives at: <project_root>/backend/migrations/env.py
# We need <project_root> on sys.path to import `backend.*`
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

# ── Load .env so DATABASE_URL / SECRET_KEY etc. are available ─────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, "backend", ".env"))

# ── Import project models so autogenerate can inspect all tables ──────────────
from backend import models  # noqa: F401 — registers all ORM models
from backend.roster import models as roster_models  # noqa: F401 — roster tables
from backend.database import engine, Base

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point autogenerate at the combined metadata
target_metadata = Base.metadata


# ─────────────────────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """
    Offline mode: generate SQL scripts without a live DB connection.
    Reads sqlalchemy.url from alembic.ini.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # SQLite-specific: compare server defaults properly
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Online mode: apply migrations directly via a live connection.
    Uses the existing project engine (respects DATABASE_URL env var).
    """
    connectable = engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite requires batch mode for ALTER TABLE operations
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
