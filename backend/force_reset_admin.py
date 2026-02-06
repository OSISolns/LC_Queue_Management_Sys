from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
import backend.models as models
from passlib.context import CryptContext

# Start DB Session
db = SessionLocal()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

try:
    print("--- FORCE RESETTING ADMIN USER ---")
    
    # 1. Find existing admin
    user = db.query(models.User).filter(models.User.username == "admin").first()
    
    # 2. Delete if exists
    if user:
        print(f"Deleting existing admin user (ID: {user.id})")
        db.delete(user)
        db.commit()
    else:
        print("No existing admin user found.")
        
    # 3. Ensure Admin Role exists
    role = db.query(models.Role).filter(models.Role.name == "Admin").first()
    if not role:
        print("Admin Role not found, creating...")
        role = models.Role(name="Admin", id=1)
        db.add(role)
        db.commit()
    
    # 4. Create new Admin user
    print("Creating new admin user...")
    new_user = models.User(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        role_id=role.id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    
    print("SUCCESS: Admin user recreated.")
    print("Username: admin")
    print("Password: admin123")
    
except Exception as e:
    print(f"ERROR: {e}")
finally:
    db.close()
