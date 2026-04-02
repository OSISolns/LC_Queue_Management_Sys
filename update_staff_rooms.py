import sys
import os
import re
import openpyxl
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append('/home/noble/Documents/LC_APPS/LC_Queuing-Sys')

from backend.database import SessionLocal
from backend.models import User, Department, Role, Room
from backend.main import get_password_hash

def clean_name(name):
    if not name: return ""
    return re.sub(r'^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+', '', str(name).strip(), flags=re.IGNORECASE).strip()

def run_update():
    db = SessionLocal()
    try:
        file_path = "/home/noble/Documents/Rosters/March/DUTY_ROSTER_2nd_March_2026_UPDATED.xlsx"
        print(f"Reading {file_path}...")
        
        wb = openpyxl.load_workbook(file_path, data_only=True)
        ws = wb.active
        
        # Load lookups
        departments = {d.name.lower(): d.id for d in db.query(Department).all()}
        # Add common aliases for departments
        dept_aliases = {
            "pysiotherapy": departments.get("physiotherapy"),
            "dental": departments.get("dentistry"),
            "dentists": departments.get("dentistry"),
            "gynecology": departments.get("gynecology"),
            "pediatrics": departments.get("pediatrics"),
            "neurology": departments.get("neurology"),
            "internal medicine": departments.get("internal medicine"),
            "cardiology": departments.get("cardiology"),
            "orthopedics": departments.get("orthopedic surgeon"),
            "dermatology": departments.get("dermatology"),
            "gp": departments.get("general practitioner"),
            "general medicine": departments.get("general medicine"),
            "lab": departments.get("laboratory"),
            "laboratory": departments.get("laboratory")
        }

        # Room Mappings (Department Name -> Room Number)
        # Based on existing database entries
        room_mappings = {
            "gynecology": "21",
            "pediatrics": "24",
            "neurology": "9",
            "internal medicine": "13",
            "cardiology": "10",
            "dermatology": "28",
            "orthopedics": "16",
            "ent": "23",
            "dentistry": "26",
            "dentistry (room 26)": "26",
            "dentistry (room 27)": "27",
            "general practitioner": "19",
            "gp": "19",
            "laboratory": "Ground Floor",
            "pathology": "Ground Floor",
            "physiotherapy": "Ground Floor",
            "chiropractor": "10",
            "urology": "15"
        }

        roles = {r.name.lower(): r.id for r in db.query(Role).all()}
        doc_role_id = roles.get("doctor", 2)
        tech_role_id = roles.get("technician", 4)
        nurse_role_id = roles.get("nurse", 6)

        rows = list(ws.iter_rows(values_only=True))
        headers = [str(h).strip().lower() for h in rows[0]]
        
        # Identify column indices
        dept_idx = -1
        name_idx = -1
        role_idx = -1
        
        for i, h in enumerate(headers):
            if "department" in h: dept_idx = i
            if "staff name" in h or "name" in h: name_idx = i
            if "role" in h: role_idx = i

        count_updated = 0
        count_created = 0

        for row in rows[1:]:
            dept_name = str(row[dept_idx]).strip() if dept_idx != -1 and row[dept_idx] else ""
            raw_name = str(row[name_idx]).strip() if name_idx != -1 and row[name_idx] else ""
            role_hint = str(row[role_idx]).strip() if role_idx != -1 and row[role_idx] else ""

            if not raw_name or raw_name.lower() == "none" or len(raw_name) < 3:
                continue

            # Clean name for matching
            c_name = clean_name(raw_name)
            
            # Find department ID
            d_id = departments.get(dept_name.lower()) or dept_aliases.get(dept_name.lower())
            
            # Find user
            user = db.query(User).filter(
                (User.full_name.ilike(f"%{c_name}%")) | 
                (User.username.ilike(f"%{c_name.replace(' ', '_')}%"))
            ).first()

            # Determine role
            target_role_id = doc_role_id
            if "technician" in role_hint.lower() or "lab" in dept_name.lower():
                target_role_id = tech_role_id
            elif "nurse" in role_hint.lower() or "nursing" in dept_name.lower():
                target_role_id = nurse_role_id

            # Determine room
            target_room = room_mappings.get(dept_name.lower()) or room_mappings.get(dept_name.lower().replace("pysiotherapy", "physiotherapy"))
            
            if user:
                # Update existing user
                user.is_active = True
                if d_id: user.department_id = d_id
                if target_room: user.room_number = target_room
                count_updated += 1
            else:
                # Create new user
                username = c_name.lower().replace(" ", "_")
                # Ensure uniqueness
                base_username = username
                counter = 1
                while db.query(User).filter(User.username == username).first():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                new_user = User(
                    username=username,
                    full_name=c_name,
                    hashed_password=get_password_hash("welcome123"),
                    role_id=target_role_id,
                    department_id=d_id,
                    room_number=target_room,
                    is_active=True
                )
                db.add(new_user)
                db.commit() # Commit to make sure uniqueness check works for next row
                db.refresh(new_user)
                count_created += 1

        db.commit()
        print(f"Summary: Updated {count_updated} users, Created {count_created} users.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_update()
