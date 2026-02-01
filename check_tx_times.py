import psycopg2
import json
from datetime import datetime

conn = psycopg2.connect('dbname=fdt_db user=fdt password=fdtpass host=localhost port=5433')
cur = conn.cursor()

# Get recent transactions  with their timestamps
cur.execute('''
    SELECT tx_id, user_id, amount, action, risk_score, ts, created_at
    FROM transactions
    ORDER BY created_at DESC
    LIMIT 30
''')

transactions = []
for row in cur.fetchall():
    ts = row[5]  # ts field
    created_at = row[6]  # created_at field
    print(f"TX: {row[0][:8]}... | ts={ts} | created_at={created_at} | Action={row[3]}")

conn.close()
