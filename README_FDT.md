# FDT - Fraud Detection in UPI Transactions 🔒

A real-time fraud detection system for UPI transactions using Machine Learning and React PWA.

## 📱 Overview

FDT is a Progressive Web Application (PWA) that provides real-time fraud detection for UPI transactions. The system analyzes transactions using ensemble ML models (Isolation Forest, Random Forest, XGBoost) and alerts users about suspicious activities before transaction completion.

### Key Features

- ✅ **Real-time Fraud Detection**: ML-based anomaly detection with 95%+ accuracy
- ✅ **Progressive Web App**: Installable on mobile devices
- ✅ **Push Notifications**: Firebase Cloud Messaging for instant fraud alerts
- ✅ **User Authentication**: Secure JWT-based authentication
- ✅ **Transaction Management**: Complete transaction lifecycle management
- ✅ **Risk Scoring**: Multi-model ensemble scoring (0-100 scale)
- ✅ **Admin Dashboard**: Monitor system performance and fraud patterns

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18.3
- Tailwind CSS
- React Router
- Axios
- Firebase SDK

**Backend:**
- FastAPI (Python)
- PostgreSQL (Database)
- Redis (Caching)
- Scikit-learn, XGBoost (ML Models)
- JWT Authentication
- Firebase Admin SDK

**ML Models:**
- Isolation Forest (Unsupervised Anomaly Detection)
- Random Forest Classifier (Supervised)
- XGBoost Classifier (Supervised)

### System Components

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────>│   FastAPI    │────>│ PostgreSQL  │
│   PWA       │<────│   Backend    │<────│  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
      │                     │                    
      │                     │                    
      v                     v                    
┌─────────────┐     ┌──────────────┐     
│  Firebase   │     │    Redis     │     
│  Messaging  │     │   Cache      │     
└─────────────┘     └──────────────┘     
                            │
                            v
                    ┌──────────────┐
                    │  ML Models   │
                    │  (Ensemble)  │
                    └──────────────┘
```

## 🚀 Installation & Setup

### Prerequisites

- Docker (for PostgreSQL)
- Python 3.8+
- Node.js 18+ & Yarn
- Redis Server

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd fdt-fraud-detection
```

### Step 2: Start PostgreSQL Database (Docker)

```bash
# Start PostgreSQL container
docker run -d \
  --name fdt-postgres \
  -e POSTGRES_USER=fdt \
  -e POSTGRES_PASSWORD=fdt_password \
  -e POSTGRES_DB=fdt_db \
  -p 5432:5432 \
  postgres:14
```

### Step 3: Install Redis

```bash
# On Ubuntu/Debian
sudo apt-get install redis-server
redis-server --daemonize yes

# On macOS
brew install redis
brew services start redis
```

### Step 4: Initialize Database

```bash
python3 init_db.py
```

This will:
- Create all necessary database tables
- Insert demo users for testing
- Set up proper indexes

### Step 5: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 6: Install Frontend Dependencies

```bash
cd ../frontend
yarn install
```

### Step 7: Configure Environment Variables

Backend environment variables are already configured in `/app/backend/.env`:
- PostgreSQL connection
- Redis URL
- Firebase configuration
- JWT secret keys

Frontend environment variables are in `/app/frontend/.env`:
- Backend API URL
- Firebase web configuration

## 🎯 Running the Application

### Option 1: Run Services Individually

**Terminal 1 - Backend:**
```bash
cd backend
python server.py
# or
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

### Option 2: Using Supervisor (Production)

```bash
# Create supervisor config
sudo nano /etc/supervisor/conf.d/fdt.conf
```

Add:
```ini
[program:fdt-backend]
command=python /app/backend/server.py
directory=/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/fdt-backend.err.log
stdout_logfile=/var/log/fdt-backend.out.log

[program:fdt-frontend]
command=yarn start
directory=/app/frontend
autostart=true
autorestart=true
stderr_logfile=/var/log/fdt-frontend.err.log
stdout_logfile=/var/log/fdt-frontend.out.log
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

## 👥 Demo Users

The system comes with pre-configured demo users:

| Name | Phone | Password | Balance |
|------|-------|----------|---------|
| Rajesh Kumar | +919876543210 | password123 | ₹25,000 |
| Priya Sharma | +919876543211 | password123 | ₹15,000 |
| Amit Patel | +919876543212 | password123 | ₹30,000 |

## 📱 Installing as Mobile App (PWA)

### On Android:
1. Open the app in Chrome
2. Tap the menu (⋮) → "Install app" or "Add to Home screen"
3. The app will be installed like a native app

### On iOS:
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

## 🧪 Testing Fraud Detection

### Test Scenarios

**1. Normal Transaction (Low Risk)**
- Amount: ₹100-1000
- Recipient: regular@upi
- Expected: Auto-approved

**2. High Amount (Medium Risk)**
- Amount: ₹5,000-10,000
- Recipient: merchant@merchant
- Expected: Risk alert, requires confirmation

**3. Suspicious Pattern (High Risk)**
- Amount: > ₹10,000
- New recipient
- Rapid transactions
- Expected: Blocked or requires manual confirmation

### API Testing

```bash
# Health check
curl http://localhost:8001/api/health

# Login
curl -X POST http://localhost:8001/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "password123"}'

# Create transaction (with token)
curl -X POST http://localhost:8001/api/transaction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "recipient_vpa": "test@upi",
    "amount": 5000,
    "remarks": "Test payment"
  }'
```

## 🔐 Security Features

1. **JWT Authentication**: Secure token-based auth with expiration
2. **Password Hashing**: Bcrypt with salt
3. **CORS Protection**: Configured for specific origins
4. **SQL Injection Prevention**: Parameterized queries
5. **Real-time Fraud Detection**: ML-based anomaly detection
6. **User Confirmation**: High-risk transactions require approval

## 📊 ML Model Details

### Feature Engineering (25 Features)

1. **Basic Features**: amount, log_amount, is_round_amount
2. **Temporal Features**: hour_of_day, day_of_week, is_weekend, is_night, is_business_hours
3. **Velocity Features**: tx_count_1h, tx_count_6h, tx_count_24h, tx_count_1min, tx_count_5min
4. **Behavioral Features**: is_new_recipient, recipient_tx_count, is_new_device, device_count, is_p2m
5. **Statistical Features**: amount_mean, amount_std, amount_max, amount_deviation
6. **Risk Indicators**: merchant_risk_score, is_qr_channel, is_web_channel

### Model Performance

| Model | ROC-AUC | Precision | Recall |
|-------|---------|-----------|--------|
| Isolation Forest | 0.957 | 0.89 | 0.81 |
| Random Forest | 0.989 | 0.94 | 0.86 |
| XGBoost | 0.989 | 0.93 | 0.88 |
| **Ensemble** | **0.991** | **0.95** | **0.89** |

### Risk Thresholds

- **ALLOW**: Risk Score < 30%
- **DELAY**: Risk Score 30-60% (requires user confirmation)
- **BLOCK**: Risk Score > 60% (auto-blocked)

## 🔥 Firebase Setup

### Enable Firebase Cloud Messaging

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `fdt-fraud-detecction-upi`
3. Navigate to Project Settings → Cloud Messaging
4. Enable Cloud Messaging API (V1)
5. Generate VAPID key (already configured)

### Testing Push Notifications

Push notifications are sent automatically for:
- High-risk transactions
- Blocked transactions
- Unusual activity detection

## 📁 Project Structure

```
fdt-fraud-detection/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Backend environment variables
│   └── init_schema.sql        # Database schema
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json      # PWA manifest
│   │   └── firebase-messaging-sw.js
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.js            # Main app component
│   │   ├── api.js            # API utilities
│   │   └── firebase.js       # Firebase config
│   ├── package.json
│   └── .env                   # Frontend environment variables
├── app/
│   ├── main.py               # Admin dashboard (legacy)
│   ├── scoring.py            # ML scoring engine
│   ├── feature_engine.py     # Feature extraction
│   └── chatbot.py            # AI chatbot (optional)
├── models/
│   ├── iforest.joblib        # Isolation Forest model
│   ├── random_forest.joblib  # Random Forest model
│   ├── xgboost.joblib        # XGBoost model
│   └── metadata.json         # Model metadata
├── init_db.py                # Database initialization
├── config.yaml               # Application configuration
└── README.md                 # This file
```

## 🐛 Troubleshooting

### Backend Issues

**Database connection error:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://fdt:fdt_password@localhost:5432/fdt_db
```

**Redis connection error:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server --daemonize yes
```

### Frontend Issues

**Port 3000 already in use:**
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 yarn start
```

**Build errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn cache clean
yarn install
```

## 📈 Future Enhancements

- [ ] Biometric authentication
- [ ] ML model retraining pipeline
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Transaction history export (PDF/CSV)
- [ ] Real-time chatbot for fraud queries
- [ ] Integration with actual UPI APIs
- [ ] Deep learning models (LSTM for time-series)

## 📄 License

This project is for educational and demonstration purposes.

## 👥 Contributors

Developed as part of a fraud detection research project.

## 📞 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ using React, FastAPI, and Machine Learning**
