import sys
import os

# Add the project root to sys.path to allow importing from backend
sys.path.append(os.getcwd())

from backend import models, database
from backend.auth_utils import get_password_hash
from datetime import datetime

def seed():
    print("🚀 Initializing Turso Database Schema...")
    # This will create tables in Turso if they don't exist
    models.Base.metadata.create_all(bind=database.engine)
    print("✅ Schema created successfully.")

    db = database.SessionLocal()
    try:
        print("🌱 Seeding initial data...")

        # 1. Seed Priority Levels
        priorities = [
            {"id": 1, "name": "Emergency", "weight": 0},
            {"id": 2, "name": "VIP", "weight": 1},
            {"id": 3, "name": "Standard", "weight": 2},
        ]
        for p in priorities:
            if not db.query(models.PriorityLevel).filter_by(id=p["id"]).first():
                db.add(models.PriorityLevel(**p))
                print(f"  + Added Priority: {p['name']}")

        # 2. Seed Roles
        roles = [
            {"id": 1, "name": "Admin", "category": "Admin"},
            {"id": 2, "name": "Doctor", "category": "Doctor"},
            {"id": 3, "name": "Helpdesk", "category": "Helpdesk"},
            {"id": 4, "name": "Technician", "category": "Technician"},
            {"id": 5, "name": "SMS Officer", "category": "SMS Officer"},
            {"id": 6, "name": "Nurse", "category": "Nurse"},
            {"id": 100, "name": "Quality", "category": "Quality"},
        ]
        for r in roles:
            role = db.query(models.Role).filter_by(id=r["id"]).first()
            if not role:
                db.add(models.Role(**r))
                print(f"  + Added Role: {r['name']}")
            elif not role.category:
                role.category = r["category"]
                print(f"  * Updated Role Category: {r['name']}")

        # 3. Seed Default Admin
        admin_role = db.query(models.Role).filter_by(name="Admin").first()
        if admin_role and not db.query(models.User).filter_by(username="admin").first():
            db.add(models.User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role_id=admin_role.id,
                full_name="System Administrator",
                is_active=True
            ))
            print("  + Created Default Admin (admin/admin123)")

        # 4. Seed basic settings if needed
        # (Add more as required)

        db.commit()
        print("✅ Seeding completed successfully.")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
