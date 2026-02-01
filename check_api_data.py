import psycopg2

conn = psycopg2.connect('dbname=fdt_db user=fdt password=fdtpass host=localhost port=5433')
cur = conn.cursor()

# Test what different time ranges return
time_ranges = {
    '1h': '1 hour',
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days',
}

print("\nTransaction counts by time range:")
print("=" * 60)

for range_key, interval in time_ranges.items():
    cur.execute(f"""
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE action = 'BLOCK') AS block,
          COUNT(*) FILTER (WHERE action = 'DELAY') AS delay,
          COUNT(*) FILTER (WHERE action = 'ALLOW') AS allow
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '{interval}';
    """)
    
    total, block, delay, allow = cur.fetchone()
    print(f"{range_key:5} ({interval:12}): Total={total:5}, ALLOW={allow:4}, DELAY={delay:4}, BLOCK={block:4}")

conn.close()
