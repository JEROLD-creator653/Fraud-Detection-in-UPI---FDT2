# FDT - Quick Command Reference

## Start Application

```bash
# User app only (most common)
bash start.sh

# User app + Admin dashboard
bash start.sh --admin

# Admin dashboard only
bash start_admin.sh
```

**The start script now automatically kills existing processes on ports 3000, 8000, and 8001!**

---

## Stop Application

```bash
# Stop everything
bash stop.sh

# Stop frontend only
bash kill_frontend.sh
```

---

## Access URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **User API** | http://localhost:8001 |
| **Admin Dashboard** | http://localhost:8000 |
| **User API Docs** | http://localhost:8001/docs |
| **Admin API Docs** | http://localhost:8000/docs |

---

## Demo Login

- Phone: `+919876543210`
- Password: `password123`

---

## View Logs

```bash
# Backend logs
tail -f /tmp/fdt-backend.log

# Admin logs
tail -f /tmp/fdt-admin.log

# Docker logs
docker compose logs -f
```

---

## Check Status

```bash
# Docker services
docker compose ps

# Check ports
lsof -i:3000  # Frontend
lsof -i:8001  # User backend
lsof -i:8000  # Admin dashboard
```

---

## Troubleshooting

### Port Already in Use

Start script now handles this automatically!

Manual override if needed:
```bash
bash kill_frontend.sh           # Kill frontend
lsof -ti:8001 | xargs kill -9   # Kill user backend
lsof -ti:8000 | xargs kill -9   # Kill admin dashboard
```

### Clean Restart

```bash
bash stop.sh
bash start.sh --admin
```

---

## Documentation

- **README.md** - Quick start guide
- **HOW_TO_RUN.md** - Complete running guide
- **AGENTS.md** - Coding guidelines
- **SETUP_DOCKER.md** - Docker setup

---

**Need help?** Run `cat HOW_TO_RUN.md` for detailed instructions.
