# LC Queue Management System - Quick Reference Guide

## 🔐 User Roles at a Glance

| Role | Key Permissions | Can Access |
|------|----------------|------------|
| **Admin** | Full system access, user management, reports | Admin Dashboard, All features |
| **Doctor** | Call patients, complete consultations, view room queue | Doctor Dashboard |
| **Helpdesk** | Register patients, view all queues, recall patients | Kiosk Interface |
| **Nurse/Technician** | Call patients, complete consultations (like Doctor) | Doctor Dashboard |

---

## 🌐 System URLs

```
Landing Page:       http://qs.legacyclinics.local
Login:              http://qs.legacyclinics.local/login
Kiosk (Helpdesk):   http://qs.legacyclinics.local/kiosk
Dashboard (Doctor): http://qs.legacyclinics.local/dashboard
Admin Panel:        http://qs.legacyclinics.local/admin
Public Display:     http://qs.legacyclinics.local/display
```

---

## 🔑 Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

> ⚠️ Change password after first login!

---

## 🔥 Priority System

| Priority | Token | Weight | Use Case |
|----------|-------|--------|----------|
| **Emergency** | E-XXX | 0 (highest) | Critical/urgent medical cases |
| **VIP** | V-XXX | 1 | Special patients, elderly, pregnant |
| **Standard** | S-XXX | 2 (normal) | Regular patients |

**Rule:** Emergency > VIP > Standard. Within same priority: First-In-First-Out.

---

## 📋 Common Actions

### For Helpdesk (Kiosk)
1. **Register Patient:**
   - Enter name/search MRN → Select visit type → Choose doctor/procedure → Set priority → Get ticket

2. **View Queue:**
   - Use tabs: Waiting List, Serving, Completed, No Shows

3. **Recall No-Show:**
   - Go to No Shows tab → Click "Recall" button

### For Doctors/Nurses
1. **Call Next Patient:**
   - Click "Call Next Patient" button

2. **Call Specific Patient:**
   - Find in Waiting Queue → Click "Call" button

3. **Complete Consultation:**
   - Click "Complete" button after finishing

4. **Mark No-Show:**
   - Click "No Show" button if patient doesn't respond

### For Admins
1. **Create User:**
   - Admin → Users → Create New User → Fill details → Save

2. **Create Department:**
   - Admin → Departments → Create Department → Enter name → Save

3. **Create Room:**
   - Admin → Rooms → Create Room → Enter name + department → Save

4. **View Reports:**
   - Admin Dashboard → View statistics and analytics

---

## 📊 Visit Types

| Visit Type | Destination | Purpose |
|------------|-------------|---------|
| **Consultation** | Doctor | New patient visit or general consultation |
| **Procedure** | Specific Room | Lab tests, imaging (X-Ray, CT, MRI, etc.) |
| **Review** | Doctor | Follow-up or review visit |

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't login | Check username/password or contact admin |
| Display not updating | Refresh browser (F5) |
| Can't register patient | Ensure all required fields filled |
| Ticket won't print | Use browser print (Ctrl+P / Cmd+P) |

---

## 📱 Required Information

### Patient Registration
- **Required:** Patient name, Visit type, Destination (doctor/procedure), Priority
- **Optional:** Phone number, MRN (if existing patient)

### User Account Creation
- **Required:** Username, Password, Role
- **Medical Staff:** Department, Room number, Full name, Salutation
- **Optional:** Email, Phone number

---

## 🚀 Quick Start

```bash
# Start the system
./dev.sh

# Access system
# 1. Open browser: http://qs.legacyclinics.local
# 2. Login with appropriate credentials
# 3. Use your role-specific interface
```

---

**For detailed documentation, see:** `USER_DOCUMENTATION.md`

**Version:** 1.0 | **Updated:** February 12, 2026
