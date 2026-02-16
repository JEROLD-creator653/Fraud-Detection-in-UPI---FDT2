# Render Deployment Guide

## Quick Start

### Step 1: Sign Up for Render
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub
4. Authorize Render to access your repositories

### Step 2: Deploy Using Blueprint

**Option A: Automatic (Recommended)**
1. In Render dashboard, click "New" → "Blueprint"
2. Connect your GitHub repo: `Fraud-Detection-in-UPI---FDT2`
3. Select branch: `production`
4. Click "Apply"
5. Render will automatically create all 5 services!

**Option B: Manual**
Create each service individually (see below)

---

## Manual Deployment (if Blueprint doesn't work)

### 1. Create PostgreSQL Database
1. Dashboard → "New" → "PostgreSQL"
2. Name: `fdt-postgres`
3. Database: `fdt_db`
4. User: `fdt`
5. Plan: **Free**
6. Click "Create Database"
7. **Copy the Internal Database URL** - you'll need it!

### 2. Create Redis Service
1. Dashboard → "New" → "Private Service"
2. Name: `fdt-redis`
3. Runtime: **Docker**
4. Select your repo and `production` branch
5. Dockerfile Path: `docker/redis.Dockerfile`
6. Plan: **Free**
7. Click "Create Private Service"

### 3. Create User Backend
1. Dashboard → "New" → "Web Service"
2. Name: `fdt-user-api`
3. Runtime: **Docker**
4. Select your repo and `production` branch
5. Dockerfile Path: `Dockerfile.backend`
6. Set Environment Variables:
   - `DB_URL`: (paste from PostgreSQL)
   - `REDIS_URL`: `redis://fdt-redis:6379/0`
   - `JWT_SECRET_KEY`: `Aetu7iZiwW7ooeDsmWO1qNPoMg4MNlSNpYQXKizSzpo`
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD_HASH`: `$pbkdf2-sha256$29000$UEoppdTa.3/PWUsphZCSkg$FNKn6Lz3vXsjx6GGl5AKsz7Rf0gyLAm2ZqlOOau3bBg`
   - `ALLOWED_ORIGINS`: (your Render frontend URL + custom domain)
   - `DELAY_THRESHOLD`: `0.35`
   - `BLOCK_THRESHOLD`: `0.70`
   - `GROQ_API_KEY`: (your API key)
7. Plan: **Free**
8. Click "Create Web Service"

### 4. Create Admin Backend
1. Dashboard → "New" → "Web Service"
2. Name: `fdt-admin-api`
3. Runtime: **Docker**
4. Dockerfile Path: `Dockerfile.admin`
5. Same environment variables as User Backend
6. Plan: **Free**
7. Click "Create Web Service"

### 5. Create Frontend
1. Dashboard → "New" → "Static Site"
2. Name: `fdt-frontend`
3. Select your repo and `production` branch
4. Build Command: `cd frontend && npm install && npm run build`
5. Publish Directory: `frontend/build`
6. Environment Variables:
   - `REACT_APP_API_URL`: (your user API URL)
7. Plan: **Free**
8. Click "Create Static Site"

---

## Step 3: Custom Domain Setup

### Point Your Domain to Render

After all services are deployed:

1. Go to your **Frontend** service dashboard
2. Click "Settings" → "Custom Domains"
3. Add Domain: `fdt2-secureupi.tech`
4. Render will give you DNS records

### Update Name.com DNS:
1. Log into Name.com
2. Go to your domain: `fdt2-secureupi.tech`
3. Go to DNS Records
4. Add CNAME record:
   - Name: `@`
   - Type: `CNAME`
   - Value: (your Render frontend URL)
   - TTL: 3600
5. Add CNAME record:
   - Name: `www`
   - Type: `CNAME`
   - Value: (your Render frontend URL)
   - TTL: 3600

### For APIs (Subdomains):
Option 1: Use Render's URLs (easiest)
Option 2: Set up subdomains:
- `api.fdt2-secureupi.tech` → User API
- `admin.fdt2-secureupi.tech` → Admin API

---

## Step 4: Verify Deployment

### Test Your URLs:
```bash
# Frontend
curl https://fdt-frontend-xxx.onrender.com

# User API
curl https://fdt-user-api-xxx.onrender.com/api/health

# Admin API
curl https://fdt-admin-api-xxx.onrender.com/admin/health
```

### Register Test User:
```bash
curl -X POST https://fdt-user-api-xxx.onrender.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "password123"}'
```

---

## Important Notes

### Free Tier Limitations:
- **Sleep after 15 minutes** of inactivity
- **512MB RAM** per service (optimized for this)
- **750 hours** runtime per month
- **1GB storage** for PostgreSQL

### To Prevent Sleeping:
Use a free uptime monitoring service:
- UptimeRobot: https://uptimerobot.com
- Set to ping your services every 5 minutes

### Costs:
**Everything is FREE on Render's free tier!**

---

## Troubleshooting

### Service Won't Start:
- Check logs in Render dashboard
- Verify environment variables
- Check Dockerfile builds locally: `docker build -f Dockerfile.backend .`

### Database Connection Issues:
- Use Internal Database URL (not External)
- Format: `postgresql://fdt:password@fdt-postgres:5432/fdt_db`

### CORS Errors:
- Update `ALLOWED_ORIGINS` with correct Render URLs
- Include both `https://` and `http://` versions

### Build Failures:
- Check `render.yaml` syntax
- Verify all files exist in production branch
- Test locally: `docker-compose -f docker-compose.azure.yml up`

---

## Support

- Render Docs: https://render.com/docs
- Community: https://community.render.com
- Your deployment files are in: `render.yaml`, `Dockerfile.*`, `docker/`

**Ready to deploy?** Start with Step 1 - sign up at https://render.com! 🚀
