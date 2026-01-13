import os
import redis
from datetime import datetime, timezone, timedelta
import math

REDIS_URL = os.getenv("REDIS_URL", "redis://host.docker.internal:6379/0")
r = redis.from_url(REDIS_URL, decode_responses=True)

# ---------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------
def safe_ts(timestamp_str):
    """Convert timestamp to UTC datetime."""
    return datetime.fromisoformat(timestamp_str.replace("Z", "+00:00")).astimezone(timezone.utc)

def zcount_last_seconds(key, now_ts, seconds):
    """Count events in a ZSET in the last X seconds."""
    start = now_ts - seconds
    return r.zcount(key, start, now_ts)

def zsum_last_seconds(key, now_ts, seconds):
    """Sum values in a ZSET in the last X seconds."""
    start = now_ts - seconds
    vals = r.zrangebyscore(key, start, now_ts)
    return sum(map(float, vals))

# ---------------------------------------------
# MAIN FEATURE EXTRACTOR
# ---------------------------------------------
def extract_features(tx):
    """
    FEATURE LIST (v2):
    [
        amount,
        hour_of_day,
        tx_count_1h,
        new_recipient_flag,
        device_change_flag,
        velocity_5min,
        velocity_10sec,
        merchant_risk,
    ]
    """

    ts = safe_ts(tx["timestamp"])
    now_ts = ts.timestamp()

    amount = float(tx["amount"])
    hour = ts.hour
    user = tx["user_id"]
    device = tx["device_id"]
    recipient = tx["recipient_vpa"]

    # --------------------------------------------------------
    # 1. Rolling transaction count (1h window)
    # --------------------------------------------------------
    tx_key = f"user:{user}:timestamps"
    r.zadd(tx_key, {str(now_ts): now_ts})
    r.zremrangebyscore(tx_key, 0, now_ts - 3600)
    tx_count_1h = r.zcount(tx_key, now_ts - 3600, now_ts)
    r.expire(tx_key, 3600)

    # --------------------------------------------------------
    # 2. New recipient flag
    # --------------------------------------------------------
    rec_key = f"user:{user}:recipients"
    new_rec = 0
    if not r.sismember(rec_key, recipient):
        new_rec = 1
        r.sadd(rec_key, recipient)
    r.expire(rec_key, 86400 * 30)  # keep for 30 days

    # --------------------------------------------------------
    # 3. Device change flag
    # --------------------------------------------------------
    dev_key = f"user:{user}:devices"
    device_flag = 0
    if not r.sismember(dev_key, device):
        device_flag = 1  # new or unseen device
        r.sadd(dev_key, device)
    r.expire(dev_key, 86400 * 60)

    # --------------------------------------------------------
    # 4. Velocity features (rapid-fire transactions)
    # --------------------------------------------------------
    key_5 = f"user:{user}:ts5"
    key_10 = f"user:{user}:ts10"

    r.zadd(key_5, {str(now_ts): now_ts})
    r.zadd(key_10, {str(now_ts): now_ts})

    r.zremrangebyscore(key_5, 0, now_ts - 300)    # last 5 min
    r.zremrangebyscore(key_10, 0, now_ts - 10)    # last 10 sec

    vel_5 = r.zcount(key_5, now_ts - 300, now_ts)
    vel_10 = r.zcount(key_10, now_ts - 10, now_ts)

    r.expire(key_5, 300)
    r.expire(key_10, 20)

    # --------------------------------------------------------
    # 5. Merchant risk scoring
    # (dummy v1: high risk if merchant starts with number)
    # --------------------------------------------------------
    merchant = recipient.split("@")[0]
    if merchant[0].isdigit():
        merchant_risk = 1
    else:
        merchant_risk = 0

    # --------------------------------------------------------
    # FINAL FEATURE VECTOR
    # --------------------------------------------------------
    return [
        amount,
        hour,
        int(tx_count_1h),
        int(new_rec),
        int(device_flag),
        int(vel_5),
        int(vel_10),
        int(merchant_risk)
    ]
