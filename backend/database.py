import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# --- Turso/SQLite Patch ---
# Turso does not support 'PRAGMA read_uncommitted' which SQLAlchemy calls during initialization.
from sqlalchemy.dialects.sqlite.base import SQLiteDialect
original_get_isolation_level = SQLiteDialect.get_isolation_level
def patched_get_isolation_level(self, dbapi_conn):
    return "SERIALIZABLE" # Return a default to avoid the PRAGMA call
SQLiteDialect.get_isolation_level = patched_get_isolation_level

# --- Database Selection ---
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
    # Turso/LibSQL Cloud
    # Strip the libsql:// prefix to get the hostname
    hostname = TURSO_DATABASE_URL.replace("libsql://", "")
    db_url = f"sqlite+libsql://{hostname}/?authToken={TURSO_AUTH_TOKEN}"
    
    from sqlalchemy.pool import NullPool
    engine = create_engine(db_url, connect_args={}, isolation_level=None, poolclass=NullPool)
else:
    # Local SQLite
    SQLITE_DATABASE_URL = "sqlite:///./queue.db"
    engine = create_engine(
        SQLITE_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
