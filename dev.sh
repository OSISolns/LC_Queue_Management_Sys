#!/bin/bash

# Patient Queuing System - Simple Development Startup
# Usage: ./dev.sh

set -e

echo "=========================================="
echo "Patient Queuing System - Quick Start"
echo "=========================================="
echo ""

# Check if virtual environment exists, create if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📥 Installing dependencies..."
    pip install -q -r backend/requirements.txt
    echo "✅ Dependencies installed"
    echo ""
fi

# Start backend in background
echo "🚀 Starting backend server..."
python backend/run.py &
BACKEND_PID=$!
echo "✅ Backend running (PID: $BACKEND_PID)"
echo ""

# Wait for backend to be ready
sleep 3

# Start frontend
echo "🚀 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "✅ System Started Successfully!"
echo "=========================================="
echo ""
echo "📍 Access Points:"
echo "   Backend:  https://localhost:8000"
echo "   Frontend: https://localhost:5173"
echo ""
echo "🏥 Interfaces:"
echo "   Kiosk:     https://localhost:5173/kiosk"
echo "   Dashboard: https://localhost:5173/dashboard"
echo "   Display:   https://localhost:5173/display"
echo ""
echo "⌨️  Press Ctrl+C to stop all servers"
echo "=========================================="
echo ""

# Handle Ctrl+C to kill both processes
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait
