#!/bin/bash

# Patient Queuing System - Linux Development Startup Script
# This script starts both the backend (FastAPI) and frontend (Vite) servers

echo "Starting Patient Queuing System..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found!"
    echo "Please run: python3 -m venv venv"
    echo "Then install dependencies: pip install -r backend/requirements.txt"
    exit 1
fi

# Start backend server in a new terminal (using gnome-terminal, xterm, or konsole)
echo "Starting backend server..."
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "source venv/bin/activate && uvicorn backend.main:socket_app --reload --port 8000; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "source venv/bin/activate && uvicorn backend.main:socket_app --reload --port 8000; exec bash" &
elif command -v konsole &> /dev/null; then
    konsole -e bash -c "source venv/bin/activate && uvicorn backend.main:socket_app --reload --port 8000; exec bash" &
else
    echo "Warning: No terminal emulator found (gnome-terminal, xterm, or konsole)."
    echo "Starting backend in background..."
    source venv/bin/activate
    uvicorn backend.main:socket_app --reload --port 8000 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
fi

# Wait a moment for backend to initialize
sleep 2

# Start frontend server in a new terminal
echo "Starting frontend server..."
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "cd frontend && npm run dev; exec bash" &
elif command -v konsole &> /dev/null; then
    konsole -e bash -c "cd frontend && npm run dev; exec bash" &
else
    echo "Starting frontend in background..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
fi

echo ""
echo "========================================="
echo "Patient Queuing System is starting!"
echo "========================================="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Access the interfaces:"
echo "  - Kiosk:     http://localhost:5173/kiosk"
echo "  - Dashboard: http://localhost:5173/dashboard"
echo "  - Display:   http://localhost:5173/display"
echo ""
echo "Press Ctrl+C in each terminal to stop the servers"
echo "========================================="
