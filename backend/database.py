import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# --- Database Selection ---
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
    # Turso/LibSQL Cloud
    # Use the sqlite dialect with the libsql-client driver
    # Note: requires 'libsql-client' or 'sqlalchemy-libsql'
    db_url = f"sqlite+{TURSO_DATABASE_URL}?authToken={TURSO_AUTH_TOKEN}"
    # Strip the libsql:// prefix if present in the URL from environment
    if TURSO_DATABASE_URL.startswith("libsql://"):
        url = TURSO_DATABASE_URL.replace("libsql://", "https://")
        db_url = f"sqlite+libsql://{url}?authToken={TURSO_AUTH_TOKEN}"
    else:
        db_url = TURSO_DATABASE_URL
    
    engine = create_engine(db_url, connect_args={})
else:
    # Local SQLite
    SQLITE_DATABASE_URL = "sqlite:///./queue.db"
    engine = create_engine(
        SQLITE_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
