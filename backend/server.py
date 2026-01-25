"""
FDT Backend Server - Fraud Detection in UPI Transactions
FastAPI server with user authentication, transaction processing, and ML-based fraud detection
"""

import os
import uuid
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal

from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from passlib.hash import bcrypt
import jwt

import psycopg2
import psycopg2.extras

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configuration
DB_URL = os.getenv("DB_URL", "postgresql://user:password@host:port/dbname").strip()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fdt_jwt_secret_key_change_in_production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Initialize FastAPI app
app = FastAPI(title="FDT API", version="1.0.0")

# CORS Configuration - Allow all origins including preview URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ============================================================================
# DATABASE HELPERS
# ============================================================================

def get_db_conn():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)

def dict_to_json_serializable(data):
    """Convert dict with Decimal to JSON serializable format"""
    if isinstance(data, dict):
        return {k: dict_to_json_serializable(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [dict_to_json_serializable(item) for item in data]
    elif isinstance(data, Decimal):
        return float(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    return data

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class UserRegister(BaseModel):
    name: str
    phone: str
    password: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    password: str

class TransactionCreate(BaseModel):
    recipient_vpa: str
    amount: float
    remarks: Optional[str] = None
    device_id: Optional[str] = None

class UserDecision(BaseModel):
    tx_id: str
    decision: str  # 'confirm' or 'cancel'

class PushToken(BaseModel):
    fcm_token: str
    device_id: Optional[str] = None

# ============================================================================
# AUTHENTICATION HELPERS
# ============================================================================

def create_access_token(user_id: str) -> str:
    """Create JWT access token"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> str:
    """Get current user from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    payload = verify_token(token)
    return payload["user_id"]

# ============================================================================
# API ENDPOINTS - AUTHENTICATION
# ============================================================================

@app.post("/api/register")
async def register_user(user_data: UserRegister):
    """Register a new user"""
    def _register():
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            
            # Check if phone already exists
            cur.execute("SELECT user_id FROM users WHERE phone = %s", (user_data.phone,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Phone number already registered")
            
            # Generate user ID
            user_id = f"user_{uuid.uuid4().hex[:8]}"
            
            # Hash password
            password_hash = bcrypt.hash(user_data.password)
            
            # Insert user
            cur.execute(
                """
                INSERT INTO users (user_id, name, phone, email, password_hash, balance, created_at)
                VALUES (%s, %s, %s, %s, %s, 10000.00, NOW())
                RETURNING user_id, name, phone, email, balance, created_at
                """,
                (user_id, user_data.name, user_data.phone, user_data.email, password_hash)
            )
            
            user = cur.fetchone()
            conn.commit()
            
            # Create access token
            token = create_access_token(user_id)
            
            return {
                "status": "success",
                "message": "User registered successfully",
                "user": dict_to_json_serializable(dict(user)),
                "token": token
            }
        finally:
            conn.close()
    
    return await run_in_threadpool(_register)

@app.post("/api/login")
async def login_user(credentials: UserLogin):
    """Login user and return JWT token"""
    def _login():
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            
            # Get user by phone
            cur.execute(
                "SELECT user_id, name, phone, email, password_hash, balance FROM users WHERE phone = %s AND is_active = TRUE",
                (credentials.phone,)
            )
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=401, detail="Invalid phone or password")
            
            # Verify password
            if not bcrypt.verify(credentials.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid phone or password")
            
            # Create token
            token = create_access_token(user["user_id"])
            
            # Remove password hash from response
            user_data = dict(user)
            del user_data["password_hash"]
            
            return {
                "status": "success",
                "message": "Login successful",
                "user": dict_to_json_serializable(user_data),
                "token": token
            }
        finally:
            conn.close()
    
    return await run_in_threadpool(_login)

# ============================================================================
# API ENDPOINTS - USER DASHBOARD
# ============================================================================

@app.get("/api/user/dashboard")
async def get_user_dashboard(user_id: str = Depends(get_current_user)):
    """Get user dashboard data"""
    def _get_dashboard():
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            
            # Get user info
            cur.execute(
                "SELECT user_id, name, phone, email, balance, created_at FROM users WHERE user_id = %s",
                (user_id,)
            )
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get recent transactions (last 5)
            cur.execute(
                """
                SELECT tx_id, amount, recipient_vpa, tx_type, action, risk_score, created_at, db_status
                FROM transactions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 5
                """,
                (user_id,)
            )
            recent_transactions = cur.fetchall()
            
            # Get transaction stats
            cur.execute(
                """
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(*) FILTER (WHERE action = 'ALLOW') as successful,
                    COUNT(*) FILTER (WHERE action = 'BLOCK') as blocked,
                    COUNT(*) FILTER (WHERE action = 'DELAY') as pending,
                    COALESCE(SUM(amount) FILTER (WHERE action = 'ALLOW'), 0) as total_spent
                FROM transactions
                WHERE user_id = %s
                """,
                (user_id,)
            )
            stats = cur.fetchone()
            
            return {
                "status": "success",
                "user": dict_to_json_serializable(dict(user)),
                "recent_transactions": dict_to_json_serializable([dict(t) for t in recent_transactions]),
                "stats": dict_to_json_serializable(dict(stats))
            }
        finally:
            conn.close()
    
    return await run_in_threadpool(_get_dashboard)

# ============================================================================
# API ENDPOINTS - TRANSACTIONS
# ============================================================================

@app.post("/api/transaction")
async def create_transaction(tx_data: TransactionCreate, user_id: str = Depends(get_current_user)):
    """Create new transaction and perform fraud detection"""
    def _create_transaction():
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            
            # Get user balance
            cur.execute("SELECT balance FROM users WHERE user_id = %s", (user_id,))
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if float(user["balance"]) < tx_data.amount:
                raise HTTPException(status_code=400, detail="Insufficient balance")
            
            # Generate transaction ID
            tx_id = f"tx_{uuid.uuid4().hex[:12]}"
            device_id = tx_data.device_id or f"device_{uuid.uuid4().hex[:8]}"
            
            # Build transaction object for ML scoring
            transaction = {
                "tx_id": tx_id,
                "user_id": user_id,
                "device_id": device_id,
                "ts": datetime.now(timezone.utc).isoformat(),
                "amount": tx_data.amount,
                "recipient_vpa": tx_data.recipient_vpa,
                "tx_type": "P2M" if "@merchant" in tx_data.recipient_vpa else "P2P",
                "channel": "app",
                "remarks": tx_data.remarks
            }
            
            # Perform fraud detection using ML models
            risk_score = 0.0
            try:
                # Import scoring module from parent app directory
                import sys
                import os
                project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                sys.path.insert(0, project_root)
                from app import scoring
                
                risk_score = scoring.score_transaction(transaction)
                print(f"ML Risk Score for {tx_id}: {risk_score}")
            except Exception as e:
                print(f"Scoring error: {e}")
                # Fallback to simple rule-based scoring
                if tx_data.amount > 10000:
                    risk_score = 0.7
                elif tx_data.amount > 5000:
                    risk_score = 0.4
                else:
                    risk_score = 0.1
            
            # Determine action based on thresholds
            delay_threshold = float(os.getenv("DELAY_THRESHOLD", "0.30"))
            block_threshold = float(os.getenv("BLOCK_THRESHOLD", "0.60"))
            
            if risk_score >= block_threshold:
                action = "BLOCK"
                db_status = "blocked"
            elif risk_score >= delay_threshold:
                action = "DELAY"
                db_status = "pending"
            else:
                action = "ALLOW"
                db_status = "success"
            
            # Insert transaction
            cur.execute(
                """
                INSERT INTO transactions 
                (tx_id, user_id, device_id, ts, amount, recipient_vpa, tx_type, channel, risk_score, action, db_status, remarks, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING tx_id, user_id, amount, recipient_vpa, risk_score, action, db_status, created_at
                """,
                (tx_id, user_id, device_id, transaction["ts"], tx_data.amount, 
                 tx_data.recipient_vpa, transaction["tx_type"], "app", 
                 risk_score, action, db_status, tx_data.remarks)
            )
            
            result = cur.fetchone()
            
            # If allowed, update balance
            if action == "ALLOW":
                cur.execute(
                    "UPDATE users SET balance = balance - %s WHERE user_id = %s",
                    (tx_data.amount, user_id)
                )
            
            # Create fraud alert if risky
            if action in ["DELAY", "BLOCK"]:
                reason = []
                if tx_data.amount > 10000:
                    reason.append("High transaction amount")
                if risk_score >= block_threshold:
                    reason.append("ML model detected suspicious pattern")
                
                cur.execute(
                    """
                    INSERT INTO fraud_alerts (tx_id, user_id, alert_type, risk_score, reason, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    """,
                    (tx_id, user_id, action, risk_score, "; ".join(reason))
                )
            
            conn.commit()
            
            return {
                "status": "success",
                "transaction": dict_to_json_serializable(dict(result)),
                "requires_confirmation": action in ["DELAY", "BLOCK"],
                "risk_level": "high" if risk_score >= block_threshold else "medium" if risk_score >= delay_threshold else "low"
            }
        finally:
            conn.close()
    
    return await run_in_threadpool(_create_transaction)

@app.post("/api/user-decision")
async def handle_user_decision(decision_data: UserDecision, user_id: str = Depends(get_current_user)):
    """Handle user's decision on flagged transaction"""
    def _handle_decision():
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            
            # Get transaction
            cur.execute(
                "SELECT * FROM transactions WHERE tx_id = %s AND user_id = %s",
                (decision_data.tx_id, user_id)
            )
            transaction = cur.fetchone()
            
            if not transaction:
                raise HTTPException(status_code=404, detail="Transaction not found")
            
            # Update transaction based on decision
            if decision_data.decision == "confirm":
                new_action = "ALLOW"
                new_status = "success"
                
                # Deduct balance
                cur.execute(
                    "UPDATE users SET balance = balance - %s WHERE user_id = %s",
                    (transaction["amount"], user_id)
                )
            else:
                new_action = "BLOCK"
                new_status = "cancelled"
            
            # Update transaction
            cur.execute(
                """
                UPDATE transactions 
                SET action = %s, db_status = %s, updated_at = NOW()
                WHERE tx_id = %s
                RETURNING tx_id, action, db_status, updated_at
                """,
                (new_action, new_status, decision_data.tx_id)
            )
            
            result = cur.fetchone()
            
            # Update fraud alert if it exists
            cur.execute(
                """
                UPDATE fraud_alerts 
                SET user_decision = %s, resolved_at = NOW()
                WHERE tx_id = %s
                """,
                (decision_data.decision, decision_data.tx_id)
            )
            
            conn.commit()
            
            return {
                "status": "success",
                "message": f"Transaction {decision_data.decision}ed successfully",
                "transaction": dict_to_json_serializable(dict(result))
            }
        finally:
            conn.close()
    
    return await run_in_threadpool(_handle_decision)

@app.get("/api/user/transactions")
async def get_user_transactions(
    user_id: str = Depends(get_current_user),
    limit: int = 20,
    status_filter: Optional[str] = None
):
    """Get user transaction history with optional filtering"""
    def _get_transactions():
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            
            query = """
                SELECT tx_id, amount, recipient_vpa, tx_type, action, risk_score, 
                       db_status, remarks, created_at
                FROM transactions
                WHERE user_id = %s
            """
            params = [user_id]
            
            if status_filter:
                query += " AND action = %s"
                params.append(status_filter.upper())
            
            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)
            
            cur.execute(query, params)
            transactions = cur.fetchall()
            
            return {
                "status": "success",
                "transactions": dict_to_json_serializable([dict(t) for t in transactions]),
                "count": len(transactions)
            }
        finally:
            conn.close()
    
    return await run_in_threadpool(_get_transactions)

# ============================================================================
# API ENDPOINTS - PUSH NOTIFICATIONS
# ============================================================================

@app.post("/api/push-token")
async def register_push_token(token_data: PushToken, user_id: str = Depends(get_current_user)):
    """Register FCM push notification token for user"""
    def _register_token():
        conn = get_db_conn()
        try:
            cur = conn.cursor()
            
            # Check if token already exists
            cur.execute(
                "SELECT token_id FROM push_tokens WHERE fcm_token = %s AND user_id = %s",
                (token_data.fcm_token, user_id)
            )
            
            if cur.fetchone():
                # Update existing token
                cur.execute(
                    """
                    UPDATE push_tokens 
                    SET last_used = NOW(), is_active = TRUE
                    WHERE fcm_token = %s AND user_id = %s
                    """,
                    (token_data.fcm_token, user_id)
                )
            else:
                # Insert new token
                cur.execute(
                    """
                    INSERT INTO push_tokens (user_id, fcm_token, device_id, created_at, last_used)
                    VALUES (%s, %s, %s, NOW(), NOW())
                    """,
                    (user_id, token_data.fcm_token, token_data.device_id)
                )
            
            conn.commit()
            
            return {
                "status": "success",
                "message": "Push token registered successfully"
            }
        finally:
            conn.close()
    
    return await run_in_threadpool(_register_token)

# ============================================================================
# API ENDPOINTS - HEALTH & INFO
# ============================================================================

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "FDT Backend",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/info")
def app_info():
    """App information endpoint"""
    return {
        "app_name": "FDT - Fraud Detection in UPI",
        "version": "1.0.0",
        "description": "Real-time fraud detection for UPI transactions using ML",
        "features": [
            "User registration and authentication",
            "Real-time fraud detection with ML",
            "Transaction history and analytics",
            "Push notifications for fraud alerts",
            "Multi-model ensemble scoring"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
