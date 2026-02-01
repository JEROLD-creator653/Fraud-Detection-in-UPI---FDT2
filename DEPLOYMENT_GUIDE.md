# FDT Secure - Deployment Guide (Docker Compose)

## Quick Overview

This guide will help you deploy the FDT Secure fraud detection system to your old laptop (192.168.2.1) using Docker Compose.

**What gets deployed:**
- PostgreSQL 14 (Database)
- Redis 6 (Caching)
- Backend API Server (Port 8001)
- Admin Dashboard (Port 8000)

**Estimated time:** 15-30 minutes

---

## Prerequisites

### On Your Development Machine (where you pull from git)

```bash
# Verify you have the latest changes
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2
git log --oneline -5
# Should show recent commits including docker-compose cleanup

# Verify docker-compose exists and is valid
cat docker-compose.yml
# Should show PostgreSQL and Redis services
```

### On Target Machine (192.168.2.1)

```bash
# 1. Operating System Support
#    - Ubuntu 18.04+ (Recommended)
#    - Debian 10+
#    - Any Linux with Docker support

# 2. Required System Resources
#    - 2+ GB RAM (minimum)
#    - 5+ GB Disk space
#    - Network connectivity

# 3. Check system info
uname -a
free -h
df -h
```

---

## Step 1: Prepare on Development Machine

### 1.1 Create Deployment Package

```bash
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2

# Create deployment directory
mkdir -p deployment
cd deployment

# Copy essential files
cp -r ../. ./fdt-secure
cd fdt-secure

# Verify key files
ls -la docker-compose.yml
ls -la requirements.txt
ls -la .env
ls -la backend/init_schema.sql

# Show what we're deploying
tree -L 2 -I 'node_modules|__pycache__|.git'
```

### 1.2 Create Deployment README

```bash
cat > DEPLOYMENT_NOTES.txt << 'EOF'
FDT Secure Deployment Package
Generated: $(date)

Contents:
- docker-compose.yml (Main deployment config)
- requirements.txt (Python dependencies)
- .env (Environment variables)
- backend/ (API server)
- app/ (Admin dashboard)
- frontend/ (React UI - optional)

Services to Run:
1. PostgreSQL 14 (Database)
2. Redis 6 (Cache)
3. Backend API (Python/FastAPI)
4. Admin Dashboard (Python/FastAPI)

Quick Start on Target Machine:
1. docker-compose up -d
2. Monitor: docker-compose logs -f
3. Access: http://192.168.2.1:8001 (API), http://192.168.2.1:8000 (Admin)

Total deployment size: ~500MB (with Docker images: 2-3GB)
EOF
```

### 1.3 Test Locally First

```bash
# IMPORTANT: Test docker-compose locally first
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2

# Validate syntax
docker-compose config

# Check for errors
docker-compose config --quiet

# Show what would be created
docker-compose config
```

---

## Step 2: Transfer Files to Old Laptop

### Option A: Using SCP (Recommended for network transfer)

```bash
# On development machine
cd /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2

# Create tar archive (faster transfer)
tar --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
    -czf fdt-secure.tar.gz .

# Transfer to old laptop
scp fdt-secure.tar.gz user@192.168.2.1:/tmp/

# On old laptop, extract:
ssh user@192.168.2.1
cd /opt  # or your preferred location
sudo tar -xzf /tmp/fdt-secure.tar.gz
cd fdt-secure
ls -la
```

### Option B: Using Git Clone

```bash
# On old laptop, if it has git access
cd /opt
git clone <your-repo-url> fdt-secure
cd fdt-secure
git pull origin main
```

### Option C: USB Drive / Direct Copy

```bash
# Copy to USB and transfer manually
rsync -av --exclude='.git' \
    /home/aakash/Projects/Fraud-Detection-in-UPI---FDT2/ \
    /media/usb/fdt-secure/

# Then on old laptop:
cp -r /media/usb/fdt-secure /opt/
```

---

## Step 3: Install Docker on Old Laptop (192.168.2.1)

### 3.1 Install Docker Engine

```bash
# SSH to old laptop
ssh user@192.168.2.1

# Update system
sudo apt update
sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker run hello-world
```

### 3.2 Install Docker Compose

```bash
# Install latest docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

### 3.3 Verify Docker Setup

```bash
# Check Docker daemon
docker info

# Check docker-compose
docker-compose --version

# Test docker-compose
docker-compose config
# Should show services: db, redis

# Check disk space
df -h
# Need at least 5GB free
```

---

## Step 4: Configure for Deployment

### 4.1 Update Environment Variables

```bash
# On old laptop, in project directory
cd /opt/fdt-secure

# Edit .env for production
nano .env
# or
vim .env

# Make sure these are set:
DB_URL=postgresql://fdt:fdtpass@db:5432/fdt_db
# Note: Use 'db' (Docker service name) NOT localhost
DELAY_THRESHOLD=0.35
BLOCK_THRESHOLD=0.70
GROQ_API_KEY=<your-api-key>
```

### 4.2 Review docker-compose.yml

```bash
# Verify deployment config
cat docker-compose.yml

# Should show:
# - PostgreSQL service (port 5432)
# - Redis service (port 6379)
# - Volume mounting for persistent data
# - Healthchecks
# - Schema initialization

# Edit if needed (change ports, volumes, etc.)
nano docker-compose.yml
```

### 4.3 Create Data Directories

```bash
# Create directories for persistent storage
mkdir -p ./data/postgres
mkdir -p ./data/redis
mkdir -p ./logs

# Set permissions
chmod 755 ./data ./data/postgres ./data/redis ./logs

# Check
ls -la data/
```

---

## Step 5: Start Services

### 5.1 Build and Start with Docker Compose

```bash
# On old laptop, in project directory
cd /opt/fdt-secure

# Pull latest images
docker-compose pull

# Build any custom images if needed
docker-compose build

# Start all services in background
docker-compose up -d

# Watch startup
docker-compose logs -f

# Press Ctrl+C to stop watching logs
```

### 5.2 Monitor Startup Progress

```bash
# Check service status
docker-compose ps

# Expected output:
# NAME                    STATUS              PORTS
# fdt-postgres           Up (healthy)        0.0.0.0:5432->5432/tcp
# fdt-redis              Up (healthy)        0.0.0.0:6379->6379/tcp

# Check individual logs
docker-compose logs db        # PostgreSQL
docker-compose logs redis     # Redis

# Wait for healthchecks to pass (usually 10-30 seconds)
```

### 5.3 Start Backend Services

```bash
# Option A: Using docker-compose (for complete stack with DB/Redis)
docker-compose up -d

# Option B: Start Python services separately (if not using docker for apps)
# In a new terminal:
python -m backend.server      # Runs on port 8001
# In another terminal:
python -m app.main            # Runs on port 8000

# Verify they're running
netstat -tuln | grep -E '8000|8001|5432|6379'
```

---

## Step 6: Verify Deployment

### 6.1 Check Service Status

```bash
# Check all containers
docker-compose ps

# Expected output:
# CONTAINER ID   IMAGE           STATUS
# abc123...      postgres:14     Up 2 minutes (healthy)
# def456...      redis:6         Up 2 minutes (healthy)
```

### 6.2 Test Database Connection

```bash
# From host machine
psql -h 192.168.2.1 -U fdt -d fdt_db -c "SELECT VERSION();"
# Should return PostgreSQL version

# Or test with Python
python -c "
import psycopg2
conn = psycopg2.connect('postgresql://fdt:fdtpass@192.168.2.1:5432/fdt_db')
print('✓ Database connected')
conn.close()
"
```

### 6.3 Test Redis Connection

```bash
# From host machine
redis-cli -h 192.168.2.1 -p 6379 ping
# Should return: PONG

# Or test with Python
python -c "
import redis
r = redis.from_url('redis://192.168.2.1:6379/0')
print('✓ Redis connected:', r.ping())
"
```

### 6.4 Test API Endpoints

```bash
# Test backend API
curl -s http://192.168.2.1:8001/health | jq
# Or
curl http://192.168.2.1:8001/docs
# Should show Swagger UI

# Test admin dashboard
curl -s http://192.168.2.1:8000/health | jq
# Or visit in browser:
# http://192.168.2.1:8000
```

### 6.5 Test Fraud Detection

```bash
# From development machine
python -c "
import requests
import json

# Test transaction scoring
url = 'http://192.168.2.1:8001/api/transactions'
headers = {'Authorization': 'Bearer <token>'}

# Score a test transaction
response = requests.post(url, json={
    'amount': 100,
    'recipient_vpa': 'test@bank',
    'user_id': 'user_001'
}, headers=headers)

print(response.json())
"
```

---

## Step 7: Production Hardening

### 7.1 Update Passwords

```bash
# On old laptop
cd /opt/fdt-secure

# Edit .env
nano .env

# Change these for production:
DB_PASSWORD=<strong-random-password>
ADMIN_PASSWORD_HASH=<new-hash>
JWT_SECRET_KEY=<long-random-string>
```

### 7.2 Configure Persistence

```bash
# Ensure database persists
docker volume ls | grep fdt
# Should show: fdt_db-data

# Check volume size
docker volume inspect fdt_db-data

# Backup configuration
docker-compose config > docker-compose.backup.yml
```

### 7.3 Set Up Logging

```bash
# Create log directory
mkdir -p /var/log/fdt-secure
sudo chown $(whoami):$(whoami) /var/log/fdt-secure

# Redirect logs
docker-compose logs -f > /var/log/fdt-secure/docker.log &

# Or use log rotation
cat > /etc/logrotate.d/fdt-secure << 'EOF'
/var/log/fdt-secure/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF
```

### 7.4 Enable Auto-Restart

```bash
# Update docker-compose to auto-restart on failure
cat >> docker-compose.yml << 'EOF'
    restart_policy:
      condition: on-failure
      delay: 5s
      max_attempts: 3
EOF
```

---

## Step 8: Daily Operations

### Start Services

```bash
# SSH to old laptop
ssh user@192.168.2.1

# Navigate to project
cd /opt/fdt-secure

# Start all services
docker-compose up -d

# Verify they're running
docker-compose ps
```

### Monitor Services

```bash
# Watch logs in real-time
docker-compose logs -f

# Watch specific service
docker-compose logs -f db

# Check health status
docker-compose exec db pg_isready -U fdt
docker-compose exec redis redis-cli ping
```

### Stop Services

```bash
# Stop gracefully
docker-compose stop

# Force stop if needed
docker-compose kill

# Remove containers (keep data)
docker-compose down

# Remove everything including volumes (be careful!)
docker-compose down -v
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart db

# View restart count
docker-compose ps
```

---

## Troubleshooting

### Issue: "docker-compose command not found"

```bash
# Install docker-compose
sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) \
    -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

### Issue: "Permission denied" for docker

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply new group
newgrp docker

# Verify
docker ps
```

### Issue: "Port already in use"

```bash
# Check what's using the port
lsof -i :8001
lsof -i :5432

# If containers are still running:
docker-compose down

# If system services are using port, change docker-compose.yml:
# Change:  "8001:8000"  to  "8002:8000"  (use different port)
```

### Issue: "Database connection failed"

```bash
# Check if PostgreSQL is running
docker-compose logs db

# Restart database
docker-compose restart db

# Check connection
docker-compose exec db psql -U fdt -d fdt_db -c "SELECT 1;"

# Verify .env has correct DB_URL
cat .env | grep DB_URL
# Should be: postgresql://fdt:fdtpass@db:5432/fdt_db
# NOT: localhost or 127.0.0.1 (use 'db' service name)
```

### Issue: "Out of disk space"

```bash
# Check disk usage
df -h

# Cleanup Docker unused images
docker image prune -a

# Cleanup unused volumes
docker volume prune

# Check Docker data usage
docker system df

# Reduce log size
docker-compose logs --tail 100 > logs.txt
```

---

## Verification Checklist

After deployment, verify:

- [ ] Docker services running: `docker-compose ps`
- [ ] PostgreSQL healthy: `docker-compose exec db pg_isready -U fdt`
- [ ] Redis healthy: `docker-compose exec redis redis-cli ping`
- [ ] Backend API accessible: `curl http://192.168.2.1:8001/docs`
- [ ] Admin dashboard accessible: `curl http://192.168.2.1:8000`
- [ ] Database initialized: `psql -h 192.168.2.1 -U fdt -d fdt_db -c "\dt"`
- [ ] Test transaction processed: Run simulator or manual test
- [ ] Fraud detection working: Check fraud scores on sample transaction
- [ ] No critical errors: `docker-compose logs | grep -i error`

---

## Rollback Procedure

If something goes wrong:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (keeps backups)
docker volume rm fdt_db-data

# Restore from backup
docker-compose up -d

# Verify
docker-compose ps
```

---

## Performance Tuning

### Increase Memory

```bash
# Edit docker-compose.yml
services:
  db:
    environment:
      POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c max_connections=200"
```

### Increase PostgreSQL Connection Pool

```bash
# In docker-compose.yml or .env
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```

### Optimize Redis

```bash
# Check Redis memory usage
docker-compose exec redis redis-cli INFO memory

# Set max memory
docker-compose exec redis redis-cli CONFIG SET maxmemory 1gb
```

---

## Security Considerations

1. **Change default passwords** in .env before production
2. **Use SSL/TLS** for external connections
3. **Restrict network access** to old laptop (firewall rules)
4. **Regular backups** of PostgreSQL data
5. **Update Docker images** monthly
6. **Monitor logs** for suspicious activity

---

## Next Steps

1. ✅ Deploy with docker-compose
2. ✅ Verify all services running
3. ✅ Test with sample transactions
4. ✅ Monitor performance
5. ✅ Set up automated backups
6. ✅ Configure monitoring/alerting

---

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Verify connectivity: `telnet 192.168.2.1 5432`
- Test manually: `python tools/debug_scoring.py`
- Review AGENTS.md for project details

---

**Last Updated:** 2026-02-01
**Version:** 1.0
