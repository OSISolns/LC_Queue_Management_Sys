#!/bin/bash
# Patient Queuing System - Linux Development Startup Script (HTTPS)
# Valery Structure

echo "Starting Patient Queuing System (HTTPS)..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found!"
    echo "Please run: python3 -m venv venv"
    echo "Then install dependencies: pip install -r backend/requirements.txt"
    exit 1
fi

# Activate virtual environment in current shell context
source venv/bin/activate

# Start backend server with SSL
echo "Starting backend server (HTTPS :8000)..."
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "source venv/bin/activate && python backend/run.py; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "source venv/bin/activate && python backend/run.py; exec bash" &
elif command -v konsole &> /dev/null; then
    konsole -e bash -c "source venv/bin/activate && python backend/run.py; exec bash" &
else
    echo "Starting backend in background..."
    python backend/run.py &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
fi

# Wait for backend to initialize
sleep 3

# Start frontend server
echo "Starting frontend server (HTTPS :5173)..."
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "cd frontend && npm run dev; exec bash" &
elif command -v konsole &> /dev/null; then
    konsole -e bash -c "cd frontend && npm run dev; exec bash" &
else
    echo "Starting frontend in background..."
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo "Frontend PID: $FRONTEND_PID"
fi

echo ""
echo "========================================="
echo "  Patient Queuing System — HTTPS Mode"
echo "========================================="
echo "  Backend:   https://localhost:8000"
echo "  Frontend:  https://localhost:5173"
echo ""
echo "  Interfaces:"
echo "  Kiosk:     https://cs.legacyclinics.local:5173/kiosk"
echo "  Dashboard: https://cs.legacyclinics.local:5173/dashboard"
echo "  Display:   https://cs.legacyclinics.local:5173/display"
echo ""
echo "  Admin:     https://cs.legacyclinics.local:8000/admin"
echo ""
echo "  NOTE: Accept the self-signed certificate in your browser."
echo "  To trust it permanently, install certs/cert.pem as a"
echo "  trusted CA in your browser or OS certificate store."
echo "========================================="
