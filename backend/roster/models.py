from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    name = Column(String, index=True, nullable=False)

    department = relationship("Department")


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)  # "Morning", "Evening", "Custom"
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)


class RosterDay(Base):
    __tablename__ = "roster_days"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False, unique=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="draft")  # "draft" or "published"
    notes = Column(String, nullable=True)

    creator = relationship("User")
    assignments = relationship("RosterAssignment", back_populates="roster_day", cascade="all, delete-orphan")


class RosterAssignment(Base):
    __tablename__ = "roster_assignments"

    id = Column(Integer, primary_key=True, index=True)
    roster_day_id = Column(Integer, ForeignKey("roster_days.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    staff_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    shift_start_time = Column(Time, nullable=False)
    shift_end_time = Column(Time, nullable=False)
    shift_label = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    room_number = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    roster_day = relationship("RosterDay", back_populates="assignments")
    department = relationship("Department")
    unit = relationship("Unit")
    staff = relationship("User")


class StaffAvailability(Base):
    __tablename__ = "staff_availability"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, index=True, nullable=False)
    available = Column(Boolean, default=True)
    reason = Column(String, nullable=True)

    staff = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    payload_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User")
