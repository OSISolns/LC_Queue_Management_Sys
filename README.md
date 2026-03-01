# Patient Queuing System

A real-time queuing system with Priority logic (Emergency, VIP, Standard).

## Project Structure

- **backend/**: FastAPI application with SQLite database and Socket.IO.
- **frontend/**: React + Vite application with three interfaces: Kiosk, Dashboard, Display.

## Prerequisites

- Python 3.8+
- Node.js & npm

## Setup & Running

### Quick Start (Recommended) 🚀

**One command to start everything:**

```bash
./dev.sh
```

This script will automatically:
- ✅ Create virtual environment if needed
- ✅ Install all dependencies
- ✅ Start both backend and frontend servers

That's it! The system will be running at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000

---

### Alternative: Manual Setup

#### 1. Backend Only

**Simple method:**
```bash
# Make sure you have a virtual environment and dependencies installed
source venv/bin/activate  # Linux/Mac
pip install -r backend/requirements.txt

# Run backend
python backend/run.py
```

**Traditional method:**
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac (Windows: .\venv\Scripts\activate)

# Install dependencies
pip install -r backend/requirements.txt

# Run the server
uvicorn backend.main:socket_app --reload --port 8000
```

#### 2. Frontend Only

```bash
cd frontend
npm install
npm run dev
```

## Usage

Access the interfaces via your browser (default port 5173):

- **Landing Page**: [http://localhost:5173](http://localhost:5173)
- **Kiosk**: [http://localhost:5173/kiosk](http://localhost:5173/kiosk) - Register new patients.
- **Dashboard**: [http://localhost:5173/dashboard](http://localhost:5173/dashboard) - Doctors call the next patient.
- **Display**: [http://localhost:5173/display](http://localhost:5173/display) - Public TV screen.

## Features implemented

- **Priority Logic**: Emergency > VIP > Standard.
- **Real-time Updates**: Public display updates instantly when a doctor calls a patient.
- **Audio**: Text-to-Speech announcement on the Display screen.
