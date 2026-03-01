# LC Queue Management System - User Roles & Requirements Matrix

## Complete Role Comparison

### Role Overview

| Feature/Requirement | Admin | Doctor | Helpdesk | Nurse/Technician |
|---------------------|-------|--------|----------|------------------|
| **Default Account** | ✅ Yes (admin/admin123) | ❌ No | ❌ No | ❌ No |
| **Requires Department** | ❌ No | ✅ Yes | ❌ No | ✅ Yes |
| **Requires Room** | ❌ No | ✅ Yes | ⚠️ Optional | ✅ Yes |
| **Can Create Users** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Full System Access** | ✅ Yes | ❌ No | ❌ No | ❌ No |

---

## Detailed Permission Matrix

### Queue Management

| Action | Admin | Doctor | Helpdesk | Nurse/Technician |
|--------|-------|--------|----------|------------------|
| Register Patient | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| Call Next Patient | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| Call Specific Patient | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| Complete Consultation | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| Mark No-Show | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| Recall Patient | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| View All Queues | ✅ Yes | ⚠️ Room Only | ✅ Yes | ⚠️ Room Only |
| View Waiting List | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| View Completed List | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| View No-Show List | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

### Patient Management

| Action | Admin | Doctor | Helpdesk | Nurse/Technician |
|--------|-------|--------|----------|------------------|
| Create Patient Record | ✅ Yes | ❌ No | ⚠️ Implicit* | ❌ No |
| Edit Patient Record | ✅ Yes | ❌ No | ❌ No | ❌ No |
| View Patient Registry | ✅ Yes | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| Search Patient by MRN | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| View Visit History | ✅ Yes | ⚠️ Own Patients | ❌ No | ⚠️ Own Patients |

*Patient records created implicitly when registering new patients

---

### System Administration

| Action | Admin | Doctor | Helpdesk | Nurse/Technician |
|--------|-------|--------|----------|------------------|
| Create Users | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Edit Users | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Delete Users | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Assign Roles | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Create Departments | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Create Rooms | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Manage Priority Levels | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Access Database Admin | ✅ Yes | ❌ No | ❌ No | ❌ No |
| View System Reports | ✅ Yes | ⚠️ Limited | ❌ No | ⚠️ Limited |
| View Analytics | ✅ Yes | ⚠️ Basic Stats | ❌ No | ⚠️ Basic Stats |

---

## Profile Field Requirements

### Admin Role

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Username | ✅ Yes | `admin` | Must be unique |
| Password | ✅ Yes | `admin123` | Change after first login |
| Role ID | ✅ Yes | 1 (Admin) | Fixed |
| Full Name | ❌ No | - | Optional |
| Salutation | ❌ No | - | Not typically used |
| Email | ❌ No | - | Optional |
| Phone Number | ❌ No | - | Optional |
| Department ID | ❌ No | NULL | Not required |
| Room Number | ❌ No | NULL | Not required |
| Is Active | ✅ Yes | `true` | Always active |

---

### Doctor Role

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Username | ✅ Yes | - | Must be unique |
| Password | ✅ Yes | - | Set by admin |
| Role ID | ✅ Yes | 2 (Doctor) | Fixed |
| Full Name | ✅ Required | - | For display purposes |
| Salutation | ✅ Recommended | `Dr.` | Dr., Mr., Mrs., Ms. |
| Email | ⚠️ Optional | - | Recommended for notifications |
| Phone Number | ⚠️ Optional | - | Recommended for contact |
| Department ID | ✅ Yes | - | Must be assigned to a department |
| Room Number | ✅ Yes | - | Must have a room assignment |
| Is Active | ✅ Yes | `true` | Can be deactivated |

---

### Helpdesk Role

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Username | ✅ Yes | - | Must be unique |
| Password | ✅ Yes | - | Set by admin |
| Role ID | ✅ Yes | 3 (Helpdesk) | Fixed |
| Full Name | ⚠️ Optional | - | Recommended for identification |
| Salutation | ❌ No | - | Usually not needed |
| Email | ❌ No | - | Optional |
| Phone Number | ❌ No | - | Optional |
| Department ID | ❌ No | NULL | Not required |
| Room Number | ⚠️ Optional | NULL | Can be assigned if stationed at specific location |
| Is Active | ✅ Yes | `true` | Can be deactivated |

---

### Nurse/Technician Role

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Username | ✅ Yes | - | Must be unique |
| Password | ✅ Yes | - | Set by admin |
| Role ID | ✅ Yes | 4 (Nurse) or 5 (Technician) | Assigned by admin |
| Full Name | ✅ Required | - | For display purposes |
| Salutation | ⚠️ Optional | - | Mr., Mrs., Ms. (typically not Dr.) |
| Email | ⚠️ Optional | - | Recommended for notifications |
| Phone Number | ⚠️ Optional | - | Recommended for contact |
| Department ID | ✅ Yes | - | Must be assigned to a department |
| Room Number | ✅ Yes | - | Must have a room assignment |
| Is Active | ✅ Yes | `true` | Can be deactivated |

---

## Access Interface by Role

### Admin
- **Primary Interface:** Admin Dashboard (`/admin`)
- **Alternative Access:** Can access all interfaces
- **Features:**
  - User management panel
  - Department & room management
  - Patient registry
  - Comprehensive reports & analytics
  - Database admin panel
  - System configuration

---

### Doctor
- **Primary Interface:** Doctor Dashboard (`/dashboard`)
- **Restricted Access:** Cannot access Kiosk or Admin
- **Features:**
  - Call next patient button
  - Waiting queue view (room-specific)
  - Current patient display
  - Complete/No-show actions
  - Basic queue statistics
  - Real-time updates

---

### Helpdesk
- **Primary Interface:** Kiosk (`/kiosk`)
- **Restricted Access:** Cannot access Dashboard or Admin
- **Features:**
  - Patient registration form
  - Patient search (by name/MRN)
  - View all queue tabs:
    - Waiting list
    - Serving/Calling
    - Completed
    - No shows
  - Recall no-show patients
  - Print ticket vouchers

---

### Nurse/Technician
- **Primary Interface:** Doctor Dashboard (`/dashboard`)
- **Restricted Access:** Cannot access Kiosk or Admin
- **Features:**
  - Same as Doctor role
  - Call next patient button
  - Waiting queue view (room-specific)
  - Complete/No-show actions
  - Basic queue statistics

---

## Workflow by Role

### Admin Typical Workflow
1. Login to Admin Dashboard
2. Create/manage user accounts
3. Assign users to departments and rooms
4. Monitor system-wide queue statistics
5. Generate reports on system usage
6. Configure departments and rooms as needed
7. Manage patient registry

---

### Doctor Typical Workflow
1. Login to Doctor Dashboard
2. View waiting queue for assigned room
3. Call next patient (system selects by priority)
4. Consult with patient
5. Complete consultation or mark no-show
6. Repeat for next patient
7. Monitor queue statistics

---

### Helpdesk Typical Workflow
1. Login to Kiosk interface
2. Patient arrives → Search for existing record
3. If found: Select patient, update visit info
4. If new: Enter patient details
5. Select visit type (consultation/procedure/review)
6. Assign to doctor or procedure
7. Set priority level
8. Generate and print ticket
9. Monitor waiting list
10. Recall no-show patients when they arrive

---

### Nurse/Technician Typical Workflow
1. Login to Doctor Dashboard
2. View waiting queue for assigned station/room
3. Call next patient for procedure/assessment
4. Perform assigned task
5. Complete or mark as no-show
6. Move to next patient

---

## Default System Roles

| ID | Role Name | Created By Default | Can Be Deleted |
|----|-----------|-------------------|----------------|
| 1 | Admin | ✅ Yes | ❌ No |
| 2 | Doctor | ✅ Yes | ❌ No |
| 3 | Helpdesk | ✅ Yes | ❌ No |
| 4 | Nurse | ⚠️ Optional | ⚠️ Protected |
| 5 | Technician | ⚠️ Optional | ⚠️ Protected |

> Note: The system creates Admin, Doctor, and Helpdesk roles by default. Nurse and Technician roles may need to be added manually or are treated similarly to Doctor role.

---

## Security & Best Practices

### Password Requirements
- **Minimum Length:** 8 characters (recommended)
- **Change Default:** Always change default admin password
- **Storage:** Passwords are hashed using bcrypt
- **Reset:** Only admins can reset user passwords

### Account Management
- **Unique Usernames:** Each username must be unique across the system
- **Active Status:** Deactivate users instead of deleting to preserve history
- **Role Assignment:** Users can only have one role at a time
- **Department Assignment:** Medical staff must be assigned to departments

### Access Control
- **Role-Based:** All access is role-based
- **Session Management:** Users must login to access the system
- **Token-Based:** Uses JWT tokens for authentication
- **Auto-Logout:** Sessions expire after inactivity

---

## Role Creation Checklist

### Creating an Admin User
- [ ] Choose unique username
- [ ] Set strong password
- [ ] Assign Admin role (ID: 1)
- [ ] Optional: Add full name and contact info
- [ ] Activate account
- [ ] Test login immediately

### Creating a Doctor User
- [ ] Choose unique username
- [ ] Set password
- [ ] Assign Doctor role (ID: 2)
- [ ] **Required:** Enter full name
- [ ] **Required:** Select salutation (Dr.)
- [ ] **Required:** Assign to department
- [ ] **Required:** Assign room number
- [ ] Optional: Add email and phone
- [ ] Activate account
- [ ] Verify department and room assignments

### Creating a Helpdesk User
- [ ] Choose unique username
- [ ] Set password
- [ ] Assign Helpdesk role (ID: 3)
- [ ] Optional: Enter full name
- [ ] Optional: Assign room number (if stationed)
- [ ] Optional: Add email and phone
- [ ] Activate account
- [ ] Test kiosk access

### Creating a Nurse/Technician User
- [ ] Choose unique username
- [ ] Set password
- [ ] Assign Nurse/Technician role
- [ ] **Required:** Enter full name
- [ ] **Required:** Assign to department
- [ ] **Required:** Assign room/station number
- [ ] Optional: Add salutation, email, phone
- [ ] Activate account
- [ ] Verify department and room assignments

---

**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**Related Documents:** USER_DOCUMENTATION.md, QUICK_REFERENCE.md
