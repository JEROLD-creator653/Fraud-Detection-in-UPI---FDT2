import yaml, psycopg2, pathlib
cfg = yaml.safe_load(pathlib.Path("config.yaml").read_text(encoding="utf-8"))
db = cfg['db_url']
conn = psycopg2.connect(db)
cur = conn.cursor()
cur.execute("""
 SELECT
   COUNT(*) as total,
   COUNT(*) FILTER (WHERE action='BLOCK') as block,
   COUNT(*) FILTER (WHERE action='DELAY') as delay,
   COUNT(*) FILTER (WHERE action='ALLOW') as allow,
   AVG(risk_score) as mean_risk
 FROM public.transactions;
""")
print(cur.fetchone())
cur.close(); conn.close()