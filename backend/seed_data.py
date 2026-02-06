from backend.database import SessionLocal
import backend.models as models

def seed_data():
    db = SessionLocal()
    try:
        print("Seeding Departments...")
        depts = [
            "Gyn", "ENT", "Internal Medicine", "General Practitioner", "Orthopedics",
            "Chiropractor", "Urology", "Neurology", "Cardiology", "General Surgeon",
            "Neuro-Surgeon", "Family Medicine", "Dentistry", "Paediatrics", "Procedure"
        ]
        
        dept_objs = {}
        for d in depts:
            obj = db.query(models.Department).filter(models.Department.name == d).first()
            if not obj:
                obj = models.Department(name=d)
                db.add(obj)
                print(f"Created Dept: {d}")
            else:
                pass # print(f"Exists: {d}")
            dept_objs[d] = obj
        
        db.commit()
        # Refresh to get IDs
        for d in depts:
            dept_objs[d] = db.query(models.Department).filter(models.Department.name == d).first()

        print("Seeding Rooms...")
        
        def ensure_room(name, dept_name):
            dept = dept_objs.get(dept_name)
            if not dept:
                print(f"Skipping room {name}, dept {dept_name} not found")
                return
            
            room = db.query(models.Room).filter(models.Room.name == name).first()
            if not room:
                room = models.Room(name=name, department_id=dept.id)
                db.add(room)
                print(f"Created Room: {name} -> {dept_name}")
            else:
                # Update department if changed (optional, but good for sync)
                if room.department_id != dept.id:
                    room.department_id = dept.id
                    db.add(room)
                    print(f"Updated Room: {name} -> {dept_name}")

        # Map from Kiosk.jsx
        # Specifics
        ensure_room("15", "Gyn")
        ensure_room("22", "Gyn")
        ensure_room("23", "Gyn")
        
        ensure_room("21", "ENT")
        ensure_room("14", "Chiropractor")
        ensure_room("9", "Cardiology")
        ensure_room("10", "Neurology")
        ensure_room("16", "Urology")
        
        # Dentistry 1D-4D
        for i in range(1, 5): ensure_room(f"{i}D", "Dentistry")
        
        # Paediatrics 1P-2P
        for i in range(1, 3): ensure_room(f"{i}P", "Paediatrics")
        
        # Procedures
        ensure_room("1", "Procedure") # Phlebotomy
        ensure_room("2", "Procedure") # CT
        ensure_room("3", "Procedure") # MRI
        ensure_room("5", "Procedure") # X-Ray
        ensure_room("7", "Procedure") # Ultrasound
        
        # General / Shared Pool
        # Kiosk logic roughly implies rooms 1-23 are the main building blocks
        # We assign remaining numbers to "General Practitioner" as a catch-all for now
        
        assigned_numbers = ["15", "22", "23", "21", "14", "9", "10", "16", "1", "2", "3", "5", "7"]
        
        for i in range(1, 24):
            r_name = str(i)
            if r_name not in assigned_numbers:
                ensure_room(r_name, "General Practitioner")
                
        db.commit()
        print("Seeding completed successfully.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
