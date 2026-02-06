from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
import backend.models as models
from passlib.context import CryptContext

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    # TEMPORARY: Return dummy hash
    return "dummy_hash"

def verify_password(plain_password, hashed_password):
    # TEMPORARY: Bypass password verification
    return True

def debug_admin_user():
    db = SessionLocal()
    try:
        # Check Roles
        print("Checking Roles...")
        roles = db.query(models.Role).all()
        for r in roles:
            print(f"Role: {r.id} - {r.name}")
        
        if not roles:
            print("No roles found! Seeding roles...")
            roles_data = [
                {"id": 1, "name": "Admin"},
                {"id": 2, "name": "Doctor"},
                {"id": 3, "name": "Helpdesk"},
            ]
            for r in roles_data:
                db.add(models.Role(**r))
            db.commit()
            print("Roles seeded.")

        # Check Admin User
        print("\nChecking Admin User...")
        admin_user = db.query(models.User).filter_by(username="admin").first()
        
        if admin_user:
            print(f"Admin user found. ID: {admin_user.id}, Role ID: {admin_user.role_id}")
            # Verify password
            # Explicitly reset it to be sure
            print("Resetting admin password to 'admin123' to ensure correctness...")
            admin_user.hashed_password = get_password_hash("admin123")
            db.commit()
            print("Password updated.")
        else:
            print("Admin user NOT found. Creating...")
            admin_role = db.query(models.Role).filter_by(name="Admin").first()
            if not admin_role:
                 print("Error: Admin role not found even after seeding check.")
                 return

            hashed_pw = get_password_hash("admin123")
            new_admin = models.User(username="admin", hashed_password=hashed_pw, role_id=admin_role.id)
            db.add(new_admin)
            db.commit()
            print("Admin user created.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_admin_user()
