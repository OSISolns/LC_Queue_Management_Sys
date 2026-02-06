import sys
import traceback
from sqlalchemy.orm import Session, joinedload
from backend.database import SessionLocal
import backend.models as models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def test_full_login_flow():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("Testing Full Login Flow")
        print("=" * 60)
        
        # Simulate the exact login endpoint logic
        username = "admin"
        password = "admin123"
        
        print(f"\n1. Querying user with username: {username}")
        user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == username).first()
        
        if not user:
            print("   ERROR: User not found!")
            return
        
        print(f"   ✓ User found: {user.username} (ID: {user.id})")
        
        print(f"\n2. Checking password...")
        if not verify_password(password, user.hashed_password):
            print("   ERROR: Password verification failed!")
            return
        
        print(f"   ✓ Password verified successfully")
        
        print(f"\n3. Accessing user.role...")
        try:
            role_name = user.role.name
            print(f"   ✓ Role accessed successfully: {role_name}")
        except Exception as e:
            print(f"   ERROR accessing role: {e}")
            traceback.print_exc()
            return
        
        print(f"\n4. Creating token data...")
        token_data = {
            "sub": user.username,
            "role": user.role.name
        }
        print(f"   ✓ Token data: {token_data}")
        
        print(f"\n5. Creating response data...")
        response_data = {
            "access_token": "dummy_token_for_test",
            "token_type": "bearer",
            "role": user.role.name,
            "username": user.username
        }
        print(f"   ✓ Response data: {response_data}")
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n{'=' * 60}")
        print(f"ERROR: {e}")
        print("=" * 60)
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_full_login_flow()
