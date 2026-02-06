# Patient Queuing System

A real-time queuing system with Priority logic (Emergency, VIP, Standard).

## Project Structure

- **backend/**: FastAPI application with SQLite database and Socket.IO.
- **frontend/**: React + Vite application with three interfaces: Kiosk, Dashboard, Display.

## Prerequisites

- Python 3.8+
- Node.js & npm

## Setup & Running

### 1. Backend Setup

Open a terminal in the root directory:

```bash
# Create virtual environment (if not already done)
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the server
uvicorn backend.main:socket_app --reload --port 8000
```
*Note: We run `socket_app` to include Socket.IO, but standard `app` works for HTTP only.* (Actually, `uvicorn backend.main:socket_app` is correct for the wrapped ASGI app).

**Quick Start (Alternative):**
- **Windows**: Run `start_dev.ps1` (PowerShell script)
- **Linux/Mac**: Run `./start_dev.sh` (Bash script)


### 2. Frontend Setup

Open a new terminal in the `frontend` directory:

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
