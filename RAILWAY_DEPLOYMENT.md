# Railway Deployment Guide for FDT

## Why Railway?
✅ No credit card required
✅ $5/month free credit (enough for your app!)
✅ Supports Docker & Docker Compose
✅ PostgreSQL included
✅ Easy GitHub integration

---

## Step 1: Sign Up for Railway

1. Go to: **https://railway.app/**
2. Click **"Start a New Project"**
3. Sign up with **GitHub**
4. Authorize Railway to access your repositories

---

## Step 2: Deploy from GitHub

### Option A: Railway CLI (Recommended)

**Install Railway CLI:**
```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 -useb | iex
```

**Login and Deploy:**
```bash
# Login
railway login

# Navigate to your project
cd /path/to/Fraud-Detection-in-UPI---FDT2

# Initialize Railway project
railway init

# Deploy
railway up
```

### Option B: Dashboard GUI

1. Railway Dashboard → "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: `Fraud-Detection-in-UPI---FDT2`
4. Select branch: `production`
5. Click "Deploy"

---

## Step 3: Add PostgreSQL Database

1. In your Railway project, click **"New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create the database automatically
4. **Copy the DATABASE_URL** - you'll need it!

---

## Step 4: Add Redis

1. Click **"New"** → **"Database"** → **"Add Redis"**
2. Railway creates Redis automatically
3. **Copy the REDIS_URL**

---

## Step 5: Deploy Your Services

### Deploy User Backend:
1. Click **"New"** → **"Deploy from GitHub repo"**
2. Select your repo
3. Configure:
   - **Start Command:** `python backend/server.py`
   - **Root Directory:** `/` (leave empty for root)
4. Add Environment Variables:
   ```
   DB_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET_KEY=Aetu7iZiwW7ooeDsmWO1qNPoMg4MNlSNpYQXKizSzpo
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=$pbkdf2-sha256$29000$UEoppdTa.3/PWUsphZCSkg$FNKn6Lz3vXsjx6GGl5AKsz7Rf0gyLAm2ZqlOOau3bBg
   ALLOWED_ORIGINS=https://fdt2-secureupi.tech,https://www.fdt2-secureupi.tech
   DELAY_THRESHOLD=0.35
   BLOCK_THRESHOLD=0.70
   GROQ_API_KEY=your_groq_api_key
   PORT=8001
   ```
5. Click "Deploy"

### Deploy Admin Backend:
1. Click **"New"** → **"Deploy from GitHub repo"**
2. Same repo, but change start command:
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`
3. Same environment variables as User Backend
4. Add PORT=8000
5. Click "Deploy"

### Deploy Frontend:
1. Click **"New"** → **"Deploy from GitHub repo"**
2. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s build -l 3000`
3. Environment Variables:
   ```
   REACT_APP_API_URL=https://your-user-backend-url.up.railway.app/api
   ```
4. Click "Deploy"

---

## Step 6: Custom Domain

1. Go to your **Frontend** service
2. Click **"Settings"** tab
3. Scroll to **"Custom Domain"**
4. Add: `fdt2-secureupi.tech`
5. Railway will give you a CNAME record
6. Go to Name.com and add the CNAME
7. Wait for DNS propagation (5-10 minutes)

---

## Alternative: Using railway.json (Declarative)

Create a `railway.json` file in your repo root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.backend"
  },
  "deploy": {
    "startCommand": "python backend/server.py",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Troubleshooting

### Service Won't Start:
- Check logs in Railway dashboard (real-time)
- Verify environment variables
- Check if PORT is set correctly

### Database Connection Issues:
- Use the internal Railway URL format
- Format: `postgresql://user:pass@host:port/db`

### Out of Memory:
- Railway free tier: 512MB RAM
- If needed, upgrade to Starter plan ($5/month) for 1GB RAM

### Free Tier Limits:
- **$5 credit** = ~170 hours of 512MB service
- **No sleep** - services run 24/7
- **1GB storage** for PostgreSQL
- Enough for your project!

---

## Railway vs Render Comparison

| Feature | Railway | Render |
|---------|---------|--------|
| Credit Card | ❌ NO | ✅ Sometimes asks |
| Free Credit | $5/month | Unlimited (with limits) |
| Sleep After Idle | ❌ NO | ✅ 15 min |
| PostgreSQL | ✅ Included | ✅ Included |
| Docker | ✅ Yes | ✅ Yes |
| Setup | ⚡ Easier | ⚡ Easy |
| Custom Domain | ✅ Yes | ✅ Yes |

---

## Support

- Railway Docs: https://docs.railway.app/
- Discord: https://discord.gg/railway
- Status: https://railway.app/status

---

**Ready to deploy?** Go to https://railway.app and start! 🚀
