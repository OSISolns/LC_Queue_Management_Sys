# LC Queue Management System - User Documentation

![Legacy Clinics](file:///home/noble/Documents/LC_APPS/LC_Queuing-Sys/Images/logo.png)

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles and Access](#user-roles-and-access)
3. [Getting Started](#getting-started)
4. [Role-Specific Guides](#role-specific-guides)
5. [System Features](#system-features)
6. [Technical Requirements](#technical-requirements)

---

## System Overview

The **LC Queue Management System** is a comprehensive patient queue management solution designed for Legacy Clinics. The system provides real-time queue tracking, priority-based patient management, and seamless coordination between different clinical departments.

### Key Components

| Component | Purpose | Access Level |
|-----------|---------|--------------|
| **Kiosk** | Patient registration and check-in | Helpdesk Staff |
| **Doctor Dashboard** | Call and manage patients | Doctors, Nurses, Technicians |
| **Admin Dashboard** | System administration and reports | Admin only |
| **Public Display** | Real-time queue status for patients | Public (No login required) |

---

## User Roles and Access

The system supports **four primary user roles**, each with specific permissions and responsibilities:

### 1. 👨‍⚕️ **Doctor** Role

**Purpose:** Medical professionals who provide patient consultations and treatments.

#### Access Rights:
- ✅ Call next patient from the queue
- ✅ View patients assigned to their room/department
- ✅ Complete patient consultations
- ✅ Mark patients as no-show
- ✅ Recall patients who were marked as no-show
- ❌ Cannot register new patients
- ❌ Cannot access admin functions

#### Requirements:
- **Account Setup:** Admin must create doctor account
- **Assignment:** Must be assigned to a specific room and department
- **Profile Information:** Full name, salutation (Dr.), email, phone number

#### Default Login:
No default doctor accounts. Admins create doctor accounts as needed.

---

### 2. 🏥 **Helpdesk** Role

**Purpose:** Front desk staff responsible for patient registration and queue management.

#### Access Rights:
- ✅ Register new patients at the kiosk
- ✅ View waiting, calling, completed, and no-show lists
- ✅ Search for existing patients by name or MRN
- ✅ Assign patients to doctors, departments, or rooms
- ✅ Set patient priority (Emergency, VIP, Standard)
- ✅ Recall patients from no-show list
- ❌ Cannot call patients
- ❌ Cannot access admin functions

#### Requirements:
- **Account Setup:** Admin must create helpdesk account
- **Assignment:** May be assigned to a specific room (optional)
- **Profile Information:** Username, email (optional), phone number (optional)

#### Default Login:
No default helpdesk accounts. Admins create helpdesk accounts as needed.

---

### 3. 🔑 **Admin** Role

**Purpose:** System administrators with full access to all system functions.

#### Access Rights:
- ✅ **Full System Access:** All features available
- ✅ **User Management:** Create, edit, delete user accounts
- ✅ **Role Assignment:** Assign roles to users
- ✅ **Department Management:** Create and manage departments
- ✅ **Room Management:** Create and assign rooms to departments
- ✅ **Patient Registry:** Manage patient records
- ✅ **Reports and Analytics:** View comprehensive reports including:
  - Queue statistics
  - Completion rates
  - Average wait times
  - Consultation duration
  - Department-wise breakdown
- ✅ **System Configuration:** Access to database admin panel
- ✅ **Priority Management:** Configure priority levels

#### Requirements:
- **Account Setup:** Default admin account created during system initialization
- **Profile Information:** Full admin privileges, no department/room assignment needed

#### Default Login:
- **Username:** `admin`
- **Password:** `admin123`

> [!IMPORTANT]
> **Security Note:** Change the default admin password immediately after first login for security purposes.

---

### 4. 👨‍⚕️ **Nurse** and **Technician** Roles

**Purpose:** Medical support staff who assist with patient care.

#### Access Rights:
- ✅ Call next patient from the queue (similar to Doctor)
- ✅ View patients assigned to their room/department
- ✅ Complete patient consultations
- ✅ Mark patients as no-show
- ❌ Cannot register new patients
- ❌ Cannot access admin functions

#### Requirements:
- **Account Setup:** Admin must create accounts
- **Assignment:** Must be assigned to a specific room and department
- **Profile Information:** Full name, salutation (optional), email, phone number

---

## Getting Started

### System Access URLs

Once the system is running, access the different interfaces through:

| Interface | URL | Who Uses It |
|-----------|-----|-------------|
| **Landing Page** | `http://qs.legacyclinics.local` | Everyone (navigation page) |
| **Login** | `http://qs.legacyclinics.local/login` | All authenticated users |
| **Kiosk** | `http://qs.legacyclinics.local/kiosk` | Helpdesk staff |
| **Doctor Dashboard** | `http://qs.legacyclinics.local/dashboard` | Doctors, Nurses, Technicians |
| **Admin Dashboard** | `http://qs.legacyclinics.local/admin` | Administrators |
| **Public Display** | `http://qs.legacyclinics.local/display` | Public (TV screens in waiting area) |

### First-Time Setup

#### Step 1: System Installation
```bash
# Quick start (recommended)
./dev.sh
```

This will:
- Create virtual environment
- Install all dependencies
- Start backend and frontend servers

#### Step 2: Admin Login
1. Navigate to `http://qs.legacyclinics.local/login`
2. Use default credentials:
   - Username: `admin`
   - Password: `admin123`
3. **Change password immediately** for security

#### Step 3: Create User Accounts
1. Go to Admin Dashboard
2. Navigate to "Users" section
3. Create accounts for:
   - Doctors
   - Helpdesk staff
   - Nurses/Technicians

#### Step 4: Configure Departments and Rooms
1. In Admin Dashboard, go to "Departments"
2. Create departments (e.g., General Medicine, Pediatrics, Cardiology)
3. Create rooms and assign them to departments

---

## Role-Specific Guides

### 📋 For Helpdesk Staff (Kiosk)

#### How to Register a Patient

1. **Login** to the Kiosk interface
2. Navigate to the **Registration** tab
3. Fill in patient information:
   - **Patient Name:** Enter name or search for existing patient by MRN
   - **Phone Number:** Select country code and enter phone number (optional)
   - **Visit Type:** Select from:
     - Consultation (for doctor visits)
     - Procedure (for lab tests, imaging)
     - Review (follow-up visits)
4. **Select destination:**
   - **For Consultation/Review:** Choose the doctor from dropdown
   - **For Procedure:** Select the specific procedure
5. **Set Priority:**
   - **Emergency:** Critical/urgent cases (highest priority)
   - **VIP:** Special patients (high priority)
   - **Standard:** Regular patients (normal priority)
6. Click **"Get Ticket"**
7. **Print** the ticket voucher for the patient

> [!TIP]
> The system will automatically search for existing patients as you type. Select from suggestions to link to patient records.

#### How to View Queue Status

- **Waiting List:** Click the "Waiting List" tab
- **Serving:** Click the "Serving" tab to see patients currently being called
- **Completed:** View completed consultations
- **No Shows:** See patients who didn't respond to calls

#### How to Recall a No-Show Patient

1. Go to the **No Shows** tab
2. Find the patient in the list
3. Click the **"Recall"** button
4. Patient will be moved back to the waiting queue

---

### 👨‍⚕️ For Doctors, Nurses & Technicians (Dashboard)

#### How to Call the Next Patient

1. **Login** to the Doctor Dashboard
2. Your room number will be displayed at the top
3. Click the **"Call Next Patient"** button
4. The system will:
   - Select the next patient based on priority
   - Display patient information
   - Show patient details on public display
   - Announce the patient via text-to-speech

#### How to Call a Specific Patient

1. In the **Waiting Queue** section
2. Find the patient you want to call
3. Click the **"Call"** button next to their name
4. Patient will be called immediately

#### How to Complete a Consultation

1. After finishing with a patient
2. Click the **"Complete"** button
3. Patient will be moved to the completed list
4. The next patient can now be called

#### How to Mark a Patient as No-Show

1. If a patient doesn't respond to multiple calls
2. Click the **"No Show"** button
3. Patient will be moved to the no-show list
4. You can call the next patient

#### How to View Queue Statistics

The dashboard displays real-time statistics:
- **Total Waiting:** Number of patients in queue
- **Currently Serving:** Patients being called
- **Completed Today:** Number of completed consultations
- **No Shows:** Patients who didn't respond

---

### 🔑 For Administrators (Admin Dashboard)

#### User Management

##### Create a New User
1. Go to **Admin Dashboard** → **Users**
2. Click **"Create New User"**
3. Fill in user details:
   - Username (unique)
   - Password
   - Role (Admin, Doctor, Helpdesk, Nurse, Technician)
   - Department (for medical staff)
   - Room Number (for medical staff)
   - Full Name
   - Salutation (Dr., Mr., Mrs., Ms.)
   - Email
   - Phone Number
4. Click **"Create"**

##### Edit User
1. Find the user in the list
2. Click **"Edit"**
3. Update information as needed
4. Save changes

##### Deactivate User
1. Find the user
2. Click **"Edit"**
3. Uncheck **"Is Active"**
4. Save changes

#### Department Management

1. Go to **Departments** section
2. Click **"Create Department"**
3. Enter department name
4. Save

#### Room Management

1. Go to **Rooms** section
2. Click **"Create Room"**
3. Enter room name/number
4. Select department
5. Save

#### Patient Registry Management

1. Go to **Patients** section
2. View all registered patients
3. Edit patient information
4. View patient visit history

#### View Reports and Analytics

The admin dashboard provides comprehensive reports:

- **Daily Statistics:**
  - Total patients registered
  - Completed consultations
  - Average wait time
  - Average consultation duration
  - No-show rate

- **Department Breakdown:**
  - Patients per department
  - Department efficiency metrics

- **Queue Analytics:**
  - Real-time queue status
  - Historical trends
  - Priority distribution

---

## System Features

### 🔥 Priority Management

The system uses a **3-tier priority system**:

| Priority | Weight | Token Prefix | Description |
|----------|--------|--------------|-------------|
| **Emergency** | 0 (highest) | E-XXX | Critical/urgent medical cases |
| **VIP** | 1 | V-XXX | Special patients, elderly, pregnant |
| **Standard** | 2 (normal) | S-XXX | Regular patients |

**How Priority Works:**
- Emergency patients are always called first
- VIP patients are called before Standard patients
- Within the same priority, patients are called in FIFO (First In, First Out) order

### 📱 SMS Notifications (Optional)

When configured with Twilio:
- Patients receive SMS when called
- Notifications include token number and room number

### 🎤 Voice Announcements

- Public display plays text-to-speech announcements
- Announces token number and room number
- Automatic playback when patient is called

### 🔍 Patient Search

- Search by **Name** or **MRN (Medical Record Number)**
- Auto-suggestions while typing
- Links new queue entries to existing patient records

### 📊 Visit History Tracking

- Complete patient visit history
- Tracks:
  - Visit date and time
  - Department and room
  - Attending doctor
  - Chief complaint
  - Diagnosis
  - Treatment
  - Prescription
  - Consultation duration

### 🔄 Real-Time Updates

- Queue updates instantly via WebSocket
- No page refresh needed
- Public display updates automatically

---

## Technical Requirements

### For End Users

#### Minimum Requirements:
- **Web Browser:** 
  - Chrome 90+ (recommended)
  - Firefox 88+
  - Safari 14+
  - Edge 90+
- **Internet Connection:** Local network access
- **Screen Resolution:** 1024x768 minimum (1920x1080 recommended for public display)

#### Recommended Setup:
- **Kiosk Station:** Touchscreen PC or tablet
- **Doctor Workstations:** Desktop or laptop with stable network
- **Public Display:** Large TV/monitor with auto-refresh enabled

### For System Administrators

#### Server Requirements:
- **Operating System:** Linux, Windows, or macOS
- **Python:** 3.8 or higher
- **Node.js:** 14.x or higher
- **Database:** SQLite (included)
- **Disk Space:** 500MB minimum
- **RAM:** 2GB minimum

#### Network Requirements:
- **Ports:** 
  - Backend: 8000 (configurable)
  - Frontend: 5173 (configurable)
- **Connectivity:** All devices must be on the same local network

---

## Frequently Asked Questions (FAQ)

### General Questions

**Q: How do I reset the system?**  
A: Run `python backend/init_database.py` to reset the database to initial state.

**Q: Can patients register themselves?**  
A: No. Registration must be done by Helpdesk staff through the Kiosk interface.

**Q: What happens at the end of the day?**  
A: The system automatically expires waiting and calling patients after 10 PM.

### For Helpdesk

**Q: What if a patient doesn't have a phone number?**  
A: Phone number is optional. You can skip it and just enter the patient name.

**Q: Can I register the same patient multiple times?**  
A: Yes, if a patient needs multiple consultations. Each visit gets a unique token.

**Q: How do I handle walk-in patients without MRN?**  
A: Just enter their name. The system supports both registered and walk-in patients.

### For Doctors

**Q: Why can't I see all patients?**  
A: You only see patients assigned to your room/department for privacy and workflow efficiency.

**Q: Can I skip a patient and call someone else?**  
A: Yes, use the "Call" button next to specific patients in the waiting queue.

**Q: What if a patient arrives late after being marked no-show?**  
A: Helpdesk can recall the patient from the no-show list.

### For Admins

**Q: How do I backup the database?**  
A: Copy the `queue.db` file from the project root directory.

**Q: Can I change user passwords?**  
A: Yes, edit the user and enter a new password.

**Q: How do I add a new department?**  
A: Go to Admin Dashboard → Departments → Create New Department.

---

## Support and Troubleshooting

### Common Issues

#### Issue: Can't login
- **Solution:** Verify username and password
- **Check:** Account is active (not deactivated by admin)
- **Contact:** System administrator to reset password

#### Issue: Public display not updating
- **Solution:** Refresh the browser page
- **Check:** Network connection
- **Check:** Backend server is running

#### Issue: Can't register patient
- **Solution:** Ensure all required fields are filled
- **Check:** Doctor must be selected for consultations
- **Check:** Procedure must be selected for procedures

#### Issue: Ticket not printing
- **Solution:** Check printer connection
- **Alternative:** Use browser print function (Ctrl+P or Cmd+P)

---

## System URLs Quick Reference

| Role | Interface | URL |
|------|-----------|-----|
| **Everyone** | Landing Page | `http://qs.legacyclinics.local` |
| **Everyone** | Login | `http://qs.legacyclinics.local/login` |
| **Helpdesk** | Kiosk | `http://qs.legacyclinics.local/kiosk` |
| **Doctors/Nurses** | Dashboard | `http://qs.legacyclinics.local/dashboard` |
| **Admin** | Admin Panel | `http://qs.legacyclinics.local/admin` |
| **Public** | Display | `http://qs.legacyclinics.local/display` |

---

## Contact Information

For technical support or system issues, contact your Legacy Clinics IT administrator.

---

**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**System Version:** LC Queue Management System v1.0
