# FDT Full-Stack Setup Guide (Docker + Conda)

Complete guide to run the Fraud Detection in UPI Transactions application using Docker and Conda environment.

---

## Prerequisites

### Required Software
- **Docker** (already installed ✓ - version 29.1.5)
- **Docker Compose** (already installed ✓ - version 5.0.2)
- **Conda** (already installed ✓)
- **Conda environment 'dev'** (already exists ✓ - Python 3.11.14)

### Verify Installation

```bash
# Check Docker
docker --version
docker compose version

# Check Conda
conda --version
conda env list | grep dev
```

---

## Quick Start (One Command)

```bash
# Start everything (Docker + Backend + Frontend)
bash start.sh
```

This will:
1. ✅ Start PostgreSQL in Docker (port 5433)
2. ✅ Start Redis in Docker (port 6379)
3. ✅ Activate conda 'dev' environment
4. ✅ Install Python dependencies if needed
5. ✅ Install frontend dependencies if needed
6. ✅ Start backend server (port 8001)
7. ✅ Start frontend server (port 3000)
8. ✅ Open http://localhost:3000 automatically

### Stop Everything

```bash
# Stop all services
bash stop.sh
```

Or press `Ctrl+C` in the terminal running `start.sh`

---

## Manual Setup (Step by Step)

### Step 1: Start Docker Services

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs
```

**Services started:**
- PostgreSQL: `localhost:5433` (user: fdt, password: fdtpass, database: fdt_db)
- Redis: `localhost:6379`

### Step 2: Activate Conda Environment

```bash
# Activate dev environment
conda activate dev

# Verify
which python
# Should show: /home/aakash/miniconda3/envs/dev/bin/python
```

### Step 3: Install Python Dependencies

```bash
# Make sure you're in the conda 'dev' environment
pip install -r requirements.txt
```

**Key packages:**
- fastapi (web framework)
- psycopg2-binary (PostgreSQL driver)
- redis (Redis client)
- scikit-learn, xgboost (ML models)
- numpy, scipy (numerical computing)

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5: Configure Environment

Create `frontend/.env` (if not exists):

```bash
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > frontend/.env
```

Backend `.env` already exists in project root (no changes needed).

### Step 6: Start Application Servers

**Terminal 1 - Backend:**
```bash
conda activate dev
python backend/server.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

---

## Docker Services Management

### Start Services
```bash
docker compose up -d
```

### Stop Services
```bash
docker compose down
```

### View Logs
```bash
# All services
docker compose logs -f

# PostgreSQL only
docker compose logs -f db

# Redis only
docker compose logs -f redis
```

### Access Database
```bash
# Connect to PostgreSQL inside container
docker compose exec db psql -U fdt -d fdt_db

# From host machine
psql -h localhost -p 5433 -U fdt -d fdt_db
```

### Access Redis
```bash
# Connect to Redis CLI inside container
docker compose exec redis redis-cli

# From host machine
redis-cli -p 6379
```

### Reset Database
```bash
# Stop and remove volumes
docker compose down -v

# Start fresh
docker compose up -d

# Database will be re-initialized with init_schema.sql
```

---

## Environment Details

### Conda Environment: `dev`
- **Python Version:** 3.11.14
- **Location:** `/home/aakash/miniconda3/envs/dev`
- **Activation:** `conda activate dev`

### Docker Services

**PostgreSQL:**
- **Image:** postgres:14
- **Container Name:** fdt-postgres
- **Host Port:** 5433 → Container Port: 5432
- **Credentials:**
  - User: `fdt`
  - Password: `fdtpass`
  - Database: `fdt_db`
- **Connection String:** `postgresql://fdt:fdtpass@localhost:5433/fdt_db`

**Redis:**
- **Image:** redis:6
- **Container Name:** fdt-redis
- **Host Port:** 6379 → Container Port: 6379
- **Connection String:** `redis://localhost:6379/0`

---

## Application URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React PWA |
| Backend API | http://localhost:8001 | FastAPI server |
| API Docs | http://localhost:8001/docs | Swagger UI |
| PostgreSQL | localhost:5433 | Database |
| Redis | localhost:6379 | Cache |

---

## Demo Users

The database is pre-loaded with demo users:

| Name | Phone | Password | Balance |
|------|-------|----------|---------|
| Rajesh Kumar | +919876543210 | password123 | ₹25,000 |
| Priya Sharma | +919876543211 | password123 | ₹15,000 |
| Amit Patel | +919876543212 | password123 | ₹30,000 |

---

## Development Workflow

### Making Backend Changes

```bash
# 1. Ensure conda environment is activated
conda activate dev

# 2. Make changes to files in app/ or backend/

# 3. Restart backend
# Press Ctrl+C, then:
python backend/server.py
```

### Making Frontend Changes

```bash
# Changes auto-reload, no restart needed
# Just edit files in frontend/src/
```

### Running Tests

```bash
# Activate conda environment
conda activate dev

# Run backend tests
python -m pytest tests/
python tests/test_fraud_reasons.py
python tests/test_ml_standalone.py

# Run frontend tests
cd frontend
npm test
```

---

## Troubleshooting

### Docker Services Not Starting

**Check if ports are already in use:**
```bash
# Check PostgreSQL port
lsof -i:5433

# Check Redis port
lsof -i:6379

# Kill processes if needed
kill -9 <PID>
```

**Check Docker logs:**
```bash
docker compose logs db
docker compose logs redis
```

### Conda Environment Issues

**Environment not activating:**
```bash
# Initialize conda for your shell
conda init bash
source ~/.bashrc

# Then try again
conda activate dev
```

**Wrong Python version:**
```bash
# Check Python in environment
conda activate dev
python --version  # Should show 3.11.x

# If wrong, recreate environment
conda deactivate
conda env remove -n dev
conda create -n dev python=3.11
conda activate dev
pip install -r requirements.txt
```

### Database Connection Issues

**Cannot connect to PostgreSQL:**
```bash
# Check if container is running
docker compose ps

# Check if database is ready
docker compose exec db pg_isready -U fdt

# Check connection from host
psql -h localhost -p 5433 -U fdt -d fdt_db

# If fails, check .env DB_URL matches port 5433
cat .env | grep DB_URL
# Should show: DB_URL=postgresql://fdt:fdtpass@127.0.0.1:5433/fdt_db
```

### Backend Can't Connect to Database

**Error: `psycopg2.OperationalError`**

Check `.env` file:
```bash
# Should use port 5433 (Docker mapped port)
DB_URL=postgresql://fdt:fdtpass@127.0.0.1:5433/fdt_db
```

**Test connection:**
```bash
conda activate dev
python -c "import psycopg2; conn = psycopg2.connect('postgresql://fdt:fdtpass@localhost:5433/fdt_db'); print('Connected!')"
```

### Frontend Can't Connect to Backend

**Check backend is running:**
```bash
curl http://localhost:8001/api/health
```

**Check frontend .env:**
```bash
cat frontend/.env
# Should show: REACT_APP_BACKEND_URL=http://localhost:8001
```

### ML Models Not Loading

**Models exist but not loading:**
```bash
conda activate dev
python -c "from app.scoring import load_models; load_models()"
```

**Models missing (retrain):**
```bash
conda activate dev
python train/train_models.py
python train/train_iforest.py
```

---

## Useful Commands

### Quick Commands

```bash
# Start everything
bash start.sh

# Stop everything
bash stop.sh

# Restart Docker services only
docker compose restart

# View all logs
docker compose logs -f

# Check what's running
docker compose ps
ps aux | grep -E "python|npm"

# Kill all related processes
pkill -f "python backend/server.py"
pkill -f "npm start"
```

### Database Operations

```bash
# Backup database
docker compose exec db pg_dump -U fdt fdt_db > backup.sql

# Restore database
cat backup.sql | docker compose exec -T db psql -U fdt fdt_db

# Reset database
docker compose down -v
docker compose up -d
```

### Python Package Management

```bash
# Activate environment
conda activate dev

# Install package
pip install package-name

# Update requirements.txt
pip freeze > requirements.txt

# Install from requirements
pip install -r requirements.txt
```

---

## Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
cd ..
```

### Run Backend in Production

```bash
conda activate dev

# Using uvicorn with workers
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --workers 4

# Or using gunicorn
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.server:app --bind 0.0.0.0:8001
```

### Environment Variables

Update `.env` for production:
```bash
DB_URL=postgresql://user:password@production-host:5432/fdt_db
JWT_SECRET_KEY=<generate-strong-random-key>
REDIS_URL=redis://production-redis:6379/0
```

---

## Project Structure

```
FDT/
├── docker-compose.yml       # Docker services configuration
├── start.sh                 # Start script (Docker + Conda)
├── stop.sh                  # Stop script
├── .env                     # Environment variables
├── requirements.txt         # Python dependencies
├── app/                     # Core Python application
├── backend/                 # User-facing API server
│   ├── server.py           # Main backend server
│   └── init_schema.sql     # Database initialization
├── frontend/               # React PWA
│   ├── src/               # React source code
│   └── package.json       # Frontend dependencies
├── models/                # Trained ML models
├── tests/                 # Test suite
└── tools/                 # Utility scripts
```

---

## Next Steps

1. ✅ **Run** `bash start.sh` to start everything
2. ✅ **Open** http://localhost:3000
3. ✅ **Login** with demo credentials
4. ✅ **Test** fraud detection features
5. ✅ **Stop** with `bash stop.sh` or Ctrl+C

---

**Need Help?**
- Check Docker logs: `docker compose logs -f`
- Check backend logs: Terminal output
- Check frontend logs: Browser console
- Review troubleshooting section above

---

**Last Updated:** January 2026  
**Docker:** v29.1.5  
**Docker Compose:** v5.0.2  
**Conda Environment:** dev (Python 3.11.14)
