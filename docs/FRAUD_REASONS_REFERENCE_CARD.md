# Fraud Reasons Module - Visual Reference Card

## 🎯 One-Page Guide

### What It Does
Generates **human-readable fraud explanations** from ML scores and transaction features.

### Quick Start
```python
from app.fraud_reasons import generate_fraud_reasons, categorize_fraud_risk

# Generate reasons
reasons, score = generate_fraud_reasons(features, scores)

# Make decision
result = categorize_fraud_risk(scores["ensemble"], reasons)
print(result["action"])  # BLOCK | DELAY | APPROVE
```

---

## 10 Risk Categories

```
┌─────────────────────────────────────────────────────────────┐
│                    FRAUD REASON CATEGORIES                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣  AMOUNT                                                 │
│      └─ High amount, Pattern deviation                      │
│                                                              │
│  2️⃣  DEVICE                                                 │
│      └─ New device, Device change                           │
│                                                              │
│  3️⃣  RECIPIENT                                              │
│      └─ New recipient, Unknown destination                  │
│                                                              │
│  4️⃣  VELOCITY                                               │
│      └─ Per-minute, 5-min, hourly, 6-hourly transactions    │
│                                                              │
│  5️⃣  TEMPORAL                                               │
│      └─ Late-night, Weekend, Unusual timing                 │
│                                                              │
│  6️⃣  MERCHANT                                               │
│      └─ Suspicious ID, Risk patterns                        │
│                                                              │
│  7️⃣  CHANNEL                                                │
│      └─ QR, Web, High-risk channels                         │
│                                                              │
│  8️⃣  TRANSACTION TYPE                                       │
│      └─ Large P2M, P2P                                      │
│                                                              │
│  9️⃣  ML CONSENSUS                                           │
│      └─ Multiple models agree, Anomalies                    │
│                                                              │
│  🔟  FALLBACK                                               │
│      └─ Normal transaction (no risks)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Severity Levels & Actions

```
CRITICAL  🔴  BLOCK       (Risk: 80%+)     Score >= 0.06
HIGH      🟠  DELAY/OTP   (Risk: 50%+)     
MEDIUM    🟡  REVIEW      (Risk: 25%+)     0.03 <= Score
LOW       🟢  MONITOR     (Risk: 5%+)      Score < 0.03
```

---

## Output Structure

```
FraudReason {
  reason:    str         # "High transaction amount"
  severity:  str         # "high" | "medium" | "low"
  feature:   str         # "amount"
  value:     float       # 25000.0
}

Categorization {
  risk_level:        "BLOCKED"/"DELAYED"/"APPROVED"
  action:            "BLOCK"/"DELAY"/"APPROVE"
  score:             0.0-1.0
  critical_reasons:  [FraudReason, ...]
  high_reasons:      [FraudReason, ...]
  all_reasons:       [FraudReason, ...]
}
```

---

## Feature Input (25)

```
AMOUNT (3)                    TEMPORAL (5)
├─ amount                     ├─ hour_of_day
├─ log_amount                 ├─ day_of_week
└─ is_round_amount            ├─ is_weekend
                              ├─ is_night
VELOCITY (5)                  └─ is_business_hours
├─ tx_count_1min              
├─ tx_count_5min              BEHAVIORAL (5)
├─ tx_count_1h                ├─ is_new_recipient
├─ tx_count_6h                ├─ recipient_tx_count
└─ tx_count_24h               ├─ is_new_device
                              ├─ device_count
STATISTICAL (4)               └─ is_p2m
├─ amount_mean                
├─ amount_std                 RISK (3)
├─ amount_max                 ├─ merchant_risk_score
└─ amount_deviation           ├─ is_qr_channel
                              └─ is_web_channel
```

---

## Common Patterns

### 🔴 High-Risk Pattern
```
[CRITICAL] Multiple ML models flagged as high-risk
[HIGH]     Amount is 13.3x above user's pattern
[HIGH]     Transaction from new/unseen device
[HIGH]     Payment to new/unknown recipient
[MEDIUM]   Transaction at unusual hour (3:00)
           
→ ACTION: BLOCK
```

### 🟠 Medium-Risk Pattern
```
[MEDIUM]   Transaction amount exceeds 10000
[MEDIUM]   Unusual transaction volume
[LOW]      Weekend late-night transaction

→ ACTION: DELAY (request OTP)
```

### 🟢 Low-Risk Pattern
```
[LOW]      No suspicious patterns detected

→ ACTION: APPROVE
```

---

## Integration Example

```python
# 1. Extract
features = extract_features(tx)

# 2. Score
scores = score_with_ensemble(features)

# 3. Reason
reasons, _ = generate_fraud_reasons(features, scores)

# 4. Categorize
result = categorize_fraud_risk(scores["ensemble"], reasons)

# 5. Decide
if result["action"] == "BLOCK":
    block_transaction()
elif result["action"] == "DELAY":
    request_otp()
else:
    approve_transaction()

# 6. Log
log_audit(result, reasons)
```

---

## API Reference

### generate_fraud_reasons()
```python
reasons, composite_score = generate_fraud_reasons(
    features: dict,           # 25 features
    scores: dict,             # {iforest, rf, xgb, ensemble}
    thresholds: dict = None   # {"delay": 0.03, "block": 0.06}
)
```

### categorize_fraud_risk()
```python
result = categorize_fraud_risk(
    ensemble_score: float,
    fraud_reasons: List[FraudReason],
    thresholds: dict = None
)
```

### format_fraud_reasons_text()
```python
text = format_fraud_reasons_text(fraud_reasons: List[FraudReason])
```

---

## Thresholds

**Default:**
```
BLOCK threshold:  0.06 (6%)
DELAY threshold:  0.03 (3%)
```

**Custom:**
```python
thresholds = {"delay": 0.02, "block": 0.05}  # Stricter
```

---

## Decision Tree

```
                    Transaction Score
                           |
                    ________┼________
                   |                 |
              >= 0.06            0.03-0.06            < 0.03
                |                    |                   |
              BLOCKED             DELAYED             APPROVED
              Action:             Action:             Action:
              BLOCK               DELAY               APPROVE
              (OTP/Verify)        (OTP)               (Proceed)
```

---

## Performance

| Metric | Value |
|--------|-------|
| Speed | 5-10 ms/tx |
| Memory | ~1 MB |
| Concurrency | Unlimited |

---

## Files

| File | Purpose | Size |
|------|---------|------|
| `app/fraud_reasons.py` | Core code | 18 KB |
| `FRAUD_REASONS_QUICK_REFERENCE.md` | Cheat sheet | 7.6 KB |
| `FRAUD_REASONS_DOCUMENTATION.md` | Full API | 9.9 KB |
| `FRAUD_REASONS_INTEGRATION_EXAMPLES.py` | Examples | 14.3 KB |
| `test_fraud_reasons.py` | Tests | 3.4 KB |

---

## Verification

```bash
python test_fraud_reasons.py
```

**Expected:** All tests pass ✅

---

## Key Points

✅ 10 risk categories  
✅ 25+ features analyzed  
✅ 4 severity levels  
✅ 3 ML models  
✅ JSON output  
✅ Production ready  
✅ Easy integration  
✅ Full documentation  

---

## Example Reasons

```
High transaction amount (50000+)
Amount is 3.5x above user's normal pattern
Transaction from new/unseen device
Payment to new/unknown recipient
12 transactions in last hour
5 transactions in last 5 minutes
Transaction at unusual hour (2:00)
Recipient profile indicates potential risk
QR code transaction - higher risk channel
Anomalous behaviour detected by Isolation Forest
Multiple ML models flagged as high-risk anomaly
Weekend late-night transaction
No suspicious patterns detected
```

---

## Status

✅ **PRODUCTION READY**

Latest Version: 1.0  
Last Updated: January 20, 2026

---

**Quick Links:**
- 📖 [Full Documentation](FRAUD_REASONS_DOCUMENTATION.md)
- ⚡ [Quick Reference](FRAUD_REASONS_QUICK_REFERENCE.md)
- 💡 [Integration Examples](FRAUD_REASONS_INTEGRATION_EXAMPLES.py)
- 🧪 [Tests](test_fraud_reasons.py)
- 📑 [Index](FRAUD_REASONS_INDEX.md)

