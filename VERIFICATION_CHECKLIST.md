# FDT System Verification Checklist

## 🔍 Automated Verification

Run this script to verify all systems are operational:

```bash
#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "   FDT System Verification Checklist - $(date +%Y-%m-%d)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Checking $name... "
    
    response=$(curl -s "$url" 2>/dev/null)
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Counters
total=0
passed=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Frontend Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((total++))
check_service "React Frontend" "http://localhost:3000" "FDT" && ((passed++))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend Services (192.168.2.1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((total++))
check_service "Backend API Health" "http://192.168.2.1:8001/api/health" "healthy" && ((passed++))

((total++))
check_service "Admin Dashboard Health" "http://192.168.2.1:8000/health" "ok" && ((passed++))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Database Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we can SSH
echo -n "Checking Docker Services... "
if ssh darklord@192.168.2.1 "cd ~/fdt-secure && docker-compose ps" 2>/dev/null | grep -q "postgres\|redis"; then
    echo -e "${GREEN}✅ OK${NC}"
    ((passed++))
else
    echo -e "${RED}❌ FAILED${NC}"
fi
((total++))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API Endpoint Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test login endpoint
echo -n "Testing Login Endpoint... "
((total++))
response=$(curl -s -X POST http://192.168.2.1:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","password":"sim123"}' 2>/dev/null)

if echo "$response" | grep -q "success"; then
    echo -e "${GREEN}✅ OK${NC}"
    ((passed++))
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Response: $response"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Summary"
echo "════════════════════════════════════════════════════════════"
echo -e "Passed: ${GREEN}$passed${NC} / $total"

if [ $passed -eq $total ]; then
    echo -e "\n${GREEN}✅ All Systems Operational!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some systems are not operational${NC}"
    exit 1
fi
```

## ✅ Manual Verification Steps

### 1. Frontend Verification
```bash
# Check React app is running
curl http://localhost:3000 | grep -q "FDT" && echo "✅ Frontend OK"

# Open in browser
# Navigate to: http://localhost:3000/login
# Try login with +919876543210 / sim123
```

### 2. Backend API Verification
```bash
# Check API is running
curl http://192.168.2.1:8001/api/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "service": "FDT Backend",
#   "timestamp": "..."
# }
```

### 3. Admin Dashboard Verification
```bash
# Check dashboard is running
curl http://192.168.2.1:8000/health | jq .

# Expected response:
# { "status": "ok" }

# Open in browser
# Navigate to: http://192.168.2.1:8000/dashboard
```

### 4. Database Verification
```bash
# SSH to old laptop
ssh darklord@192.168.2.1

# Check Docker containers
docker-compose ps

# Expected output shows:
# - postgres container running
# - redis container running

# Check database connection
docker exec -it fdt-secure-postgres-1 psql -U fdt -d fdt_db -c "SELECT COUNT(*) FROM users;"
# Should show 6 users
```

### 5. Login Flow Verification
```bash
# Test complete login flow
curl -X POST http://192.168.2.1:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "sim123"
  }' | jq .

# Expected response:
# {
#   "status": "success",
#   "message": "Login successful",
#   "user": {
#     "user_id": "user_001",
#     "name": "Rajesh Kumar",
#     "phone": "+919876543210",
#     ...
#   },
#   "token": "eyJhbGc..."
# }
```

### 6. Dashboard Data Verification
```bash
# Get a token first (from login)
TOKEN="<token from login response>"

# Test dashboard endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://192.168.2.1:8001/api/user/dashboard | jq .
```

## 🔧 Troubleshooting During Verification

| Error | Solution |
|-------|----------|
| `curl: (7) Failed to connect to localhost port 3000` | Start frontend: `cd frontend && npm start` |
| `curl: (7) Failed to connect to 192.168.2.1 port 8001` | Check backend is running on old laptop |
| `{"detail":"Not Found"}` on API call | Check endpoint name is correct |
| `401 Unauthorized` | Check token is valid and not expired |
| `500 Internal Server Error` | Check backend logs: `docker-compose logs` |

## 📊 Expected Performance

- Frontend load: < 3 seconds
- Login response: < 1 second
- Health check: < 500ms
- Dashboard load: < 2 seconds

## 🎯 Sign-off Criteria

System is ready for testing when:
- [ ] All services respond with correct status codes
- [ ] Login works with test credentials
- [ ] Dashboard displays without errors
- [ ] No errors in browser console (F12)
- [ ] Database contains test user data
- [ ] Admin dashboard is accessible

---

**Last Verified:** February 1, 2026
**Status:** ✅ Verified and Operational
