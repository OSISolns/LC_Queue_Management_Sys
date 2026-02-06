# Database Schema Documentation

## Overview
The LC Queue Management System now includes a comprehensive database for managing users, patients, queue entries, and visit history.

## Database Tables

### 1. **patients** - Patient Registry
Stores persistent patient information for long-term reference.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `mrn` | String | Medical Record Number (unique) |
| `first_name` | String | Patient's first name |
| `last_name` | String | Patient's last name |
| `date_of_birth` | Date | Date of birth |
| `gender` | String | Gender (Male/Female/Other) |
| `phone_number` | String | Contact phone number |
| `email` | String | Email address |
| `address` | Text | Home address |
| `emergency_contact_name` | String | Emergency contact name |
| `emergency_contact_phone` | String | Emergency contact phone |
| `blood_type` | String | Blood type (A+, B-, etc.) |
| `allergies` | Text | Known allergies |
| `medical_notes` | Text | General medical notes |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |
| `is_active` | Boolean | Active status |

**Relationships:**
- One-to-Many with `queue` (patient can have multiple queue entries)
- One-to-Many with `visit_history` (patient can have multiple visits)

---

### 2. **visit_history** - Visit Tracking
Tracks all patient visits for historical reference and medical records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `patient_id` | Integer | Foreign key to patients table |
| `queue_id` | Integer | Foreign key to queue table (optional) |
| `visit_date` | DateTime | Date and time of visit |
| `department` | String | Department visited |
| `room` | String | Room number |
| `doctor_id` | Integer | Foreign key to users table (doctor) |
| `visit_type` | String | Type (New Patient/Follow-up/Emergency) |
| `chief_complaint` | Text | Patient's main complaint |
| `diagnosis` | Text | Doctor's diagnosis |
| `treatment` | Text | Treatment provided |
| `prescription` | Text | Medications prescribed |
| `notes` | Text | Additional notes |
| `status` | String | Visit status (completed/no-show/cancelled) |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

**Relationships:**
- Many-to-One with `patients` (visit belongs to one patient)
- Many-to-One with `users` (visit handled by one doctor)
- One-to-One with `queue` (optional link to queue entry)

---

### 3. **queue** - Queue Management
Manages the current queue of patients waiting for service.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `token_number` | String | Queue token/ticket number |
| `patient_id` | Integer | Foreign key to patients (optional) |
| `patient_name` | String | Patient name (for walk-ins) |
| `priority_id` | Integer | Foreign key to priority_levels |
| `status` | String | waiting/calling/completed/no-show |
| `doctor_id` | Integer | Foreign key to users (doctor) |
| `room_number` | String | Assigned room number |
| `target_dept` | String | Target department |
| `target_room` | String | Target room |
| `visit_type` | String | Visit type |
| `created_at` | DateTime | Entry creation time |
| `called_at` | DateTime | Time patient was called |
| `completed_at` | DateTime | Time visit completed |

**Relationships:**
- Many-to-One with `patients` (optional, for registered patients)
- Many-to-One with `priority_levels`
- Many-to-One with `users` (doctor)

---

### 4. **priority_levels** - Priority Configuration
Defines priority levels for queue management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Priority name (Emergency/VIP/Standard) |
| `weight` | Integer | Priority weight (0=highest, 2=lowest) |

**Default Values:**
- Emergency (weight: 0)
- VIP (weight: 1)
- Standard (weight: 2)

---

### 5. **users** - System Users
Stores user accounts for doctors, admin, and helpdesk staff.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `username` | String | Unique username |
| `hashed_password` | String | Bcrypt hashed password |
| `role_id` | Integer | Foreign key to roles |
| `is_active` | Boolean | Account active status |

**Relationships:**
- Many-to-One with `roles`
- One-to-Many with `queue` (as doctor)
- One-to-Many with `visit_history` (as doctor)

---

### 6. **roles** - User Roles
Defines user role types.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Role name (Admin/Doctor/Helpdesk) |

**Default Roles:**
- Admin (full system access)
- Doctor (queue management, patient care)
- Helpdesk (patient registration)

---

### 7. **departments** - Hospital Departments
Stores department information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Department name |

**Default Departments:**
- General Medicine
- Pediatrics
- Cardiology
- Orthopedics
- Emergency

---

### 8. **rooms** - Room Management
Stores room information linked to departments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Room name/number |
| `department_id` | Integer | Foreign key to departments |

---

## Database Relationships Diagram

```
patients (1) ──────< (M) queue
    │
    └──────< (M) visit_history ────> (1) users (doctor)
                     │
                     └──────> (1) queue (optional)

priority_levels (1) ──────< (M) queue

users (1) ──────< (M) queue (as doctor)
  │
  └────> (1) roles

departments (1) ──────< (M) rooms
```

## Key Features

### 1. **Patient Registry**
- Persistent storage of patient demographics
- Unique Medical Record Number (MRN) for each patient
- Emergency contact information
- Medical history (allergies, blood type, notes)

### 2. **Visit History**
- Complete tracking of all patient visits
- Links to patient records and queue entries
- Stores diagnosis, treatment, and prescriptions
- Supports medical record keeping

### 3. **Queue Management**
- Real-time queue tracking
- Priority-based ordering
- Links to patient registry (optional)
- Supports walk-in patients without registration

### 4. **User Management**
- Role-based access control
- Secure password hashing
- Support for multiple user types

## Database File Location

**SQLite Database:** `c:/Users/Valer/OneDrive/Documents/LC_Queuing-Sys/queue.db`

## Initialization

To initialize or reset the database:

```bash
python -m backend.init_database
```

This will:
- Create all tables
- Seed default priority levels
- Seed default roles
- Create admin user (username: admin, password: admin123)
- Create default departments and rooms

## Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

## API Endpoints (To Be Implemented)

### Patient Management
- `POST /patients` - Create new patient
- `GET /patients` - List all patients
- `GET /patients/{id}` - Get patient details
- `PUT /patients/{id}` - Update patient
- `GET /patients/search?mrn={mrn}` - Search by MRN

### Visit History
- `POST /visits` - Create visit record
- `GET /visits/patient/{patient_id}` - Get patient visit history
- `PUT /visits/{id}` - Update visit record

### Queue Management (Existing)
- `POST /queue` - Add to queue
- `GET /queue` - Get current queue
- `POST /call-next` - Call next patient
- `PUT /queue/{id}` - Update queue entry

## Notes

- The system supports both registered patients (with MRN) and walk-in patients
- Queue entries can optionally link to patient records
- Visit history automatically tracks completed queue entries
- All timestamps use UTC
- Passwords are hashed using bcrypt
