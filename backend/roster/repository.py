import json
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.roster import models, schemas
from backend.models import Department, User

def create_roster_day(db: Session, request: schemas.RosterDayCreate, user_id: int):
    roster_day = models.RosterDay(
        date=request.date,
        notes=request.notes,
        created_by_user_id=user_id,
        status="draft"
    )
    db.add(roster_day)
    db.commit()
    db.refresh(roster_day)
    return roster_day

def get_roster_day(db: Session, roster_day_id: int):
    return db.query(models.RosterDay).filter(models.RosterDay.id == roster_day_id).first()

def get_roster_day_by_date(db: Session, target_date: date):
    return db.query(models.RosterDay).filter(models.RosterDay.date == target_date).first()

def get_all_roster_days(db: Session):
    return db.query(models.RosterDay).order_by(models.RosterDay.date.desc()).all()

def update_roster_day_status(db: Session, roster_day_id: int, status: str):
    roster = get_roster_day(db, roster_day_id)
    if roster:
        roster.status = status
        db.commit()
        db.refresh(roster)
    return roster

def get_staff_by_department(db: Session, department_id: int):
    return db.query(models.Staff).filter(
        models.Staff.department_id == department_id,
        models.Staff.is_active == True
    ).all()

def get_all_staff(db: Session):
    return db.query(models.Staff).filter(models.Staff.is_active == True).all()

def get_active_shifts(db: Session):
    return db.query(models.Shift).all()

def get_staff_unavailability(db: Session, target_date: date):
    unavail = db.query(models.StaffAvailability).filter(
        models.StaffAvailability.date == target_date,
        models.StaffAvailability.available == False
    ).all()
    return [u.staff_id for u in unavail]

def clear_assignments(db: Session, roster_day_id: int):
    db.query(models.RosterAssignment).filter(
        models.RosterAssignment.roster_day_id == roster_day_id
    ).delete()
    db.commit()

def create_assignment(db: Session, assignment: schemas.RosterAssignmentCreate):
    db_assignment = models.RosterAssignment(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

def bulk_create_assignments(db: Session, assignments: List[schemas.RosterAssignmentCreate]):
    db_assignments = [models.RosterAssignment(**a.dict()) for a in assignments]
    db.bulk_save_objects(db_assignments)
    db.commit()
    return db_assignments

def get_assignments_for_day(db: Session, roster_day_id: int):
    return db.query(models.RosterAssignment).filter(
        models.RosterAssignment.roster_day_id == roster_day_id
    ).all()

def log_audit_action(db: Session, user_id: int, action: str, payload: dict):
    log = models.AuditLog(
        actor_user_id=user_id,
        action=action,
        payload_json=payload
    )
    db.add(log)
    db.commit()
