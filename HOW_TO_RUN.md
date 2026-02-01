# Running the FDT Application - Complete Guide

## Overview

The FDT (Fraud Detection in UPI) application consists of **three main components**:

1. **User Backend** (`backend/server.py`) - Port 8001
2. **Admin Dashboard** (`app/main.py`) - Port 8000
3. **Frontend React App** - Port 3000

Plus **two Docker services**:
- PostgreSQL - Port 5433
- Redis - Port 6379

---

## Quick Start Options

### Option 1: User App Only (Recommended for development)

```bash
bash start.sh
```

**Starts:**
- ✅ PostgreSQL (Docker)
- ✅ Redis (Docker)
- ✅ User Backend (port 8001)
- ✅ Frontend (port 3000)

**Access:**
- User App: http://localhost:3000
- User API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

### Option 2: User App + Admin Dashboard (Full system)

```bash
bash start.sh --admin
```

**Starts:**
- ✅ PostgreSQL (Docker)
- ✅ Redis (Docker)
- ✅ User Backend (port 8001)
- ✅ **Admin Dashboard (port 8000)**
- ✅ Frontend (port 3000)

**Access:**
- User App: http://localhost:3000
- User API: http://localhost:8001
- **Admin Dashboard: http://localhost:8000**
- Admin API Docs: http://localhost:8000/docs

---

### Option 3: Start Admin Dashboard Separately

If you already have the user backend running and just want to add the admin dashboard:

```bash
bash start_admin.sh
```

**Access:**
- Admin Dashboard: http://localhost:8000
- Admin API Docs: http://localhost:8000/docs

---

## Manual Start (Full Control)

### Step 1: Start Docker Services
```bash
docker compose up -d
```

### Step 2: Activate Conda Environment
```bash
conda activate dev
```

### Step 3: Start User Backend (Terminal 1)
```bash
python backend/server.py
```

### Step 4: Start Admin Dashboard (Terminal 2) - Optional
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 5: Start Frontend (Terminal 3)
```bash
cd frontend
npm start
```

---

## Stopping the Application

### Quick Stop
```bash
bash stop.sh
```

### Stop Frontend Only
```bash
bash kill_frontend.sh
```

### Manual Stop
- Press `Ctrl+C` in each terminal window
- Stop Docker: `docker compose down`
- Kill specific port: `lsof -ti:3000 | xargs kill -9`

---

## What Each Backend Does

### User Backend (`backend/server.py`) - Port 8001

**Purpose:** Handles all user-facing operations

**Key Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/dashboard` - Get user dashboard data
- `POST /api/transactions` - Create new transaction
- `POST /api/decisions` - Submit fraud feedback
- `GET /api/health` - Health check

**Used By:** React frontend (port 3000)

**Features:**
- User authentication with JWT
- Transaction processing
- Fraud detection for individual users
- User-specific dashboard data
- Security settings management

---

### Admin Dashboard (`app/main.py`) - Port 8000

**Purpose:** System-wide monitoring and analytics

**Key Endpoints:**
- `GET /` - Admin dashboard UI
- `GET /api/activity` - Recent system activity
- `GET /api/stats` - System-wide statistics
- `GET /api/transactions` - All transactions across users
- `GET /api/users` - User management
- `GET /api/fraud-analysis` - Fraud pattern analysis

**Used By:** Administrators and analysts

**Features:**
- Real-time activity monitoring
- Transaction analytics across all users
- Fraud pattern detection
- ML model performance metrics
- System health monitoring
- User behavior analysis

---

## When to Use Each

### Use User Backend Only (`bash start.sh`)
- ✅ Frontend development
- ✅ Testing user features
- ✅ API development for user endpoints
- ✅ Quick demos
- ✅ Most day-to-day development

### Use Both Backends (`bash start.sh --admin`)
- ✅ Full system testing
- ✅ Monitoring fraud patterns across users
- ✅ System-wide analytics
- ✅ Admin feature development
- ✅ Production-like environment
- ✅ ML model evaluation

### Use Admin Only (`bash start_admin.sh`)
- ✅ When user backend is already running
- ✅ Analytics and monitoring tasks
- ✅ Admin dashboard development
- ✅ Fraud analysis work

---

## Environment Setup

### Prerequisites
- Docker & Docker Compose
- Conda environment 'dev' (Python 3.11+)
- Node.js & npm (for frontend)

### Required Environment Files

**Backend `.env` (project root):**
```bash
DB_URL=postgresql://fdt:fdtpass@127.0.0.1:5433/fdt_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=fdt_jwt_secret_key_change_in_production
GROQ_API_KEY=gsk_...
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<hash>
```

**Frontend `.env` (frontend directory):**
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## Logs and Monitoring

### View Logs

**User Backend:**
```bash
tail -f /tmp/fdt-backend.log
```

**Admin Dashboard:**
```bash
tail -f /tmp/fdt-admin.log
```

**Docker Services:**
```bash
docker compose logs -f
```

**Specific Docker Service:**
```bash
docker compose logs -f db      # PostgreSQL
docker compose logs -f redis   # Redis
```

### Check Running Services

```bash
# Docker containers
docker compose ps

# Check specific ports
lsof -i:8000  # Admin dashboard
lsof -i:8001  # User backend
lsof -i:3000  # Frontend
lsof -i:5433  # PostgreSQL
lsof -i:6379  # Redis

# Check all processes
ps aux | grep -E "python backend|uvicorn app.main|npm start"
```

---

## Troubleshooting

### Port Already in Use

The `start.sh` script now **automatically kills processes** on ports 3000, 8000, and 8001.

If you still have issues:

```bash
# Kill frontend specifically
bash kill_frontend.sh

# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Find and kill process on port 8001
lsof -ti:8001 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps db

# Check database logs
docker compose logs db

# Restart PostgreSQL
docker compose restart db
```

### Redis Connection Issues

```bash
# Check Redis is running
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping

# Restart Redis
docker compose restart redis
```

### Clean Restart

```bash
# Stop everything
bash stop.sh

# Remove all containers (fresh start)
docker compose down -v

# Start again
bash start.sh --admin
```

---

## Development Workflow

### Typical Development Session

```bash
# 1. Start the application
bash start.sh

# 2. Make code changes
# - Backend: Edit files in backend/ or app/
# - Frontend: Edit files in frontend/src/

# 3. Frontend changes auto-reload
# - Just save the file, browser refreshes automatically

# 4. Backend changes require restart
# - Press Ctrl+C in backend terminal
# - Run: python backend/server.py

# 5. Stop when done
bash stop.sh
```

### Running Tests

```bash
conda activate dev

# Run all tests
python -m pytest tests/

# Run specific test
python tests/test_fraud_reasons.py
python tests/test_ml_standalone.py
```

---

## Common Commands Reference

### Starting Services
```bash
bash start.sh                  # User backend + frontend (auto-kills existing)
bash start.sh --admin          # Full system (auto-kills existing)
bash start_admin.sh            # Admin only
docker compose up -d           # Docker services only
```

### Stopping Services
```bash
bash stop.sh                   # Stop everything
bash kill_frontend.sh          # Stop frontend only
docker compose down            # Stop Docker only
Ctrl+C                         # Stop individual terminal
```

### Viewing Status
```bash
docker compose ps              # Docker services
lsof -i:8000                   # Admin dashboard
lsof -i:8001                   # User backend
lsof -i:3000                   # Frontend
```

### Viewing Logs
```bash
tail -f /tmp/fdt-backend.log   # User backend logs
tail -f /tmp/fdt-admin.log     # Admin logs
docker compose logs -f         # Docker logs
```

### Database Operations
```bash
# Connect to PostgreSQL
docker compose exec db psql -U fdt -d fdt_db

# Run SQL query
docker compose exec db psql -U fdt -d fdt_db -c "SELECT * FROM users;"

# Export data
docker compose exec db pg_dump -U fdt fdt_db > backup.sql
```

---

## Demo Credentials

**User Login (Frontend):**
- Phone: `+919876543210`
- Password: `password123`

**Other Demo Users:**
- `+919876543211` / `password123`
- `+919876543212` / `password123`

---

## API Documentation

### User Backend API
**URL:** http://localhost:8001/docs

**Interactive Swagger UI** with all user-facing endpoints

### Admin Dashboard API
**URL:** http://localhost:8000/docs

**Interactive Swagger UI** with all admin endpoints

---

## File Locations

### Scripts
- `start.sh` - Main startup script (auto-kills existing processes)
- `start_admin.sh` - Admin-only startup
- `stop.sh` - Shutdown script (kills all processes)
- `kill_frontend.sh` - Kill frontend server only

### Backend Code
- `backend/server.py` - User backend server
- `app/main.py` - Admin dashboard server
- `app/scoring.py` - ML scoring engine
- `app/fraud_reasons.py` - Fraud reasoning
- `app/feature_engine.py` - Feature extraction

### Frontend Code
- `frontend/src/App.js` - Main React component
- `frontend/src/components/` - React components
- `frontend/src/api.js` - API client

### Configuration
- `.env` - Backend environment variables
- `frontend/.env` - Frontend environment variables
- `docker-compose.yml` - Docker configuration

### Logs
- `/tmp/fdt-backend.log` - User backend logs
- `/tmp/fdt-admin.log` - Admin dashboard logs

---

## Summary

### Quick Commands

```bash
# Most common: Start for development
bash start.sh

# Full system with admin
bash start.sh --admin

# Stop everything
bash stop.sh

# View logs
tail -f /tmp/fdt-backend.log

# Check status
docker compose ps
lsof -i:8001
```

### URLs at a Glance

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | User interface |
| User API | http://localhost:8001 | User backend |
| User Docs | http://localhost:8001/docs | API documentation |
| Admin Dashboard | http://localhost:8000 | Admin interface |
| Admin Docs | http://localhost:8000/docs | Admin API docs |

---

**Last Updated:** January 2026  
**Environment:** Docker + Conda 'dev'  
**Python:** 3.11.14+  
**React:** 18.3.1
