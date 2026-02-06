"""
Verify room reorganization
"""
from backend.database import SessionLocal
from backend.models import Department, Room

db = SessionLocal()

print("=== CURRENT DEPARTMENTS ===")
depts = db.query(Department).order_by(Department.id).all()
dept_map = {}
for d in depts:
    dept_map[d.id] = d.name
    print(f"ID {d.id:2d}: {d.name}")

print("\n=== CURRENT ROOMS (Organized) ===")
rooms = db.query(Room).order_by(Room.name).all()

for r in rooms:
    dept_name = dept_map.get(r.department_id, "Unknown")
    print(f"Room {r.name:3s} → {dept_name}")

print(f"\n✅ Total: {len(rooms)} rooms across {len(depts)} departments")

db.close()
