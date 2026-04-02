"""
session_manager.py
------------------
Server-side idle session enforcement for the QMS backend.

Each login creates a UserSession row. Every authenticated request must call
touch_session() — if the session has been idle for > IDLE_TIMEOUT_SECONDS
it returns False and the request is rejected with 401.
"""

import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from . import models

# ── Configuration ──────────────────────────────────────────────────────────────
IDLE_TIMEOUT_SECONDS = 5 * 60        # 5 minutes — must match frontend
CLEANUP_AFTER_SECONDS = 60 * 60      # Delete sessions idle for > 1 hour


def _hash_token(token: str) -> str:
    """Return a SHA-256 hex digest of the JWT string."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ── Public API ─────────────────────────────────────────────────────────────────

def create_session(db: Session, token: str, user_id: int) -> models.UserSession:
    """
    Register a new active session after a successful login.
    Replaces any pre-existing session for the same token hash (safety guard).
    """
    token_hash = _hash_token(token)

    # Remove stale duplicate if it somehow exists
    existing = db.query(models.UserSession).filter_by(token_hash=token_hash).first()
    if existing:
        db.delete(existing)
        db.flush()

    session = models.UserSession(
        token_hash=token_hash,
        user_id=user_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def touch_session(db: Session, token: str) -> bool:
    """
    Check whether the session is still active (not idle > 5 min).
    - Returns True  → session valid, last_activity updated to now.
    - Returns False → session missing OR idle timeout exceeded.
    """
    token_hash = _hash_token(token)
    session = db.query(models.UserSession).filter_by(token_hash=token_hash).first()

    if not session:
        return False  # Session row doesn't exist (never logged in via new flow, or was deleted)

    now = datetime.utcnow()
    idle_seconds = (now - session.last_activity).total_seconds()

    if idle_seconds > IDLE_TIMEOUT_SECONDS:
        # Idle for too long — remove the dead session and deny access
        db.delete(session)
        db.commit()
        return False

    # Session is alive — refresh the timestamp
    session.last_activity = now
    db.commit()
    return True


def delete_session(db: Session, token: str) -> None:
    """
    Remove the session on explicit logout so the token is immediately invalidated.
    """
    token_hash = _hash_token(token)
    session = db.query(models.UserSession).filter_by(token_hash=token_hash).first()
    if session:
        db.delete(session)
        db.commit()


def cleanup_old_sessions(db: Session) -> int:
    """
    Delete all sessions that haven't been active for > CLEANUP_AFTER_SECONDS.
    Called on server startup to avoid table bloat.
    Returns the number of rows deleted.
    """
    cutoff = datetime.utcnow() - timedelta(seconds=CLEANUP_AFTER_SECONDS)
    deleted = db.query(models.UserSession).filter(
        models.UserSession.last_activity < cutoff
    ).delete(synchronize_session=False)
    db.commit()
    return deleted
