# FDT Deployment Guide - Digital Ocean + Name.com

## Phase 1: Domain Setup (DO THIS FIRST!)

### Step 1: Claim Your Free Domain via GitHub Student Pack
1. Go to [GitHub Student Developer Pack](https://education.github.com/pack)
2. Click "Sign in" (if not already signed in)
3. Scroll down to "Name.com" section
4. Click "Get access" or "View offer"
5. You'll get a unique promo code - **SAVE THIS!**
6. Create a Name.com account (or log in)
7. Go to your cart and apply the promo code
8. Register a domain (e.g., `fdt-demo.com`, `upifraudguard.com`, etc.)
9. **Note the domain name** - you'll need it later!

**Tips for domain selection:**
- Keep it short and memorable
- Avoid hyphens if possible
- Common TLDs: .com, .net, .io

---

## Phase 2: Prepare Your Repository

### Step 2: Create Production Branch
```bash
# From your project directory
git checkout -b production
git push -u origin production
```

### Step 3: Review & Update Environment Variables
Before deploying, you need to:
1. Generate a secure JWT secret key
2. Create admin password hash
3. Update CORS origins

Run these commands:

```bash
# Generate JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate admin password hash
python -c "from passlib.hash import pbkdf2_sha256; print(pbkdf2_sha256.hash('YourSecureAdminPassword'))"
```

**Save these values - you'll need them in Phase 3!**

---

## Phase 3: Digital Ocean Setup

### Step 4: Sign Up for Digital Ocean
1. Go to [Digital Ocean](https://www.digitalocean.com/)
2. Sign up with your GitHub account (easiest method)
3. Verify your email
4. **Important**: If you have GitHub Student Pack, you can get $200 credit
   - Check [GitHub Student Pack DO offer](https://education.github.com/pack?sort_by=popularity&tag=Cloud)

### Step 5: Create Managed Database
1. In DO Console, click "Databases" → "Create Database Cluster"
2. Choose PostgreSQL
3. Select "NYC3" or "BLR1" region (closest to you)
4. Choose development tier (cheapest)
5. Create database name: `fdt_db`
6. Wait for provisioning (2-3 minutes)
7. **Copy the connection string** - you'll need it!
8. Repeat for Redis (if using managed Redis)

### Step 6: Deploy App Platform
1. Click "Apps" → "Create App"
2. Choose "GitHub" and select your repository
3. Select the `production` branch
4. **Configure the app components:**

#### Component 1: Frontend (Static Site)
- **Name**: frontend
- **Source Directory**: `/frontend`
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `build`
- **HTTP Port**: 3000
- **Route**: `/`

#### Component 2: User Backend (Web Service)
- **Name**: user-backend
- **Source Directory**: `/`
- **Build Command**: `pip install -r requirements.txt`
- **Run Command**: `python backend/server.py`
- **HTTP Port**: 8001
- **Route**: `/api`
- **Instance Size**: Basic (512MB RAM)

#### Component 3: Admin Backend (Web Service)
- **Name**: admin-backend  
- **Source Directory**: `/`
- **Build Command**: `pip install -r requirements.txt`
- **Run Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **HTTP Port**: 8000
- **Route**: `/admin`
- **Instance Size**: Basic (512MB RAM)

### Step 7: Configure Environment Variables
Add these to your App Platform settings:

```
# For user-backend
DB_URL=<your-postgresql-connection-string>
REDIS_URL=<your-redis-connection-string>
JWT_SECRET_KEY=<your-generated-secret>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<your-generated-hash>
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
DELAY_THRESHOLD=0.35
BLOCK_THRESHOLD=0.70
GROQ_API_KEY=<your-groq-key>

# For admin-backend (same values)
DB_URL=<your-postgresql-connection-string>
REDIS_URL=<your-redis-connection-string>
JWT_SECRET_KEY=<your-generated-secret>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<your-generated-hash>
ALLOWED_ORIGINS=https://your-domain.com
DELAY_THRESHOLD=0.35
BLOCK_THRESHOLD=0.70
GROQ_API_KEY=<your-groq-key>
```

### Step 8: Deploy!
1. Click "Next" to review
2. Click "Create Resources"
3. Wait for deployment (5-10 minutes)
4. You'll get a temporary URL: `https://your-app-name.ondigitalocean.app`

---

## Phase 4: Connect Your Domain

### Step 9: Add Custom Domain in DO
1. In App Platform, go to "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain from Name.com (e.g., `fdt-demo.com`)
4. Choose "Let DigitalOcean manage DNS for this domain"
5. Copy the nameservers provided (usually 3 nameservers)

### Step 10: Update Name.com DNS
1. Log into Name.com
2. Go to "My Domains"
3. Click your domain
4. Go to "Nameservers" section
5. Select "Custom DNS"
6. Enter the 3 Digital Ocean nameservers
7. Save changes
8. **Wait 15-60 minutes** for DNS propagation

### Step 11: Enable HTTPS
1. Back in DO App Platform, go to your domain settings
2. The SSL certificate should auto-provision once DNS propagates
3. Enable "Force HTTPS" to redirect all HTTP to HTTPS

---

## Phase 5: Verify & Test

### Step 12: Test Your Deployment
```bash
# Test frontend
curl https://your-domain.com

# Test user API
curl https://your-domain.com/api/health

# Test admin API  
curl https://your-domain.com/admin/health

# Register a test user
curl -X POST https://your-domain.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "password123"}'
```

### Step 13: Update Environment Files (Optional)
Once verified, update your local `.env` file with production URLs for testing:
```bash
# Add to .env
PRODUCTION_API_URL=https://your-domain.com/api
PRODUCTION_ADMIN_URL=https://your-domain.com/admin
```

---

## Troubleshooting Checklist

### If deployment fails:
- [ ] Check build logs in DO console
- [ ] Verify all environment variables are set
- [ ] Ensure database is in the same region as app
- [ ] Check that `requirements.txt` has all dependencies

### If domain doesn't work:
- [ ] Verify nameservers are correctly updated at Name.com
- [ ] Wait at least 1 hour for DNS propagation
- [ ] Check SSL certificate status in DO
- [ ] Clear browser cache

### If APIs return errors:
- [ ] Check database connection string format
- [ ] Verify Redis URL is correct
- [ ] Ensure JWT secret is set for both backends
- [ ] Check CORS origins include your domain

---

## Quick Reference Commands

```bash
# Check deployment status
# (Use DO web console - no CLI needed for App Platform)

# View logs
digitalocean apps logs <app-id>

# Restart deployment
digitalocean apps restart <app-id>

# Scale services
digitalocean apps update <app-id> --service <service-name> --instance-size <size>
```

---

## Expected Timeline

| Phase | Estimated Time |
|-------|---------------|
| Domain Setup | 15 minutes |
| DO Sign Up + Database | 30 minutes |
| App Platform Config | 45 minutes |
| Domain Connection | 1-2 hours (mostly waiting) |
| Testing & Verification | 30 minutes |
| **Total** | **3-4 hours** |

---

## Next Steps After Deployment

1. **Set up monitoring** - Enable DO monitoring alerts
2. **Configure backups** - Enable automated database backups
3. **Security review** - Change default passwords, enable 2FA
4. **Performance tuning** - Monitor response times, scale if needed
5. **Documentation** - Update README with production URLs

---

**Questions? Check the Digital Ocean docs or run into issues? I'm here to help!**
