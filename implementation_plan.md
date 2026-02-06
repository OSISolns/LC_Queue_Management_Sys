# Patient Queuing System Implementation Plan

## Overview
This project aims to build a robust real-time patient queuing system with three main interfaces: Registration Kiosk, Doctor Dashboard, and Public Display. The system will handle standard, VIP, and emergency patients using a priority queue algorithm.

## Technology Stack
- **Backend**: Python (FastAPI)
  - Handling business logic, priority queue sorting, and database interactions.
  - **WebSockets**: For real-time updates to the public display and dashboard.
  - **Database**: SQLite (for initial local development, easily scalable to PostgreSQL).
- **Frontend**: React (Vite)
  - **Styling**: Vanilla CSS (Modern, Responsive, Variables for theming).
  - **Architecture**: Single Page Application (SPA) with routing for the three interfaces.

## Architecture

### 1. Backend (`/backend`)
- **API Endpoints**:
  - `POST /register`: For Kiosk input.
  - `GET /queue`: For fetching current queue status.
  - `POST /call-next`: For doctors to call the next patient.
  - `POST /transfer`: For transferring patients.
- **WebSocket Events**:
  - `queue_update`: Broadcasts changes to the queue.
  - `call_patient`: Triggers audio/visual alerts on the Display.

### 2. Frontend (`/frontend`)
- **Pages**:
  - **/kiosk**: Patient registration form (Name, Priority, Department).
  - **/dashboard**: Doctor's control panel (Call Next, View Queue, Mark Done).
  - **/display**: Public TV screen interface (Current Token, History, Audio).

## Implementation Steps

### Phase 1: Foundation Setup
1. Initialize the project structure (backend and frontend directories).
2. Set up Python virtual environment and install dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `python-socketio`).
3. Initialize the React/Vite application.
4. Define the Database Models (Queue, PriorityLevels) using SQLAlchemy.

### Phase 2: Core Backend Logic
1. Implement the `PriorityLevels` and `Queue` tables.
2. detailed "Call Next" logic with sorting: `ORDER BY priority_weight ASC, registration_time ASC`.
3. Create API endpoints for registering and calling patients.
4. Implement WebSocket manager for real-time broadcasting.

### Phase 3: Frontend Implementation
1. **Design System**: specific CSS variables for colors, typography, and glassmorphism effects.
2. **Kiosk Interface**: Simple, large-button interface for self-registration.
3. **Dashboard Interface**: List view of waiting patients, controls for doctors.
4. **Display Interface**: High-contrast, easy-to-read layout with animations for new calls.

### Phase 4: Integration & Real-time Features
1. Connect Kiosk to `POST /register`.
2. Connect Dashboard to `POST /call-next` and `queue` listing.
3. specific WebSocket listeners on Display and Dashboard for instant updates.
4. Implement Text-to-Speech (TTS) on the Display page using the Web Speech API.

### Phase 5: Polish & Aesthetics
1. Add smooth transitions/animations for queue movements.
2. Ensure responsive design.
3. Verify "Premium" look and feel (gradients, shadows, clarity).

## Next Steps
- Create project folders.
- Install backend dependencies.
- Initialize frontend application.
