import math
import io
from typing import List, Dict, Optional
from datetime import date, time
from sqlalchemy.orm import Session
from backend.roster import repository, schemas, models
from backend.models import User as ClinicUser, Department
from collections import defaultdict


def _parse_time(value: str) -> Optional[time]:
    """Parse a time string like '08:00', '8:00 AM', or a decimal (Excel serial)."""
    if not value:
        return None
    value = str(value).strip()
    # Handle Excel decimal time (e.g. 0.333 = 08:00)
    try:
        decimal = float(value)
        total_minutes = int(decimal * 24 * 60)
        return time(total_minutes // 60 % 24, total_minutes % 60)
    except ValueError:
        pass
    # Handle HH:MM or H:MM AM/PM
    import re
    m = re.match(r'(\d{1,2}):(\d{2})(?:\s*(AM|PM))?', value, re.IGNORECASE)
    if m:
        h, mn, meridiem = int(m.group(1)), int(m.group(2)), m.group(3)
        if meridiem:
            if meridiem.upper() == 'PM' and h != 12:
                h += 12
            elif meridiem.upper() == 'AM' and h == 12:
                h = 0
        return time(h % 24, mn)
    return None


def parse_roster_file(file_bytes: bytes, ext: str, db: Session, roster_day_id: int, user_id: int):
    """
    Parse a .docx or .xlsx file and create roster assignments.

    Expected columns (case-insensitive):
      Department | Staff Name | Role | Shift | Start Time | End Time

    Returns (count_created, list_of_error_strings).
    """
    # Load lookup maps
    dept_map = {d.name.lower(): d for d in db.query(Department).all()}

    # Index staff by BOTH full_name and username so either can be matched
    staff_map = {}
    for u in db.query(ClinicUser).filter(ClinicUser.is_active == True).all():
        if u.full_name:
            staff_map[u.full_name.lower()] = u
        if u.username:
            staff_map[u.username.lower()] = u

    def find_dept(name: str):
        key = name.strip().lower()
        # Handle "0", "Department 0" or empty as Physiotherapy
        if not key or key in ("0", "department 0"):
            return dept_map.get("physiotherapy")

        if key in dept_map:
            return dept_map[key]
        # Partial match
        for k, d in dept_map.items():
            if key in k or k in key:
                return d
        
        # Fallback to Physiotherapy for unmatched departments
        return dept_map.get("physiotherapy")

    def find_staff(name: str):
        key = name.strip().lower()
        # Exact match
        if key in staff_map:
            return staff_map[key]
        # Partial match — handle "Firstname Lastname" vs "Lastname, Firstname" etc.
        for k, u in staff_map.items():
            if not k:
                continue
            if key in k or k in key:
                return u
        return None

    rows = []  # list of dicts

    if ext == '.docx':
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        if not doc.tables:
            raise ValueError("The uploaded .docx file contains no tables.")
        table = doc.tables[0]
        headers = [cell.text.strip().lower() for cell in table.rows[0].cells]
        for row in table.rows[1:]:
            cells = [c.text.strip() for c in row.cells]
            rows.append(dict(zip(headers, cells)))

    elif ext in ('.xlsx', '.xls'):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        ws = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        if not all_rows:
            raise ValueError("The uploaded spreadsheet is empty.")
        headers = [str(h).strip().lower() if h is not None else "" for h in all_rows[0]]
        for data_row in all_rows[1:]:
            if all(v is None for v in data_row):
                continue  # skip blank rows
            rows.append(dict(zip(headers, [str(v).strip() if v is not None else "" for v in data_row])))
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    # Column aliases — order matters (first match wins)
    STAFF_ALIASES  = ['staff name', 'staff', 'name', 'fullname', 'full name', 'employee', 'employee name', 'doctor', 'doctors', 'nurse']
    DEPT_ALIASES   = ['department', 'dept', 'department name', 'unit']
    ROLE_ALIASES   = ['role', 'position', 'designation', 'title']
    SHIFT_ALIASES  = ['shift', 'shift name', 'shift type', 'shift label', 'duty']
    START_ALIASES  = ['start time', 'start', 'from', 'time in', 'time from', 'shift start']
    END_ALIASES    = ['end time', 'end', 'to', 'time out', 'time to', 'shift end']

    def get(row, *aliases):
        for a in aliases:
            if a in row and row[a]:
                return row[a]
        return ""

    if not rows:
        raise ValueError("The file contains no data rows after the header.")

    # Validate that a staff column exists
    first_row = rows[0]
    found_staff_col = any(a in first_row for a in STAFF_ALIASES)
    if not found_staff_col:
        detected = list(first_row.keys())
        raise ValueError(
            f"Could not find a staff name column. "
            f"Detected columns: {detected}. "
            f"Expected one of: {STAFF_ALIASES}"
        )

    # Clear old assignments before import
    repository.clear_assignments(db, roster_day_id)

    assignments = []
    errors = []

    # Non-person desk/role placeholder labels — skip these rows
    SKIP_PATTERNS = ['billing desk', 'help desk', 'helpdesk', 'reception desk', 'front desk']

    import re as _re

    def is_placeholder(name: str) -> bool:
        return any(p in name.strip().lower() for p in SKIP_PATTERNS)

    def strip_time_hint(name: str) -> str:
        """Remove trailing time annotations like '(8am-2pm)' or '(9am-4pm)' but NOT qualifiers like '(Ped)'."""
        # Only strip parenthetical content that looks like a time: contains a digit followed by am/pm or ':'
        return _re.sub(r'\s*\(\d[^)]*(?:am|pm|AM|PM|:)\d*[^)]*\)', '', name).strip()

    def split_combined(name: str):
        """Split 'A+B' or 'A&B' into ['A', 'B'] when both sides look like real names."""
        parts = _re.split(r'\s*[+&]\s*', name)
        if len(parts) > 1:
            parts = [p.strip() for p in parts if p.strip()]
            if all(1 < len(p) <= 40 for p in parts):
                return parts
        return [name]

    for i, row in enumerate(rows, start=2):  # row 1 is header
        dept_name   = get(row, *DEPT_ALIASES)
        staff_name  = get(row, *STAFF_ALIASES)
        shift_label = get(row, *SHIFT_ALIASES)
        start_str   = get(row, *START_ALIASES)
        end_str     = get(row, *END_ALIASES)

        if not staff_name:
            continue  # skip truly empty rows

        # Strip time hints before matching (e.g. "Nadine R(8am-2pm)" -> "Nadine R")
        staff_name = strip_time_hint(staff_name)

        # Skip non-person desk/role placeholders
        if is_placeholder(staff_name):
            errors.append(f"Row {i}: '{staff_name}' — skipped (desk/role placeholder, not a person)")
            continue

        dept = find_dept(dept_name) if dept_name else None
        # Use Physiotherapy ID as fallback instead of 0
        physio = dept_map.get("physiotherapy")
        dept_id = dept.id if dept else (physio.id if physio else 0)

        start_t = _parse_time(start_str)
        end_t   = _parse_time(end_str)

        if not start_t or not end_t:
            errors.append(f"Row {i}: '{staff_name}' — could not parse times '{start_str}'/'{end_str}', using 08:00–16:00 default")
            start_t = start_t or time(8, 0)
            end_t   = end_t   or time(16, 0)

        # Handle combined-name cells: "Gad+Gaston", "Etienne+Irene", "Nelson &Ishimwe"
        individual_names = split_combined(staff_name)

        for name in individual_names:
            staff = find_staff(name)
            if staff is None:
                errors.append(f"Row {i}: '{name}' — no matching active staff found (skipped)")
                continue

            assignments.append(schemas.RosterAssignmentCreate(
                roster_day_id=roster_day_id,
                department_id=dept_id,
                unit_id=None,
                staff_id=staff.id,
                shift_start_time=start_t,
                shift_end_time=end_t,
                shift_label=shift_label or "Day",
                phone=staff.phone_number
            ))

    repository.bulk_create_assignments(db, assignments)
    repository.log_audit_action(
        db, user_id, "UPLOAD_ROSTER",
        {"roster_day_id": roster_day_id, "assignments_created": len(assignments), "parse_errors": errors}
    )
    return len(assignments), errors




def generate_roster(
    db: Session,
    roster_day_id: int,
    request: schemas.RosterGenerateRequest,
    user_id: int
):
    roster_day = repository.get_roster_day(db, roster_day_id)
    if not roster_day:
        raise ValueError("Roster day not found")
        
    if roster_day.status == "published":
        raise ValueError("Cannot regenerate a published roster")

    target_date = roster_day.date

    # 1. Clear ALL existing assignments for this day before regenerating
    # This ensures no old dummy/stale data persists across generations
    repository.clear_assignments(db, roster_day_id)
    assigned_staff_ids = {}  # start fresh

    # 2. Fetch real clinic users — only include clinical staff with a department
    # Exclude administrative roles that shouldn't be on shift rosters
    excluded_roles = {"Admin", "SMS Officer", "Helpdesk"}
    unavail_staff_ids = set(repository.get_staff_unavailability(db, target_date))
    exclude_ids = set(request.exclude_staff_ids)

    clinic_users = db.query(ClinicUser).filter(ClinicUser.is_active == True).all()
    staff_list = [
        u for u in clinic_users
        if (u.role.category if u.role else "Staff") not in excluded_roles
        and u.id not in unavail_staff_ids
        and u.id not in exclude_ids
        and u.department_id is not None  # Must belong to a department
    ]

    # 3. Get active shifts
    shifts = repository.get_active_shifts(db)
    if not shifts:
        raise ValueError("No active shifts found in the system.")

    # Group staff by department
    dept_staff = defaultdict(list)
    for u in staff_list:
        dept_id = u.department_id or 0  # 0 = no department
        dept_staff[dept_id].append(u)

    new_assignments = []

    # Round-Robin assignment: 1 staff per shift per department
    for dept_id, staff in dept_staff.items():
        staff.sort(key=lambda u: u.id)  # deterministic ordering
        staff_idx = 0

        for shift in shifts:
            needed = request.min_staff_per_shift

            assigned_count = 0
            while assigned_count < needed:
                if staff_idx >= len(staff):
                    break  # Not enough staff for this dept

                candidate = staff[staff_idx]
                staff_idx += 1

                if candidate.id in assigned_staff_ids:
                    continue  # Already assigned today, skip

                assignment = schemas.RosterAssignmentCreate(
                    roster_day_id=roster_day_id,
                    department_id=dept_id or 0,
                    unit_id=None,
                    staff_id=candidate.id,
                    shift_start_time=shift.start_time,
                    shift_end_time=shift.end_time,
                    shift_label=shift.name,
                    phone=candidate.phone_number  # real Users field
                )
                new_assignments.append(assignment)
                assigned_staff_ids[candidate.id] = assignment
                assigned_count += 1

    # 4. Bulk insert
    repository.bulk_create_assignments(db, new_assignments)

    # Audit trail
    repository.log_audit_action(
        db, user_id, "GENERATE_ROSTER",
        {"roster_day_id": roster_day_id, "assignments_created": len(new_assignments)}
    )

    return get_roster_summary(db, roster_day_id)


def get_roster_summary(db: Session, roster_day_id: int):
    roster_day = repository.get_roster_day(db, roster_day_id)
    if not roster_day:
        return None

    assignments = repository.get_assignments_for_day(db, roster_day_id)

    # Pre-load real clinic users for name/role resolution
    clinic_users = {
        u.id: u for u in db.query(ClinicUser).filter(ClinicUser.is_active == True).all()
    }
    
    # Pre-load departments for name resolution
    departments_map = {
        d.id: d.name for d in db.query(Department).all()
    }

    # Group by Department -> Unit
    dep_map = {}
    
    for a in assignments:
        d_id = a.department_id
        if d_id not in dep_map:
            # Fallback for ID 0 or missing ID
            dept_name = departments_map.get(d_id)
            if not dept_name:
                if d_id == 0:
                    dept_name = "PHYSIOTHERAPY"
                else:
                    dept_name = f"Dept {d_id}"
            
            dep_map[d_id] = {
                "department_id": d_id,
                "department_name": dept_name,
                "units": {}
            }
        
        u_id = a.unit_id or 0
        if u_id not in dep_map[d_id]["units"]:
            dep_map[d_id]["units"][u_id] = {
                "unit_id": a.unit_id,
                "unit_name": "General",
                "assignments": []
            }

        # Resolve staff name/role from real Users table
        user = clinic_users.get(a.staff_id)
        staff_name = (user.full_name or user.username) if user else f"Staff {a.staff_id}"
        staff_role = (user.role.name if user and user.role else "Staff")
            
        dep_map[d_id]["units"][u_id]["assignments"].append({
            "staff_id": a.staff_id,
            "staff_name": staff_name,
            "role": staff_role,
            "shift_start_time": a.shift_start_time,
            "shift_end_time": a.shift_end_time,
            "shift_label": a.shift_label,
            "phone": a.phone
        })

    # Convert to schema shape
    departments = []
    for d_id, d_data in dep_map.items():
        units_list = []
        for u_id, u_data in d_data["units"].items():
            units_list.append(schemas.UnitRosterGroup(**u_data))
        d_data["units"] = units_list
        departments.append(schemas.DepartmentRosterGroup(**d_data))

    return schemas.RosterDayDetailResponse(
        id=roster_day.id,
        date=roster_day.date,
        notes=roster_day.notes,
        created_by_user_id=roster_day.created_by_user_id,
        status=roster_day.status,
        departments=departments
    )


def get_hourly_coverage(db: Session, target_date: date):
    roster_day = repository.get_roster_day_by_date(db, target_date)
    if not roster_day or roster_day.status != "published":
        return None # or empty

    assignments = repository.get_assignments_for_day(db, roster_day.id)
    
    # department -> hour -> count
    coverage = defaultdict(lambda: defaultdict(int))
    dept_names = {}
    
    for a in assignments:
        dept_id = a.department_id
        dept_names[dept_id] = a.department.name if a.department else f"Dept {dept_id}"
        
        start_hour = a.shift_start_time.hour
        end_hour = a.shift_end_time.hour
        
        # handle overnight shifts? assume same day for MVP
        for hr in range(start_hour, end_hour):
            coverage[dept_id][hr] += 1
            
    response = []
    for d_id, hours_map in coverage.items():
        hr_list = [schemas.HourlyCoverage(hour=hr, active_staff_count=cnt) for hr, cnt in hours_map.items()]
        response.append(schemas.DepartmentCoverage(
            department_id=d_id,
            department_name=dept_names[d_id],
            hourly_coverage=hr_list
        ))
        
    return schemas.CoverageResponse(date=target_date, departments=response)
