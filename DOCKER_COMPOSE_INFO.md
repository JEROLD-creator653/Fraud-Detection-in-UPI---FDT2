# Docker Compose Files

This project has two docker-compose files:

## `/docker-compose.yml` (Root - Recommended for Development)
- **Location:** Project root
- **Features:**
  - Container names (fdt-postgres, fdt-redis)
  - Healthchecks for both services
  - Auto-initialization with `backend/init_schema.sql`
  - UTF-8 encoding (no issues)
- **Use with:** `docker compose up -d` from project root
- **Best for:** Running with `start.sh` script and development

## `/tools/docker-compose.yml` (Original - Basic)
- **Location:** tools/ directory
- **Features:**
  - Basic PostgreSQL and Redis setup
  - Minimal configuration
  - UTF-16 encoding (original)
- **Use with:** `docker compose -f tools/docker-compose.yml up -d`
- **Best for:** Quick standalone Docker testing

---

## Recommendation

Use the **root docker-compose.yml** for development as it:
- Works seamlessly with `start.sh` script
- Auto-initializes database schema
- Has healthchecks to ensure services are ready
- Better error handling

The `tools/` version is kept for backward compatibility.
