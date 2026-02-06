from backend.database import SessionLocal
import backend.models as models

db = SessionLocal()
try:
    print("Checking Priority Levels:")
    priorities = db.query(models.PriorityLevel).all()
    for p in priorities:
        print(f"ID: {p.id}, Name: {p.name}, Weight: {p.weight}")
        
    print("\nChecking Queue Count:")
    count = db.query(models.Queue).count()
    print(f"Total in Queue: {count}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
