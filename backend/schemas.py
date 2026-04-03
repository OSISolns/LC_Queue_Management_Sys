from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional, List
from enum import Enum

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
        orm_mode = True

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
    doctor_name: Optional[str] = None

    class Config:
        orm_mode = True

# Queue Schemas
class QueueBase(BaseModel):
    patient_name: str
    priority_id: int
    target_dept: Optional[str] = None
    target_room: Optional[str] = None
    visit_type: Optional[str] = None
    doctor_id: Optional[int] = None
    department_id: Optional[int] = None

class QueueCreate(QueueBase):
    patient_id: Optional[int] = None  # Link to patient registry if available
    phone_number: Optional[str] = None  # Phone number from kiosk registration
    gender: Optional[str] = None # Gender for new patients

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
    created_by_id: Optional[int] = None
    registrar_name: Optional[str] = None
    department_id: Optional[int] = None
    room_number: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_gender: Optional[str] = None
    patient_dob: Optional[str] = None
    priority_name: Optional[str] = None

    class Config:
        orm_mode = True

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
        orm_mode = True

# Room Schemas
class RoomBase(BaseModel):
    name: str
    floor: Optional[str] = None
    extension: Optional[str] = None

class RoomCreate(RoomBase):
    department_id: Optional[int] = None

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    floor: Optional[str] = None
    extension: Optional[str] = None

class Room(RoomBase):
    id: int
    department_id: Optional[int] = None
    class Config:
        orm_mode = True

# Role Schemas
class RoleBase(BaseModel):
    name: str
    category: Optional[str] = None

class Role(RoleBase):
    id: int
    class Config:
        orm_mode = True

# User Schemas
class Salutation(str, Enum):
    DR = "Dr."
    MR = "Mr."
    MRS = "Mrs."
    MS = "Ms."

class UserBase(BaseModel):
    username: str
    role_id: int
    department_id: Optional[int] = None
    room_number: Optional[str] = None
    is_active: Optional[bool] = True
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    salutation: Optional[str] = None
    profile_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    role_id: Optional[int] = None
    department_id: Optional[int] = None
    room_number: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    salutation: Optional[str] = None
    profile_picture: Optional[str] = None

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str # This will be the category for permissions
    role_title: str # This will be the specific title for display
    username: str
    room_number: Optional[str] = None
    id: int
    first_login_today: bool = False
    salutation: Optional[str] = None
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None # Category

class LoginRequest(BaseModel):
    username: str
    password: str

# SMS Schemas
class MessageType(str, Enum):
    TEST_RESULTS = "test_results"
    APPOINTMENT = "appointment"
    PAYMENT = "payment"
    GENERAL = "general"

class SMSSendRequest(BaseModel):
    patient_id: Optional[int] = None
    phone_number: str
    message_body: str
    message_type: Optional[MessageType] = MessageType.GENERAL

class SMSHistoryResponse(BaseModel):
    id: int
    patient_id: Optional[int]
    phone_number: str
    message_body: str
    message_type: Optional[str]
    sent_by_user_id: int
    sent_at: datetime
    status: str
    
    class Config:
        orm_mode = True

class PatientForSMS(BaseModel):
    id: int
    mrn: str
    first_name: str
    last_name: str
    phone_number: Optional[str]
    last_visit_date: Optional[datetime]
    
    class Config:
        orm_mode = True

class MessageTemplate(BaseModel):
    type: MessageType
    template: str
    description: str


class SettingBase(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class SettingResponse(SettingBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class UserDeleteRequest(BaseModel):
    admin_password: str
    reason: str

class HistoryDeleteRequest(BaseModel):
    admin_password: str
    reason: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# ==========================================
# Secure File Sharing Hub Schemas
# ==========================================

class FileCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class FileCategoryCreate(FileCategoryBase):
    pass

class FileCategoryResponse(FileCategoryBase):
    id: int

    class Config:
        orm_mode = True

class DocumentRoleAccessBase(BaseModel):
    role_id: int
    permission_type: str # "view_only" or "view_download"

class DocumentRoleAccessCreate(DocumentRoleAccessBase):
    pass

class DocumentRoleAccessResponse(DocumentRoleAccessBase):
    id: int
    document_id: int
    role: Optional[Role] = None

    class Config:
        orm_mode = True

class DocumentBase(BaseModel):
    original_name: str
    category_id: Optional[int] = None

class DocumentResponse(DocumentBase):
    id: int
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    upload_date: datetime
    uploaded_by_id: int
    is_active: bool
    role_access: List[DocumentRoleAccessResponse] = []
    category: Optional[FileCategoryResponse] = None

    class Config:
        orm_mode = True

class FileAuditLogResponse(BaseModel):
    id: int
    user_id: int
    document_id: int
    action: str
    timestamp: datetime
    ip_address: Optional[str] = None
    user: Optional[User] = None
    document: Optional[DocumentResponse] = None

    class Config:
        orm_mode = True

# ==========================================
# Patient Portal Schemas
# ==========================================

class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    reason: Optional[str] = None
    status: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    # We can add more info if needed
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None

    class Config:
        orm_mode = True

class DoctorReviewBase(BaseModel):
    patient_id: int
    doctor_id: int
    rating: int  # 1-5
    comment: Optional[str] = None

class DoctorReviewCreate(DoctorReviewBase):
    pass

class DoctorReviewResponse(DoctorReviewBase):
    id: int
    created_at: datetime
    patient_name: Optional[str] = None

    class Config:
        orm_mode = True

class PublicDoctorResponse(BaseModel):
    id: int
    full_name: Optional[str]
    salutation: Optional[str]
    department_name: Optional[str]
    room_number: Optional[str]
    email: Optional[str]
    phone_number: Optional[str]
    is_available: bool
    average_rating: float = 0.0
    review_count: int = 0
    profile_picture: Optional[str] = None
    roster: list = []

    class Config:
        orm_mode = True

class PublicAppointment(BaseModel):
    id: int
    appointment_date: datetime
    reason: Optional[str] = None
    status: str
    doctor_name: str
    doctor_department: str

class PublicMessage(BaseModel):
    id: int
    message_body: str
    message_type: Optional[str] = None
    sent_at: datetime

class PatientDashboardResponse(BaseModel):
    patient: PatientResponse
    appointments: list[PublicAppointment] = []
    messages: list[PublicMessage] = []

# ==========================================
# Observation & Medication Schemas
# ==========================================

class ObservationNoteBase(BaseModel):
    patient_id: int
    content: str
    nurse_id: Optional[int] = None

class ObservationNoteCreate(ObservationNoteBase):
    pass

class ObservationNoteResponse(ObservationNoteBase):
    id: int
    created_at: datetime
    nurse_name: Optional[str] = None

    class Config:
        orm_mode = True

class MedicationAdministrationBase(BaseModel):
    patient_id: int
    medication_name: str
    dosage: Optional[str] = None
    route: Optional[str] = None
    notes: Optional[str] = None
    nurse_id: Optional[int] = None

class MedicationAdministrationCreate(MedicationAdministrationBase):
    pass

class MedicationAdministrationResponse(MedicationAdministrationBase):
    id: int
    administered_at: datetime
    nurse_name: Optional[str] = None

    class Config:
        orm_mode = True

class UserRoomUpdate(BaseModel):
    room_number: str

class PatientVitalsBase(BaseModel):
    patient_id: int
    temperature: Optional[str] = None
    weight: Optional[str] = None
    height: Optional[str] = None
    blood_pressure: Optional[str] = None
    heart_rate: Optional[str] = None
    respiratory_rate: Optional[str] = None
    spo2: Optional[str] = None
    bmi: Optional[str] = None
    notes: Optional[str] = None
    queue_id: Optional[int] = None
    visit_id: Optional[int] = None

class PatientVitalsCreate(PatientVitalsBase):
    nurse_id: Optional[int] = None

class PatientVitalsResponse(PatientVitalsBase):
    id: int
    nurse_id: Optional[int]
    nurse_name: Optional[str] = None
    recorded_at: datetime
    queue_id: Optional[int] = None
    visit_id: Optional[int] = None

    class Config:
        orm_mode = True
