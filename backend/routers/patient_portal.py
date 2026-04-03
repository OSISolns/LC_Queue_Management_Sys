from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas, database
from datetime import datetime

router = APIRouter(
    prefix="/portal",
    tags=["patient-portal"]
)

from ..dependencies import get_db

@router.get("/doctors", response_model=List[schemas.PublicDoctorResponse])
def get_public_doctors(db: Session = Depends(get_db)):
    # Get doctors (role_id=2 or role.category='Doctor')
    doctors = db.query(models.User).join(models.Role).filter(
        (models.User.role_id == 2) | (models.Role.category == "Doctor")
    ).filter(models.User.is_active == True).all()

    result = []
    excluded_depts = {
        "administration", "physiotherapy", "tabara", 
        "laboratory", "phlebotomy", "nursing", 
        "customer care", "operations"
    }
    for doc in doctors:
        dept_name = doc.department.name if doc.department else "General Medicine"
        if dept_name.lower() in excluded_depts:
            continue
            
        # Calculate average rating and review count
        stats = db.query(
            func.avg(models.DoctorReview.rating).label("avg_rating"),
            func.count(models.DoctorReview.id).label("review_count")
        ).filter(models.DoctorReview.doctor_id == doc.id).first()

        result.append(schemas.PublicDoctorResponse(
            id=doc.id,
            full_name=doc.full_name or doc.username,
            salutation=doc.salutation,
            department_name=doc.department.name if doc.department else "General Medicine",
            room_number=doc.room_number,
            email=doc.email,
            phone_number=doc.phone_number,
            is_available=doc.is_available,
            average_rating=float(stats.avg_rating or 0),
            review_count=int(stats.review_count or 0)
        ))
    
    return result

@router.get("/doctors/{doctor_id}/reviews", response_model=List[schemas.DoctorReviewResponse])
def get_doctor_reviews(doctor_id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.DoctorReview).filter(models.DoctorReview.doctor_id == doctor_id).order_by(models.DoctorReview.created_at.desc()).all()
    
    # Enrich with patient names
    result = []
    for r in reviews:
        patient = db.query(models.Patient).filter(models.Patient.id == r.patient_id).first()
        result.append(schemas.DoctorReviewResponse(
            id=r.id,
            patient_id=r.patient_id,
            doctor_id=r.doctor_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
            patient_name=f"{patient.first_name} {patient.last_name[0]}." if patient else "Anonymous"
        ))
    return result

@router.post("/reviews", response_model=schemas.DoctorReviewResponse)
def leave_review(review: schemas.DoctorReviewCreate, db: Session = Depends(get_db)):
    # Check if patient exists
    patient = db.query(models.Patient).filter(models.Patient.id == review.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if doctor exists and is a doctor
    doctor = db.query(models.User).filter(models.User.id == review.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    new_review = models.DoctorReview(
        patient_id=review.patient_id,
        doctor_id=review.doctor_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    return schemas.DoctorReviewResponse(
        id=new_review.id,
        patient_id=new_review.patient_id,
        doctor_id=new_review.doctor_id,
        rating=new_review.rating,
        comment=new_review.comment,
        created_at=new_review.created_at,
        patient_name=f"{patient.first_name} {patient.last_name}"
    )

@router.post("/appointments", response_model=schemas.AppointmentResponse)
def book_appointment(appointment: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    # Check patient
    patient = db.query(models.Patient).filter(models.Patient.id == appointment.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Check doctor
    doctor = db.query(models.User).filter(models.User.id == appointment.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    new_app = models.Appointment(
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        appointment_date=appointment.appointment_date,
        reason=appointment.reason,
        status="scheduled"
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    return schemas.AppointmentResponse(
        id=new_app.id,
        patient_id=new_app.patient_id,
        doctor_id=new_app.doctor_id,
        appointment_date=new_app.appointment_date,
        reason=new_app.reason,
        status=new_app.status,
        created_at=new_app.created_at,
        updated_at=new_app.updated_at,
        doctor_name=f"{doctor.salutation or ''} {doctor.full_name or doctor.username}".strip(),
        patient_name=f"{patient.first_name} {patient.last_name}"
    )

@router.get("/patients/find", response_model=schemas.PatientResponse)
def find_patient(identifier: str, db: Session = Depends(get_db)):
    """Find patient by phone or MRN"""
    patient = db.query(models.Patient).filter(
        (models.Patient.phone_number == identifier) | 
        (models.Patient.mrn == identifier)
    ).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return patient

@router.post("/patients/register", response_model=schemas.PatientResponse)
def register_portal_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    """Register a new patient from the portal"""
    # Check if already exists
    exists = db.query(models.Patient).filter(
        (models.Patient.phone_number == patient.phone_number) & (models.Patient.phone_number != None)
    ).first()
    if exists:
         return exists

    # Generate MRN
    count = db.query(models.Patient).count() + 1
    mrn = f"MRN-P-{count:05d}"
    
    new_patient = models.Patient(
        mrn=mrn,
        first_name=patient.first_name,
        last_name=patient.last_name,
        phone_number=patient.phone_number,
        email=patient.email,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.get("/patients/{patient_id}/appointments", response_model=List[schemas.AppointmentResponse])
def get_patient_appointments(patient_id: int, db: Session = Depends(get_db)):
    """Get all appointments for a patient"""
    # Verify patient exists
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
         raise HTTPException(status_code=404, detail="Patient not found")

    appointments = db.query(models.Appointment).filter(models.Appointment.patient_id == patient_id).order_by(models.Appointment.appointment_date.desc()).all()
    result = []
    patient_name = f"{patient.first_name} {patient.last_name}"
    
    for app in appointments:
        doctor = db.query(models.User).filter(models.User.id == app.doctor_id).first()
        doctor_name = f"{doctor.salutation or ''} {doctor.full_name or doctor.username}".strip() if doctor else "Unknown"
        result.append(schemas.AppointmentResponse(
            id=app.id,
            patient_id=app.patient_id,
            doctor_id=app.doctor_id,
            appointment_date=app.appointment_date,
            reason=app.reason,
            status=app.status,
            created_at=app.created_at,
            updated_at=app.updated_at,
            doctor_name=doctor_name,
            patient_name=patient_name
        ))
    return result

@router.get("/patients/{patient_id}/visits", response_model=List[schemas.VisitHistoryResponse])
def get_patient_visits(patient_id: int, db: Session = Depends(get_db)):
    """Get all past visits for a patient"""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
         raise HTTPException(status_code=404, detail="Patient not found")

    visits = db.query(models.VisitHistory).filter(models.VisitHistory.patient_id == patient_id).order_by(models.VisitHistory.visit_date.desc()).all()
    result = []
    
    for v in visits:
        doctor_name = "Unknown"
        if v.doctor_id:
            doctor = db.query(models.User).filter(models.User.id == v.doctor_id).first()
            if doctor:
                doctor_name = f"{doctor.salutation or ''} {doctor.full_name or doctor.username}".strip()
                
        result.append(schemas.VisitHistoryResponse(
            id=v.id,
            patient_id=v.patient_id,
            queue_id=v.queue_id,
            visit_date=v.visit_date,
            department=v.department,
            room=v.room,
            doctor_id=v.doctor_id,
            visit_type=v.visit_type,
            chief_complaint=v.chief_complaint,
            diagnosis=v.diagnosis,
            treatment=v.treatment,
            prescription=v.prescription,
            notes=v.notes,
            status=v.status,
            created_at=v.created_at,
            updated_at=v.updated_at,
            doctor_name=doctor_name
        ))
    return result
