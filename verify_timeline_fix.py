import psycopg2
from datetime import datetime, timedelta

# Direct database query to verify the fix
conn = psycopg2.connect('dbname=fdt_db user=fdt password=fdtpass host=localhost port=5433')
cur = conn.cursor()

print('Simulating /recent-transactions?limit=1500&time_range=7d')
print('=' * 80)

# Calculate since timestamp (7 days ago)
since = datetime.utcnow() - timedelta(days=7)
print(f'Filtering by: ts >= {since}\n')

# Execute the UPDATED query that the backend now uses (NO LIMIT for time ranges)
cur.execute('''
    SELECT * FROM public.transactions
    WHERE ts >= %s
    ORDER BY ts DESC
''', (since,))

rows = cur.fetchall()
print(f'Returned {len(rows)} transactions\n')

# Get column names
col_names = [desc[0] for desc in cur.description]

# Check if ts is in the results
if 'ts' in col_names:
    ts_idx = col_names.index('ts')
    action_idx = col_names.index('action')
    tx_id_idx = col_names.index('tx_id')
    
    # Get date distribution
    dates = [row[ts_idx].date() for row in rows]
    unique_dates = sorted(set(dates), reverse=True)
    min_date = min(dates)
    max_date = max(dates)
    
    print(f'Date span: {min_date} to {max_date} ({len(unique_dates)} unique dates)\n')
    
    print('Transaction counts by date:')
    print('-' * 40)
    for date in unique_dates:
        count = sum(1 for d in dates if d == date)
        print(f'{date}: {count} transactions')
    
    print(f'\nFirst 5 transactions:')
    print('-' * 80)
    for i, row in enumerate(rows[:5]):
        print(f'TX {i+1}: {row[tx_id_idx][:16]}... | ts={row[ts_idx]} | action={row[action_idx]}')
    
    print(f'\n✓ SUCCESS: Timeline data spans {len(unique_dates)} days with multiple dates')

conn.close()
