#!/bin/bash

# Knowledge Nexus Framework™ - Production Startup Script
# This script provides a stable, production-ready startup for the Flask API

echo "🚀 Starting Knowledge Nexus Framework™ - Production Mode"
echo "=================================================="

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "python3 app.py" 2>/dev/null || true
pkill -f "http.server" 2>/dev/null || true
lsof -ti:5001,3001 | xargs kill -9 2>/dev/null || true

# Wait for ports to be released
sleep 2

# Start backend with production settings
echo "🔧 Starting Backend API (Production Mode)..."
cd backend
python3 app.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Test backend health
echo "🏥 Testing backend health..."
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Start frontend
echo "🎨 Starting Frontend..."
cd ../frontend
python3 -m http.server 3001 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 2

echo ""
echo "🎉 Knowledge Nexus Framework™ is running!"
echo "=================================================="
echo "📊 Backend API: http://localhost:5001"
echo "🎨 Frontend: http://localhost:3001"
echo "🏥 Health Check: http://localhost:5001/api/health"
echo ""
echo "📋 Process IDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Open the application
open http://localhost:3001

echo "✅ Application opened in browser"
echo "🔄 Monitoring processes..."

# Monitor processes
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend process died, restarting..."
        cd ../backend
        python3 app.py &
        BACKEND_PID=$!
        echo "New Backend PID: $BACKEND_PID"
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend process died, restarting..."
        cd ../frontend
        python3 -m http.server 3001 &
        FRONTEND_PID=$!
        echo "New Frontend PID: $FRONTEND_PID"
    fi
    
    sleep 10
done
