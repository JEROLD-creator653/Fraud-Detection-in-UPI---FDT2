#!/bin/bash

echo "🚀 Starting FDT - Fraud Detection in UPI Transactions"
echo "=================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Start PostgreSQL
echo -e "\n${YELLOW}📊 Starting PostgreSQL...${NC}"
service postgresql start
sleep 2
if service postgresql status | grep -q "online"; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
fi

# Start Redis
echo -e "\n${YELLOW}🔴 Starting Redis...${NC}"
redis-server --daemonize yes --bind 0.0.0.0 --port 6379
sleep 1
if redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
fi

# Initialize database if needed
echo -e "\n${YELLOW}💾 Checking database...${NC}"
if sudo -u postgres psql -d fdt_db -c "SELECT 1 FROM users LIMIT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database already initialized${NC}"
else
    echo -e "${YELLOW}Initializing database...${NC}"
    python3 /app/init_db.py
fi

# Start Backend
echo -e "\n${YELLOW}⚡ Starting Backend Server...${NC}"
cd /app/backend
python server.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Check backend health
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:8001${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    cat /tmp/backend.log
    exit 1
fi

# Start Frontend
echo -e "\n${YELLOW}🌐 Starting Frontend (React)...${NC}"
cd /app/frontend
PORT=3000 yarn start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

echo -e "\n${GREEN}=================================================="
echo -e "✨ FDT Application Started Successfully!"
echo -e "==================================================${NC}"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "⚡ Backend API: http://localhost:8001"
echo "📚 API Docs: http://localhost:8001/docs"
echo ""
echo "👥 Demo Users (password: password123):"
echo "   📞 +919876543210 - Rajesh Kumar (₹25,000)"
echo "   📞 +919876543211 - Priya Sharma (₹15,000)"
echo "   📞 +919876543212 - Amit Patel (₹30,000)"
echo ""
echo "🔍 Process IDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo "   Backend: /tmp/backend.log"
echo "   Frontend: /tmp/frontend.log"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"

# Wait for user interrupt
wait
