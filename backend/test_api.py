"""
Simple test script to directly test the login endpoint logic
"""
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta
import models, schemas, database
from passlib.context import CryptContext
from jose import jwt

app = FastAPI()

SECRET_KEY = "supersecretkey_change_me_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/test-login")
async def test_login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        print(f"Received login request for user: {form_data.username}")
        
        # Query with joinedload
        user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == form_data.username).first()
        
        if not user:
            print("User not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        
        print(f"User found: {user.username}")
        
        if not verify_password(form_data.password, user.hashed_password):
            print("Password verification failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password verification failed",
            )
        
        print("Password verified")
        
        # Try to access role
        try:
            role_name = user.role.name
            print(f"Role accessed: {role_name}")
        except Exception as e:
            print(f"Error accessing role: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error accessing role: {str(e)}",
            )
        
        return {
            "access_token": "test_token",
            "token_type": "bearer",
            "role": user.role.name,
            "username": user.username
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
