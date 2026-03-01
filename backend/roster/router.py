from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from datetime import date
from typing import List
import csv
import io
import os
from fastapi.responses import StreamingResponse

# Import dependencies from main.py
from backend.main import get_db, get_admin_user, get_current_active_user
from backend.models import User
from backend.roster import schemas, repository, service, models

router = APIRouter()

# --- Common Endpoints ---

@router.get("/staff", response_model=List[schemas.StaffResponse])
def get_all_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch all active clinic users (doctors, nurses, technicians) eligible for rostering."""
    from backend.models import User as ClinicUser, Role
    
    # Pull actual clinic staff - any active user that has a meaningful role (not just Admin/Helpdesk)
    excluded_roles = {"Admin"}
    clinic_users = db.query(ClinicUser).filter(ClinicUser.is_active == True).all()
    
    result = []
    for u in clinic_users:
        role_category = u.role.category if u.role else "Staff"
        role_title = u.role.name if u.role else "Staff"
        
        if role_category in excluded_roles:
            continue
            
        result.append({
            "id": u.id,
            "full_name": u.full_name or u.username,
            "role": role_title,
            "phone": u.phone_number,
            "department_id": u.department_id,
            "is_active": u.is_active
        })
    
    return result

@router.get("/shifts", response_model=List[schemas.ShiftResponse])
def get_all_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch all configured shifts configurations."""
    return repository.get_active_shifts(db)

@router.get("/days", response_model=List[schemas.RosterDayResponse])
def get_all_roster_days(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch all generated roster days drafts and published."""
    return repository.get_all_roster_days(db)

# --- Admin / Ops Endpoints (Require Admin privileges) ---

@router.post("/days", response_model=schemas.RosterDayResponse)
def create_roster_day(
    request: schemas.RosterDayCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a roster day draft for a specific date."""
    existing = repository.get_roster_day_by_date(db, request.date)
    if existing:
        raise HTTPException(status_code=400, detail="Roster day already exists for this date")
    
    return repository.create_roster_day(db, request, current_user.id)


@router.post("/days/{roster_day_id}/generate", response_model=schemas.RosterDayDetailResponse)
def generate_roster(
    roster_day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
    request: schemas.RosterGenerateRequest = None
):
    """Auto-generate assignments using rules."""
    if request is None:
        request = schemas.RosterGenerateRequest()
    try:
        summary = service.generate_roster(db, roster_day_id, request, current_user.id)
        if not summary:
            raise HTTPException(status_code=404, detail="Roster day not found")
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/days/{roster_day_id}/upload")
async def upload_roster_file(
    roster_day_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Import roster assignments from an uploaded .docx or .xlsx file."""
    from fastapi.responses import JSONResponse

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".docx", ".xlsx", ".xls"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a .docx or .xlsx file."
        )

    contents = await file.read()
    try:
        count, parse_errors = service.parse_roster_file(contents, ext, db, roster_day_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if count == 0:
        # Build a helpful error that tells the user which names failed
        detail = {
            "message": "No valid assignments were found in the file.",
            "errors": parse_errors[:10],
            "hint": "Check that staff names in the file match usernames or full names in the system (see Staff Pool tab)."
        }
        raise HTTPException(status_code=422, detail=detail)

    summary = service.get_roster_summary(db, roster_day_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Roster day not found")

    # Return roster data + metadata about partial parse errors
    response_data = summary.dict()
    response_data["_meta"] = {
        "assignments_created": count,
        "parse_warnings": parse_errors
    }
    return response_data



@router.post("/days/{roster_day_id}/publish", response_model=schemas.RosterDayResponse)
def publish_roster(
    roster_day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Set status=published; immutable except by admin."""
    roster = repository.update_roster_day_status(db, roster_day_id, "published")
    if not roster:
        raise HTTPException(status_code=404, detail="Roster day not found")
    
    repository.log_audit_action(db, current_user.id, "PUBLISH_ROSTER", {"roster_day_id": roster_day_id})
    return roster


@router.put("/assignments/{assignment_id}", response_model=schemas.RosterAssignmentResponse)
def update_assignment(
    assignment_id: int,
    request: schemas.RosterAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Edit assignment: staff, time, phone, etc."""
    assignment = db.query(models.RosterAssignment).filter(models.RosterAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = request.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(assignment, key, value)
        
    db.commit()
    db.refresh(assignment)
    
    repository.log_audit_action(db, current_user.id, "UPDATE_ASSIGNMENT", {"assignment_id": assignment_id, "updates": update_data})
    return assignment


# --- Shared Endpoints (Accessible to any active staff user) ---

@router.get("/days/{roster_day_id}", response_model=schemas.RosterDayDetailResponse)
def get_roster_day_details(
    roster_day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """View roster day + grouped by department/unit."""
    summary = service.get_roster_summary(db, roster_day_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Roster day not found")
    return summary


@router.get("", response_model=schemas.RosterDayDetailResponse)
def get_published_roster_by_date(
    date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch published roster for a specific date."""
    roster = repository.get_roster_day_by_date(db, date)
    if not roster or roster.status != "published":
        raise HTTPException(status_code=404, detail="Published roster not found for this date")
    
    return service.get_roster_summary(db, roster.id)


@router.get("/coverage", response_model=schemas.CoverageResponse)
def get_hourly_coverage(
    date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Endpoint that produces hourly coverage for ML forecasting."""
    res = service.get_hourly_coverage(db, date)
    if not res:
        raise HTTPException(status_code=404, detail="No published roster coverage found for this date")
    return res


# --- Export Endpoints ---

@router.get("/days/{roster_day_id}/export/json", response_model=schemas.RosterDayDetailResponse)
def export_roster_json(
    roster_day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """AI-ready normalized export."""
    summary = service.get_roster_summary(db, roster_day_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Roster day not found")
    return summary


@router.get("/days/{roster_day_id}/export/csv")
def export_roster_csv(
    roster_day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Export roster to CSV."""
    summary = service.get_roster_summary(db, roster_day_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Roster day not found")
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Department", "Unit", "Staff Name", "Role", "Phone", "Shift", "Start Time", "End Time"])

    for dept in summary.departments:
        for unit in dept.units:
            for assign in unit.assignments:
                writer.writerow([
                    dept.department_name,
                    unit.unit_name or "General",
                    assign.staff_name,
                    assign.role,
                    assign.phone or "",
                    assign.shift_label,
                    assign.shift_start_time.strftime("%H:%M"),
                    assign.shift_end_time.strftime("%H:%M")
                ])
                
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=roster_{summary.date}.csv"}
    )
