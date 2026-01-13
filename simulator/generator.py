# simulator/generator.py
import requests, uuid, random, time
from datetime import datetime, timezone

URL = "http://localhost:8000/transactions"

def gen_tx():
    ts = datetime.now(timezone.utc).isoformat()
    amount = round(abs(random.gauss(300,200)) + 1, 2)
    # create a basic heuristic risk so simulator isn't always ALLOW
    # bigger amounts -> higher risk
    risk_guess = min(1.0, max(0.0, (amount - 200) / 1000.0 + random.random()*0.2))
    # choose action with some bias on risk
    if risk_guess >= 0.07:
        action = random.choices(["BLOCK","DELAY","ALLOW"], weights=[0.5,0.3,0.2])[0]
    elif risk_guess >= 0.02:
        action = random.choices(["DELAY","ALLOW"], weights=[0.4,0.6])[0]
    else:
        action = "ALLOW"
    return {
        "tx_id": str(uuid.uuid4()),
        "user_id": f"user{random.randint(1,200)}",
        "device_id": str(uuid.uuid4()),
        "ts": ts,
        "amount": amount,
        "recipient_vpa": f"merchant{random.randint(1,50)}@upi",
        "tx_type": random.choice(["P2P","P2M"]),
        "channel": random.choice(["app","qr","web"]),
        "risk_score": round(risk_guess, 4),
        "action": action
    }

if __name__ == "__main__":
    while True:
        tx = gen_tx()
        try:
            r = requests.post(URL, json=tx, timeout=5)
            print(r.status_code, r.text)
        except Exception as e:
            print("error:", e)
        time.sleep(0.2)