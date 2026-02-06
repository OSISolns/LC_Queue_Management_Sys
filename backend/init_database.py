"""
Database Migration Script
Initializes the enhanced database with Patient Registry and Visit History tables
"""
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
import backend.models as models
from passlib.context import CryptContext
from datetime import datetime

# Ensure all tables are created
print("Creating database tables...")
models.Base.metadata.create_all(bind=engine)
print("✓ Database tables created successfully")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def initialize_database():
    """Initialize database with default data"""
    db = SessionLocal()
    
    try:
        print("\n--- INITIALIZING DATABASE ---\n")
        
        # 1. Initialize Priority Levels
        print("1. Setting up Priority Levels...")
        priorities = [
            {"id": 1, "name": "Emergency", "weight": 0},
            {"id": 2, "name": "VIP", "weight": 1},
            {"id": 3, "name": "Standard", "weight": 2},
        ]
        
        for p in priorities:
            existing = db.query(models.PriorityLevel).filter_by(id=p["id"]).first()
            if not existing:
                db.add(models.PriorityLevel(**p))
                print(f"  ✓ Created priority: {p['name']}")
            else:
                print(f"  - Priority '{p['name']}' already exists")
        
        db.commit()
        
        # 2. Initialize Roles
        print("\n2. Setting up User Roles...")
        roles_data = [
            {"id": 1, "name": "Admin"},
            {"id": 2, "name": "Doctor"},
            {"id": 3, "name": "Helpdesk"},
        ]
        
        for r in roles_data:
            existing = db.query(models.Role).filter_by(id=r["id"]).first()
            if not existing:
                db.add(models.Role(**r))
                print(f"  ✓ Created role: {r['name']}")
            else:
                print(f"  - Role '{r['name']}' already exists")
        
        db.commit()
        
        # 3. Initialize Admin User
        print("\n3. Setting up Admin User...")
        admin_user = db.query(models.User).filter_by(username="admin").first()
        
        if admin_user:
            print("  - Admin user already exists, resetting password...")
            admin_user.hashed_password = get_password_hash("admin123")
            admin_user.is_active = True
            db.commit()
            print("  ✓ Admin password reset to 'admin123'")
        else:
            admin_role = db.query(models.Role).filter_by(name="Admin").first()
            new_admin = models.User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role_id=admin_role.id,
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("  ✓ Admin user created")
        
        # 4. Initialize Default Departments
        print("\n4. Setting up Default Departments...")
        departments = [
            "General Medicine",
            "Pediatrics",
            "Cardiology",
            "Orthopedics",
            "Emergency"
        ]
        
        for dept_name in departments:
            existing = db.query(models.Department).filter_by(name=dept_name).first()
            if not existing:
                db.add(models.Department(name=dept_name))
                print(f"  ✓ Created department: {dept_name}")
            else:
                print(f"  - Department '{dept_name}' already exists")
        
        db.commit()
        
        # 5. Initialize Sample Rooms
        print("\n5. Setting up Sample Rooms...")
        general_med = db.query(models.Department).filter_by(name="General Medicine").first()
        
        if general_med:
            rooms = ["Room 101", "Room 102", "Room 103"]
            for room_name in rooms:
                existing = db.query(models.Room).filter_by(name=room_name).first()
                if not existing:
                    db.add(models.Room(name=room_name, department_id=general_med.id))
                    print(f"  ✓ Created room: {room_name}")
                else:
                    print(f"  - Room '{room_name}' already exists")
            
            db.commit()
        
        print("\n" + "="*50)
        print("DATABASE INITIALIZATION COMPLETE")
        print("="*50)
        print("\n✓ Patient Registry: Ready")
        print("✓ Visit History: Ready")
        print("✓ Queue Management: Ready")
        print("✓ User Management: Ready")
        print("\nDefault Admin Credentials:")
        print("  Username: admin")
        print("  Password: admin123")
        print("\n" + "="*50 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    initialize_database()
