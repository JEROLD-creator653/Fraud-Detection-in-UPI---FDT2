"""
Temporary fix script to verify the admin log issue
"""
import yaml, psycopg2, psycopg2.extras, pathlib

raw = pathlib.Path('config/config.yaml').read_bytes()
text = raw.decode('utf-8-sig').lstrip('\ufeff')
cfg = yaml.safe_load(text)
conn = psycopg2.connect(cfg['db_url'], cursor_factory=psycopg2.extras.RealDictCursor)
cur = conn.cursor()

# Test insert
cur.execute("""
    INSERT INTO public.admin_logs (tx_id, user_id, action, admin_username, source_ip, created_at)
    VALUES (%s, %s, %s, %s, %s, NOW())
    RETURNING log_id;
""", ('test_tx_abc', 'user_test', 'BLOCK', 'admin', '127.0.0.1'))

row = cur.fetchone()
print(f"Row type: {type(row)}")
print(f"Row value: {row}")

# Try both access methods
try:
    log_id_index = row[0]
    print(f"Access by index [0]: {log_id_index}")
except Exception as e:
    print(f"Access by index failed: {e}")

try:
    log_id_key = row.get("log_id")
    print(f"Access by key .get('log_id'): {log_id_key}")
except Exception as e:
    print(f"Access by key failed: {e}")

try:
    log_id_bracket = row["log_id"]
    print(f"Access by bracket ['log_id']: {log_id_bracket}")
except Exception as e:
    print(f"Access by bracket failed: {e}")

conn.rollback()  # Don't commit test data
cur.close()
conn.close()
