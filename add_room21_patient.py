from backend.database import SessionLocal
from backend import models
from datetime import datetime

db = SessionLocal()

def create_patient_room21():
    # Clear existing queue for Room 21
    db.query(models.Queue).filter(models.Queue.target_room == "21").delete()
    db.commit()

    # Create proper test patient
    patient = models.Patient(
        mrn="TEST-R21",
        first_name="Test",
        last_name="PatientRoom21",
        date_of_birth=datetime(1990, 1, 1),
        gender="Male",
        phone_number="555-0021"
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Add to queue
    queue_item = models.Queue(
        token_number="R21-01",
        patient_id=patient.id,
        patient_name="Test Patient Room 21",
        priority_id=3, # Standard
        status="waiting",
        target_room="21",
        target_dept="General Practitioner",
        visit_type="New Patient",
        created_at=datetime.utcnow()
    )
    db.add(queue_item)
    db.commit()
    print("Added Test Patient to Room 21")

create_patient_room21()
db.close()
