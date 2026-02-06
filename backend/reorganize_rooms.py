"""
Script to reorganize rooms according to new layout:
- Dental: Rooms 1D, 2D, 3D, 4D
- Phlebotomy: Room 1
- CT-Scan: Room 2
- MRI: Room 4
- X-Ray: Room 5
- Remove Room 3 (console room)
"""

from backend.database import SessionLocal
from backend.models import Department, Room

db = SessionLocal()

try:
    print("=== REORGANIZING ROOMS ===\n")
    
    # First, let's ensure we have all required departments
    departments_needed = {
        'Dental': None,
        'Phlebotomy': None,
        'CT-Scan': None,
        'MRI': None,
        'X-Ray': None
    }
    
    # Check existing departments
    all_depts = {d.name: d for d in db.query(Department).all()}
    
    # Create missing departments
    for dept_name in departments_needed.keys():
        if dept_name in all_depts:
            departments_needed[dept_name] = all_depts[dept_name]
            print(f"✓ Department '{dept_name}' exists (ID: {all_depts[dept_name].id})")
        else:
            new_dept = Department(name=dept_name)
            db.add(new_dept)
            db.flush()
            departments_needed[dept_name] = new_dept
            print(f"+ Created department '{dept_name}' (ID: {new_dept.id})")
    
    db.commit()
    
    # Now delete ALL existing rooms to start fresh
    print("\n=== CLEARING OLD ROOMS ===")
    deleted_count = db.query(Room).delete()
    db.commit()
    print(f"Deleted {deleted_count} old rooms")
    
    # Create new rooms according to specification
    print("\n=== CREATING NEW ROOMS ===")
    
    new_rooms = [
        # Dental rooms (1D to 4D)
        {'name': '1D', 'department': departments_needed['Dental']},
        {'name': '2D', 'department': departments_needed['Dental']},
        {'name': '3D', 'department': departments_needed['Dental']},
        {'name': '4D', 'department': departments_needed['Dental']},
        
        # Special procedure rooms
        {'name': '1', 'department': departments_needed['Phlebotomy']},
        {'name': '2', 'department': departments_needed['CT-Scan']},
        # Room 3 is skipped (console room)
        {'name': '4', 'department': departments_needed['MRI']},
        {'name': '5', 'department': departments_needed['X-Ray']},
    ]
    
    for room_data in new_rooms:
        new_room = Room(
            name=room_data['name'],
            department_id=room_data['department'].id
        )
        db.add(new_room)
        print(f"+ Created Room {room_data['name']} → {room_data['department'].name}")
    
    db.commit()
    
    print("\n=== FINAL ROOM LIST ===")
    rooms = db.query(Room).order_by(Room.name).all()
    for r in rooms:
        dept = db.query(Department).filter_by(id=r.department_id).first()
        print(f"Room {r.name:3s} → {dept.name if dept else 'N/A'}")
    
    print(f"\n✅ Successfully reorganized {len(rooms)} rooms")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()
