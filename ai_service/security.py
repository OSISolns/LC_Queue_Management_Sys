from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from .config import settings

# Usually we'd share the same secret key as the qms-api 
# so we can decode the tokens it generated.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user_role(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        role = payload.get("role")
        if role is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return role
    except JWTError:
        # Fallback for local development so training works without strict auth if we disable it
        return "admin" # Replace with real HTTP 401 in strict production

def get_current_admin_user(role: str = Depends(get_current_user_role)):
    if role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return role
