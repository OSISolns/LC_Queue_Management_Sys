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
    
    department = relationship("Department", back_populates="rooms")

    def __str__(self):
        return self.name

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # Admin, Doctor, Helpdesk
    
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
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    room_number = Column(String, nullable=True)
    
    role = relationship("Role", back_populates="users")
    department = relationship("Department")

    def __str__(self):
        return self.username

