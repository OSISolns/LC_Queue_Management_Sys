from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional, List

# Patient Schemas
class PatientBase(BaseModel):
    mrn: str
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    medical_notes: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    medical_notes: Optional[str] = None
    is_active: Optional[bool] = None

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# Visit History Schemas
class VisitHistoryBase(BaseModel):
    patient_id: int
    department: Optional[str] = None
    room: Optional[str] = None
    doctor_id: Optional[int] = None
    visit_type: Optional[str] = None
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    prescription: Optional[str] = None
    notes: Optional[str] = None

class VisitHistoryCreate(VisitHistoryBase):
    pass

class VisitHistoryUpdate(BaseModel):
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    prescription: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class VisitHistoryResponse(VisitHistoryBase):
    id: int
    queue_id: Optional[int] = None
    visit_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Queue Schemas
class QueueBase(BaseModel):
    patient_name: str
    priority_id: int
    target_dept: Optional[str] = None
    target_room: Optional[str] = None
    visit_type: Optional[str] = None
    doctor_id: Optional[int] = None

class QueueCreate(QueueBase):
    patient_id: Optional[int] = None  # Link to patient registry if available

class QueueUpdate(BaseModel):
    status: str
    doctor_id: Optional[int] = None
    room_number: Optional[str] = None

class QueueResponse(QueueBase):
    id: int
    token_number: str
    patient_id: Optional[int] = None
    status: str
    created_at: datetime
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    room_number: Optional[str] = None

    class Config:
        from_attributes = True

class CallNextRequest(BaseModel):
    doctor_id: int
    room_number: str


# Department Schemas
class DepartmentBase(BaseModel):
    name: str

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: int
    class Config:
        from_attributes = True

# Room Schemas
class RoomBase(BaseModel):
    name: str

class RoomCreate(RoomBase):
    department_id: int

class Room(RoomBase):
    id: int
    department_id: int
    class Config:
        from_attributes = True

# Role Schemas
class RoleBase(BaseModel):
    name: str

class Role(RoleBase):
    id: int
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    username: str
    role_id: int
    department_id: Optional[int] = None
    room_number: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    role_id: Optional[int] = None
    department_id: Optional[int] = None
    room_number: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    room_number: Optional[str] = None
    id: int

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

