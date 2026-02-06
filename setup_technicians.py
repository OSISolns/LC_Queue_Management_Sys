from backend.database import SessionLocal
import backend.models as models
from backend.auth import get_password_hash

def setup_technicians():
    db = SessionLocal()
    try:
        # 1. Ensure Technician Role
        tech_role = db.query(models.Role).filter_by(name="Technician").first()
        if not tech_role:
            print("Creating Technician Role...")
            tech_role = models.Role(id=4, name="Technician")
            db.add(tech_role)
            db.commit()
            db.refresh(tech_role)

        # 2. Create Departments
        new_depts = ["X-Ray", "Ultrasound", "MRI", "CT-Scan", "Phlebotomy"]
        dept_map = {}
        
        for d_name in new_depts:
            dept = db.query(models.Department).filter_by(name=d_name).first()
            if not dept:
                print(f"Creating Department: {d_name}")
                dept = models.Department(name=d_name)
                db.add(dept)
                db.commit() # Commit individually to get ID safely
                db.refresh(dept)
            dept_map[d_name] = dept

        # 3. Create Technician Users
        # Format: username, dept_name
        techs = [
            ("tech_xray", "X-Ray"),
            ("tech_ultrasound", "Ultrasound"),
            ("tech_mri", "MRI"),
            ("tech_ct", "CT-Scan"),
            ("tech_phlebotomy", "Phlebotomy")
        ]
        
        default_pw = get_password_hash("password")
        
        for username, dept_name in techs:
            user = db.query(models.User).filter_by(username=username).first()
            if not user:
                print(f"Creating User: {username} for {dept_name}")
                new_user = models.User(
                    username=username,
                    hashed_password=default_pw,
                    role_id=tech_role.id,
                    department_id=dept_map[dept_name].id,
                    is_active=True
                )
                db.add(new_user)
            else:
                print(f"User {username} already exists. Updating department.")
                user.role_id = tech_role.id
                user.department_id = dept_map[dept_name].id
                
        db.commit()
        print("Technicians setup completed successfully.")

    except Exception as e:
        print(f"Error setting up technicians: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_technicians()
