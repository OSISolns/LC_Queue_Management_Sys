"""
Complete Room Organization Script
Based on department-room assignments and restrictions
"""

from backend.database import SessionLocal
from backend.models import Department, Room

db = SessionLocal()

try:
    print("=== STEP 1: CREATING/VERIFYING DEPARTMENTS ===\n")
    
    # Define all departments we need
    required_departments = [
        'Dental',
        'Phlebotomy',
        'CT-Scan',
        'MRI',
        'X-Ray',
        'Ultrasound',
        'Neurology',
        'Cardiology',
        'Gynecology',
        'ENT',
        'General Practitioner',
        'Internal Medicine',
        'Family Medicine',
        'Urology',
        'Orthopedics',
        'Neuro-Surgeon',
        'Dermatology'
    ]
    
    # Get or create departments
    dept_map = {}
    existing_depts = {d.name: d for d in db.query(Department).all()}
    
    for dept_name in required_departments:
        if dept_name in existing_depts:
            dept_map[dept_name] = existing_depts[dept_name]
            print(f"✓ {dept_name} (ID: {existing_depts[dept_name].id})")
        else:
            new_dept = Department(name=dept_name)
            db.add(new_dept)
            db.flush()
            dept_map[dept_name] = new_dept
            print(f"+ {dept_name} (ID: {new_dept.id})")
    
    db.commit()
    
    print("\n=== STEP 2: CLEARING OLD ROOMS ===")
    deleted_count = db.query(Room).delete()
    db.commit()
    print(f"Deleted {deleted_count} old rooms\n")
    
    print("=== STEP 3: CREATING NEW ROOM ASSIGNMENTS ===\n")
    
    # Define room assignments
    # Format: (room_name, primary_department, description)
    room_assignments = [
        # Special Procedure/Fixed Rooms
        ('1', 'Phlebotomy', 'Phlebotomy only'),
        ('2', 'CT-Scan', 'CT-Scan only'),
        # Room 3 is console room - skipped
        ('4', 'MRI', 'MRI only'),
        ('5', 'X-Ray', 'X-Ray only'),
        ('7', 'Ultrasound', 'Ultrasound only'),
        ('9', 'Neurology', 'Neurology (95% of times)'),
        ('10', 'Cardiology', 'Cardiology (99% of times)'),
        
        # Dental Rooms
        ('1D', 'Dental', 'Dental'),
        ('2D', 'Dental', 'Dental'),
        ('3D', 'Dental', 'Dental'),
        ('4D', 'Dental', 'Dental'),
        
        # Gynecology Rooms (15-22, 23)
        ('15', 'Gynecology', 'Gynecology only'),
        ('16', 'Gynecology', 'Gynecology only'),
        ('17', 'Gynecology', 'Gynecology only'),
        ('18', 'Gynecology', 'Gynecology only'),
        ('19', 'Gynecology', 'Gynecology only'),
        ('20', 'Gynecology', 'Gynecology only'),
        ('21', 'ENT', 'ENT only (within Gyn range)'),
        ('22', 'Gynecology', 'Gynecology only'),
        ('23', 'Gynecology', 'Gynecology only'),
        
        # General/Flexible Rooms
        # Available rooms: NOT (1,2,3,4,5,6,7,8,11,12,17,18,20,1D,2D,3D,4D)
        # We'll create general rooms: 13, 14, 24-30
        ('13', 'General Practitioner', 'General use'),
        ('14', 'General Practitioner', 'General use'),
        ('24', 'General Practitioner', 'General use'),
        ('25', 'General Practitioner', 'General use'),
        ('26', 'General Practitioner', 'General use'),
        ('27', 'General Practitioner', 'General use'),
        ('28', 'General Practitioner', 'General use'),
        ('29', 'General Practitioner', 'General use'),
        ('30', 'General Practitioner', 'General use'),
    ]
    
    created_rooms = []
    for room_name, dept_name, description in room_assignments:
        new_room = Room(
            name=room_name,
            department_id=dept_map[dept_name].id
        )
        db.add(new_room)
        created_rooms.append((room_name, dept_name, description))
        print(f"+ Room {room_name:3s} → {dept_name:25s} ({description})")
    
    db.commit()
    
    print(f"\n=== SUMMARY ===")
    print(f"✅ Created {len(created_rooms)} rooms")
    print(f"✅ Configured {len(dept_map)} departments")
    
    print("\n=== ROOM USAGE GUIDE ===")
    print("\n📍 FIXED ASSIGNMENT ROOMS (Dedicated Use):")
    print("   Room 1     → Phlebotomy")
    print("   Room 2     → CT-Scan")
    print("   Room 4     → MRI")
    print("   Room 5     → X-Ray")
    print("   Room 7     → Ultrasound")
    print("   Room 9     → Neurology (95% of times)")
    print("   Room 10    → Cardiology (99% of times)")
    print("   Rooms 1D-4D → Dental")
    print("   Rooms 15-23 → Gynecology (except Room 21)")
    print("   Room 21    → ENT only")
    
    print("\n🔄 FLEXIBLE/GENERAL ROOMS (Rooms 13, 14, 24-30):")
    print("   Available for:")
    print("   - General Practitioner")
    print("   - Internal Medicine")
    print("   - Family Medicine")
    print("   - Urology")
    print("   - Orthopedics")
    print("   - Neuro-Surgeon")
    print("   - Dermatology")
    
    print("\n❌ EXCLUDED ROOMS (Not in system):")
    print("   Rooms 3, 6, 8, 11, 12, 17, 18, 20")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()
