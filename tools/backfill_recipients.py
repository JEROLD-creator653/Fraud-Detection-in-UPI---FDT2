#!/usr/bin/env python3
"""
Backfill Redis with existing recipient relationships from PostgreSQL.
This fixes the issue where recipient_tx_count shows 0 even when
there are previous successful transactions to that recipient.
"""
import os
import sys
import psycopg2
import redis
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def backfill_recipients():
    """Backfill all successful transactions into Redis recipient sets."""
    
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        dbname="fdt_db",
        user="fdt",
        password="fdtpass"
    )
    
    # Connect to Redis
    try:
        r = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        r.ping()
        print("✓ Connected to Redis")
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")
        return
    
    try:
        cur = conn.cursor()
        
        # Get all ALLOWED transactions
        print("Fetching all allowed transactions...")
        cur.execute("""
            SELECT user_id, recipient_vpa, COUNT(*) as tx_count
            FROM transactions
            WHERE action = 'ALLOW'
            GROUP BY user_id, recipient_vpa
            ORDER BY user_id, recipient_vpa
        """)
        
        rows = cur.fetchall()
        print(f"Found {len(rows)} user-recipient pairs to backfill")
        
        # Add each recipient to Redis
        backfilled = 0
        for user_id, recipient_vpa, tx_count in rows:
            rec_key = f"user:{user_id}:recipients"
            
            # Add to Redis set
            r.sadd(rec_key, recipient_vpa)
            r.expire(rec_key, 86400 * 30)  # 30 day TTL
            
            backfilled += 1
            if backfilled % 100 == 0:
                print(f"  Progress: {backfilled}/{len(rows)}")
        
        print(f"\n✓ Backfilled {backfilled} user-recipient relationships")
        
        # Show some stats
        print("\nSample data:")
        sample_users = ['user_6030fe90', 'user_bcaa9d94', 'user_28b04e92']
        for user_id in sample_users:
            rec_key = f"user:{user_id}:recipients"
            count = r.scard(rec_key)
            recipients = list(r.smembers(rec_key))[:5]
            print(f"  {user_id}: {count} recipients ({', '.join(recipients)}...)")
        
    finally:
        conn.close()
        print("\n✓ Backfill complete!")

if __name__ == "__main__":
    backfill_recipients()
