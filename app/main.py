import os
import yaml
import json
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any

from fastapi import FastAPI, Request, Form, status, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.templating import Jinja2Templates
from fastapi.concurrency import run_in_threadpool

import psycopg2
import psycopg2.extras
from passlib.hash import pbkdf2_sha256

# ---------------- CONFIG ----------------

CFG_PATH = os.path.join(os.getcwd(), "config.yaml")

DEFAULT_CFG = {
    "db_url": "postgresql://fdt:fdtpass@host.docker.internal:5432/fdt_db",
    "thresholds": {"delay": 0.02, "block": 0.07},
    # WARNING: change secret_key before production
    "secret_key": "dev-secret-change-me-please",
    # default admin credentials (password hash can be overridden in config)
    "admin_username": "admin",
    "admin_password_hash": pbkdf2_sha256.hash("StrongAdmin123!")
}

cfg = DEFAULT_CFG.copy()

if os.path.exists(CFG_PATH):
    with open(CFG_PATH, "rb") as f:
        raw = f.read()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("utf-8-sig")
        cfg.update(yaml.safe_load(text) or {})

DB_URL = cfg.get("db_url")
THRESHOLDS = cfg.get("thresholds", {"delay": 0.02, "block": 0.07})
SECRET_KEY = cfg.get("secret_key", DEFAULT_CFG["secret_key"])
ADMIN_USERNAME = cfg.get("admin_username", DEFAULT_CFG["admin_username"])
ADMIN_PASSWORD_HASH = cfg.get("admin_password_hash", DEFAULT_CFG["admin_password_hash"])

# ---------------- APP ----------------

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------------- HELPERS ----------------

def resolve_time_range(time_range: str) -> str:
    if time_range == "1h":
        return "1 hour"
    if time_range == "7d":
        return "7 days"
    return "24 hours"

def get_conn():
    return psycopg2.connect(
        DB_URL,
        cursor_factory=psycopg2.extras.RealDictCursor
    )

# ---------------- WEBSOCKET MANAGER ----------------

class WSManager:
    def __init__(self):
        self.connections: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self.lock:
            self.connections.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self.lock:
            if ws in self.connections:
                self.connections.remove(ws)

    async def broadcast(self, payload: Dict[str, Any]):
        msg = json.dumps(payload, default=str)
        async with self.lock:
            conns = list(self.connections)
        for ws in conns:
            try:
                await ws.send_text(msg)
            except Exception:
                await self.disconnect(ws)

ws_manager = WSManager()

# ---------------- DB FUNCTIONS ----------------

def db_insert_transaction(tx: Dict[str, Any]):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO transactions
            (tx_id, user_id, device_id, ts, amount, recipient_vpa,
             tx_type, channel, risk_score, action, db_status, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())
            ON CONFLICT (tx_id) DO UPDATE
            SET action=EXCLUDED.action,
                risk_score=EXCLUDED.risk_score,
                created_at=now()
            RETURNING tx_id, action, risk_score, created_at;
        """, (
            tx["tx_id"], tx["user_id"], tx["device_id"], tx["ts"],
            tx["amount"], tx["recipient_vpa"], tx["tx_type"],
            tx["channel"], tx["risk_score"], tx["action"],
            tx.get("db_status", "inserted")
        ))
        row = cur.fetchone()
        conn.commit()
        return row
    finally:
        conn.close()

def db_recent_transactions(limit: int, interval: str):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT tx_id, user_id, amount, recipient_vpa,
                   tx_type, channel, action, risk_score, created_at
            FROM transactions
            WHERE created_at >= now() - interval %s
            ORDER BY created_at DESC
            LIMIT %s;
        """, (interval, limit))
        return cur.fetchall()
    finally:
        conn.close()

def db_dashboard_stats(interval: str):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              COUNT(*) total,
              COUNT(*) FILTER (WHERE action='BLOCK') block,
              COUNT(*) FILTER (WHERE action='DELAY') delay,
              COUNT(*) FILTER (WHERE action='ALLOW') allow,
              COALESCE(AVG(risk_score),0) mean_risk
            FROM transactions
            WHERE created_at >= now() - interval %s;
        """, (interval,))
        return cur.fetchone()
    finally:
        conn.close()

def db_timeline(interval: str):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              date_trunc('minute', created_at) bucket,
              COUNT(*) FILTER (WHERE action='ALLOW') allowed,
              COUNT(*) FILTER (WHERE action='DELAY') delayed,
              COUNT(*) FILTER (WHERE action='BLOCK') blocked
            FROM transactions
            WHERE created_at >= now() - interval %s
            GROUP BY bucket
            ORDER BY bucket;
        """, (interval,))
        return cur.fetchall()
    finally:
        conn.close()

def db_update_action(tx_id: str, action: str):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE transactions
            SET action=%s
            WHERE tx_id=%s
            RETURNING *;
        """, (action, tx_id))
        row = cur.fetchone()
        conn.commit()
        return row
    finally:
        conn.close()

# ---------------- AUTH ----------------

def is_logged_in(req: Request):
    return bool(req.session.get("admin"))

def check_admin(username: str, password: str) -> bool:
    return (
        username == ADMIN_USERNAME and
        pbkdf2_sha256.verify(password, ADMIN_PASSWORD_HASH)
    )

# ---------------- ROUTES ----------------

@app.get("/")
def root():
    return RedirectResponse("/dashboard")

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(req: Request):
    return templates.TemplateResponse("dashboard.html", {"request": req})

@app.get("/dashboard-data")
async def dashboard_data(time_range: str = "24h"):
    interval = resolve_time_range(time_range)

    stats = await run_in_threadpool(db_dashboard_stats, interval)
    timeline = await run_in_threadpool(db_timeline, interval)

    return {
        "stats": {
            "totalTransactions": int(stats["total"]),
            "blocked": int(stats["block"]),
            "delayed": int(stats["delay"]),
            "allowed": int(stats["allow"]),
            "mean_risk": float(stats["mean_risk"])
        },
        "trend": [
            {
                "time": r["bucket"].isoformat(),
                "allowed": r["allowed"],
                "delayed": r["delayed"],
                "blocked": r["blocked"]
            } for r in timeline
        ],
        "thresholds": THRESHOLDS
    }

@app.get("/recent-transactions")
async def recent_transactions(limit: int = 20, time_range: str = "24h"):
    interval = resolve_time_range(time_range)
    rows = await run_in_threadpool(db_recent_transactions, limit, interval)
    return {"transactions": rows}

@app.post("/transactions")
async def new_transaction(request: Request):
    body = await request.json()
    tx = dict(body)

    # optional scoring module
    risk_score = None
    try:
        import scoring
        try:
            features = scoring.extract_features(tx)
            risk_score = scoring.score_features(features)
        except Exception as e:
            print("scoring failed:", e)
            risk_score = None
    except Exception:
        risk_score = None

    if risk_score is None:
        risk_score = float(tx.get("risk_score", 0.0))

    tx["risk_score"] = float(risk_score)

    if "action" not in tx or not tx.get("action"):
        if tx["risk_score"] >= THRESHOLDS["block"]:
            tx["action"] = "BLOCK"
        elif tx["risk_score"] >= THRESHOLDS["delay"]:
            tx["action"] = "DELAY"
        else:
            tx["action"] = "ALLOW"

    inserted = await run_in_threadpool(db_insert_transaction, tx)

    asyncio.create_task(
        ws_manager.broadcast({"type": "tx_inserted", "data": tx})
    )

    return {"status": "ok", "inserted": inserted}

# ---------------- ADMIN ----------------

@app.get("/admin/login", response_class=HTMLResponse)
def admin_login(req: Request):
    return templates.TemplateResponse("admin_login.html", {"request": req})

@app.post("/admin/login")
async def admin_login_post(req: Request,
                           username: str = Form(...),
                           password: str = Form(...)):
    if check_admin(username, password):
        req.session["admin"] = username
        return RedirectResponse("/admin", status_code=303)
    return templates.TemplateResponse(
        "admin_login.html",
        {"request": req, "error": "Invalid credentials"},
        status_code=401
    )

@app.get("/admin", response_class=HTMLResponse)
def admin_page(req: Request):
    if not is_logged_in(req):
        return RedirectResponse("/admin/login")
    return templates.TemplateResponse("admin.html", {"request": req})

@app.post("/admin/action")
async def admin_action(req: Request):
    if not is_logged_in(req):
        return JSONResponse({"detail": "unauthorized"}, 401)

    data = await req.json()
    updated = await run_in_threadpool(
        db_update_action, data["tx_id"], data["action"]
    )

    asyncio.create_task(
        ws_manager.broadcast({"type": "tx_updated", "data": updated})
    )

    return {"status": "ok"}

@app.get("/admin/logout")
def admin_logout(req: Request):
    req.session.clear()
    return RedirectResponse("/admin/login")

# ---------------- WEBSOCKET ----------------

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)

@app.get("/health")
def health():
    return {"status": "ok"}