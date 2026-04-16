"""
main.py
-------
FastAPI application factory.

Responsibilities:
  - Create FastAPI + Socket.IO ASGI application
  - Register middleware and routers
  - Define SQLAdmin GUI (must stay here — tightly coupled to app instance)
  - Startup event: seed DB, cleanup sessions
"""
__author__ = "Valery Structure"
import os
import uuid
import shutil
import logging

from fastapi import FastAPI, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import case, or_
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import RedirectResponse
from typing import List, Optional
from datetime import datetime

import socketio
from dotenv import load_dotenv

# Load .env before anything that reads os.getenv()
load_dotenv()

from . import models, schemas, database, session_manager
from .socket_instance import sio
from .auth_utils import verify_password, get_password_hash, SECRET_KEY, ALGORITHM
from .dependencies import get_db, get_current_active_user, get_admin_user

# ─── SQLAdmin imports ─────────────────────────────────────────────────────────
from sqladmin import Admin, ModelView, BaseView, expose
from sqladmin.authentication import AuthenticationBackend
from wtforms import PasswordField, SelectField
from sqlalchemy import func, desc

logger = logging.getLogger(__name__)

# ─── Database bootstrap ───────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=database.engine)

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="LC Queue Management System",
    description="Legacy Clinics Patient Queue Management System API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Socket.IO ASGI wrapper ───────────────────────────────────────────────────
socket_app = socketio.ASGIApp(sio, app)

# ─── Mount Static Files ───────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# ─── Include all domain routers ───────────────────────────────────────────────
from .routers import files, patient_portal, sukraa as sukraa_router
from .routers.auth_router import router as auth_router
from .routers.queue_router import router as queue_router
from .routers.data_router import router as data_router
from .routers.admin_router import router as admin_router
from .routers.nursing_router import router as nursing_router

app.include_router(auth_router)
app.include_router(queue_router)
app.include_router(data_router)
app.include_router(admin_router)
app.include_router(nursing_router)
app.include_router(files.router)
app.include_router(patient_portal.router)
app.include_router(sukraa_router.router)

# Roster sub-application
from .roster.router import router as roster_router
app.include_router(roster_router, prefix="/roster", tags=["Roster"])


# ─── Startup Event ────────────────────────────────────────────────────────────

def check_and_expire_queue(db: Session):
    """Moves 'waiting'/'calling' patients to 'expired' if after 22:00. Currently disabled."""
    if False:  # Re-enable with proper scheduling when needed
        expired_count = db.query(models.Queue).filter(
            models.Queue.status.in_(["waiting", "calling"])
        ).update({models.Queue.status: "expired"}, synchronize_session=False)
        if expired_count > 0:
            print(f"[MAINTENANCE] Expired {expired_count} patients due to 10 PM cutoff.")
            db.commit()


@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()

    # Seed Priority Levels
    for p in [
        {"id": 1, "name": "Emergency", "weight": 0},
        {"id": 2, "name": "VIP", "weight": 1},
        {"id": 3, "name": "Standard", "weight": 2},
    ]:
        if not db.query(models.PriorityLevel).filter_by(id=p["id"]).first():
            db.add(models.PriorityLevel(**p))

    # Seed Roles
    for r in [
        {"id": 1, "name": "Admin", "category": "Admin"},
        {"id": 2, "name": "Doctor", "category": "Doctor"},
        {"id": 3, "name": "Helpdesk", "category": "Helpdesk"},
        {"id": 4, "name": "Technician", "category": "Technician"},
        {"id": 5, "name": "SMS Officer", "category": "SMS Officer"},
        {"id": 6, "name": "Nurse", "category": "Nurse"},
        {"id": 100, "name": "Quality", "category": "Quality"},
    ]:
        role = db.query(models.Role).filter_by(id=r["id"]).first()
        if not role:
            db.add(models.Role(**r))
        elif not role.category:
            role.category = r["category"]
            db.add(role)

    db.commit()

    # Seed Default Admin
    admin_role = db.query(models.Role).filter_by(name="Admin").first()
    if admin_role and not db.query(models.User).filter_by(username="admin").first():
        db.add(models.User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role_id=admin_role.id
        ))
        db.commit()

    check_and_expire_queue(db)

    removed = session_manager.cleanup_old_sessions(db)
    if removed:
        print(f"[SESSION] Cleaned up {removed} stale session(s) on startup.")

    db.close()


# ─── Socket.IO Events ─────────────────────────────────────────────────────────

@sio.event
async def connect(sid, environ):
    print("connect", sid)


# ─────────────────────────────────────────────────────────────────────────────
# SQLAdmin GUI
# ─────────────────────────────────────────────────────────────────────────────

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username, password = form.get("username"), form.get("password")
        with database.SessionLocal() as db:
            user = db.query(models.User).filter(models.User.username == username).first()
            if not user or not verify_password(password, user.hashed_password):
                return False
            if user.role.name != "Admin":
                return False
        request.session.update({"token": username})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("token"))


class UserAdmin(ModelView, model=models.User):
    column_list = [models.User.id, models.User.username, models.User.salutation, models.User.full_name, "is_available", models.User.role, models.User.last_login]
    column_sortable_list = [models.User.id, models.User.username, models.User.full_name, models.User.email, models.User.last_login]
    column_searchable_list = [models.User.username, models.User.full_name, models.User.email]
    icon = "fa-solid fa-user"
    can_create = True; can_edit = True; can_delete = True; can_view_details = True; can_export = True
    category = "User Management"
    form_columns = [models.User.username, models.User.salutation, models.User.full_name, models.User.email, models.User.phone_number, models.User.role, models.User.department, models.User.room_number, models.User.is_active, models.User.is_available]
    form_extra_fields = {
        "password": PasswordField("Password"),
        "salutation": SelectField("Salutation", choices=[("", "Select..."), ("Dr.", "Dr."), ("Mr.", "Mr."), ("Mrs.", "Mrs."), ("Ms.", "Ms.")])
    }

    async def on_model_change(self, data, model, is_created, request):
        password = data.get("password")
        if password:
            model.hashed_password = get_password_hash(password)
        if "password" in data:
            del data["password"]


class RoleAdmin(ModelView, model=models.Role):
    column_list = [models.Role.id, models.Role.name]
    can_delete = False
    icon = "fa-solid fa-user-shield"
    can_view_details = True
    category = "User Management"


class DepartmentAdmin(ModelView, model=models.Department):
    column_list = [models.Department.id, models.Department.name]
    icon = "fa-solid fa-building"
    can_export = True
    category = "Hospital Resources"


class RoomAdmin(ModelView, model=models.Room):
    column_list = [models.Room.id, models.Room.name, models.Room.department, models.Room.floor, models.Room.extension]
    column_sortable_list = [models.Room.id, models.Room.name, models.Room.floor]
    column_searchable_list = [models.Room.name, models.Room.extension]
    icon = "fa-solid fa-door-open"
    can_export = True
    category = "Hospital Resources"
    form_overrides = {"floor": SelectField}
    form_args = {"floor": {"choices": [("", "None"), ("ground", "Ground Floor"), ("first", "First Floor"), ("pediatrics", "Pediatrics")]}}


class PatientAdmin(ModelView, model=models.Patient):
    column_list = [models.Patient.mrn, models.Patient.first_name, models.Patient.last_name, models.Patient.date_of_birth, models.Patient.is_active]
    column_sortable_list = [models.Patient.mrn, models.Patient.last_name, models.Patient.date_of_birth]
    column_searchable_list = [models.Patient.mrn, models.Patient.last_name, models.Patient.first_name]
    icon = "fa-solid fa-hospital-user"
    can_export = True; can_view_details = True; page_size = 5000
    category = "Medical Records"


class QueueAdmin(ModelView, model=models.Queue):
    column_list = [models.Queue.token_number, models.Queue.patient_name, models.Queue.priority, models.Queue.status, models.Queue.target_dept, models.Queue.doctor, models.Queue.room_number, models.Queue.doctor_notes, "duration"]
    column_sortable_list = [models.Queue.created_at]
    icon = "fa-solid fa-list-ol"
    can_view_details = True
    category = "Queue Management"

    def duration(self, model):
        if model.called_at and model.completed_at:
            diff = model.completed_at - model.called_at
            total_seconds = int(diff.total_seconds())
            return f"{total_seconds // 60}m {total_seconds % 60}s"
        return "-"


class VisitHistoryAdmin(ModelView, model=models.VisitHistory):
    column_list = [models.VisitHistory.visit_date, models.VisitHistory.patient, models.VisitHistory.doctor, models.VisitHistory.status, models.VisitHistory.doctor_notes]
    column_sortable_list = [models.VisitHistory.visit_date, models.VisitHistory.status]
    icon = "fa-solid fa-file-medical"
    can_view_details = True
    category = "Medical Records"


class PatientVitalsAdmin(ModelView, model=models.PatientVitals):
    name = "Triage / Vitals"
    icon = "fa-solid fa-heart-pulse"
    category = "Medical Records"
    column_list = [models.PatientVitals.id, models.PatientVitals.patient_id, models.PatientVitals.temperature, models.PatientVitals.blood_pressure, models.PatientVitals.recorded_at]


class PriorityLevelAdmin(ModelView, model=models.PriorityLevel):
    column_list = [models.PriorityLevel.name, models.PriorityLevel.weight]
    can_delete = False
    icon = "fa-solid fa-layer-group"


class SMSHistoryAdmin(ModelView, model=models.SMSHistory):
    name = "SMS History"; name_plural = "SMS History"
    icon = "fa-solid fa-comment-sms"; category = "Communications"
    column_list = [models.SMSHistory.sent_at, models.SMSHistory.phone_number, "patient", models.SMSHistory.message_type, models.SMSHistory.status, "sent_by"]
    column_sortable_list = [models.SMSHistory.sent_at, models.SMSHistory.status, models.SMSHistory.message_type]
    column_searchable_list = [models.SMSHistory.phone_number, models.SMSHistory.message_type]
    can_create = False; can_edit = False; can_delete = False; can_view_details = True; can_export = True


class SMSTemplateAdmin(ModelView, model=models.SMSTemplate):
    name = "SMS Templates"; name_plural = "SMS Templates"
    icon = "fa-solid fa-file-lines"; category = "Communications"
    column_list = [models.SMSTemplate.type, models.SMSTemplate.description, models.SMSTemplate.template]
    column_searchable_list = [models.SMSTemplate.type, models.SMSTemplate.description]
    can_create = True; can_edit = True; can_delete = True; can_view_details = True; can_export = True


class SettingAdmin(ModelView, model=models.Setting):
    name = "System Settings"; name_plural = "System Settings"
    icon = "fa-solid fa-gear"; category = "System"
    column_list = [models.Setting.key, models.Setting.value, models.Setting.description, models.Setting.updated_at]
    column_sortable_list = [models.Setting.key, models.Setting.updated_at]
    column_searchable_list = [models.Setting.key, models.Setting.description]
    can_create = False; can_edit = True; can_delete = False; can_view_details = True; can_export = True


class FileCategoryAdmin(ModelView, model=models.FileCategory):
    name = "File Categories"; name_plural = "File Categories"
    icon = "fa-solid fa-folder"; category = "File Hub"
    column_list = [models.FileCategory.id, models.FileCategory.name, models.FileCategory.description]
    column_searchable_list = [models.FileCategory.name]
    can_create = True; can_edit = True; can_delete = True; can_view_details = True; can_export = True


class DocumentAdmin(ModelView, model=models.Document):
    name = "Documents"; name_plural = "Documents"
    icon = "fa-solid fa-file"; category = "File Hub"
    column_list = [models.Document.original_name, "category", "uploaded_by", models.Document.upload_date, models.Document.file_size, models.Document.mime_type, models.Document.is_active]
    column_sortable_list = [models.Document.upload_date, models.Document.file_size, models.Document.original_name]
    column_searchable_list = [models.Document.original_name, models.Document.mime_type]
    can_create = False; can_edit = True; can_delete = True; can_view_details = True; can_export = True
    form_columns = [models.Document.category, models.Document.is_active]


class FileAuditLogAdmin(ModelView, model=models.FileAuditLog):
    name = "File Audit Log"; name_plural = "File Audit Logs"
    icon = "fa-solid fa-shield-halved"; category = "File Hub"
    column_list = [models.FileAuditLog.timestamp, "user", "document", models.FileAuditLog.action, models.FileAuditLog.ip_address]
    column_sortable_list = [models.FileAuditLog.timestamp, models.FileAuditLog.action]
    column_searchable_list = [models.FileAuditLog.action, models.FileAuditLog.ip_address]
    can_create = False; can_edit = False; can_delete = False; can_view_details = True; can_export = True


from .roster.models import (
    Unit, Shift, RosterDay, RosterAssignment, StaffAvailability,
    AuditLog as RosterAuditLog,
)


class DoctorRosterAdmin(ModelView, model=models.DoctorRoster):
    name = "Doctor Weekly Roster"; name_plural = "Doctor Weekly Roster"
    icon = "fa-solid fa-calendar-check"; category = "Roster"
    column_list = ["doctor", models.DoctorRoster.day_of_week, models.DoctorRoster.status, models.DoctorRoster.updated_at]
    column_sortable_list = [models.DoctorRoster.day_of_week, models.DoctorRoster.updated_at]
    column_searchable_list = [models.DoctorRoster.day_of_week, models.DoctorRoster.status]
    can_create = True; can_edit = True; can_delete = True; can_export = True


class UnitAdmin(ModelView, model=Unit):
    name = "Units"; name_plural = "Units"
    icon = "fa-solid fa-sitemap"; category = "Roster"
    column_list = [Unit.id, Unit.name, "department"]
    column_searchable_list = [Unit.name]
    can_create = True; can_edit = True; can_delete = True; can_export = True


class ShiftAdmin(ModelView, model=Shift):
    name = "Shifts"; name_plural = "Shifts"
    icon = "fa-solid fa-clock"; category = "Roster"
    column_list = [Shift.id, Shift.name, Shift.start_time, Shift.end_time]
    column_sortable_list = [Shift.name, Shift.start_time]
    column_searchable_list = [Shift.name]
    can_create = True; can_edit = True; can_delete = True; can_export = True


class RosterDayAdmin(ModelView, model=RosterDay):
    name = "Roster Days"; name_plural = "Roster Days"
    icon = "fa-solid fa-calendar-days"; category = "Roster"
    column_list = [RosterDay.id, RosterDay.date, "creator", RosterDay.status, RosterDay.notes]
    column_sortable_list = [RosterDay.date, RosterDay.status]
    column_searchable_list = [RosterDay.status]
    can_create = True; can_edit = True; can_delete = True; can_export = True; can_view_details = True


class RosterAssignmentAdmin(ModelView, model=RosterAssignment):
    name = "Roster Assignments"; name_plural = "Roster Assignments"
    icon = "fa-solid fa-user-clock"; category = "Roster"
    column_list = ["roster_day", "staff", "department", "unit", RosterAssignment.shift_label, RosterAssignment.shift_start_time, RosterAssignment.shift_end_time, RosterAssignment.room_number, RosterAssignment.phone]
    column_sortable_list = [RosterAssignment.shift_label, RosterAssignment.created_at]
    column_searchable_list = [RosterAssignment.shift_label, RosterAssignment.phone, RosterAssignment.room_number]
    can_create = True; can_edit = True; can_delete = True; can_export = True; can_view_details = True


class StaffAvailabilityAdmin(ModelView, model=StaffAvailability):
    name = "Staff Availability"; name_plural = "Staff Availability"
    icon = "fa-solid fa-user-check"; category = "Roster"
    column_list = ["staff", StaffAvailability.date, StaffAvailability.available, StaffAvailability.reason]
    column_sortable_list = [StaffAvailability.date, StaffAvailability.available]
    can_create = True; can_edit = True; can_delete = True; can_export = True


class RosterAuditLogAdmin(ModelView, model=RosterAuditLog):
    name = "Roster Audit Log"; name_plural = "Roster Audit Logs"
    icon = "fa-solid fa-list-check"; category = "Roster"
    column_list = ["actor", RosterAuditLog.action, RosterAuditLog.created_at]
    column_sortable_list = [RosterAuditLog.created_at]
    column_searchable_list = [RosterAuditLog.action]
    can_create = False; can_edit = False; can_delete = False; can_export = True


# ─── Custom Admin Dashboard ───────────────────────────────────────────────────

class LCAdmin(Admin):
    async def index(self, request: Request):
        with database.SessionLocal() as db:
            waiting_count = db.query(models.Queue).filter(models.Queue.status == "waiting").count()
            active_visits = db.query(models.Queue).filter(models.Queue.status == "serving").count()
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            total_today = db.query(models.VisitHistory).filter(models.VisitHistory.visit_date >= today_start).count()
            active_staff = db.query(models.User).filter(models.User.is_active == True).count()
            total_patients = db.query(models.Patient).filter(models.Patient.is_active == True).count()
            sms_today = db.query(models.SMSHistory).filter(models.SMSHistory.sent_at >= today_start).count()
            files_count = db.query(models.Document).filter(models.Document.is_active == True).count()
            active_rosters = db.query(RosterDay).filter(RosterDay.status == "published").count()

            live_queue = db.query(models.Queue).filter(
                models.Queue.status.in_(["waiting", "serving"])
            ).order_by(
                case((models.Queue.status == "serving", 0), else_=1),
                models.Queue.priority_id.asc(),
                models.Queue.created_at.asc()
            ).limit(5).all()

            medical_staff = db.query(models.User).join(models.Role).filter(
                models.User.is_active == True,
                or_(models.Role.name == "Doctor", models.Role.name == "Nurse", models.Role.name == "Technician")
            ).all()

            doctor_status = []
            for staff in medical_staff:
                active_pt = db.query(models.Queue).filter(
                    models.Queue.doctor_id == staff.id, models.Queue.status == "serving"
                ).first()
                doctor_status.append({
                    "name": staff.full_name or staff.username,
                    "role": staff.role.name.capitalize() if staff.role else "Staff",
                    "status": "Busy" if active_pt else "Available",
                    "current_patient": active_pt.patient_name if active_pt else None
                })

        return await self.templates.TemplateResponse(request, "admin/index.html", context={
            "request": request,
            "waiting_count": waiting_count,
            "active_visits": active_visits,
            "total_today": total_today,
            "active_staff": active_staff,
            "total_patients": total_patients,
            "sms_today": sms_today,
            "files_count": files_count,
            "active_rosters": active_rosters,
            "live_queue": live_queue,
            "doctor_status": doctor_status,
        })


class AnalyticsView(BaseView):
    name = "Analytics"
    icon = "fa-solid fa-chart-line"

    @expose("/analytics", methods=["GET"])
    async def analytics(self, request: Request):
        with database.SessionLocal() as db:
            start_str = request.query_params.get("start_date")
            end_str = request.query_params.get("end_date")
            now = datetime.now()

            start = datetime.strptime(start_str, "%Y-%m-%d") if start_str else now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = datetime.strptime(end_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59) if end_str else now.replace(hour=23, minute=59, second=59)

            date_label = f"{start.strftime('%b %d')} - {end.strftime('%b %d')}"
            if start.date() == now.date() and end.date() == now.date():
                date_label = "Today's Data"

            total_visits = db.query(models.VisitHistory).filter(
                models.VisitHistory.visit_date >= start,
                models.VisitHistory.visit_date <= end
            ).count()

            avg_svc = db.query(func.avg(models.VisitHistory.duration_seconds)).filter(
                models.VisitHistory.visit_date >= start,
                models.VisitHistory.visit_date <= end,
                models.VisitHistory.duration_seconds != None
            ).scalar()
            avg_service_time = int(avg_svc / 60) if avg_svc else 0

            room_stats = db.query(models.VisitHistory.room, func.count(models.VisitHistory.id)).filter(
                models.VisitHistory.visit_date >= start,
                models.VisitHistory.visit_date <= end
            ).group_by(models.VisitHistory.room).all()
            room_data = {r: c for r, c in room_stats if r}

            staff_stats = db.query(
                models.User.full_name,
                func.count(models.VisitHistory.id),
                func.avg(models.VisitHistory.duration_seconds)
            ).join(models.User, models.VisitHistory.doctor_id == models.User.id).filter(
                models.VisitHistory.visit_date >= start,
                models.VisitHistory.visit_date <= end
            ).group_by(models.User.full_name).all()
            staff_data = [{"name": n, "visits": c, "avg_time": int(a / 60) if a else 0} for n, c, a in staff_stats]

            hourly_data = {f"{h}:00": 0 for h in range(7, 23)}
            visits = db.query(models.VisitHistory.visit_date).filter(
                models.VisitHistory.visit_date >= start,
                models.VisitHistory.visit_date <= end
            ).all()
            for v in visits:
                if v.visit_date:
                    h = v.visit_date.hour
                    if 7 <= h <= 22:
                        hourly_data[f"{h}:00"] += 1

        return await self.templates.TemplateResponse(request, "admin/analytics.html", context={
            "request": request,
            "avg_wait_time": 0,
            "avg_service_time": avg_service_time,
            "total_visits": total_visits,
            "room_data": room_data,
            "staff_data": staff_data,
            "hourly_data": hourly_data,
            "date_label": date_label,
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": end.strftime("%Y-%m-%d"),
        })


class DoctorsView(BaseView):
    name = "Doctors"
    icon = "fa-solid fa-user-doctor"
    category = "Hospital Resources"

    @expose("/doctors", methods=["GET"])
    async def doctors(self, request: Request):
        DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        with database.SessionLocal() as db:
            from .roster.models import Shift
            shifts = db.query(Shift).all()
            excluded_departments = ["Administration", "Physiotherapy", "Tabara"]
            departments = db.query(models.Department).filter(
                ~models.Department.name.in_(excluded_departments)
            ).order_by(models.Department.name).all()

            dept_data = []
            for dept in departments:
                doctors = db.query(models.User).join(models.Role).filter(
                    models.Role.name == "Doctor",
                    models.User.department_id == dept.id,
                    models.User.is_active == True
                ).all()
                if not doctors:
                    continue
                doctor_list = []
                for doc in doctors:
                    roster_entries = db.query(models.DoctorRoster).filter(
                        models.DoctorRoster.doctor_id == doc.id
                    ).all()
                    roster_map = {r.day_of_week: r.status for r in roster_entries}
                    roster = [{"day": day, "day_short": day[:3], "status": roster_map.get(day, "available")} for day in DAYS]
                    doctor_list.append({
                        "id": doc.id, "name": doc.full_name or doc.username,
                        "username": doc.username, "room": doc.room_number or "—",
                        "is_available": doc.is_available, "roster": roster
                    })
                dept_data.append({"id": dept.id, "name": dept.name, "doctors": doctor_list})

        return await self.templates.TemplateResponse(request, "admin/doctors.html", context={
            "request": request, "departments": dept_data, "days": DAYS, "shifts": shifts
        })

    @expose("/doctors/update-roster", methods=["POST"])
    async def update_roster(self, request: Request):
        from starlette.responses import JSONResponse
        data = await request.json()
        doctor_id = data.get("doctor_id")
        day = data.get("day")
        new_status = str(data.get("status"))

        if not doctor_id or not day:
            return JSONResponse({"error": "Invalid input"}, status_code=400)

        with database.SessionLocal() as db:
            from .roster.models import Shift
            shifts = db.query(Shift).all()
            valid_statuses = ["available", "not_available"] + [str(s.id) for s in shifts]
            if new_status not in valid_statuses:
                return JSONResponse({"error": "Invalid shift or status"}, status_code=400)

            entry = db.query(models.DoctorRoster).filter(
                models.DoctorRoster.doctor_id == doctor_id,
                models.DoctorRoster.day_of_week == day
            ).first()
            if entry:
                entry.status = new_status
                entry.updated_at = datetime.utcnow()
            else:
                db.add(models.DoctorRoster(
                    doctor_id=doctor_id, day_of_week=day,
                    status=new_status, updated_at=datetime.utcnow()
                ))
            db.commit()

        return JSONResponse({"success": True, "doctor_id": doctor_id, "day": day, "status": new_status})


# ─── Initialize SQLAdmin ──────────────────────────────────────────────────────

authentication_backend = AdminAuth(secret_key=SECRET_KEY)
admin = LCAdmin(
    app, database.engine,
    authentication_backend=authentication_backend,
    title="Legacy Clinics Admin",
    logo_url="/static/logo.png",
    templates_dir="backend/templates"
)

admin.add_view(AnalyticsView)
admin.add_view(DoctorsView)

# User Management
admin.add_view(UserAdmin)
admin.add_view(RoleAdmin)

# Hospital Resources
admin.add_view(DepartmentAdmin)
admin.add_view(RoomAdmin)

# Medical Records
admin.add_view(PatientAdmin)
admin.add_view(QueueAdmin)
admin.add_view(VisitHistoryAdmin)
admin.add_view(PriorityLevelAdmin)
admin.add_view(PatientVitalsAdmin)

# Communications
admin.add_view(SMSHistoryAdmin)
admin.add_view(SMSTemplateAdmin)

# System
admin.add_view(SettingAdmin)

# File Hub
admin.add_view(FileCategoryAdmin)
admin.add_view(DocumentAdmin)
admin.add_view(FileAuditLogAdmin)

# Roster
admin.add_view(DoctorRosterAdmin)
admin.add_view(UnitAdmin)
admin.add_view(ShiftAdmin)
admin.add_view(RosterDayAdmin)
admin.add_view(RosterAssignmentAdmin)
admin.add_view(StaffAvailabilityAdmin)
admin.add_view(RosterAuditLogAdmin)
