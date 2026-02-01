import psycopg2
from datetime import datetime, timedelta

conn = psycopg2.connect('dbname=fdt_db user=fdt password=fdtpass host=localhost port=5433')
cur = conn.cursor()

print("\nDate Distribution in Database:")
print("=" * 60)

# Get min and max dates in database
cur.execute("SELECT MIN(ts), MAX(ts) FROM transactions WHERE ts >= NOW() - INTERVAL '30 days'")
min_ts, max_ts = cur.fetchone()
print(f"Date Range: {min_ts.date()} to {max_ts.date()}")

# Show transactions per date for last 7 days
cur.execute("""
    SELECT DATE(ts), COUNT(*) as count
    FROM transactions
    WHERE ts >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(ts)
    ORDER BY DATE(ts) DESC
""")

print("\nLast 7 Days Transaction Count by Date:")
print("-" * 40)
print(f"{'Date':<15} {'Count':<10}")
print("-" * 40)
for date, count in cur.fetchall():
    print(f"{str(date):<15} {count:<10}")

conn.close()
print("\n✓ If the timeline shows dates from past week, the fix is working!")
