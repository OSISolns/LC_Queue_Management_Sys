"""
Clean verification of current room setup
"""
from backend.database import SessionLocal
from backend.models import Department, Room

db = SessionLocal()

rooms = db.query(Room).order_by(Room.name).all()
dept_map = {d.id: d.name for d in db.query(Department).all()}

print(f"Total Rooms: {len(rooms)}")
print("-" * 40)
print(f"{'ROOM':<10} | {'DEPARTMENT'}")
print("-" * 40)

# Sort rooms naturally (1, 2, 10 instead of 1, 10, 2)
def natural_key(room):
    import re
    parts = re.split(r'(\d+)', room.name)
    return [int(p) if p.isdigit() else p for p in parts]

sorted_rooms = sorted(rooms, key=natural_key)

for r in sorted_rooms:
    d_name = dept_map.get(r.department_id, "Unknown")
    print(f"{r.name:<10} | {d_name}")

print("-" * 40)
db.close()
