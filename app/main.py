# app/main.py
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

# --- config loader with defaults ---
CFG_PATH = os.path.join(os.getcwd(), "config.yaml")
DEFAULT_CFG = {
    "db_url": "postgresql://fdt:fdtpass@host.docker.internal:5432/fdt_db",
    "thresholds": {"delay": 0.02, "block": 0.07},
    # WARNING: change secret_key before production
    "secret_key": "dev-secret-change-me-please",
    # default admin credentials (password hash can be overridden in config)
    "admin_username": "admin",
    # hashed password for "StrongAdmin123!" using pbkdf2_sha256
    "admin_password_hash": pbkdf2_sha256.hash("StrongAdmin123!")
}
cfg = DEFAULT_CFG.copy()
if os.path.exists(CFG_PATH):
    try:
        with open(CFG_PATH, "rb") as fh:
            raw = fh.read()
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                text = raw.decode("utf-8-sig")
        loaded = yaml.safe_load(text) or {}
        cfg.update(loaded)
    except Exception as e:
        print("Failed to load config.yaml:", e)

DB_URL = cfg.get("db_url")
THRESHOLDS = cfg.get("thresholds", {"delay": 0.02, "block": 0.07})
SECRET_KEY = cfg.get("secret_key", DEFAULT_CFG["secret_key"])
ADMIN_USERNAME = cfg.get("admin_username", DEFAULT_CFG["admin_username"])
ADMIN_PASSWORD_HASH = cfg.get("admin_password_hash", DEFAULT_CFG["admin_password_hash"])

# --- FastAPI app and templates ---
app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
templates = Jinja2Templates(directory="templates")
# serve static if directory exists
if os.path.isdir("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# --- websockets manager ---
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

    async def broadcast(self, message: Dict[str, Any]):
        text = json.dumps(message, default=str)
        async with self.lock:
            conns = list(self.connections)
        for ws in conns:
            try:
                await ws.send_text(text)
            except Exception:
                try:
                    await self.disconnect(ws)
                except Exception:
                    pass

ws_manager = WSManager()

# --- DB helpers (sync psycopg2 executed in threadpool) ---
def get_conn():
    if not DB_URL:
        raise RuntimeError("DB URL not configured")
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)

def db_get_transaction(tx_id):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT tx_id, user_id, device_id, ts, amount, recipient_vpa, tx_type, channel, db_status, action, risk_score, created_at FROM public.transactions WHERE tx_id=%s;",
            (tx_id,)
        )
        row = cur.fetchone()
        cur.close()
        return row
    finally:
        conn.close()

def db_insert_transaction(tx: Dict[str, Any]):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO public.transactions
            (tx_id, user_id, device_id, ts, amount, recipient_vpa, tx_type, channel, risk_score, action, db_status, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
            ON CONFLICT (tx_id) DO UPDATE
              SET risk_score = EXCLUDED.risk_score,
                  action = EXCLUDED.action,
                  db_status = EXCLUDED.db_status,
                  created_at = now()
            RETURNING tx_id, risk_score, action, created_at;
            """,
            (
                tx.get("tx_id"),
                tx.get("user_id"),
                tx.get("device_id"),
                tx.get("ts"),
                tx.get("amount"),
                tx.get("recipient_vpa"),
                tx.get("tx_type"),
                tx.get("channel"),
                tx.get("risk_score"),
                tx.get("action"),
                tx.get("db_status", "inserted"),
            ),
        )
        inserted = cur.fetchone()
        conn.commit()
        cur.close()
        return inserted
    finally:
        conn.close()

def db_recent_transactions(limit=50, range_clause=None):
    conn = get_conn()
    try:
        cur = conn.cursor()
        q = """
            SELECT tx_id, user_id, amount, recipient_vpa, tx_type, channel, db_status, action, risk_score, created_at
            FROM public.transactions
            ORDER BY created_at DESC
            LIMIT %s
        """
        params = (limit,)
        cur.execute(q, params)
        rows = cur.fetchall()
        cur.close()
        return rows
    finally:
        conn.close()

def db_dashboard_stats():
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE action='BLOCK') as block,
              COUNT(*) FILTER (WHERE action='DELAY') as delay,
              COUNT(*) FILTER (WHERE action='ALLOW') as allow,
              COALESCE(AVG(risk_score),0) as mean_risk
            FROM public.transactions;
            """
        )
        row = cur.fetchone()
        cur.close()
        return row
    finally:
        conn.close()

def db_update_action(tx_id, action, risk_score=None):
    conn = get_conn()
    try:
        cur = conn.cursor()
        if risk_score is None:
            cur.execute(
                "UPDATE public.transactions SET action=%s WHERE tx_id=%s RETURNING tx_id, action, risk_score, created_at;",
                (action, tx_id),
            )
        else:
            cur.execute(
                "UPDATE public.transactions SET action=%s, risk_score=%s WHERE tx_id=%s RETURNING tx_id, action, risk_score, created_at;",
                (action, risk_score, tx_id),
            )
        res = cur.fetchone()
        conn.commit()
        cur.close()
        return res
    finally:
        conn.close()

# --- auth helpers ---
def is_logged_in(request: Request):
    return bool(request.session.get("admin"))

def try_auth_admin(username: str, password: str):
    if username != ADMIN_USERNAME:
        return False
    try:
        return pbkdf2_sha256.verify(password, ADMIN_PASSWORD_HASH)
    except Exception:
        return False

# --- routes ---
@app.get("/", response_class=RedirectResponse)
def root():
    return RedirectResponse("/dashboard")

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/dashboard-data")
async def dashboard_data(time_range: str = "24h"):
    stats = await run_in_threadpool(db_dashboard_stats)

    # placeholder trend: 6 time buckets (improve later)
    trend = []
    now = datetime.now(timezone.utc)
    for i in range(6, 0, -1):
        # simple identical buckets for now; backend analytics can be added.
        trend.append({
            "time": (now).isoformat(),
            "blocked": 0,
            "delayed": 0,
            "allowed": 0,
        })
    return {"stats": {
                "totalTransactions": int(stats["total"] or 0),
                "blocked": int(stats["block"] or 0),
                "delayed": int(stats["delay"] or 0),
                "allowed": int(stats["allow"] or 0),
                "mean_risk": float(stats["mean_risk"] or 0.0)
            }, "trend": trend, "thresholds": THRESHOLDS}

@app.get("/recent-transactions")
async def recent_transactions(limit: int = 50, time_range: str = "24h"):
    rows = await run_in_threadpool(db_recent_transactions, limit, None)
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
    full_row = await run_in_threadpool(db_get_transaction, inserted["tx_id"])

    # broadcast to websockets
    asyncio.create_task(ws_manager.broadcast({"type": "tx_inserted", "data": full_row}))

    return {"status": "ok", "inserted": inserted}

# --- admin pages & actions ---
@app.get("/admin/login", response_class=HTMLResponse)
def admin_login_page(request: Request):
    return templates.TemplateResponse("admin_login.html", {"request": request, "error": None})

@app.post("/admin/login")
async def admin_login(request: Request, username: str = Form(...), password: str = Form(...)):
    if try_auth_admin(username, password):
        request.session["admin"] = username
        return RedirectResponse("/admin", status_code=status.HTTP_303_SEE_OTHER)
    else:
        return templates.TemplateResponse("admin_login.html", {"request": request, "error": "Invalid credentials"}, status_code=401)

@app.get("/admin", response_class=HTMLResponse)
def admin_panel(request: Request):
    if not is_logged_in(request):
        return RedirectResponse("/admin/login")
    return templates.TemplateResponse("admin.html", {"request": request})

@app.get("/admin/logout")
def admin_logout(request: Request):
    request.session.clear()
    return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)

@app.post("/admin/action")
async def admin_action(request: Request):
    if not is_logged_in(request):
        return JSONResponse({"detail": "unauthenticated"}, status_code=401)
    body = await request.json()
    tx_id = body.get("tx_id")
    action = body.get("action")
    if not tx_id or not action:
        return JSONResponse({"detail": "tx_id and action required"}, status_code=400)
    risk_score = body.get("risk_score")
    updated = await run_in_threadpool(db_update_action, tx_id, action, risk_score)
    if not updated:
        return JSONResponse({"detail": "tx not found"}, status_code=404)

    full = await run_in_threadpool(db_get_transaction, tx_id)
    asyncio.create_task(ws_manager.broadcast({"type": "tx_updated", "data": full}))
    return {"status": "ok", "updated": full}

# --- websocket endpoint for live updates ---
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            # simple keepalive / echo — clients generally don't need to send
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)
    except Exception:
        await ws_manager.disconnect(ws)

# --- health ---
@app.get("/health")
def health():
    return {"status": "ok"}