"""
auth_router.py
--------------
Authentication endpoints: login, logout, and the user list.
"""
__author__ = "Valery Structure"
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from starlette.requests import Request
from typing import List, Optional
from datetime import timedelta

from .. import models, schemas, session_manager
from ..dependencies import get_db, get_current_active_user
from ..auth_utils import (
    verify_password, get_password_hash, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

import logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])

# Re-export the scheme so main.py can keep importing from here if needed
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ─────────────────────────────────────────────────────────────
# Auth Routes
# ─────────────────────────────────────────────────────────────

@router.post("/test-login")
async def test_login_endpoint(form_data: schemas.LoginRequest):
    print(f"[TEST] Received username: {form_data.username}")
    print(f"[TEST] Password length: {len(form_data.password)}")
    return {"message": "Test successful", "username": form_data.username, "password_length": len(form_data.password)}


@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(
    request: Request,
    form_data: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    try:
        origin = request.headers.get("origin")
        print(f"[LOGIN] Attempting login from {origin} for user: {form_data.username}")

        user = db.query(models.User).options(joinedload(models.User.role)).filter(
            models.User.username == form_data.username
        ).first()

        if not user:
            print(f"[LOGIN] User not found: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(form_data.password, user.hashed_password):
            print(f"[LOGIN] Password verification failed for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        role_title = user.role.name
        role_category = user.role.category or role_title

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "role": role_category},
            expires_delta=access_token_expires
        )

        # Register server-side session for idle timeout tracking
        session_manager.create_session(db, access_token, user.id)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": role_category,
            "role_title": role_title,
            "username": user.username,
            "room_number": user.room_number,
            "id": user.id,
            "full_name": user.full_name,
            "salutation": user.salutation
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Immediately invalidate the server-side session so the token can no longer be used."""
    session_manager.delete_session(db, token)
    return {"message": "Logged out successfully"}


@router.get("/users", response_model=List[schemas.User])
def get_users(role_name: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch users, optionally filtered by role name (e.g., 'Nurse', 'Doctor')"""
    query = db.query(models.User)
    if role_name:
        query = query.join(models.Role).filter(models.Role.name == role_name)
    return query.all()
