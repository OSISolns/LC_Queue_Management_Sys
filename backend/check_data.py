import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import models
from backend.database import SessionLocal

def check():
    db = SessionLocal()
    print("--- DEPARTMENTS ---")
    depts = db.query(models.Department).all()
    for d in depts:
        print(f"{d.id}: {d.name}")

    print("\n--- ROOMS ---")
    rooms = db.query(models.Room).all()
    for r in rooms:
        print(f"{r.name} -> {r.department.name} ({r.department_id})")
    db.close()

if __name__ == "__main__":
    check()
