# Running the QMS Servers

The LC Patient Queuing System has **three services** that must all be running.

| Service | Port | Description |
|---------|------|-------------|
| Backend API | **8000 (HTTPS)** | FastAPI + WebSockets, core business logic |
| AI Service | **8001 (HTTP)** | Wait-time predictions, anomaly detection |
| Frontend | **5173 (HTTPS)** | Vite/React UI |
| Patient Portal | **5174 (HTTP)** | Standalone patient-facing interface |

> **Always run commands from the project root:**
> `/home/noble/Documents/LC_APPS/LC_Queuing-Sys/`

---

## Prerequisites

- Python 3.10+ and a working `venv/` in the project root
- Node.js + npm installed
- SSL certs present at `certs/cert.pem` and `certs/key.pem` ✅

---

## Option A — Quick Start (Backend + Frontend only)

```bash
chmod +x dev.sh   # only needed once
./dev.sh
```

`dev.sh` creates the venv if missing, installs backend dependencies, starts the **Backend** and **Frontend** in the background, and kills both on `Ctrl+C`.

> The AI Service is **not** started by `dev.sh`. Start it separately (Option B, Terminal 2) if needed.

---

## Option B — Manual Start (All 3 Services)

Open **3 separate terminals**, all in the project root.

### Step 1 — Activate the venv (every terminal)

```bash
source venv/bin/activate
```

> **Never use `sudo apt install uvicorn`** if you see "command not found".
> The fix is always to activate the venv first. Alternatively, skip activation entirely:
> ```bash
> venv/bin/python -m uvicorn <module:app> --port <port> --reload
> ```

---

### Terminal 1 — Backend

```bash
python backend/run.py
```

Expected output:
```
Uvicorn running on https://0.0.0.0:8000
```

Alternative (equivalent):
```bash
uvicorn backend.main:socket_app --host 0.0.0.0 --port 8000 --reload \
  --ssl-keyfile certs/key.pem --ssl-certfile certs/cert.pem
```

---

### Terminal 2 — AI Service

```bash
uvicorn ai_service.main:app --host 0.0.0.0 --port 8001 --reload
```

Expected output:
```
Uvicorn running on http://0.0.0.0:8001
```

> First-time or after pulling changes, install AI dependencies:
> ```bash
> pip install -r ai_service/requirements.txt
> ```

---

### Terminal 3 — Frontend

```bash
cd frontend
npm install   # only needed on first run or after pulling changes
npm run dev
```

Expected output:
```
➜  Local: https://localhost:5173/
```

---

## Access URLs

| Interface | URL |
|-----------|-----|
| **Kiosk** (patient check-in) | https://localhost:5173/kiosk |
| **Dashboard** (Doctors / Technicians) | https://localhost:5173/dashboard |
| **Admin Panel** | https://localhost:5173/admin |
| **Patient Portal** | http://localhost:5174 |
| **Display Screen** (TV / public) | https://localhost:5173/display |
| **Backend API Docs** | https://localhost:8000/docs |
| **AI Service Docs** | http://localhost:8001/docs |
| **AI Health Check** | http://localhost:8001/health |

---

## Default Login

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |

---

## SSL Certificate Warning

The backend uses a self-signed certificate. On first use:

1. Open **https://localhost:8000/docs** in your browser
2. Click **Advanced → Proceed to localhost (unsafe)**
3. Return to **https://localhost:5173** — login will now work

> You may need to repeat this once per browser session after restarting the servers.

---

## Session & Idle Timeout

All authenticated panels automatically log out after **5 minutes of inactivity**:

- A warning dialog appears at the **4-minute** mark with a 60-second countdown
- Clicking **"Keep me logged in"** resets the timer
- The backend also enforces this server-side — stale tokens return `HTTP 401`
- After restarting the backend, all users must **log in again**

---

## Stopping the Servers

| Method | Action |
|--------|--------|
| `dev.sh` | Press `Ctrl+C` once |
| Manual | Press `Ctrl+C` in each terminal individually |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError` on backend start | `pip install -r backend/requirements.txt` |
| `ModuleNotFoundError` on AI service start | `pip install -r ai_service/requirements.txt` |
| `uvicorn: command not found` | Activate venv first: `source venv/bin/activate` |
| `Address already in use` on port 8000/8001 | `lsof -i :8000` → `kill -9 <PID>` |
| `NetworkError` / SSL error in browser | Navigate to `https://localhost:8000/docs` and accept the certificate |
| `Session expired` after backend restart | Log in again — backend session store was cleared on restart |
