# FDT (Fraud Detection in UPI) - Operations & Deployment Guide

## 📋 System Overview

The FDT system is a complete fraud detection platform for UPI transactions with three main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT MACHINE (localhost)              │
│  - React Frontend: http://localhost:3000                        │
│  - User Interface for transactions and fraud alerts             │
└─────────────────────────────────────────────────────────────────┘
                              ↕
                      API (HTTP/REST)
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                  OLD LAPTOP (192.168.2.1)                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Backend Services (Docker Containers)                   │     │
│  │ - PostgreSQL Database: :5432                           │     │
│  │ - Redis Cache: :6379                                   │     │
│  └────────────────────────────────────────────────────────┘     │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Backend API Server: :8001                              │     │
│  │ - Fastapi (uvicorn)                                    │     │
│  │ - Fraud detection ML models                            │     │
│  │ - Transaction processing                               │     │
│  └────────────────────────────────────────────────────────┘     │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Admin Dashboard: :8000                                 │     │
│  │ - Fastapi Admin Interface                              │     │
│  │ - Real-time monitoring                                 │     │
│  │ - Fraud pattern analytics                              │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Starting All Services)

### From Development Machine

```bash
# 1. Start React Frontend
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend
source /home/aakash/miniconda3/etc/profile.d/conda.sh
conda activate dev
npm start
# Accessible at: http://localhost:3000
```

### From Old Laptop (via SSH)

```bash
# Terminal 1: Start Docker Services (PostgreSQL + Redis)
ssh darklord@192.168.2.1
cd ~/fdt-secure
docker-compose up -d
# Wait 10 seconds for services to start
docker-compose ps

# Terminal 2: Start Backend API Server
ssh darklord@192.168.2.1
cd ~/fdt-secure
source venv/bin/activate
uvicorn backend.server:app --host 0.0.0.0 --port 8001
# Logs will show server running on 0.0.0.0:8001

# Terminal 3: Start Admin Dashboard
ssh darklord@192.168.2.1
cd ~/fdt-secure
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
# Logs will show server running on 0.0.0.0:8000
```

---

## 🔐 Test Credentials

Use these credentials to test the system:

**Phone Numbers:** Any of these
- `+919876543210`
- `+919876543211`
- `+919876543212`
- `+919876543217`
- `+919876543218`
- `+919876543219`

**Password:** `sim123` (for all test users)

---

## 🌐 Service Endpoints

### Frontend (Development Machine)
| Service | URL | Purpose |
|---------|-----|---------|
| React App | http://localhost:3000 | User interface |
| Login | http://localhost:3000/login | User authentication |
| Dashboard | http://localhost:3000/dashboard | User dashboard |
| Send Money | http://localhost:3000/send-money | Transaction interface |
| Transactions | http://localhost:3000/transactions | History & management |

### Backend Services (Old Laptop)
| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://192.168.2.1:8001 | REST API |
| Health Check | http://192.168.2.1:8001/api/health | API status |
| Admin Dashboard | http://192.168.2.1:8000 | Admin interface |
| Admin Health | http://192.168.2.1:8000/health | Admin status |

### Databases (Old Laptop)
| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL | localhost | 5432 | user: `fdt`, pass: `fdtpass`, db: `fdt_db` |
| Redis | localhost | 6379 | No authentication |

---

## 📍 Key File Locations

### Development Machine
```
/home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/
├── frontend/
│   ├── src/
│   │   ├── App.js                    # Main React app
│   │   ├── api.js                    # API client with logging
│   │   ├── components/
│   │   │   ├── LoginScreen.js        # Login form
│   │   │   ├── Dashboard.js          # User dashboard
│   │   │   └── SendMoney.js          # Transaction form
│   │   └── utils/
│   │       └── errorHandler.js       # Error handling utilities
│   ├── .env                          # Environment variables
│   ├── package.json                  # Dependencies
│   └── public/index.html             # HTML template
├── backend/
│   └── server.py                     # Backend API server
└── .git/                             # Version control
```

### Old Laptop (192.168.2.1)
```
/home/darklord/fdt-secure/
├── backend/
│   ├── server.py                     # FastAPI server
│   ├── models.py                     # Database models
│   └── database.py                   # DB configuration
├── app/
│   ├── main.py                       # Admin dashboard
│   ├── scoring.py                    # Fraud scoring
│   └── feature_engine.py             # Feature extraction
├── venv/                             # Virtual environment
├── docker-compose.yml                # Docker services
├── .env                              # Environment variables
└── requirements.txt                  # Python dependencies
```

---

## 🔧 Common Operations

### Check Service Status

```bash
# Check all services on old laptop
ssh darklord@192.168.2.1 << 'EOF'
echo "=== Docker Services ==="
docker-compose ps

echo -e "\n=== Backend API ==="
curl -s http://localhost:8001/api/health | jq .

echo -e "\n=== Admin Dashboard ==="
curl -s http://localhost:8000/health | jq .

echo -e "\n=== Python Processes ==="
ps aux | grep uvicorn
EOF
```

### Restart Backend Services

```bash
ssh darklord@192.168.2.1 << 'EOF'
cd ~/fdt-secure

# Restart Docker services
echo "Restarting Docker services..."
docker-compose down
sleep 2
docker-compose up -d
sleep 10

# Check status
docker-compose ps
EOF
```

### View Backend Logs

```bash
# Real-time logs from old laptop
ssh darklord@192.168.2.1 "cd ~/fdt-secure && docker-compose logs -f"

# Stop logs: Press Ctrl+C
```

### Database Queries

```bash
# Connect to PostgreSQL
ssh darklord@192.168.2.1 << 'EOF'
docker exec -it fdt-secure-postgres-1 psql -U fdt -d fdt_db

# Common queries:
# \dt                          # List tables
# SELECT * FROM users;         # View users
# SELECT COUNT(*) FROM transactions;  # Count transactions
# \q                           # Exit
EOF
```

### Test API Endpoint

```bash
# Test login API
curl -X POST http://192.168.2.1:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "sim123"
  }'

# Test dashboard API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://192.168.2.1:8001/api/user/dashboard
```

---

## 🐛 Troubleshooting

### Frontend Login Shows "Session Expired"

**Problem:** User can't log in even with correct credentials

**Solution:**
1. Check backend is running: `curl http://192.168.2.1:8001/api/health`
2. Check React logs in browser console (F12)
3. Verify `.env` file has: `REACT_APP_BACKEND_URL=http://192.168.2.1:8001`
4. Restart React dev server:
   ```bash
   cd frontend
   npm start
   ```

### Backend API Not Responding

**Problem:** `curl http://192.168.2.1:8001/api/health` fails

**Solution:**
1. SSH to old laptop: `ssh darklord@192.168.2.1`
2. Check if server is running: `ps aux | grep uvicorn`
3. Check Docker services: `docker-compose ps`
4. Restart backend:
   ```bash
   cd ~/fdt-secure
   source venv/bin/activate
   uvicorn backend.server:app --host 0.0.0.0 --port 8001
   ```

### Database Connection Error

**Problem:** "Cannot connect to database" error

**Solution:**
1. Check Docker containers: `ssh darklord@192.168.2.1 docker-compose ps`
2. Check logs: `ssh darklord@192.168.2.1 docker-compose logs postgres`
3. Restart containers:
   ```bash
   ssh darklord@192.168.2.1 << 'EOF'
   cd ~/fdt-secure
   docker-compose down
   sleep 2
   docker-compose up -d
   sleep 10
   docker-compose ps
   EOF
   ```

### Port Already in Use

**Problem:** "Address already in use" error

**Solution:**
```bash
# Find and kill process using port
ssh darklord@192.168.2.1 "lsof -i :8001" 
# Kill the process shown, or restart the entire system
```

---

## 📊 Admin Dashboard

Access the admin dashboard at: **http://192.168.2.1:8000/dashboard**

### Features

1. **Real-time Monitoring**
   - Transaction volume metrics
   - Fraud detection rate
   - System health status

2. **Transaction Analysis**
   - Filter transactions by status
   - View transaction details
   - Export data

3. **Fraud Pattern Analytics**
   - Common fraud patterns
   - Risk indicators
   - Trend analysis

4. **Model Performance**
   - Accuracy metrics
   - Precision/Recall
   - ROC curves

### Admin Features

- Login: http://192.168.2.1:8000/admin/login
- Configure fraud thresholds
- Save detection presets
- View detailed logs
- Download reports

---

## 📝 Logs and Monitoring

### React App Logs

Open browser console (F12) and check:
- API Configuration on startup
- Login attempts
- API errors with full details

### Backend API Logs

SSH to old laptop and run:
```bash
cd ~/fdt-secure
source venv/bin/activate
# Run with logs in foreground
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

### Docker Logs

```bash
ssh darklord@192.168.2.1 << 'EOF'
cd ~/fdt-secure

# View all logs
docker-compose logs

# View specific service
docker-compose logs postgres
docker-compose logs redis

# Real-time logs
docker-compose logs -f
EOF
```

---

## 🔄 Development Workflow

### Making Changes to Frontend

1. Edit files in `/home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend/src/`
2. React dev server auto-reloads (if `npm start` is running)
3. Check browser console (F12) for errors
4. Commit changes: `git add . && git commit -m "message"`

### Making Changes to Backend

1. Edit files in `/home/darklord/fdt-secure/backend/` (on old laptop)
2. Restart backend: `Ctrl+C` then `uvicorn backend.server:app --host 0.0.0.0 --port 8001`
3. Test API: `curl http://192.168.2.1:8001/api/health`
4. Commit changes to your repository

### Environment Variables

#### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://192.168.2.1:8001
REACT_APP_FIREBASE_ENABLED=false
```

#### Backend (.env in ~/fdt-secure)
```
DATABASE_URL=postgresql://fdt:fdtpass@localhost:5432/fdt_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Login Flow**
  - Navigate to http://localhost:3000/login
  - Enter: `+919876543210` and `sim123`
  - Should redirect to dashboard

- [ ] **Send Money**
  - Click "Send Money" on dashboard
  - Search for recipient
  - Enter amount and send
  - Check transaction history

- [ ] **Transaction History**
  - View all transactions
  - Filter by status
  - Check transaction details

- [ ] **Fraud Alerts**
  - Check for fraud alerts on dashboard
  - Click alert for details
  - Confirm or reject fraud detection

- [ ] **Admin Dashboard**
  - Navigate to http://192.168.2.1:8000/dashboard
  - Check analytics
  - View transaction details

---

## 📦 Deployment to Production

### Pre-deployment Checklist

- [ ] Update `.env` files with production credentials
- [ ] Set `REACT_APP_BACKEND_URL` to production API
- [ ] Review all sensitive data in code
- [ ] Run tests: `npm test` (frontend)
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Set strong `SECRET_KEY` in backend

### Build Frontend for Production

```bash
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/frontend
npm run build
# Creates optimized build in ./build/ directory
```

### Docker Compose (Production)

```bash
ssh darklord@192.168.2.1 << 'EOF'
cd ~/fdt-secure

# Review docker-compose.yml
cat docker-compose.yml

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
EOF
```

---

## 🔒 Security Notes

1. **Database Credentials**
   - Never commit `.env` files with real credentials
   - Use environment variables in production
   - Rotate passwords regularly

2. **JWT Tokens**
   - Tokens expire after 1 hour
   - Stored in localStorage (frontend)
   - Never expose token in logs

3. **HTTPS**
   - Use HTTPS in production (not HTTP)
   - Configure reverse proxy (nginx/Apache)
   - Enable CORS properly

4. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Protect login endpoint from brute force
   - Add CAPTCHA if needed

---

## 📞 Support

### Common Issues and Solutions

**Issue: Frontend can't connect to backend**
- Check: `curl http://192.168.2.1:8001/api/health`
- Check: Browser network tab (F12 → Network)
- Check: `.env` has correct `REACT_APP_BACKEND_URL`

**Issue: Database not accessible**
- Check: `docker-compose ps` shows postgres running
- Check: Credentials in `.env` file
- Check: Port 5432 not blocked by firewall

**Issue: Slow performance**
- Check: Redis is running
- Check: Database query performance
- Check: Browser console for large API responses

**Issue: User can't log in**
- Verify: User exists in database
- Verify: Password hash is correct (argon2)
- Check: Backend logs for authentication errors

---

## 🔄 Version Control

### Recent Commits

```bash
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2
git log --oneline -10
```

### Making a Commit

```bash
git add .
git commit -m "type: message

- Detailed description of changes
- Multiple lines supported"

git push origin main
```

### Commit Message Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Build/dependency updates

---

## 📚 Additional Resources

- **React Documentation**: https://react.dev
- **FastAPI Documentation**: https://fastapi.tiangolo.com
- **PostgreSQL Documentation**: https://www.postgresql.org/docs
- **Docker Documentation**: https://docs.docker.com
- **Tailwind CSS**: https://tailwindcss.com

---

## ✅ Verification Checklist

Run this checklist to ensure all systems are operational:

```bash
# 1. Check Frontend
curl -s http://localhost:3000/ | grep -q "FDT" && echo "✅ Frontend OK" || echo "❌ Frontend FAILED"

# 2. Check Backend API
curl -s http://192.168.2.1:8001/api/health | grep -q "healthy" && echo "✅ Backend API OK" || echo "❌ Backend API FAILED"

# 3. Check Admin Dashboard
curl -s http://192.168.2.1:8000/health | grep -q "ok" && echo "✅ Admin Dashboard OK" || echo "❌ Admin Dashboard FAILED"

# 4. Check Database
ssh darklord@192.168.2.1 "docker-compose ps" | grep -q "postgres" && echo "✅ Database OK" || echo "❌ Database FAILED"

# 5. Check Redis
ssh darklord@192.168.2.1 "docker-compose ps" | grep -q "redis" && echo "✅ Redis OK" || echo "❌ Redis FAILED"

# All services should show ✅
```

---

**Last Updated:** February 1, 2026  
**Status:** ✅ All Systems Operational
