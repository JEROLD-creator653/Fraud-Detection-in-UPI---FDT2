# FDT - Fraud Detection in UPI Transactions

> **Quick Start with Docker + Conda**

## 🚀 One-Command Setup

```bash
# Start user backend + frontend
bash start.sh

# Start user backend + admin dashboard + frontend
bash start.sh --admin
```

This starts:
- PostgreSQL (Docker, port 5433)
- Redis (Docker, port 6379)  
- User Backend API (Conda 'dev', port 8001)
- Admin Dashboard (Conda 'dev', port 8000) - optional
- Frontend App (port 3000)

Then open: 
- **User App:** http://localhost:3000
- **Admin Dashboard:** http://localhost:8000 (if started with `--admin`)

---

## 🏗️ Two Backend Servers

This project has **two separate backend servers**:

### 1. User Backend (`backend/server.py`) - Port 8001
**What the React frontend connects to**
- User authentication (register/login)
- Transaction creation
- User dashboard data
- Fraud detection for user transactions

### 2. Admin Dashboard (`app/main.py`) - Port 8000
**Admin monitoring console**
- Real-time activity monitoring
- System-wide fraud statistics
- Transaction analytics across all users
- ML model performance metrics

**Start both:** `bash start.sh --admin`  
**Start admin only:** `bash start_admin.sh`

---

## 📋 Prerequisites

✅ Already installed:
- Docker v29.1.5
- Docker Compose v5.0.2
- Conda environment 'dev' (Python 3.11.14)
- ML models in `models/` directory

🔧 Need to install:
```bash
# Frontend dependencies
cd frontend && npm install && cd ..

# Python dependencies (in conda env 'dev')
conda activate dev
pip install -r requirements.txt
```

---

## 🎯 Demo Login

- **Phone:** +919876543210
- **Password:** password123

---

## 📚 Documentation

| File | Description |
|------|-------------|
| **SETUP_DOCKER.md** | Complete Docker + Conda setup guide |
| **HOW_TO_RUN.md** | Complete guide for running both backends |
| **AGENTS.md** | Coding standards for agents |
| **start.sh** | Start all services |
| **start_admin.sh** | Start admin dashboard only |
| **stop.sh** | Stop all services |
| **kill_frontend.sh** | Kill frontend server on port 3000 |

---

## 🛠️ Manual Start

```bash
# 1. Start Docker services
docker compose up -d

# 2. Activate conda environment
conda activate dev

# 3. Start user backend (terminal 1)
python backend/server.py

# 4. Start admin dashboard (terminal 2) - optional
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 5. Start frontend (terminal 3)
cd frontend && npm start
```

---

## ⚙️ Architecture

```
Frontend (React) → User Backend (FastAPI) → PostgreSQL (Docker)
     ↓                  ↓                         ↓
 Port 3000          Port 8001                 Port 5433
                        ↓
                   Redis (Docker)
                    Port 6379
                        ↑
Admin Dashboard (FastAPI)
     Port 8000
```

---

## 🌟 Features

- ✅ Real-time fraud detection with ML (Isolation Forest, Random Forest, XGBoost)
- ✅ User authentication with JWT
- ✅ Transaction history and dashboard
- ✅ Explainable fraud reasons (10 risk categories, 25+ features)
- ✅ Push notifications
- ✅ Risk analysis and security settings

---

**Need Help?** See [SETUP_DOCKER.md](SETUP_DOCKER.md) for detailed instructions.
