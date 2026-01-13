# scripts/load_config.py
import yaml, sys, pathlib

p = pathlib.Path("config.yaml")
if not p.exists():
    print("config.yaml not found in", p.resolve())
    sys.exit(1)

raw = p.read_bytes()
# quick sniff
print("First 4 bytes:", raw[:4])

# Try decoding with common encodings
for enc in ("utf-8", "utf-8-sig", "utf-16", "latin-1"):
    try:
        text = raw.decode(enc)
        cfg = yaml.safe_load(text)
        print("Loaded config with encoding:", enc)
        print("Keys:", list(cfg.keys()))
        print(cfg)
        break
    except Exception as e:
        print("Failed with", enc, ":", e)
else:
    print("Could not decode config.yaml with tried encodings.")
    sys.exit(2)