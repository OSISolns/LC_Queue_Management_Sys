from backend.database import SessionLocal
import backend.models as models
import random
from datetime import datetime, timedelta

def seed_queue():
    db = SessionLocal()
    try:
        # Clear existing data
        print("Clearing existing queue and history...")
        try:
            db.query(models.VisitHistory).delete()
            db.query(models.Queue).delete()
            db.commit()
            print("Queue cleared.")
        except Exception as e:
            print(f"Error clearing queue: {e}")
            db.rollback()
            return

        print("Seeding 50 dummy patients...")
        
        # Get Priorities
        priorities = db.query(models.PriorityLevel).all()
        if not priorities:
            print("No priorities found! Run the main app first to seed priorities.")
            return

        # Map ID to Prefix (E, V, S)
        p_map = {p.id: p.name[0].upper() for p in priorities}
        
        # Local counters for token generation
        p_counts = {p.id: 0 for p in priorities}
        
        # Sample Locations
        depts = ["Family Medicine", "Gyn", "Dentistry", "Cardiology", "ENT", "Urology"]
        rooms = ["11", "12", "1", "2", "15", "22", "9", "10", "3"]
        
        new_patients = []
        
        for i in range(1, 51):
            # Random selection
            priority = random.choice(priorities)
            dept = random.choice(depts)
            room = random.choice(rooms)
            
            # Increment token counter
            p_counts[priority.id] += 1
            count = p_counts[priority.id]
            prefix = p_map[priority.id]
            token = f"{prefix}-{count:03d}"
            
            # Stagger created_at times so they don't all look identical
            created_time = datetime.utcnow() - timedelta(minutes=random.randint(0, 120))
            
            patient = models.Queue(
                token_number=token,
                patient_name=f"Patient {i}",
                priority_id=priority.id,
                target_dept=dept,
                target_room=room,
                status="waiting",
                visit_type="Consultation",
                created_at=created_time
            )
            new_patients.append(patient)
            
        db.add_all(new_patients)
        db.commit()
        
        print(f"Successfully seeded {len(new_patients)} patients.")
        print("Sample Tokens:")
        for p in new_patients[:5]:
            print(f" - {p.token_number} -> Room {p.target_room} ({p.priority.name})")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_queue()
