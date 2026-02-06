from backend.database import SessionLocal
from backend import models
from datetime import datetime, timedelta

db = SessionLocal()

def create_patient(token, name, priority_id, room, visit_type="New Patient"):
    # Create patient entry
    patient = models.Patient(
        mrn=f"TEST-{token}",
        first_name=name.split()[0],
        last_name=name.split()[1] if len(name.split()) > 1 else "Test",
        date_of_birth=datetime(1990, 1, 1),
        gender="Male",
        phone_number="555-0123"
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Create queue entry
    queue_item = models.Queue(
        token_number=token,
        patient_id=patient.id,
        patient_name=name,
        priority_id=priority_id,
        status="waiting",
        target_room=room,
        target_dept="Phlebotomy",
        visit_type=visit_type,
        created_at=datetime.utcnow()
    )
    db.add(queue_item)
    db.commit()
    print(f"Added {name} ({token}) - {visit_type} for Room {room}")

# Clear existing queue for Room 1 to be clean
db.query(models.Queue).filter(models.Queue.target_room == "1").delete()
db.commit()

# 1. Standard Patient (Next in Line) - Should be callable
create_patient("A001", "Adam Standard", 3, "1", "New Patient")

# 2. Standard Patient (Second) - Should NOT be callable
create_patient("A002", "Bob Second", 3, "1", "New Patient")

# 3. Review Patient (Third) - Should be callable despite being last
create_patient("A003", "Charlie Review", 3, "1", "Review")

db.close()
