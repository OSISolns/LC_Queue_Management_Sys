from pydantic import BaseModel, Field, validator
from typing import List, Optional, Any, Dict
from datetime import date, time, datetime

# --- Unit Schemas ---
class UnitBase(BaseModel):
    name: str
    department_id: int

class UnitCreate(UnitBase):
    pass

class UnitResponse(UnitBase):
    id: int

    class Config:
        orm_mode = True

# --- Staff Schemas ---
class StaffBase(BaseModel):
    full_name: str
    role: str
    phone: Optional[str] = None
    department_id: Optional[int] = None
    is_active: bool = True

class StaffCreate(StaffBase):
    pass

class StaffResponse(StaffBase):
    id: int

    class Config:
        orm_mode = True

# --- Shift Schemas ---
class ShiftBase(BaseModel):
    name: str
    start_time: time
    end_time: time

class ShiftCreate(ShiftBase):
    pass

class ShiftResponse(ShiftBase):
    id: int

    class Config:
        orm_mode = True

# --- Roster Assignment Schemas ---
class RosterAssignmentBase(BaseModel):
    department_id: int
    unit_id: Optional[int] = None
    staff_id: int
    shift_start_time: time
    shift_end_time: time
    shift_label: str
    phone: Optional[str] = None

class RosterAssignmentCreate(RosterAssignmentBase):
    roster_day_id: int

class RosterAssignmentUpdate(BaseModel):
    department_id: Optional[int] = None
    unit_id: Optional[int] = None
    staff_id: Optional[int] = None
    shift_start_time: Optional[time] = None
    shift_end_time: Optional[time] = None
    shift_label: Optional[str] = None
    phone: Optional[str] = None

class RosterAssignmentResponse(RosterAssignmentBase):
    id: int
    roster_day_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# --- Grouped Roster Response ---
class UnitRosterStaff(BaseModel):
    staff_id: int
    staff_name: str
    role: str
    shift_start_time: time
    shift_end_time: time
    shift_label: str
    phone: Optional[str] = None

class UnitRosterGroup(BaseModel):
    unit_id: Optional[int]
    unit_name: Optional[str]
    assignments: List[UnitRosterStaff]

class DepartmentRosterGroup(BaseModel):
    department_id: int
    department_name: str
    units: List[UnitRosterGroup]
    
# --- Roster Day Schemas ---
class RosterDayBase(BaseModel):
    date: date
    notes: Optional[str] = None

class RosterDayCreate(RosterDayBase):
    pass

class RosterDayResponse(RosterDayBase):
    id: int
    created_by_user_id: int
    status: str
    
    class Config:
        orm_mode = True

class RosterDayDetailResponse(RosterDayResponse):
    departments: List[DepartmentRosterGroup]

# --- Roster Generate Request ---
class RosterGenerateRequest(BaseModel):
    # Optional config for rule overrides
    min_staff_per_shift: int = 1
    exclude_staff_ids: List[int] = []
    
# --- Staff Availability ---
class StaffAvailabilityBase(BaseModel):
    staff_id: int
    date: date
    available: bool = True
    reason: Optional[str] = None

class StaffAvailabilityCreate(StaffAvailabilityBase):
    pass

class StaffAvailabilityResponse(StaffAvailabilityBase):
    id: int

    class Config:
        orm_mode = True

# --- Coverage Target Response ---
class HourlyCoverage(BaseModel):
    hour: int
    active_staff_count: int

class DepartmentCoverage(BaseModel):
    department_id: int
    department_name: str
    hourly_coverage: List[HourlyCoverage]

class CoverageResponse(BaseModel):
    date: date
    departments: List[DepartmentCoverage]
