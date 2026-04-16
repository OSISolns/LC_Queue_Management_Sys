"""
admin_router.py
---------------
Admin-only write/mutate endpoints:
  user CRUD, department create, room create/update,
  panel links, reset queue/calling, history purge,
  settings update (admin).
"""
__author__ = "Valery Structure"
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas, database
from ..auth_utils import verify_password, get_password_hash
from ..dependencies import get_db, get_admin_user, get_current_active_user
from ..socket_instance import sio
from starlette.requests import Request

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin"])


# ─── User Management ──────────────────────────────────────────────────────────

@router.post("/users", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    db_user = models.User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        role_id=user.role_id,
        is_active=user.is_active,
        department_id=user.department_id,
        room_number=user.room_number,
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        salutation=user.salutation
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/public/doctors", response_model=List[schemas.User])
def get_public_doctors(db: Session = Depends(get_db)):
    """List doctors for Kiosk selection — cleaned up version."""
    messy_keywords = [
        "am", "pm", "7am", "8am", "9am", "2pm", "3pm", "4pm", "9pm",
        "Floor", "Desk", "Date", "Time", "center", "Lounge", "Office",
        "Date/Day", "Unit", "Shift", "RSSB", "Insurance", "/", "02nd", "1st"
    ]
    dept_names = [
        "Physiotherapy", "Pathology", "Laboratory", "Imaging",
        "Radiology", "Dental", "Phlebotomy", "Duty Managers",
        "Nursing", "Clinical Plaza", "Morning", "Evening"
    ]
    doctor_roles = db.query(models.Role).filter(
        (models.Role.name == "Doctor") | (models.Role.category == "Doctor")
    ).all()
    role_ids = [r.id for r in doctor_roles]

    all_potential = db.query(models.User).filter(
        models.User.role_id.in_(role_ids),
        models.User.is_active == True
    ).all()

    doctors = []
    for d in all_potential:
        if not d.full_name:
            continue
        name_lower = d.full_name.lower()
        if any(kw.lower() in name_lower for kw in messy_keywords):
            continue
        if any(dept.lower() == name_lower for dept in dept_names):
            continue
        if len(d.full_name.strip()) < 3:
            continue
        if any(char.isdigit() for char in d.full_name) and "Dr." not in d.full_name:
            if not d.room_number:
                continue
        doctors.append(d)
    return doctors


@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.role_id is not None:
        db_user.role_id = user_update.role_id
    if user_update.department_id is not None:
        db_user.department_id = user_update.department_id
    if user_update.room_number is not None:
        db_user.room_number = user_update.room_number
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    if user_update.full_name is not None:
        db_user.full_name = user_update.full_name
    if user_update.email is not None:
        db_user.email = user_update.email
    if user_update.phone_number is not None:
        db_user.phone_number = user_update.phone_number
    if user_update.salutation is not None:
        db_user.salutation = user_update.salutation
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    request: schemas.UserDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    if not verify_password(request.admin_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect admin password")

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(db_user)
    db.commit()
    logger.info(f"[AUDIT] User {current_user.username} deleted user {db_user.username}. Reason: {request.reason}")
    return {"message": "User deleted successfully"}


# ─── Departments & Rooms ──────────────────────────────────────────────────────

@router.post("/departments", response_model=schemas.Department)
def create_department(
    dept: schemas.DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_dept = models.Department(name=dept.name)
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept


@router.post("/rooms", response_model=schemas.Room)
def create_room(
    room: schemas.RoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_room = models.Room(name=room.name, department_id=room.department_id, floor=room.floor)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room


@router.put("/rooms/{room_id}", response_model=schemas.Room)
def update_room(
    room_id: int,
    room: schemas.RoomUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    db_room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    for key, value in room.dict(exclude_unset=True).items():
        setattr(db_room, key, value)
    db.commit()
    db.refresh(db_room)
    return db_room


# ─── Panel Links ──────────────────────────────────────────────────────────────

@router.get("/panel-links")
def get_panel_links(
    request: Request,
    current_user: models.User = Depends(get_current_active_user)
):
    host = request.url.hostname
    base_url = f"http://{host}:5173"
    return [
        {"name": "Admin Dashboard", "url": f"{base_url}/admin", "role_required": "Admin"},
        {"name": "Doctor Dashboard", "url": f"{base_url}/doctor", "role_required": "Doctor"},
        {"name": "Kiosk Registration", "url": f"{base_url}/kiosk", "role_required": "Helpdesk"},
        {"name": "Public Display", "url": f"{base_url}/display", "role_required": "None"},
    ]


# ─── Queue Admin Operations ───────────────────────────────────────────────────

@router.post("/reset-queue")
def reset_queue(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Clear all waiting patients."""
    db.query(models.Queue).filter(models.Queue.status == "waiting").delete()
    db.commit()
    return {"message": "Queue cleared"}


@router.post("/reset-calling")
async def reset_calling(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Clear all calling patients (mark as expired to remove from display)."""
    num_updated = db.query(models.Queue).filter(models.Queue.status == "calling").update(
        {models.Queue.status: "expired"},
        synchronize_session=False
    )
    db.commit()
    logger.info(f"[ADMIN] Cleared {num_updated} active calls via reset-calling")
    await sio.emit("queue_update", {"message": "Active calls cleared"})
    return {"message": f"Active calls cleared: {num_updated}"}


@router.delete("/history")
def delete_history(
    request: schemas.HistoryDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Delete history records (completed, no-show, expired) within a date range."""
    if not verify_password(request.admin_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect admin password")
    if not request.reason or len(request.reason) < 5:
        raise HTTPException(status_code=400, detail="A valid reason (min 5 chars) is required for deletion")

    query = db.query(models.Queue).filter(
        models.Queue.status.in_(["completed", "no-show", "expired"])
    )
    if request.start_date:
        query = query.filter(models.Queue.created_at >= request.start_date)
    if request.end_date:
        query = query.filter(models.Queue.created_at <= request.end_date)

    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    logger.info(f"[AUDIT] User {current_user.username} purged {deleted_count} history records. Reason: {request.reason}")
    return {"message": f"Successfully purged {deleted_count} records"}


# ─── Settings (admin write) ───────────────────────────────────────────────────

@router.post("/settings", response_model=schemas.SettingResponse)
def update_setting(
    setting_in: schemas.SettingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Admin endpoint to create or update a setting."""
    setting = db.query(models.Setting).filter(models.Setting.key == setting_in.key).first()
    if setting:
        setting.value = setting_in.value
        setting.description = setting_in.description or setting.description
    else:
        setting = models.Setting(**setting_in.dict())
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting
