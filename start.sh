#!/bin/bash

# Knowledge Nexus Framework™ - Startup Script
# Simple, modular startup for Python + React architecture

echo "🚀 Starting Knowledge Nexus Framework™"
echo "======================================"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip3 install -r requirements.txt
cd ..

# Start backend API
echo "🔧 Starting backend API..."
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if backend is running
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend API is running on http://localhost:5001"
else
    echo "❌ Backend API failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend server (simple Python HTTP server)
echo "🎨 Starting frontend server..."
cd frontend
python3 -m http.server 3001 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 2

echo ""
echo "🎉 Knowledge Nexus Framework™ is running!"
echo "======================================"
echo "📊 Dashboard: http://localhost:3001"
echo "🔧 Backend API: http://localhost:5001"
echo "📈 Health Check: http://localhost:5001/api/health"
echo "📋 Metrics: http://localhost:5001/api/metrics"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Keep script running
wait
