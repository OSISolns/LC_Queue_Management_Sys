from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Text
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    queue_entries = relationship("Queue", back_populates="patient")
    visit_history = relationship("VisitHistory", back_populates="patient", order_by="desc(VisitHistory.visit_date)")

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.mrn})"


class Queue(Base):
    __tablename__ = "queue"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)  # Link to patient registry
    patient_name = Column(String)  # Keep for backward compatibility and walk-ins
    priority_id = Column(Integer, ForeignKey("priority_levels.id"))
    status = Column(String, default="waiting") # waiting, calling, completed, no-show
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    room_number = Column(String, nullable=True)
    target_dept = Column(String, nullable=True)
    target_room = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    called_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    visit_type = Column(String, nullable=True)  # New Patient, Follow-up, Emergency

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
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
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
    status = Column(String, default="completed")  # completed, no-show, cancelled
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="visit_history")
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
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    salutation = Column(String, nullable=True)
    last_login = Column(DateTime, nullable=True)
    
    role = relationship("Role", back_populates="users")
    department = relationship("Department")

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
