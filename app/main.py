# app/main.py
import os
import yaml
import json
import asyncio
from datetime import datetime, timezone, timedelta
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

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# --- time range helper ---
def parse_time_range(time_range: str):
    now = datetime.now(timezone.utc)

    if time_range == "1h":
        return now - timedelta(hours=1)
    elif time_range == "24h":
        return now - timedelta(hours=24)
    elif time_range == "7d":
        return now - timedelta(days=7)
    elif time_range == "30d":
        return now - timedelta(days=30)
    else:
        return None


def extract_confidence_level(row: Dict[str, Any], default: str = "HIGH") -> str:
    """Safely derive confidence_level from row or embedded explainability."""
    if not row:
        return default
    if row.get("confidence_level"):
        return row.get("confidence_level")
    expl = row.get("explainability") or {}
    if isinstance(expl, dict):
        return expl.get("confidence_level", default)
    return default


def attach_confidence_level(payload: Any, default: str = "HIGH") -> Any:
    """Ensure confidence_level key is present for outbound payloads."""
    if isinstance(payload, dict):
        payload.setdefault("confidence_level", extract_confidence_level(payload, default))
    return payload

# --- config loader with defaults ---
# Prefer workspace config/config.yaml; fallback to env; final fallback to defaults.
CFG_PATH = os.path.join(os.getcwd(), "config", "config.yaml")
DEFAULT_CFG = {
    "db_url": "postgresql://fdt:fdtpass@host.docker.internal:5432/fdt_db",
    "thresholds": {"delay": 0.03, "block": 0.06},
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

env_db_url = os.getenv("DB_URL")
DB_URL = env_db_url or cfg.get("db_url")
THRESHOLDS = cfg.get("thresholds", {"delay": 0.0, "block": 0.07})
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
        has_expl = _ensure_explainability_column(conn)
        cols = "tx_id, user_id, device_id, ts, amount, recipient_vpa, tx_type, channel, db_status, action, risk_score, created_at"
        if has_expl:
            cols += ", explainability"
        cur.execute(
            f"SELECT {cols} FROM public.transactions WHERE tx_id=%s;",
            (tx_id,)
        )
        row = cur.fetchone()
        cur.close()
        return row
    finally:
        conn.close()

_HAS_EXPL_COL = None


def _ensure_explainability_column(conn) -> bool:
    global _HAS_EXPL_COL
    if _HAS_EXPL_COL is not None:
        return _HAS_EXPL_COL
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'transactions'
              AND column_name = 'explainability'
            LIMIT 1;
            """
        )
        _HAS_EXPL_COL = cur.fetchone() is not None
        cur.close()
    except Exception:
        _HAS_EXPL_COL = False
    return _HAS_EXPL_COL


def db_insert_transaction(tx: Dict[str, Any]):
    conn = get_conn()
    try:
        cur = conn.cursor()
        has_expl = _ensure_explainability_column(conn)

        explainability_payload = psycopg2.extras.Json(tx.get("explainability")) if has_expl else None

        if has_expl:
            try:
                cur.execute(
                    """
                    INSERT INTO public.transactions
                    (tx_id, user_id, device_id, ts, amount, recipient_vpa, tx_type, channel, risk_score, action, db_status, explainability, created_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
                    ON CONFLICT (tx_id) DO UPDATE
                      SET risk_score = EXCLUDED.risk_score,
                          action = EXCLUDED.action,
                          db_status = EXCLUDED.db_status,
                          explainability = EXCLUDED.explainability,
                          created_at = now()
                    RETURNING tx_id, risk_score, action, created_at, explainability;
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
                        explainability_payload,
                    ),
                )
                inserted = cur.fetchone()
                conn.commit()
                cur.close()
                return inserted
            except Exception as e:
                conn.rollback()
                print("Explainability column write failed, falling back without explainability:", e)

        # Fallback without explainability
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
        has_expl = _ensure_explainability_column(conn)
        cols = "tx_id, user_id, amount, recipient_vpa, tx_type, channel, db_status, action, risk_score, created_at"
        if has_expl:
            cols += ", explainability"
        q = f"""
            SELECT {cols}
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

def db_dashboard_stats(time_range: str):
    conn = get_conn()
    try:
        cur = conn.cursor()

        interval_map = {
            "1h": "1 hour",
            "24h": "24 hours",
            "7d": "7 days",
            "30d": "30 days",
        }

        interval = interval_map.get(time_range, "24 hours")

        cur.execute(f"""
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE action = 'BLOCK') AS block,
              COUNT(*) FILTER (WHERE action = 'DELAY') AS delay,
              COUNT(*) FILTER (WHERE action = 'ALLOW') AS allow,
              COALESCE(AVG(risk_score), 0) AS mean_risk
            FROM transactions
            WHERE created_at >= NOW() - INTERVAL '{interval}';
        """)

        return cur.fetchone()
    finally:
        conn.close()

def db_aggregate_fraud_patterns(time_range: str = "24h", limit: int = None):
    """
    Aggregate fraud pattern statistics from transactions.
    
    Args:
        time_range: Time window (1h, 24h, 7d, 30d)
        limit: Maximum number of transactions to analyze (fallback if no time_range)
    
    Returns:
        Dict with pattern counts aggregated across transactions
    """
    conn = get_conn()
    try:
        cur = conn.cursor()
        
        # Check if explainability column exists
        has_expl = _ensure_explainability_column(conn)
        if not has_expl:
            return {
                "amount_anomaly": 0,
                "behavioural_anomaly": 0,
                "device_anomaly": 0,
                "velocity_anomaly": 0,
                "model_consensus": 0,
                "model_disagreement": 0,
                "transactions_analyzed": 0,
            }
        
        # Build query based on time_range or limit
        since = parse_time_range(time_range)
        if since:
            cur.execute("""
                SELECT explainability
                FROM public.transactions
                WHERE created_at >= %s
                  AND explainability IS NOT NULL
                ORDER BY created_at DESC
            """, (since,))
        else:
            # Fallback: use limit
            max_limit = limit if limit else 1000
            cur.execute("""
                SELECT explainability
                FROM public.transactions
                WHERE explainability IS NOT NULL
                ORDER BY created_at DESC
                LIMIT %s
            """, (max_limit,))
        
        rows = cur.fetchall()
        
        # Initialize counters
        totals = {
            "amount_anomaly": 0,
            "behavioural_anomaly": 0,
            "device_anomaly": 0,
            "velocity_anomaly": 0,
            "model_consensus": 0,
            "model_disagreement": 0,
            "transactions_analyzed": 0,
        }
        
        # Aggregate pattern counts
        # One transaction can contribute to multiple patterns
        for row in rows:
            totals["transactions_analyzed"] += 1
            
            expl = row.get("explainability")
            if not expl or not isinstance(expl, dict):
                continue
            
            # Check if pre-computed patterns exist
            patterns = expl.get("patterns")
            if patterns and isinstance(patterns, dict):
                counts = patterns.get("pattern_counts", {})
                for key in ["amount_anomaly", "behavioural_anomaly", "device_anomaly", 
                           "velocity_anomaly", "model_consensus", "model_disagreement"]:
                    totals[key] += counts.get(key, 0)
            else:
                # Fallback: compute patterns from features on-the-fly
                try:
                    from .pattern_mapper import PatternMapper
                    features = expl.get("features", {})
                    model_scores = expl.get("model_scores", {})
                    
                    if features and model_scores:
                        pattern_results = PatternMapper.analyze_all_patterns(features, model_scores)
                        for key, result in pattern_results.items():
                            if result.detected:
                                totals[key] += 1
                except Exception as e:
                    print(f"Pattern computation error: {e}")
                    continue
        
        cur.close()
        return totals
    finally:
        conn.close()

def db_update_action(tx_id, action, risk_score=None, explainability=None):
    conn = get_conn()
    try:
        cur = conn.cursor()
        has_expl = _ensure_explainability_column(conn)

        expl_payload = psycopg2.extras.Json(explainability) if (has_expl and explainability is not None) else None

        if has_expl:
            try:
                # Only update explainability when explicitly provided; otherwise preserve existing JSON.
                if explainability is not None:
                    if risk_score is None:
                        cur.execute(
                            "UPDATE public.transactions SET action=%s, explainability=%s WHERE tx_id=%s RETURNING tx_id, action, risk_score, explainability, created_at;",
                            (action, expl_payload, tx_id),
                        )
                    else:
                        cur.execute(
                            "UPDATE public.transactions SET action=%s, risk_score=%s, explainability=%s WHERE tx_id=%s RETURNING tx_id, action, risk_score, explainability, created_at;",
                            (action, risk_score, expl_payload, tx_id),
                        )
                else:
                    if risk_score is None:
                        cur.execute(
                            "UPDATE public.transactions SET action=%s WHERE tx_id=%s RETURNING tx_id, action, risk_score, explainability, created_at;",
                            (action, tx_id),
                        )
                    else:
                        cur.execute(
                            "UPDATE public.transactions SET action=%s, risk_score=%s WHERE tx_id=%s RETURNING tx_id, action, risk_score, explainability, created_at;",
                            (action, risk_score, tx_id),
                        )
                res = cur.fetchone()
                conn.commit()
                cur.close()
                return res
            except Exception as e:
                conn.rollback()
                print("Explainability column update failed, falling back without explainability:", e)

        # Fallback without explainability
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

# --- analytics helpers ---
def db_dashboard_analytics(time_range: str):
    since = parse_time_range(time_range)
    bucket_unit = 'hour'
    bucket_limit = 24
    if time_range == '1h':
        bucket_unit = 'minute'
        bucket_limit = 60
    elif time_range == '7d':
        bucket_unit = 'day'
        bucket_limit = 7
    elif time_range == '30d':
        bucket_unit = 'day'
        bucket_limit = 30

    conn = get_conn()
    try:
        cur = conn.cursor()

        # Risk distribution
        if since:
            cur.execute(
                """
                SELECT
                  SUM(CASE WHEN risk_score < 0.3 THEN 1 ELSE 0 END) AS low,
                  SUM(CASE WHEN risk_score >= 0.3 AND risk_score < 0.6 THEN 1 ELSE 0 END) AS medium,
                  SUM(CASE WHEN risk_score >= 0.6 AND risk_score < 0.8 THEN 1 ELSE 0 END) AS high,
                  SUM(CASE WHEN risk_score >= 0.8 THEN 1 ELSE 0 END) AS critical
                FROM public.transactions
                WHERE created_at >= %s;
                """,
                (since,)
            )
        else:
            cur.execute(
                """
                SELECT
                  SUM(CASE WHEN risk_score < 0.3 THEN 1 ELSE 0 END) AS low,
                  SUM(CASE WHEN risk_score >= 0.3 AND risk_score < 0.6 THEN 1 ELSE 0 END) AS medium,
                  SUM(CASE WHEN risk_score >= 0.6 AND risk_score < 0.8 THEN 1 ELSE 0 END) AS high,
                  SUM(CASE WHEN risk_score >= 0.8 THEN 1 ELSE 0 END) AS critical
                FROM public.transactions;
                """
            )
        risk_row = cur.fetchone() or {"low": 0, "medium": 0, "high": 0, "critical": 0}

        # Timeline buckets
        dt_expr = f"date_trunc('{bucket_unit}', created_at)"
        if since:
            cur.execute(
                f"""
                SELECT {dt_expr} AS bucket,
                  SUM(CASE WHEN action = 'BLOCK' THEN 1 ELSE 0 END) AS block,
                  SUM(CASE WHEN action = 'DELAY' THEN 1 ELSE 0 END) AS delay,
                  SUM(CASE WHEN action = 'ALLOW' THEN 1 ELSE 0 END) AS allow
                FROM public.transactions
                WHERE created_at >= %s
                GROUP BY bucket
                ORDER BY bucket DESC
                LIMIT %s;
                """,
                (since, bucket_limit)
            )
        else:
            cur.execute(
                f"""
                SELECT {dt_expr} AS bucket,
                  SUM(CASE WHEN action = 'BLOCK' THEN 1 ELSE 0 END) AS block,
                  SUM(CASE WHEN action = 'DELAY' THEN 1 ELSE 0 END) AS delay,
                  SUM(CASE WHEN action = 'ALLOW' THEN 1 ELSE 0 END) AS allow
                FROM public.transactions
                GROUP BY bucket
                ORDER BY bucket DESC
                LIMIT %s;
                """,
                (bucket_limit,)
            )
        timeline_rows = cur.fetchall() or []

        # Reverse to chronological order
        timeline_rows = list(reversed(timeline_rows))

        # Prepare response
        labels = []
        blocks = []
        delays = []
        allows = []
        for r in timeline_rows:
            b = r["bucket"]
            # Convert to ISO string for client-side formatting
            labels.append(b.isoformat())
            blocks.append(int(r["block"]))
            delays.append(int(r["delay"]))
            allows.append(int(r["allow"]))

        return {
            "risk": {
                "low": int(risk_row["low"] or 0),
                "medium": int(risk_row["medium"] or 0),
                "high": int(risk_row["high"] or 0),
                "critical": int(risk_row["critical"] or 0),
            },
            "timeline": {
                "labels": labels,
                "block": blocks,
                "delay": delays,
                "allow": allows,
            }
        }
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
    stats = await run_in_threadpool(db_dashboard_stats, time_range)
    return {
        "stats": {
            "totalTransactions": stats["total"],
            "blocked": stats["block"],
            "delayed": stats["delay"],
            "allowed": stats["allow"],
        }
    }

@app.get("/dashboard-analytics")
async def dashboard_analytics(time_range: str = "24h"):
    """Aggregated analytics for charts to align with card stats."""
    data = await run_in_threadpool(db_dashboard_analytics, time_range)
    return data

@app.get("/pattern-analytics")
async def pattern_analytics(time_range: str = "24h", limit: int = None):
    """
    Get aggregated fraud pattern counts for the given time range.
    
    Args:
        time_range: Time window (1h, 24h, 7d, 30d)
        limit: Optional max transactions to analyze (used as fallback)
    
    Returns:
        JSON with pattern counts and metadata
    """
    stats = await run_in_threadpool(db_aggregate_fraud_patterns, time_range, limit)
    return stats

@app.get("/model-accuracy")
async def model_accuracy():
    """Get model accuracy metrics from metadata.json"""
    try:
        metadata_path = os.path.join(os.path.dirname(__file__), "..", "models", "metadata.json")
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        model_results = metadata.get("model_results", {})
        
        # Calculate accuracy from confusion matrix
        def calculate_accuracy(confusion_matrix):
            tn, fp, fn, tp = confusion_matrix[0][0], confusion_matrix[0][1], confusion_matrix[1][0], confusion_matrix[1][1]
            total = tn + fp + fn + tp
            return ((tn + tp) / total * 100) if total > 0 else 0
        
        rf_acc = calculate_accuracy(model_results.get("random_forest", {}).get("confusion_matrix", [[0,0],[0,0]]))
        xgb_acc = calculate_accuracy(model_results.get("xgboost", {}).get("confusion_matrix", [[0,0],[0,0]]))
        if_detection = model_results.get("iforest", {}).get("roc_auc", 0) * 100
        
        ensemble_acc = (rf_acc + xgb_acc) / 2
        
        return {
            "random_forest": round(rf_acc, 2),
            "xgboost": round(xgb_acc, 2),
            "isolation_forest": round(if_detection, 2),
            "ensemble": round(ensemble_acc, 2)
        }
    except Exception as e:
        print(f"Error loading model accuracy: {e}")
        return {
            "random_forest": 0,
            "xgboost": 0,
            "isolation_forest": 0,
            "ensemble": 0
        }

@app.get("/recent-transactions")
async def recent_transactions(limit: int = 10, time_range: str = "24h"):
    since = parse_time_range(time_range)

    def query():
        conn = get_conn()
        cur = conn.cursor()
        if since:
            cur.execute("""
                SELECT * FROM public.transactions
                WHERE created_at >= %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (since, limit))
        else:
            cur.execute("""
                SELECT * FROM public.transactions
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
        rows = cur.fetchall()
        conn.close()
        # Enrich confidence_level from explainability if missing
        for r in rows:
            r["confidence_level"] = extract_confidence_level(r, "HIGH")
        return rows

    return {"transactions": await run_in_threadpool(query)}

@app.post("/transactions")
async def new_transaction(request: Request):
    body = await request.json()
    tx = dict(body)

    # Enhanced scoring with ensemble models
    scoring_details = None
    risk_score = None
    confidence_level = "HIGH"
    disagreement = 0.0
    final_risk_score = None
    try:
        from . import scoring
        try:
            scoring_details = scoring.score_transaction(tx, return_details=True)
            risk_score = scoring_details.get("risk_score")
            confidence_level = scoring_details.get("confidence_level", confidence_level)
            disagreement = scoring_details.get("disagreement", disagreement)
            final_risk_score = scoring_details.get("final_risk_score")
        except Exception as e:
            print("Ensemble scoring failed, trying legacy:", e)
            try:
                features = scoring.extract_features(tx)
                legacy_score = scoring.score_features(features)
                risk_score = legacy_score
            except Exception as e2:
                print("Legacy scoring also failed:", e2)
                risk_score = None
    except Exception as e:
        print("Could not import scoring module:", e)
        risk_score = None

    if risk_score is None:
        risk_score = float(tx.get("risk_score", 0.0))

    tx["risk_score"] = float(risk_score)
    tx["confidence_level"] = confidence_level

    # Attach explainability data so it is persisted/auditable when possible
    if scoring_details:
        # Generate pattern analysis using the mapper
        pattern_summary = None
        pattern_reasons: List[str] = []
        try:
            from .pattern_mapper import PatternMapper
            pattern_summary = PatternMapper.get_pattern_summary(
                scoring_details.get("features", {}),
                scoring_details.get("model_scores", {})
            )
            # Align explainability reasons with fraud pattern categories so UI narratives stay consistent
            for p in pattern_summary.get("detected_patterns", []):
                name = p.get("name") or "Pattern"
                expl = p.get("explanation") or "Detected"
                pattern_reasons.append(f"{name}: {expl}")
        except Exception as e:
            print(f"Pattern mapping error: {e}")
        
        # Merge base reasons with pattern-driven reasons, preserving order and uniqueness
        merged_reasons: List[str] = []
        for reason in list(scoring_details.get("reasons", [])) + pattern_reasons:
            if reason and reason not in merged_reasons:
                merged_reasons.append(reason)

        tx["explainability"] = {
            "reasons": merged_reasons,
            "pattern_reasons": pattern_reasons,
            "model_scores": scoring_details.get("model_scores", {}),
            "features": scoring_details.get("features", {}),
            "patterns": pattern_summary,
            "confidence_level": confidence_level,
            "disagreement": disagreement,
            "final_risk_score": final_risk_score if final_risk_score is not None else risk_score,
        }

    if "action" not in tx or not tx.get("action"):
        if tx["risk_score"] >= THRESHOLDS["block"]:
            tx["action"] = "BLOCK"
        elif tx["risk_score"] >= THRESHOLDS["delay"]:
            tx["action"] = "DELAY"
        else:
            tx["action"] = "ALLOW"

    inserted = await run_in_threadpool(db_insert_transaction, tx)
    if isinstance(inserted, dict):
        inserted["confidence_level"] = confidence_level
    full_row = await run_in_threadpool(db_get_transaction, inserted["tx_id"])
    full_row = attach_confidence_level(full_row, confidence_level)

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
    full = attach_confidence_level(full, "HIGH")
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

# --- chatbot endpoint ---
@app.post("/api/chatbot")
async def chatbot_endpoint(request: Request):
    """AI Chatbot endpoint for fraud detection analytics"""
    try:
        body = await request.json()
        message = body.get("message", "").strip()
        time_range = body.get("time_range", "24h")
        conversation_history = body.get("history", [])
        
        if not message:
            return JSONResponse({"error": "Message is required"}, status_code=400)
        
        # Import and initialize chatbot
        from .chatbot import FraudDetectionChatbot
        chatbot = FraudDetectionChatbot(
            db_url=DB_URL,
            groq_api_key=os.getenv("GROQ_API_KEY")
        )
        
        # Get response
        result = await run_in_threadpool(
            chatbot.chat,
            message,
            time_range,
            conversation_history
        )
        
        return JSONResponse(result)
        
    except Exception as e:
        print(f"Chatbot error: {e}")
        return JSONResponse(
            {"error": f"Chatbot error: {str(e)}"}, 
            status_code=500
        )