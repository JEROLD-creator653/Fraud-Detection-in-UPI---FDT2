# scripts/force_block.py
import yaml, psycopg2, pathlib, sys

if len(sys.argv) < 2:
    print("Usage: python scripts/force_block.py <tx_id> [risk_score]")
    sys.exit(1)

txid = sys.argv[1]
risk_score = float(sys.argv[2]) if len(sys.argv) > 2 else 0.12

cfg = yaml.safe_load(pathlib.Path("config.yaml").read_text(encoding="utf-8"))
db = cfg.get("db_url")
if not db:
    print("db_url missing in config:", cfg)
    sys.exit(1)

conn = psycopg2.connect(db)
cur = conn.cursor()

cur.execute("""
 UPDATE public.transactions
 SET risk_score = %s, action = %s
 WHERE tx_id = %s
 RETURNING tx_id, risk_score, action, created_at;
""", (risk_score, "BLOCK", txid))
row = cur.fetchone()
conn.commit()

if row:
    print("Updated row:", row)
else:
    print("No row updated (tx_id may not exist).")

cur.close()
conn.close()