"""
queue_router.py
---------------
All live queue management endpoints:
  register, call-next, call-specific, complete, no-show, recall,
  skip, undo, queue list, counters, recommend, notes, announce, sync-hims.
"""
__author__ = "Valery Structure"
import os
import uuid
import json
import logging
from datetime import datetime
from typing import List, Optional

import edge_tts
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..ai_client import ai_client
from ..dependencies import (
    get_db, get_current_user_optional, get_current_active_user,
)
from ..socket_instance import sio

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Queue"])


# ─── Internal helper ──────────────────────────────────────────────────────────

def _send_sms_notification(phone_number: str, token_number: str, room_number: str) -> bool:
    """Stub — SMS integration pending MTN Rwanda API."""
    if not phone_number:
        logger.warning("SMS sending skipped: No phone number provided")
        return False
    logger.info(f"[SMS] Would have sent token {token_number} to {phone_number} (not yet configured)")
    return False


class DoctorNotesRequest(BaseModel):
    notes: str


# ─── TTS Announce ─────────────────────────────────────────────────────────────

@router.get("/announce")
async def announce(
    token: str,
    room: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    if room and room.lower() not in ["null", "undefined", "none", ""]:
        text = f"Patient {token}, please proceed to room {room}"
    else:
        text = f"Patient {token}, please proceed to your designated room"

    voice = "en-US-JennyNeural"
    output_file = f"temp_{uuid.uuid4()}.mp3"

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

    background_tasks.add_task(os.remove, output_file)
    return FileResponse(output_file, media_type="audio/mpeg")


# ─── HIMS Sync ────────────────────────────────────────────────────────────────

@router.get("/sync-hims")
async def sync_hims_patients(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger manual sync from external Sukraa HIMS in the background"""
    from ..sync_sukraa import sync_patients
    background_tasks.add_task(sync_patients)
    return {"status": "success", "message": "Synchronization started in the background"}


# ─── Registration ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=schemas.QueueResponse)
async def register_patient(
    patient: schemas.QueueCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    # Handle patient record and phone number
    patient_db_id = patient.patient_id

    # Validation: Ensure patient is not already active in the queue
    if patient_db_id:
        active_entry = db.query(models.Queue).filter(
            models.Queue.patient_id == patient_db_id,
            models.Queue.status.in_(["waiting", "calling", "in-consultation"]),
            models.Queue.completed_at == None
        ).first()
        if active_entry:
            raise HTTPException(
                status_code=400,
                detail=f"Patient is already active in {active_entry.target_dept or 'the queue'} with Token: {active_entry.token_number}."
            )

    # Pediatrics Age Restriction (<= 15)
    is_pediatrics = False
    if patient.target_dept and "Pediatrics" in patient.target_dept:
        is_pediatrics = True
    if patient.department_id == 17:
        is_pediatrics = True

    if is_pediatrics and patient_db_id:
        existing_p = db.query(models.Patient).filter(models.Patient.id == patient_db_id).first()
        if existing_p and existing_p.date_of_birth:
            today = datetime.now().date()
            age = today.year - existing_p.date_of_birth.year - (
                (today.month, today.day) < (existing_p.date_of_birth.month, existing_p.date_of_birth.day)
            )
            if age > 15:
                raise HTTPException(
                    status_code=400,
                    detail=f"Pediatrics Restriction: Patient is {age} years old. Only children aged 15 and below are allowed in Pediatrics."
                )

    priority = db.query(models.PriorityLevel).filter(models.PriorityLevel.id == patient.priority_id).first()
    if not priority:
        raise HTTPException(status_code=400, detail="Invalid Priority ID")

    # Validation: Ensure doctor is available today
    if patient.doctor_id:
        current_day = datetime.now().strftime("%A")
        roster_entry = db.query(models.DoctorRoster).filter(
            models.DoctorRoster.doctor_id == patient.doctor_id,
            models.DoctorRoster.day_of_week == current_day
        ).first()
        if roster_entry and roster_entry.status in ["not_available", "on_call"]:
            formatted_status = roster_entry.status.replace('_', ' ')
            raise HTTPException(
                status_code=400,
                detail=f"Cannot assign patient: Doctor is currently {formatted_status} today."
            )

    # Update existing patient if ID provided
    if patient_db_id:
        existing_patient = db.query(models.Patient).filter(models.Patient.id == patient_db_id).first()
        if existing_patient:
            if patient.phone_number:
                existing_patient.phone_number = patient.phone_number
            if patient.gender and not existing_patient.gender:
                existing_patient.gender = patient.gender
            db.commit()

    # Create new patient record if no ID but phone given
    if not patient_db_id and patient.phone_number:
        name_parts = patient.patient_name.strip().split(maxsplit=1)
        first_name = name_parts[0] if len(name_parts) > 0 else patient.patient_name
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        mrn_count = db.query(models.Patient).count() + 1
        new_mrn = f"PID{mrn_count:06d}"
        new_patient_record = models.Patient(
            mrn=new_mrn, first_name=first_name, last_name=last_name,
            phone_number=patient.phone_number, gender=patient.gender
        )
        db.add(new_patient_record)
        db.commit()
        db.refresh(new_patient_record)
        patient_db_id = new_patient_record.id

    prefix = priority.name[0].upper()
    count = db.query(models.Queue).filter(models.Queue.priority_id == patient.priority_id).count() + 1
    token = f"{prefix}-{count:03d}"

    new_entry = models.Queue(
        token_number=token,
        patient_name=patient.patient_name,
        patient_id=patient_db_id,
        priority_id=patient.priority_id,
        target_dept=patient.target_dept,
        target_room=patient.target_room,
        doctor_id=patient.doctor_id,
        department_id=patient.department_id,
        created_by_id=current_user.id if current_user else None,
        visit_type=patient.visit_type,
        status="waiting"
    )

    # AI: Auto-Select Doctor/Room
    if not new_entry.doctor_id and (new_entry.visit_type in ["consultation", "review", "Consultation", "Review"]):
        try:
            patient_age = None
            if patient_db_id:
                existing_p = db.query(models.Patient).filter(models.Patient.id == patient_db_id).first()
                if existing_p and existing_p.date_of_birth:
                    today = datetime.now().date()
                    patient_age = today.year - existing_p.date_of_birth.year - (
                        (today.month, today.day) < (existing_p.date_of_birth.month, existing_p.date_of_birth.day)
                    )
            recommendation = await ai_client.get_counter_recommendation(
                service_type=new_entry.visit_type,
                priority_id=new_entry.priority_id,
                age=patient_age
            )
            if recommendation and "recommended_doctor_id" in recommendation:
                new_entry.doctor_id = recommendation["recommended_doctor_id"]
                if not new_entry.target_room:
                    new_entry.target_room = recommendation["recommended_counter_id"]
                logger.info(f"AI Auto-selected Doctor ID {new_entry.doctor_id} for Token {token}")
        except Exception as e:
            logger.error(f"AI Auto-selection failed: {e}")

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    # AI: Predict Wait Time
    try:
        now_dt = datetime.utcnow()
        prediction = await ai_client.get_wait_time(
            hour=now_dt.hour,
            day_of_week=now_dt.weekday(),
            service_type=patient.visit_type or "default",
            priority=patient.priority_id
        )
        from sqlalchemy import text
        db.execute(text("""
            INSERT INTO ticket_predictions (ticket_id, model_type, model_version, predicted_value_seconds, predicted_value_str, explanation_json, created_at)
            VALUES (:tid, 'wait_time', :mver, :psec, :pstr, :expl, :cat)
        """), {
            "tid": new_entry.id,
            "mver": prediction.get('model_version', 'unknown'),
            "psec": prediction.get('predicted_wait_seconds', 0),
            "pstr": f"{prediction.get('predicted_wait_minutes', 0.0):.1f} mins",
            "expl": json.dumps(prediction),
            "cat": now_dt
        })
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record AI wait time prediction: {e}")

    if patient.phone_number:
        room_info = patient.target_room or patient.target_dept or "TBD"
        _send_sms_notification(patient.phone_number, token, room_info)

    await sio.emit('queue_update', {'message': 'New patient registered'})
    return new_entry


# ─── Priority Scoring ─────────────────────────────────────────────────────────

def calculate_priority_score(patient: models.Queue) -> float:
    score = (3 - (patient.priority.weight if patient.priority else 2)) * 100
    score += patient.wait_duration
    if patient.patient and patient.patient.date_of_birth:
        age_delta = datetime.utcnow().date() - patient.patient.date_of_birth
        age = age_delta.days // 365
        if age >= 65:
            score += 50
    return score


# ─── Queue Reads ──────────────────────────────────────────────────────────────

@router.get("/queue", response_model=List[schemas.QueueResponse])
def get_queue(
    room: Optional[str] = None,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(models.Queue).filter(models.Queue.status == "waiting")

    if room:
        query = query.filter(models.Queue.target_room == room)

    if current_user and current_user.role.category in ["Doctor", "Technician", "Nurse"]:
        if current_user.room_number:
            query = query.filter(models.Queue.target_room == current_user.room_number)
        elif current_user.department_id:
            dept = db.query(models.Department).filter(models.Department.id == current_user.department_id).first()
            if dept:
                query = query.filter(models.Queue.target_dept == dept.name)

        if current_user.role.category == "Doctor":
            query = query.filter(models.Queue.visit_type.in_(
                ["consultation", "review", "Consultation", "Review", None]
            ))
            query = query.filter(models.Queue.doctor_id.in_([current_user.id, None]))
        elif current_user.role.category == "Technician":
            query = query.filter(models.Queue.visit_type.in_(
                ["procedure", "laboratory", "pharmacy", "Procedure", "Laboratory", "Pharmacy"]
            ))
            query = query.filter(models.Queue.doctor_id.in_([current_user.id, None]))

    return query.join(models.PriorityLevel).options(
        joinedload(models.Queue.doctor),
        joinedload(models.Queue.patient),
        joinedload(models.Queue.priority)
    ).order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).all()


@router.get("/queue/counters")
def get_active_counters(db: Session = Depends(get_db)):
    """Multi-counter awareness: Return what each room is currently serving."""
    active_patients = db.query(models.Queue).filter(
        models.Queue.status.in_(["calling", "serving", "in-consultation"])
    ).all()
    return [
        {
            "room": p.room_number,
            "patient_name": p.patient_name,
            "token": p.token_number,
            "status": p.status,
            "doctor": p.doctor_name
        } for p in active_patients if p.room_number
    ]


@router.get("/queue/recommend", response_model=schemas.QueueResponse)
def recommend_next_patient(
    room_number: Optional[str] = None,
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Suggests the next highest priority patient based on the scoring engine."""
    query = db.query(models.Queue).join(models.PriorityLevel).filter(models.Queue.status == "waiting")

    if room_number:
        query = query.filter(models.Queue.target_room == room_number)
    if doctor_id:
        query = query.filter(models.Queue.doctor_id.in_([doctor_id, None]))

    patients = query.options(
        joinedload(models.Queue.priority),
        joinedload(models.Queue.patient)
    ).all()
    if not patients:
        raise HTTPException(status_code=404, detail="No waiting patients.")

    recommended = max(patients, key=calculate_priority_score)
    return recommended


# ─── Call Next ────────────────────────────────────────────────────────────────

@router.post("/call-next", response_model=schemas.QueueResponse)
async def call_next_patient(request: schemas.CallNextRequest, db: Session = Depends(get_db)):
    next_patient = None
    total_waiting = 0

    if request.patient_id:
        next_patient = db.query(models.Queue).filter(
            models.Queue.id == request.patient_id,
            models.Queue.status == "waiting"
        ).first()

    if not next_patient:
        query = db.query(models.Queue).join(models.PriorityLevel).filter(models.Queue.status == "waiting")

        if request.room_number:
            active_patient = db.query(models.Queue).filter(
                models.Queue.status == "calling",
                models.Queue.room_number == request.room_number
            ).first()
            if active_patient:
                raise HTTPException(status_code=400, detail="You have an active patient. Complete them first.")

            if request.room_number in ["Station 1(GF)", "Station 2(1F)", "Station 3(PED)"]:
                query = query.filter(or_(models.Queue.target_dept == "Triage", models.Queue.target_room == request.room_number))
            else:
                query = query.filter(models.Queue.target_room == request.room_number)

        is_triage_station = request.room_number and (
            request.room_number.startswith("Station") or request.room_number.startswith("Triage")
        )
        if request.doctor_id and not is_triage_station:
            query = query.filter(models.Queue.doctor_id.in_([request.doctor_id, None]))

        total_waiting = query.count()

        if total_waiting >= 15:
            history = db.query(models.Queue).filter(
                models.Queue.target_room == request.room_number,
                models.Queue.status.in_(['completed', 'calling']),
                models.Queue.called_at >= datetime.utcnow().date()
            ).order_by(models.Queue.called_at.desc()).limit(3).all()

            last_3_types = [p.visit_type for p in history]
            non_review_streak = 0
            for vt in last_3_types:
                if vt != 'Review':
                    non_review_streak += 1
                else:
                    break

            should_call_review = (non_review_streak >= 3)
            if should_call_review:
                next_patient = query.filter(models.Queue.visit_type == 'Review')\
                    .order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).first()
            else:
                next_patient = query.filter(models.Queue.visit_type != 'Review')\
                    .order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).first()

        if not next_patient:
            next_patient = query.order_by(
                models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()
            ).first()

    else:
        is_triage_station = request.room_number and (
            request.room_number.startswith("Station") or request.room_number.startswith("Triage")
        )

    if not next_patient:
        raise HTTPException(status_code=404, detail="No patients in waiting queue.")

    next_patient.status = "calling"
    if not is_triage_station:
        next_patient.doctor_id = request.doctor_id
        next_patient.room_number = request.room_number or next_patient.target_room
    else:
        next_patient.room_number = request.room_number
    next_patient.called_at = datetime.utcnow()

    db.commit()
    db.refresh(next_patient)

    is_vip = next_patient.priority.name == "VIP"
    await sio.emit('call_patient', {
        'token': next_patient.token_number,
        'room': next_patient.room_number,
        'department': next_patient.target_dept,
        'name': next_patient.patient_name,
        'is_vip': is_vip
    })
    return next_patient


@router.post("/call-specific/{patient_id}")
async def call_specific_patient(
    patient_id: int,
    request: schemas.CallNextRequest,
    db: Session = Depends(get_db)
):
    """Call a specific patient from the waiting list, bypassing priority order."""
    patient = db.query(models.Queue).filter(
        models.Queue.id == patient_id, models.Queue.status == "waiting"
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or not waiting.")

    if patient.doctor_id is not None and request.doctor_id is not None:
        if patient.doctor_id != request.doctor_id:
            raise HTTPException(status_code=403, detail="This patient is booked for another doctor.")

    if request.room_number:
        active_patient = db.query(models.Queue).filter(
            models.Queue.status == "calling",
            models.Queue.room_number == request.room_number
        ).first()
        if active_patient:
            raise HTTPException(status_code=400, detail="You have an active patient. Complete them first.")

        is_nurse_triage = (
            request.room_number in ["Station 1(GF)", "Station 2(1F)", "Station 3(PED)"]
            and patient.target_dept == "Triage"
        )
        if not is_nurse_triage and patient.target_room and patient.target_room != request.room_number:
            raise HTTPException(
                status_code=400,
                detail=f"Patient is waiting for Room {patient.target_room}, you are in Room {request.room_number}"
            )

        is_review = patient.visit_type and patient.visit_type.lower() == "review"

        if is_nurse_triage:
            next_in_line = db.query(models.Queue).filter(
                models.Queue.status == "waiting",
                or_(models.Queue.target_dept == "Triage", models.Queue.target_room == request.room_number)
            ).order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).first()
        else:
            next_in_line = db.query(models.Queue).filter(
                models.Queue.status == "waiting",
                models.Queue.target_room == request.room_number
            ).order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).first()

        is_next = next_in_line and next_in_line.id == patient_id

        if not (is_review or is_next):
            raise HTTPException(status_code=400, detail="You can only call the NEXT patient or a REVIEW patient.")

    patient.status = "calling"
    patient.doctor_id = request.doctor_id
    patient.room_number = request.room_number or patient.target_room
    patient.called_at = datetime.utcnow()

    db.commit()
    db.refresh(patient)

    is_vip = patient.priority.name == "VIP"
    await sio.emit('call_patient', {
        'token': patient.token_number,
        'room': patient.room_number,
        'department': patient.target_dept,
        'name': patient.patient_name,
        'is_vip': is_vip
    })
    return patient


# ─── Status Updates ───────────────────────────────────────────────────────────

@router.post("/complete/{patient_id}")
async def complete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.status = "completed"
    patient.completed_at = datetime.utcnow()

    duration = 0
    if patient.called_at:
        duration = int((patient.completed_at - patient.called_at).total_seconds())

    visit = models.VisitHistory(
        patient_id=patient.patient_id,
        queue_id=patient.id,
        visit_date=patient.completed_at,
        department=patient.target_dept,
        room=patient.room_number,
        doctor_id=patient.doctor_id,
        visit_type=patient.visit_type,
        status="completed",
        duration_seconds=duration
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)

    db.query(models.PatientVitals).filter(
        models.PatientVitals.queue_id == patient.id
    ).update({models.PatientVitals.visit_id: visit.id}, synchronize_session=False)
    db.commit()

    await sio.emit('queue_update', {'message': 'Patient completed'})
    return {"message": "Patient marked as completed"}


@router.post("/no-show/{patient_id}")
async def mark_no_show(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.status = "no-show"
    db.commit()
    await sio.emit('queue_update', {'message': 'Patient marked as no-show'})
    return {"message": "Patient marked as no-show"}


@router.post("/recall/{patient_id}")
async def recall_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.status = "calling"
    patient.called_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    await sio.emit('call_patient', {
        'token': patient.token_number,
        'room': patient.room_number,
        'department': patient.target_dept,
        'name': patient.patient_name,
        'is_vip': patient.priority.name == "VIP"
    })
    return {"message": "Patient recalled"}


@router.post("/queue/skip/{patient_id}")
async def skip_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.previous_status = patient.status
    patient.status = "skipped"
    patient.skipped_at = datetime.utcnow()
    db.commit()
    await sio.emit('queue_update', {'message': f'Patient {patient.token_number} skipped'})
    return {"message": "Patient skipped", "token": patient.token_number}


@router.post("/queue/undo/{patient_id}")
async def undo_patient_status(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient or not patient.previous_status:
        raise HTTPException(status_code=400, detail="Cannot undo for this patient.")
    patient.status = patient.previous_status
    patient.previous_status = None
    if patient.status == "waiting":
        patient.called_at = None
        patient.room_number = None
    db.commit()
    await sio.emit('queue_update', {'message': f'Undo action for patient {patient.token_number}'})
    return {"message": "Action reverted", "new_status": patient.status}


# ─── Doctor Notes ─────────────────────────────────────────────────────────────

@router.post("/queue/{queue_id}/notes")
async def save_doctor_notes(
    queue_id: int,
    body: DoctorNotesRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Save or update doctor's consultation notes."""
    entry = db.query(models.Queue).filter(models.Queue.id == queue_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    if entry.status == "waiting":
        raise HTTPException(status_code=403, detail="Cannot add notes before the patient is being served")
    entry.doctor_notes = body.notes.strip()
    db.commit()
    return {"message": "Notes saved", "doctor_notes": entry.doctor_notes}
