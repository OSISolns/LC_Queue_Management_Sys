"""
nursing_router.py
-----------------
Nursing Portal API endpoints:
  patient vitals/triage, observation notes, medication administration,
  clinical sheet, consumables, patient charges, notification system,
  nurse logs, room assignment, profile picture upload.
"""
__author__ = "Valery Structure"
import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc
from starlette.requests import Request

from .. import models, schemas
from ..dependencies import (
    get_db, get_current_user_optional, get_current_active_user,
)
from ..socket_instance import sio

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Nursing"])


# ─── Observation Notes ────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/observation-notes", response_model=schemas.ObservationNoteResponse)
async def create_observation_note(
    patient_id: int,
    note: schemas.ObservationNoteCreate,
    db: Session = Depends(get_db)
):
    if not db.query(models.Patient).filter(models.Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    db_note = models.ObservationNote(
        patient_id=patient_id, nurse_id=note.nurse_id, content=note.content
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.get("/patients/{patient_id}/observation-notes", response_model=List[schemas.ObservationNoteResponse])
async def list_observation_notes(patient_id: int, db: Session = Depends(get_db)):
    return db.query(models.ObservationNote).filter(
        models.ObservationNote.patient_id == patient_id
    ).order_by(models.ObservationNote.created_at.desc()).all()


# ─── Medication Administration ────────────────────────────────────────────────

@router.post("/patients/{patient_id}/medications", response_model=schemas.MedicationAdministrationResponse)
async def administer_medication(
    patient_id: int,
    admin: schemas.MedicationAdministrationCreate,
    db: Session = Depends(get_db)
):
    if not db.query(models.Patient).filter(models.Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    db_admin = models.MedicationAdministration(
        patient_id=patient_id,
        nurse_id=admin.nurse_id,
        medication_name=admin.medication_name,
        dosage=admin.dosage,
        route=admin.route,
        notes=admin.notes
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin


@router.get("/patients/{patient_id}/medications", response_model=List[schemas.MedicationAdministrationResponse])
async def list_medications(patient_id: int, db: Session = Depends(get_db)):
    return db.query(models.MedicationAdministration).filter(
        models.MedicationAdministration.patient_id == patient_id
    ).order_by(models.MedicationAdministration.administered_at.desc()).all()


# ─── Vitals / Triage ─────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/vitals", response_model=schemas.PatientVitalsResponse)
async def create_patient_vitals(
    patient_id: int,
    vitals: schemas.PatientVitalsCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Record new vitals for a patient (Triage)."""
    if not db.query(models.Patient).filter(models.Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    n_id = current_user.id if current_user else vitals.nurse_id
    db_vitals = models.PatientVitals(**vitals.dict(exclude={"nurse_id"}), nurse_id=n_id)
    db.add(db_vitals)
    db.commit()
    db.refresh(db_vitals)
    return db_vitals


@router.get("/patients/{patient_id}/vitals", response_model=List[schemas.PatientVitalsResponse])
async def list_patient_vitals(patient_id: int, db: Session = Depends(get_db)):
    """List historical vitals for a patient."""
    return db.query(models.PatientVitals).filter(
        models.PatientVitals.patient_id == patient_id
    ).order_by(models.PatientVitals.recorded_at.desc()).all()


# ─── Consumables & Charges ────────────────────────────────────────────────────

@router.get("/consumables", response_model=List[schemas.ConsumableResponse])
def get_consumables(db: Session = Depends(get_db)):
    """Fetch the master tariff for consumables and medications used by nurses."""
    return db.query(models.Consumable).filter(models.Consumable.is_active == True).all()


@router.post("/patients/{patient_id}/charges", response_model=schemas.PatientChargeResponse)
def add_patient_charge(
    patient_id: int,
    charge: schemas.PatientChargeCreate,
    db: Session = Depends(get_db)
):
    """Charge a patient for used consumables or medications during triage/observation."""
    consumable = db.query(models.Consumable).filter(models.Consumable.id == charge.consumable_id).first()
    if not consumable:
        raise HTTPException(status_code=404, detail="Item not found in tariff")
    nurse = db.query(models.User).filter(models.User.id == charge.nurse_id).first()
    db_charge = models.PatientCharge(
        patient_id=patient_id,
        queue_id=charge.queue_id,
        consumable_id=charge.consumable_id,
        quantity=charge.quantity,
        price_at_time=consumable.price,
        total_amount=consumable.price * charge.quantity,
        nurse_id=charge.nurse_id
    )
    db.add(db_charge)
    db.commit()
    db.refresh(db_charge)
    db_charge.consumable_name = consumable.name
    db_charge.nurse_name = nurse.full_name if nurse else "Unknown"
    return db_charge


@router.get("/patients/{patient_id}/charges", response_model=List[schemas.PatientChargeResponse])
def get_patient_charges(patient_id: int, db: Session = Depends(get_db)):
    """Retrieve billing items charged to a patient."""
    charges = db.query(models.PatientCharge).filter(models.PatientCharge.patient_id == patient_id).all()
    for c in charges:
        consumable = db.query(models.Consumable).filter(models.Consumable.id == c.consumable_id).first()
        nurse = db.query(models.User).filter(models.User.id == c.nurse_id).first()
        c.consumable_name = consumable.name if consumable else "Deleted Item"
        c.nurse_name = nurse.full_name if nurse else "System"
    return charges


# ─── Nurse Logs ───────────────────────────────────────────────────────────────

@router.get("/nurses/{nurse_id}/logs")
async def get_nurse_logs(nurse_id: int, db: Session = Depends(get_db)):
    """Fetch all vitals, notes, and medications administered by a specific nurse."""
    vitals = db.query(models.PatientVitals).filter(
        models.PatientVitals.nurse_id == nurse_id
    ).order_by(models.PatientVitals.recorded_at.desc()).all()

    notes = db.query(models.ObservationNote).filter(
        models.ObservationNote.nurse_id == nurse_id
    ).order_by(models.ObservationNote.created_at.desc()).all()

    meds = db.query(models.MedicationAdministration).filter(
        models.MedicationAdministration.nurse_id == nurse_id
    ).order_by(models.MedicationAdministration.administered_at.desc()).all()

    logs = []
    for v in vitals:
        logs.append({
            "type": "vital",
            "patient_name": f"{v.patient.first_name} {v.patient.last_name}",
            "mrn": v.patient.mrn,
            "timestamp": v.recorded_at,
            "data": schemas.PatientVitalsResponse.from_orm(v).dict()
        })
    for n in notes:
        logs.append({
            "type": "note",
            "patient_name": f"{n.patient.first_name} {n.patient.last_name}",
            "mrn": n.patient.mrn,
            "timestamp": n.created_at,
            "data": schemas.ObservationNoteResponse.from_orm(n).dict()
        })
    for m in meds:
        logs.append({
            "type": "med",
            "patient_name": f"{m.patient.first_name} {m.patient.last_name}",
            "mrn": m.patient.mrn,
            "timestamp": m.administered_at,
            "data": schemas.MedicationAdministrationResponse.from_orm(m).dict()
        })

    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return logs


# ─── Room Assignment ──────────────────────────────────────────────────────────

@router.put("/users/{user_id}/room", status_code=200)
async def update_doctor_room(
    user_id: int,
    room_data: schemas.UserRoomUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Update a doctor's room assignment.
    - If the doctor has NO room set: any authenticated user (e.g. Customer Care) may set it.
    - If the doctor ALREADY has a room set: only an Admin can override it.
    - Passing room_number=null/empty clears the lock (Admin only).
    """
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    already_has_room = bool(target_user.room_number)
    caller_is_admin = (
        current_user is not None
        and hasattr(current_user, 'role')
        and current_user.role is not None
        and current_user.role.category == "Admin"
    )

    if already_has_room and not caller_is_admin:
        raise HTTPException(
            status_code=403,
            detail=f"Room {target_user.room_number} is already locked for this doctor. Only an Admin can override it."
        )

    target_user.room_number = room_data.room_number or None
    db.commit()
    db.refresh(target_user)
    return {"message": "Room updated", "room_number": target_user.room_number}


@router.delete("/users/{user_id}/room", status_code=200)
async def clear_doctor_room(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional)
):
    """Admin-only: clear a doctor's room lock (end of shift)."""
    caller_is_admin = (
        current_user is not None
        and hasattr(current_user, 'role')
        and current_user.role is not None
        and current_user.role.category == "Admin"
    )
    if not caller_is_admin:
        raise HTTPException(status_code=403, detail="Only an Admin can clear a doctor's room lock.")

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.room_number = None
    db.commit()
    return {"message": "Room lock cleared", "doctor": target_user.full_name}


# ─── Profile Picture ──────────────────────────────────────────────────────────

@router.post("/users/{user_id}/profile-picture")
async def upload_user_picture(
    user_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Allows an administrator to change a staff member's profile picture."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    upload_dir = "backend/static/uploads/profiles"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    filename = f"user_{user_id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Build absolute URL dynamically — prefer BASE_URL env var, fall back to request host
    base_url = os.getenv("BASE_URL") or f"{request.url.scheme}://{request.url.netloc}"
    profile_url = f"{base_url}/static/uploads/profiles/{filename}"
    user.profile_picture = profile_url
    db.commit()
    db.refresh(user)
    return {"message": "Profile picture updated successfully", "profile_picture": profile_url}


# ─── Notification System ──────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[schemas.NotificationResponse])
async def get_notifications(
    limit: int = 100,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve system notifications, filterable by type."""
    query = db.query(models.ClinicNotification)
    if type:
        query = query.filter(models.ClinicNotification.type == type)
    return query.order_by(desc(models.ClinicNotification.created_at)).limit(limit).all()


@router.post("/notifications", response_model=schemas.NotificationResponse)
async def create_notification(
    notif: schemas.NotificationCreate,
    db: Session = Depends(get_db)
):
    """Log a new notification (emergency, death, legal, etc.) and broadcast via Socket.IO."""
    db_notif = models.ClinicNotification(**notif.dict())
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    await sio.emit("new_notification", {
        "id": db_notif.id,
        "title": db_notif.title,
        "message": db_notif.message,
        "type": db_notif.type,
        "priority": db_notif.priority
    })
    return db_notif


@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    """Mark a notification as read."""
    notif = db.query(models.ClinicNotification).filter(models.ClinicNotification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "success"}


# ─── Clinical Sheet ───────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/clinical-sheet", response_model=schemas.ClinicalSheetResponse)
async def upsert_clinical_sheet(
    patient_id: int,
    sheet: schemas.ClinicalSheetCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Save or update a clinical sheet for a patient visit."""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Sync patient identification fields from clinical sheet
    try:
        data_obj = json.loads(sheet.data)
        ident = data_obj.get("patient_identification", {})
        if ident:
            if ident.get("occupation"):
                patient.occupation = ident["occupation"]
            if ident.get("national_id"):
                patient.national_id = ident["national_id"]
            if ident.get("country"):
                patient.nationality = ident["country"]
            if ident.get("province"):
                patient.province = ident["province"]
            if ident.get("district"):
                patient.district = ident["district"]
            if ident.get("sector"):
                patient.sector = ident["sector"]
            if ident.get("next_of_kin_relationship"):
                patient.next_of_kin_relationship = ident["next_of_kin_relationship"]
            db.add(patient)
    except Exception:
        pass

    # Find existing sheet or create new
    existing = None
    if sheet.visit_id:
        existing = db.query(models.ClinicalSheet).filter(
            models.ClinicalSheet.visit_id == sheet.visit_id
        ).first()
    elif sheet.queue_id:
        existing = db.query(models.ClinicalSheet).filter(
            models.ClinicalSheet.queue_id == sheet.queue_id
        ).first()

    if not existing:
        today = datetime.utcnow().date()
        from sqlalchemy import func as sqlfunc
        existing = db.query(models.ClinicalSheet).filter(
            models.ClinicalSheet.patient_id == patient_id,
            sqlfunc.date(models.ClinicalSheet.created_at) == today
        ).order_by(models.ClinicalSheet.created_at.desc()).first()

    r_id = current_user.id if current_user else sheet.recorded_by_id

    if existing:
        existing.data = sheet.data
        existing.updated_at = datetime.utcnow()
        if r_id:
            existing.recorded_by_id = r_id
        if sheet.visit_id:
            existing.visit_id = sheet.visit_id
        if sheet.queue_id:
            existing.queue_id = sheet.queue_id
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        db_sheet = models.ClinicalSheet(
            patient_id=patient_id,
            data=sheet.data,
            visit_id=sheet.visit_id,
            queue_id=sheet.queue_id,
            recorded_by_id=r_id
        )
        db.add(db_sheet)
        db.commit()
        db.refresh(db_sheet)
        return db_sheet


@router.get("/patients/{patient_id}/clinical-sheet", response_model=Optional[schemas.ClinicalSheetResponse])
async def get_clinical_sheet(
    patient_id: int,
    visit_id: Optional[int] = None,
    queue_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Retrieve a clinical sheet by visit, queue, or the latest for the patient."""
    query = db.query(models.ClinicalSheet).filter(models.ClinicalSheet.patient_id == patient_id)
    if visit_id:
        query = query.filter(models.ClinicalSheet.visit_id == visit_id)
    elif queue_id:
        query = query.filter(models.ClinicalSheet.queue_id == queue_id)
    return query.order_by(models.ClinicalSheet.created_at.desc()).first()
