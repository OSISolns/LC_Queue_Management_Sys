from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from jose import JWTError, jwt
from . import models, schemas, database, session_manager
from typing import Optional
import hashlib
from datetime import datetime, timedelta

# Auth Configuration (Must match main.py)
SECRET_KEY = "supersecretkey_change_me_in_production"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username, role=payload.get("role"))
    except JWTError:
        raise credentials_exception

    # --- Server-side idle session check ---
    session_alive = session_manager.touch_session(db, token)
    if not session_alive:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired due to inactivity",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # --------------------------------------

    user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        token_data = schemas.TokenData(username=username, role=payload.get("role"))
    except JWTError:
        return None
        
    user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == token_data.username).first()
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_admin_user(current_user: models.User = Depends(get_current_active_user)):
    if current_user.role.category != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

async def get_sms_officer_user(current_user: models.User = Depends(get_current_active_user)):
    """Allow both Admin and SMS Officer roles to access SMS features"""
    if current_user.role.category not in ["Admin", "SMS Officer"]:
        raise HTTPException(status_code=403, detail="Not authorized for SMS operations")
    return current_user
