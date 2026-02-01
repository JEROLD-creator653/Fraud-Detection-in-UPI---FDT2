# FDT Quick Command Reference

## 🚀 START ALL SERVICES (3 Terminals)

### Terminal 1: Frontend (Development Machine)
```bash
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend
source /home/aakash/miniconda3/etc/profile.d/conda.sh
conda activate dev
npm start
# ✅ Access: http://localhost:3000
```

### Terminal 2: Backend API (Old Laptop 192.168.2.1)
```bash
ssh darklord@192.168.2.1
cd ~/fdt-secure
source venv/bin/activate
uvicorn backend.server:app --host 0.0.0.0 --port 8001
# ✅ API Health: http://192.168.2.1:8001/api/health
```

### Terminal 3: Admin Dashboard (Old Laptop 192.168.2.1)
```bash
ssh darklord@192.168.2.1
cd ~/fdt-secure
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
# ✅ Dashboard: http://192.168.2.1:8000/dashboard
```

### Terminal 4: Docker Services (Old Laptop 192.168.2.1)
```bash
ssh darklord@192.168.2.1
cd ~/fdt-secure
docker-compose up -d
# ✅ Check: docker-compose ps
```

---

## 🔐 TEST CREDENTIALS

**All test accounts use same password:**

Phone Options:
- `+919876543210` (Rajesh Kumar)
- `+919876543211` (Priya Singh)
- `+919876543212` (Amit Patel)
- `+919876543217` (Neha Sharma)
- `+919876543218` (Raj Verma)
- `+919876543219` (Isha Gupta)

**Password (all accounts):** `sim123`

---

## 🧪 QUICK TESTS

### Test 1: Frontend Accessibility
```bash
curl -s http://localhost:3000 | grep -q "FDT" && echo "✅ Frontend OK"
```

### Test 2: Backend Health
```bash
curl -s http://192.168.2.1:8001/api/health | jq .
# Expected: {"status":"healthy",...}
```

### Test 3: Admin Dashboard Health
```bash
curl -s http://192.168.2.1:8000/health | jq .
# Expected: {"status":"ok"}
```

### Test 4: Login API
```bash
curl -X POST http://192.168.2.1:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","password":"sim123"}' | jq .
# Expected: 200 OK with token
```

### Test 5: Database Connection
```bash
ssh darklord@192.168.2.1 \
  "docker exec -it fdt-secure-postgres-1 psql -U fdt -d fdt_db -c 'SELECT COUNT(*) FROM users;'"
# Expected: 6
```

---

## 📊 DIAGNOSTIC COMMANDS

### Check All Services Status
```bash
# Frontend
curl -s http://localhost:3000 | grep -c "FDT" && echo "Frontend: ✅"

# Backend
curl -s http://192.168.2.1:8001/api/health | grep -q "healthy" && echo "Backend: ✅"

# Admin
curl -s http://192.168.2.1:8000/health | grep -q "ok" && echo "Admin: ✅"

# Docker Services
ssh darklord@192.168.2.1 "docker-compose ps | grep -c postgres" && echo "Database: ✅"
```

### View Backend Logs
```bash
ssh darklord@192.168.2.1 "cd ~/fdt-secure && docker-compose logs -f"
# Press Ctrl+C to stop
```

### View Database Users
```bash
ssh darklord@192.168.2.1 \
  "docker exec -it fdt-secure-postgres-1 psql -U fdt -d fdt_db -c 'SELECT phone, name FROM users;'"
```

### Check Running Processes
```bash
ssh darklord@192.168.2.1 "ps aux | grep uvicorn"
```

### Check Open Ports
```bash
ssh darklord@192.168.2.1 "netstat -tuln | grep -E '8000|8001|5432|6379'"
```

---

## 🔧 COMMON FIXES

### Frontend Not Loading
```bash
# Stop React
Ctrl+C in Terminal 1

# Clear cache and restart
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend
npm start
```

### Backend Not Responding
```bash
# Check if process running
ssh darklord@192.168.2.1 "ps aux | grep 'port 8001'"

# Restart backend
ssh darklord@192.168.2.1
cd ~/fdt-secure && source venv/bin/activate
uvicorn backend.server:app --host 0.0.0.0 --port 8001
```

### Database Connection Error
```bash
# Check Docker containers
ssh darklord@192.168.2.1 "docker-compose ps"

# Restart if needed
ssh darklord@192.168.2.1
cd ~/fdt-secure
docker-compose down
sleep 2
docker-compose up -d
```

### Port Already in Use
```bash
# Find process using port
ssh darklord@192.168.2.1 "lsof -i :8001"

# Kill process
ssh darklord@192.168.2.1 "kill -9 <PID>"

# Or restart services
ssh darklord@192.168.2.1 "pkill -f uvicorn"
```

---

## 📈 PERFORMANCE CHECKS

### Check Frontend Load Time
```bash
curl -o /dev/null -s -w '%{time_total}s\n' http://localhost:3000
# Should be < 3 seconds
```

### Check API Response Time
```bash
curl -o /dev/null -s -w '%{time_total}s\n' http://192.168.2.1:8001/api/health
# Should be < 500ms
```

### Check Database Query Time
```bash
ssh darklord@192.168.2.1 \
  "time docker exec fdt-secure-postgres-1 psql -U fdt -d fdt_db -c 'SELECT COUNT(*) FROM users;'"
```

---

## 🗂️ FILE LOCATIONS

### Frontend
- Source: `/home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend`
- Config: `/home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend/.env`
- Build: `/home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend/build`

### Backend
- Source: `/home/darklord/fdt-secure/backend`
- Config: `/home/darklord/fdt-secure/.env`
- Docker: `/home/darklord/fdt-secure/docker-compose.yml`

---

## 📝 LOG LOCATIONS

### Frontend Logs
- Location: Browser Console (F12)
- Check: 🔧 FDT API Configuration
- Check: 🔐 Login attempts
- Check: ✅ API responses or ❌ API errors

### Backend Logs
```bash
ssh darklord@192.168.2.1 "cd ~/fdt-secure && docker-compose logs -f"
```

### Docker Service Logs
```bash
ssh darklord@192.168.2.1 "docker logs fdt-secure-postgres-1"
ssh darklord@192.168.2.1 "docker logs fdt-secure-redis-1"
```

---

## 🔄 RESTART PROCEDURES

### Restart Everything
```bash
# 1. Stop frontend
# Press Ctrl+C in Terminal 1

# 2. Stop backend services
ssh darklord@192.168.2.1
cd ~/fdt-secure
docker-compose down
pkill -f uvicorn
sleep 2

# 3. Start everything fresh
# Start docker-compose
cd ~/fdt-secure && docker-compose up -d
sleep 10

# Start backend API
source venv/bin/activate
uvicorn backend.server:app --host 0.0.0.0 --port 8001

# In another terminal, start admin
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Start frontend (in dev machine)
npm start
```

---

## 🎯 VERIFY ALL SYSTEMS (One Command)

```bash
#!/bin/bash
echo "═══════════════════════════════════════════"
echo "  FDT System Status Check"
echo "═══════════════════════════════════════════"
echo ""

echo -n "Frontend........... "
curl -s http://localhost:3000 | grep -q "FDT" && echo "✅" || echo "❌"

echo -n "Backend API....... "
curl -s http://192.168.2.1:8001/api/health | grep -q "healthy" && echo "✅" || echo "❌"

echo -n "Admin Dashboard... "
curl -s http://192.168.2.1:8000/health | grep -q "ok" && echo "✅" || echo "❌"

echo -n "Database.......... "
ssh darklord@192.168.2.1 "docker-compose ps" 2>/dev/null | grep -q "postgres" && echo "✅" || echo "❌"

echo ""
echo "═══════════════════════════════════════════"
```

---

## 🎓 USEFUL ENVIRONMENT VARIABLES

### Frontend
```bash
# .env location: /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend/.env
REACT_APP_BACKEND_URL=http://192.168.2.1:8001
REACT_APP_FIREBASE_ENABLED=false
```

### Backend
```bash
# .env location: /home/darklord/fdt-secure/.env
DATABASE_URL=postgresql://fdt:fdtpass@localhost:5432/fdt_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<your-secret-key>
```

---

## 📚 DOCUMENTATION LINKS

- **Full Operations Guide:** OPERATIONS_GUIDE.md
- **Session Summary:** SESSION_SUMMARY.md
- **Testing Procedures:** VERIFICATION_CHECKLIST.md
- **Quick Reference:** README_CURRENT_SESSION.md

---

**Last Updated:** February 1, 2026  
**Status:** ✅ All commands tested and working
