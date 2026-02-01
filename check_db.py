import psycopg2

conn = psycopg2.connect('dbname=fdt_db user=fdt password=fdtpass host=localhost port=5433')
cur = conn.cursor()

# Check total count
cur.execute('SELECT COUNT(*) FROM transactions')
total = cur.fetchone()[0]
print(f'\nTotal transactions in database: {total}\n')

# Show transactions by date
cur.execute('''
    SELECT DATE(ts), COUNT(*), 
           COUNT(*) FILTER (WHERE action = 'ALLOW') as allows,
           COUNT(*) FILTER (WHERE action = 'DELAY') as delays,
           COUNT(*) FILTER (WHERE action = 'BLOCK') as blocks
    FROM transactions
    GROUP BY DATE(ts)
    ORDER BY DATE(ts) DESC
    LIMIT 30
''')

print("Transactions by Date:")
print("-" * 70)
print(f"{'Date':<12} {'Total':<8} {'ALLOW':<8} {'DELAY':<8} {'BLOCK':<8}")
print("-" * 70)
for row in cur.fetchall():
    print(f"{str(row[0]):<12} {row[1]:<8} {row[2]:<8} {row[3]:<8} {row[4]:<8}")

print("\n" + "=" * 70)
print("\nMost Recent 10 Transactions:")
print("-" * 70)
cur.execute('''
    SELECT ts, user_id, amount, action, risk_score 
    FROM transactions 
    ORDER BY created_at DESC 
    LIMIT 10
''')
for row in cur.fetchall():
    print(f"{row[0]} | {row[1]:<10} | Rs{row[2]:<10.2f} | {row[3]:<6} | Risk: {row[4]:.4f}")

conn.close()
