import os
"""
Scoring module used by app.main.
Provides:
  - extract_features(tx) -> dict
  - score_features(features) -> float (0.0 - 1.0)
It will try to use sklearn.IsolationForest if available, otherwise a rule-based fallback.
"""

from datetime import datetime, timezone, timedelta
import math
import random

# optional DB helper - main will call scoring in-threadpool, so it's fine to use synchronous DB calls if needed
try:
    from .db_utils import count_recent_transactions_for_user_device
except Exception:
    # if db_utils not present, define a no-op fallback
    def count_recent_transactions_for_user_device(user_id=None, device_id=None, period_seconds=60):
        return 0

# Try to import sklearn IsolationForest
USE_SKLEARN = False
try:
    from sklearn.ensemble import IsolationForest
    import numpy as np
    USE_SKLEARN = True
except Exception:
    USE_SKLEARN = False

# simple in-memory buffer for isolation forest training samples (very small)
_SK_SAMPLES = []

def extract_features(tx: dict) -> dict:
    """
    Build a small numeric feature vector from tx.
    """
    f = {}
    f["amount"] = float(tx.get("amount") or 0.0)
    f["has_recipient"] = 1.0 if tx.get("recipient_vpa") else 0.0
    f["is_p2m"] = 1.0 if (tx.get("tx_type") or "").upper() == "P2M" else 0.0
    f["is_qr"] = 1.0 if (tx.get("channel") or "").lower() == "qr" else 0.0
    # velocity features (counts in last minute)
    try:
        u = tx.get("user_id")
        d = tx.get("device_id")
        f["user_recent_count"] = float(count_recent_transactions_for_user_device(user_id=u, device_id=None, period_seconds=60))
        f["device_recent_count"] = float(count_recent_transactions_for_user_device(user_id=None, device_id=d, period_seconds=60))
    except Exception:
        f["user_recent_count"] = 0.0
        f["device_recent_count"] = 0.0
    # timestamp hour
    try:
        ts = tx.get("ts") or tx.get("created_at") or tx.get("timestamp")
        if ts:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
            f["hour"] = float(dt.hour)
        else:
            f["hour"] = 0.0
    except Exception:
        f["hour"] = 0.0
    return f

def _features_to_vector(fdict):
    # fixed order
    return [fdict.get(k, 0.0) for k in ("amount","has_recipient","is_p2m","is_qr","user_recent_count","device_recent_count","hour")]

def score_features(features: dict) -> float:
    """
    Return a risk score in [0,1]. If sklearn is available, use IsolationForest.
    Otherwise use a heuristic:
      - large amounts -> higher score
      - high velocity (user/device counts) -> higher score
      - odd hour -> small bump
    """
    vec = _features_to_vector(features)

    # if sklearn available, use IsolationForest trained online with recent samples
    if USE_SKLEARN:
        try:
            # keep a sliding window of samples
            _SK_SAMPLES.append(vec)
            if len(_SK_SAMPLES) > 500:
                _SK_SAMPLES.pop(0)
            # train a small model on available samples (cheap)
            X = np.array(_SK_SAMPLES)
            if len(X) >= 30:
                iso = IsolationForest(n_estimators=64, contamination=0.05, random_state=42)
                iso.fit(X)
                score = -iso.decision_function([vec])[0]  # anomaly score (higher means more anomalous)
                # normalize to 0..1 (rough)
                score = 1/(1+math.exp(-score))  # logistic
                return float(max(0.0, min(1.0, score)))
        except Exception:
            pass

    # fallback heuristic
    amount = float(features.get("amount") or 0.0)
    user_cnt = float(features.get("user_recent_count") or 0.0)
    dev_cnt = float(features.get("device_recent_count") or 0.0)
    hour = float(features.get("hour") or 0.0)

    # base from amount (use log scale)
    base = 0.0
    if amount <= 0:
        base = 0.0
    else:
        base = math.tanh(math.log1p(amount) / 5.0)  # between 0..~1

    # velocity boost
    vel = math.tanh((user_cnt + dev_cnt) / 5.0)

    # odd-hour bump (2am-5am)
    hour_bump = 0.15 if (hour >= 2 and hour <= 5) else 0.0

    score = base * 0.6 + vel * 0.3 + hour_bump
    # clamp
    score = max(0.0, min(1.0, score))
    # small random jitter to avoid identical scores
    score = float(score * 0.98 + random.random() * 0.02)
    return score