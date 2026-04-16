from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from sqlalchemy import Boolean


class PriorityLevel(Base):
    __tablename__ = "priority_levels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    weight = Column(Integer, default=2) # 0=Emergency, 1=VIP, 2=Standard

    queue_entries = relationship("Queue", back_populates="priority")

    def __str__(self):
        return self.name


class Patient(Base):
    """Patient Registry - Stores persistent patient information"""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String, unique=True, index=True, nullable=False)  # Medical Record Number
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)  # Male, Female, Other
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    blood_type = Column(String, nullable=True)
    allergies = Column(Text, nullable=True)
    medical_notes = Column(Text, nullable=True)
    insurance = Column(String, nullable=True)
    
    # New identification fields for Clinical Sheet
    occupation = Column(String, nullable=True)
    national_id = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    province = Column(String, nullable=True)
    district = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    next_of_kin_relationship = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    queue_entries = relationship("Queue", back_populates="patient", cascade="all, delete-orphan")
    vitals = relationship("PatientVitals", back_populates="patient", cascade="all, delete-orphan")
    notes = relationship("ObservationNote", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("MedicationAdministration", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    reviews = relationship("DoctorReview", back_populates="patient", cascade="all, delete-orphan")
    visits = relationship("VisitHistory", back_populates="patient", cascade="all, delete-orphan")
    charges = relationship("PatientCharge", back_populates="patient", cascade="all, delete-orphan")
    notifications = relationship("ClinicNotification", back_populates="patient", cascade="all, delete-orphan")

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.mrn})"


class Queue(Base):
    __tablename__ = "queue"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=True)  # Link to patient registry
    patient_name = Column(String)  # Keep for backward compatibility and walk-ins
    priority_id = Column(Integer, ForeignKey("priority_levels.id"))
    status = Column(String, default="waiting") # waiting, calling, serving, completed, skipped, no-show
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    room_number = Column(String, nullable=True)
    target_dept = Column(String, nullable=True)
    target_room = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    called_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    skipped_at = Column(DateTime, nullable=True)
    previous_status = Column(String, nullable=True) # For Undo
    visit_type = Column(String, nullable=True)  # New Patient, Follow-up, Emergency
    doctor_notes = Column(Text, nullable=True)   # Doctor's consultation notes

    # Relationships
    priority = relationship("PriorityLevel", back_populates="queue_entries")
    patient = relationship("Patient", back_populates="queue_entries")
    doctor = relationship("User", foreign_keys=[doctor_id])
    registrar = relationship("User", foreign_keys=[created_by_id])

    @property
    def doctor_name(self):
        if not self.doctor: return None
        name = self.doctor.full_name or self.doctor.username
        if self.doctor.salutation:
            return f"{self.doctor.salutation} {name}"
        return name

    @property
    def doctor_room(self):
        if not self.doctor: return None
        return self.doctor.room_number

    @property
    def doctor_floor(self):
        if not self.doctor: return None
        return self.doctor.floor

    @property
    def registrar_name(self):
        if not self.registrar: return None
        name = self.registrar.full_name or self.registrar.username
        if self.registrar.salutation:
            return f"{self.registrar.salutation} {name}"
        return name

    @property
    def patient_phone(self):
        return self.patient.phone_number if self.patient else None

    @property
    def patient_gender(self):
        return self.patient.gender if self.patient else None

    @property
    def patient_dob(self):
        return str(self.patient.date_of_birth) if self.patient and self.patient.date_of_birth else None

    @property
    def priority_name(self):
        return self.priority.name if self.priority else None

    @property
    def wait_duration(self):
        """Duration spent waiting in minutes"""
        if self.created_at and self.called_at:
            diff = self.called_at - self.created_at
            return int(diff.total_seconds() // 60)
        elif self.created_at and self.status == 'waiting':
            diff = datetime.utcnow() - self.created_at
            return int(diff.total_seconds() // 60)
        return 0

    @property
    def service_duration(self):
        """Duration spent in service in minutes"""
        if self.called_at and self.completed_at:
            diff = self.completed_at - self.called_at
            return int(diff.total_seconds() // 60)
        elif self.called_at and self.status == 'calling':
            diff = datetime.utcnow() - self.called_at
            return int(diff.total_seconds() // 60)
        return 0


class VisitHistory(Base):
    """Track all patient visits for historical reference"""
    __tablename__ = "visit_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    queue_id = Column(Integer, ForeignKey("queue.id"), nullable=True)
    visit_date = Column(DateTime, default=datetime.utcnow)
    department = Column(String, nullable=True)
    room = Column(String, nullable=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    visit_type = Column(String, nullable=True)  # New Patient, Follow-up, Emergency
    chief_complaint = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    treatment = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    status = Column(String, default="completed")  # completed, no-show, cancelled
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="visits")
    doctor = relationship("User", foreign_keys=[doctor_id])

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    rooms = relationship("Room", back_populates="department")

    def __str__(self):
        return self.name

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    floor = Column(String, nullable=True)
    extension = Column(String, nullable=True)  # Internal phone extension e.g. "1124"
    
    department = relationship("Department", back_populates="rooms")

    def __str__(self):
        return self.name

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # Specific title like "Pediatrics", "Imaging Technologist"
    category = Column(String, nullable=True) # Permission group like "Doctor", "Technician", "Admin", "Helpdesk"
    
    users = relationship("User", back_populates="role")

    def __str__(self):
        return self.name

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"))
    is_active = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True) # For doctors/staff availability status
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    room_number = Column(String, nullable=True)
    floor = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    salutation = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    last_login = Column(DateTime, nullable=True)
    
    role = relationship("Role", back_populates="users")
    department = relationship("Department")
    appointments = relationship("Appointment", back_populates="doctor")
    reviews = relationship("DoctorReview", back_populates="doctor")

    def __str__(self):
        return self.username

class SMSHistory(Base):
    """Track SMS notifications sent to patients"""
    __tablename__ = "sms_history"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    phone_number = Column(String, nullable=False)
    message_body = Column(Text, nullable=False)
    message_type = Column(String, nullable=True)  # test_results, appointment, payment, general
    sent_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="sent")  # sent, failed, delivered
    
    # Relationships
    patient = relationship("Patient")
    sent_by = relationship("User", foreign_keys=[sent_by_user_id])
    
    def __str__(self):
        return f"SMS to {self.phone_number} at {self.sent_at}"


class SMSTemplate(Base):
    __tablename__ = "sms_templates"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, unique=True, index=True)  # test_results, appointment, payment, etc.
    template = Column(Text, nullable=False)
    description = Column(String, nullable=True)

    def __str__(self):
        return self.type



class DoctorRoster(Base):
    """Weekly availability schedule for each doctor"""
    __tablename__ = "doctor_rosters"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(String, nullable=False)  # Monday, Tuesday, ...
    status = Column(String, default="available")   # available, on_call, not_available
    schedule_text = Column(String, nullable=True)  # Detailed times e.g. 8:00 AM - 5:00 PM
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = relationship("User", foreign_keys=[doctor_id])

    def __str__(self):
        return f"{self.doctor_id} - {self.day_of_week}: {self.status}"


class Setting(Base):
    """General system settings configured by admins"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __str__(self):
        return self.key


# ==========================================
# Secure File Sharing Hub Models
# ==========================================

class FileCategory(Base):
    __tablename__ = "file_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    documents = relationship("Document", back_populates="category")

    def __str__(self):
        return self.name

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False) # e.g., safe UUID-based name on disk
    original_name = Column(String, nullable=False) # original name e.g. "report.pdf"
    stored_path = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("file_categories.id"), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    file_size = Column(Integer, nullable=True) # size in bytes
    mime_type = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    category = relationship("FileCategory", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    role_access = relationship("DocumentRoleAccess", back_populates="document", cascade="all, delete-orphan")
    audit_logs = relationship("FileAuditLog", back_populates="document", cascade="all, delete-orphan")

    def __str__(self):
        return self.original_name

class DocumentRoleAccess(Base):
    __tablename__ = "document_role_access"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    permission_type = Column(String, nullable=False, default="view_only") # view_only, view_download

    document = relationship("Document", back_populates="role_access")
    role = relationship("Role")

class FileAuditLog(Base):
    __tablename__ = "file_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    action = Column(String, nullable=False) # view, download, denied
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    document = relationship("Document", back_populates="audit_logs")


# ==========================================
# Server-Side Session Tracking
# ==========================================

class UserSession(Base):
    """
    Tracks active user sessions for server-side idle timeout enforcement.
    A row is created on login and deleted on logout.
    last_activity is updated on every authenticated request.
    If last_activity is older than IDLE_TIMEOUT_SECONDS, the session is rejected.
    """
    __tablename__ = "user_sessions"

    id            = Column(Integer, primary_key=True, index=True)
    token_hash    = Column(String, unique=True, index=True, nullable=False)  # SHA-256 of the JWT
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

    def __str__(self):
        return f"Session(user_id={self.user_id}, last={self.last_activity})"

# ==========================================
# Patient Portal Models
# ==========================================

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled, no-show
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User", back_populates="appointments")

class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="reviews")
    doctor = relationship("User", back_populates="reviews")

class ObservationNote(Base):
    """Nurses notes for patients under observation"""
    __tablename__ = "observation_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    nurse_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nurse who wrote the note
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient")
    nurse = relationship("User")

    @property
    def nurse_name(self):
        if not self.nurse: return "Unknown Nurse"
        name = self.nurse.full_name or self.nurse.username
        if self.nurse.salutation:
            return f"{self.nurse.salutation} {name}"
        return name

class PatientVitals(Base):
    """Patient Vitals - Recorded by Nursing staff during Triage"""
    __tablename__ = "patient_vitals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    nurse_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Core Vitals
    temperature = Column(String, nullable=True) # °C
    weight = Column(String, nullable=True)      # kg
    height = Column(String, nullable=True)      # cm
    blood_pressure = Column(String, nullable=True) # 120/80
    heart_rate = Column(String, nullable=True)     # bpm
    respiratory_rate = Column(String, nullable=True) # bpm
    spo2 = Column(String, nullable=True)           # %
    bmi = Column(String, nullable=True)
    
    # Links to associate vitals with a specific visit/token
    queue_id = Column(Integer, ForeignKey("queue.id"), nullable=True)
    visit_id = Column(Integer, ForeignKey("visit_history.id"), nullable=True)
    
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient")
    nurse = relationship("User")
    queue_entry = relationship("Queue")
    visit_history = relationship("VisitHistory")

    @property
    def nurse_name(self):
        num = self.nurse.full_name or self.nurse.username if self.nurse else "Unknown Nurse"
        if self.nurse and self.nurse.salutation:
            return f"{self.nurse.salutation} {num}"
        return num

class MedicationAdministration(Base):
    """Track medications administered by nurses"""
    __tablename__ = "medication_administrations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    nurse_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    medication_name = Column(String, nullable=False)
    dosage = Column(String, nullable=True)
    route = Column(String, nullable=True) # Oral, IV, etc.
    administered_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    # Relationships
    patient = relationship("Patient")
    nurse = relationship("User")

    @property
    def nurse_name(self):
        if not self.nurse: return "Unknown Nurse"
        name = self.nurse.full_name or self.nurse.username
        if self.nurse.salutation:
            return f"{self.nurse.salutation} {name}"
        return name

class ClinicNotification(Base):
    """System-wide notifications for emergencies, legal documentation, and clinical events"""
    __tablename__ = "clinic_notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")  # info, emergency, death, legal, sync
    priority = Column(Integer, default=1)   # 0=Critical, 1=Normal, 2=Low
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    
    # Metadata for legal/emergency tracing
    nurse_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=True)
    room_number = Column(String, nullable=True)

    # Relationships
    nurse = relationship("User", foreign_keys=[nurse_id])
    patient = relationship("Patient", back_populates="notifications")

    def __str__(self):
        return f"{self.type.upper()}: {self.title} ({self.created_at})"

class ClinicalSheet(Base):
    """Permanent storage for the full Clinical Observation Sheet"""
    __tablename__ = "clinical_sheets"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    visit_id = Column(Integer, ForeignKey("visit_history.id"), nullable=True)
    queue_id = Column(Integer, ForeignKey("queue.id"), nullable=True)
    
    # We store the structured data as a JSON blob for maximum flexibility 
    # while allowing the UI to maintain its complex schema
    data = Column(Text, nullable=False) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    patient = relationship("Patient")
    visit = relationship("VisitHistory")
    recorder = relationship("User")

class Consumable(Base):
    __tablename__ = "consumables"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, nullable=True) # e.g. Medication, Consumable, Lab
    price = Column(Float, default=0.0)
    unit = Column(String, default="pcs")
    is_active = Column(Boolean, default=True)

class PatientCharge(Base):
    __tablename__ = "patient_charges"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"))
    queue_id = Column(Integer, ForeignKey("queue.id"), nullable=True)
    consumable_id = Column(Integer, ForeignKey("consumables.id"))
    quantity = Column(Integer, default=1)
    price_at_time = Column(Float)
    total_amount = Column(Float)
    nurse_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    patient = relationship("Patient")
    consumable = relationship("Consumable")
    nurse = relationship("User")
