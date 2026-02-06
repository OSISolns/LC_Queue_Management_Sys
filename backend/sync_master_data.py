import sys
import os

# Add project root to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import models
from backend.database import SessionLocal, engine

def sync_data():
    db = SessionLocal()
    
    # 1. Departments Configuration (ID -> Name)
    departments_map = {
        3: "Cardiology",
        4: "Orthopedics",
        7: "ENT",
        8: "Internal Medicine",
        10: "Chiropractor",
        11: "Urology",
        12: "Neurology",
        13: "General Surgeon",
        14: "Neuro-Surgeon",
        15: "Family Medicine",
        16: "Dentistry",
        17: "Pediatrics",
        18: "Procedure",
        25: "Gynecology",
        26: "General Practitioner",
        27: "Dermatology",
        28: "Radiology & Laboratory"
    }

    print("--- Syncing Departments ---")
    for dept_id, dept_name in departments_map.items():
        # Check if ID exists
        existing_dept_by_id = db.query(models.Department).filter(models.Department.id == dept_id).first()
        
        # Check if Name exists (to avoid unique constraint fail)
        existing_dept_by_name = db.query(models.Department).filter(models.Department.name == dept_name).first()

        if existing_dept_by_name and existing_dept_by_name.id != dept_id:
            # Name exists but on a different ID. Rename the old one to avoid conflict.
            print(f"Renaming conflicting department: {existing_dept_by_name.name} (ID: {existing_dept_by_name.id}) -> {dept_name}_OLD")
            existing_dept_by_name.name = f"{dept_name}_OLD"
            db.commit()

        if existing_dept_by_id:
            if existing_dept_by_id.name != dept_name:
                print(f"Updating Department ID {dept_id}: {existing_dept_by_id.name} -> {dept_name}")
                existing_dept_by_id.name = dept_name
        else:
            print(f"Creating Department: ID {dept_id} - {dept_name}")
            new_dept = models.Department(id=dept_id, name=dept_name)
            db.add(new_dept)
        
        db.commit()

    # 2. Rooms Configuration (Room Name -> Department Name)
    rooms_map = [
        ("1", "Radiology & Laboratory"),
        ("2", "Radiology & Laboratory"),
        ("4", "Radiology & Laboratory"),
        ("5", "Radiology & Laboratory"),
        ("7", "Radiology & Laboratory"),
        ("9", "Neurology"),
        ("10", "Cardiology"),
        ("1D", "Dentistry"),
        ("2D", "Dentistry"),
        ("3D", "Dentistry"),
        ("4D", "Dentistry"),
        ("15", "Gynecology"),
        ("16", "Gynecology"),
        ("17", "Gynecology"),
        ("18", "Gynecology"),
        ("19", "Gynecology"),
        ("20", "Gynecology"),
        ("21", "ENT"),
        ("22", "Gynecology"),
        ("23", "Gynecology"),
        ("13", "General Practitioner"),
        ("14", "General Practitioner"),
        ("24", "General Practitioner"),
        ("25", "General Practitioner"),
        ("26", "General Practitioner"),
        ("27", "General Practitioner"),
        ("28", "General Practitioner"),
        ("29", "General Practitioner"),
        ("30", "General Practitioner")
    ]

    print("\n--- Syncing Rooms ---")
    for room_name, dept_name in rooms_map:
        # Find Department
        dept = db.query(models.Department).filter(models.Department.name == dept_name).first()
        if not dept:
            print(f"CRITICAL: Department '{dept_name}' not found for Room {room_name}. Skipping.")
            continue

        # Find or Create Room
        room = db.query(models.Room).filter(models.Room.name == room_name).first()
        if room:
            if room.department_id != dept.id:
                print(f"Reassigning Room {room_name}: Dept {room.department_id} -> {dept.name} ({dept.id})")
                room.department_id = dept.id
        else:
            print(f"Creating Room {room_name} assigned to {dept.name}")
            new_room = models.Room(name=room_name, department_id=dept.id)
            db.add(new_room)
        
        db.commit()

    print("\n--- Sync Complete ---")
    db.close()

if __name__ == "__main__":
    sync_data()
