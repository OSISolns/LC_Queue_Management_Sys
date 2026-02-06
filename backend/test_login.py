from sqlalchemy.orm import Session, joinedload
from backend.database import SessionLocal
import backend.models as models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def test_login():
    db = SessionLocal()
    try:
        # Test with joinedload
        print("Testing login with joinedload...")
        user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == "admin").first()
        
        if user:
            print(f"User found: {user.username}")
            print(f"User ID: {user.id}")
            print(f"Role ID: {user.role_id}")
            print(f"Role Name: {user.role.name}")
            
            # Test password
            if verify_password("admin123", user.hashed_password):
                print("Password verification: SUCCESS")
            else:
                print("Password verification: FAILED")
        else:
            print("User not found!")
            
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_login()
