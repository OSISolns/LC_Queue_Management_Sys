import os
from datetime import datetime, timedelta
import random

from backend import database, models

def seed_medical_history():
    db = database.SessionLocal()
    
    patient = db.query(models.Patient).filter(models.Patient.mrn == "MRN000012").first()
    
    if not patient:
        print("Patient MRN000012 not found. Let's create the patient first.")
        new_patient = models.Patient(
            mrn="MRN000012",
            first_name="Geofrey",
            last_name="Test",
            phone_number="+250788123456",
            date_of_birth=datetime(1985, 5, 20).date(),
            gender="Male",
        )
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)
        patient = new_patient
    
    print(f"Generating 5 years of history for {patient.first_name} {patient.last_name} (ID: {patient.id})")
    
    # 5 years, approximately 20 visits
    doctor = db.query(models.User).join(models.Role).filter(models.Role.category == "Doctor").first()
    doctor_id = doctor.id if doctor else None
    
    visit_data = [
        {"type": "General Checkup", "comp": "Routine annual examination.", "diag": "Healthy adult, mild elevated blood pressure.", "treat": "Advised on diet and exercise.", "presc": "None"},
        {"type": "Illness", "comp": "Severe headache and fever for 3 days.", "diag": "Viral infection (suspected flu).", "treat": "Rest, hydration.", "presc": "Paracetamol 500mg, Ibuprofen 400mg"},
        {"type": "Injury", "comp": "Twisted ankle while jogging.", "diag": "Grade 1 ankle sprain.", "treat": "RICE protocol, compression bandage applied.", "presc": "Painkillers for 3 days PRN"},
        {"type": "Follow-up", "comp": "Review of ankle sprain recovery.", "diag": "Resolving sprain.", "treat": "Cleared for light jogging.", "presc": "None"},
        {"type": "Digestive", "comp": "Stomach pain and nausea after meals.", "diag": "Gastritis.", "treat": "Dietary modification, avoid spicy foods.", "presc": "Omeprazole 20mg x 14 days"},
    ]
    
    departments = ["Internal Medicine", "General Medicine", "Orthopedics", "Cardiology"]
    
    base_date = datetime.utcnow() - timedelta(days=5 * 365)
    
    visits = []
    
    for i in range(25):
        days_to_add = random.randint(10, 365 * 5 - 10)
        v_date = base_date + timedelta(days=days_to_add)
        
        template = random.choice(visit_data)
        
        visit = models.VisitHistory(
            patient_id=patient.id,
            visit_date=v_date,
            department=random.choice(departments),
            room=f"Room {random.randint(101, 120)}",
            doctor_id=doctor_id,
            visit_type="Follow-up" if random.random() > 0.7 else "New Patient",
            chief_complaint=template["comp"],
            diagnosis=template["diag"],
            treatment=template["treat"],
            prescription=template["presc"],
            doctor_notes=f"Patient responded well to consultation. Next review as needed.",
            status="completed",
            duration_seconds=random.randint(600, 3600),
            created_at=v_date,
            updated_at=v_date
        )
        visits.append(visit)
    
    # Sort by date so they appear sequentially in the DB (optional)
    visits.sort(key=lambda x: x.visit_date)
    
    # Insert bulk
    db.add_all(visits)
    db.commit()
    
    print(f"Successfully inserted {len(visits)} historical records for MRN000012.")
    db.close()

if __name__ == "__main__":
    seed_medical_history()
