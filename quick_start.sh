#!/bin/bash

# FDT Quick Start Script
# This ensures all services are running properly

echo "🚀 FDT - Starting All Services"
echo "================================"

# Check PostgreSQL
echo "📊 Checking PostgreSQL..."
if service postgresql status | grep -q "online"; then
    echo "✅ PostgreSQL is running"
else
    echo "⚠️  Starting PostgreSQL..."
    service postgresql start
    sleep 2
fi

# Check Redis
echo "🔴 Checking Redis..."
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis is running"
else
    echo "⚠️  Starting Redis..."
    redis-server --daemonize yes
    sleep 1
fi

# Check Backend
echo "⚡ Checking Backend..."
if curl -s http://localhost:8001/api/health 2>/dev/null | grep -q "healthy"; then
    echo "✅ Backend is running"
else
    echo "⚠️  Starting Backend..."
    cd /app/backend
    python server.py > /tmp/backend.log 2>&1 &
    sleep 3
fi

# Check Frontend  
echo "🌐 Checking Frontend..."
if curl -s http://localhost:3000 2>/dev/null | grep -q "FDT"; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Starting Frontend..."
    pkill -f "react-scripts" 2>/dev/null
    cd /app/frontend
    PORT=3000 BROWSER=none yarn start > /tmp/frontend.log 2>&1 &
    echo "   Waiting for frontend to compile..."
    sleep 15
fi

echo ""
echo "================================"
echo "✨ FDT Application Ready!"
echo "================================"
echo ""
echo "📱 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8001"
echo ""
echo "🔑 Demo Login Credentials:"
echo "   Phone:    +919876543210"
echo "   Password: password123"
echo ""
echo "👥 All Demo Users (password: password123):"
echo "   📞 +919876543210 - Rajesh Kumar (₹25,000)"
echo "   📞 +919876543211 - Priya Sharma (₹15,000)"  
echo "   📞 +919876543212 - Amit Patel (₹30,000)"
echo ""
echo "🧪 Test Login:"
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "password123"}' | python3 -m json.tool | grep -E "(status|message|name)" | head -3

echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
