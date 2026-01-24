# Fraud Reason Generator - Documentation

## Overview

The `fraud_reasons.py` module generates human-readable fraud reasons based on transaction features and ML model outputs. It analyzes 25+ features across 9 risk categories to provide detailed explanations for fraud decisions.

## Features & Risk Categories

### 1. **Amount-Based Risk**
- Very high absolute amounts (50000+)
- High absolute amounts (20000+)
- Moderate amounts (10000+)
- Significant deviation from user's historical pattern
- Example: "Amount is 3.5x above user's normal pattern"

### 2. **Device Risk**
- New/unseen device detection
- Device change patterns
- Example: "Transaction from new/unseen device"

### 3. **Recipient/Beneficiary Risk**
- New recipient detection
- Unknown payment destinations
- Example: "Payment to new/unknown recipient"

### 4. **Velocity Fraud** (transactions in short time)
- Per-minute velocity: Card testing (>3 tx/min)
- Per-5-minute velocity: Extremely high (>10 tx/5min)
- Per-hour velocity: Unusual burst (>30 tx/hour)
- Per-6-hour velocity: Sustained high volume
- Example: "12 transactions in last hour"

### 5. **Temporal Risk** (time-based patterns)
- Late-night transactions (22:00-05:00)
- Weekend transactions
- Combined late-night + weekend patterns
- Example: "Transaction at unusual hour (2:00) - late night activity"

### 6. **Merchant Risk**
- Suspicious merchant ID formats
- High-risk merchant patterns
- Example: "Recipient profile indicates potential risk"

### 7. **Channel Risk**
- QR code transactions (higher risk)
- Web-based transactions
- Example: "QR code transaction - higher risk channel"

### 8. **Transaction Type Risk**
- Large P2M (Peer-to-Merchant) transactions
- Example: "Large P2M transaction - higher fraud risk category"

### 9. **ML Model Consensus**
- Multiple models detecting anomalies
- High model confidence
- Anomaly scores from Isolation Forest
- Example: "Anomalous behaviour detected by Isolation Forest"

### 10. **Fallback Pattern**
- Normal transaction profile (when no risks detected)
- Example: "No suspicious patterns detected - normal transaction profile"

## API Reference

### `FraudReason` Class

```python
class FraudReason:
    def __init__(self, 
                 reason: str,           # Human-readable reason
                 severity: str,         # "critical", "high", "medium", "low"
                 feature_name: str = None,
                 feature_value: float = None)
    
    def to_dict(self) -> dict
        # Returns: {"reason": str, "severity": str, "feature": str, "value": float}
```

### `generate_fraud_reasons()` Function

**Signature:**
```python
def generate_fraud_reasons(
    features: dict,
    scores: dict,
    thresholds: dict = None
) -> Tuple[List[FraudReason], float]
```

**Parameters:**
- `features`: Feature dictionary from `feature_engine.extract_features()`
  - 25+ features across: amount, temporal, velocity, behavioral, statistical, risk
- `scores`: Score dictionary from `scoring.score_with_ensemble()`
  - Keys: `iforest`, `random_forest`, `xgboost`, `ensemble` (0-1 float values)
- `thresholds`: Optional threshold dict with keys `delay` and `block` (default: 0.03, 0.06)

**Returns:**
- Tuple: (fraud_reasons_list, composite_risk_score)
- `fraud_reasons_list`: List of `FraudReason` objects
- `composite_risk_score`: Float (0-1) representing overall fraud probability

### `categorize_fraud_risk()` Function

**Signature:**
```python
def categorize_fraud_risk(
    ensemble_score: float,
    fraud_reasons: List[FraudReason],
    thresholds: dict = None
) -> Dict
```

**Returns:**
```python
{
    "risk_level": "BLOCKED" | "DELAYED" | "APPROVED",
    "action": "BLOCK" | "DELAY" | "APPROVE",
    "explanation": str,
    "score": float,
    "is_normal": bool,
    "critical_reasons": List[FraudReason],
    "high_reasons": List[FraudReason],
    "all_reasons": List[FraudReason]
}
```

### `format_fraud_reasons_text()` Function

**Signature:**
```python
def format_fraud_reasons_text(fraud_reasons: List[FraudReason]) -> str
```

**Returns:** Multi-line human-readable string grouped by severity

**Example Output:**
```
CRITICAL:
   • Multiple ML models flagged as high-risk anomaly
     [ml_consensus = 0.75]

HIGH:
   • Anomalous behaviour detected by Isolation Forest
     [iforest_anomaly = 0.72]
   • Amount is 3.5x above user's normal pattern
     [amount_deviation = 3.5]
```

## Integration Example

### Basic Usage with Scoring Module

```python
from app.scoring import score_transaction, extract_features
from app.fraud_reasons import generate_fraud_reasons, categorize_fraud_risk

# Process transaction
tx = {
    "user_id": "user123",
    "device_id": "device456",
    "amount": 15000,
    "timestamp": "2024-01-20T02:30:00Z",
    "recipient_vpa": "merchant@upi",
    "tx_type": "P2P",
    "channel": "app"
}

# Extract features
features = extract_features(tx)

# Score with ML models
scores = score_with_ensemble(features)

# Generate fraud reasons
reasons, composite_score = generate_fraud_reasons(features, scores)

# Categorize risk level
categorization = categorize_fraud_risk(scores["ensemble"], reasons)

# Use results
if categorization["action"] == "BLOCK":
    print(f"TRANSACTION BLOCKED: {categorization['explanation']}")
    for reason in categorization["critical_reasons"]:
        print(f"  - {reason.reason}")
```

### API Response Format

```python
import json

# Convert reasons to JSON
response = {
    "transaction_id": "tx_12345",
    "risk_level": categorization["risk_level"],
    "action": categorization["action"],
    "fraud_score": categorization["score"],
    "reasons": [r.to_dict() for r in reasons]
}

return json.dumps(response)
```

**Example API Response:**
```json
{
  "transaction_id": "tx_12345",
  "risk_level": "BLOCKED",
  "action": "BLOCK",
  "fraud_score": 0.68,
  "reasons": [
    {
      "reason": "Anomalous behaviour detected by Isolation Forest",
      "severity": "high",
      "feature": "iforest_anomaly",
      "value": 0.72
    },
    {
      "reason": "Amount is 3.5x above user's normal pattern",
      "severity": "high",
      "feature": "amount_deviation",
      "value": 3.5
    },
    {
      "reason": "Transaction from new/unseen device",
      "severity": "high",
      "feature": "is_new_device",
      "value": 1.0
    }
  ]
}
```

## Severity Levels

| Level | Color | Typical Action | Description |
|-------|-------|---|---|
| **critical** | Red | BLOCK | Immediate action required, very high confidence fraud |
| **high** | Orange | DELAY/BLOCK | Strong fraud indicators |
| **medium** | Yellow | DELAY | Moderate risk, warrants verification |
| **low** | Green | APPROVE (monitor) | Minor risk factor, typically approved |

## Thresholds

Default thresholds (can be customized):
- **Delay Threshold**: 0.03 (3%)
- **Block Threshold**: 0.06 (6%)

Risk levels:
- Score >= 0.06 → **BLOCKED**
- Score 0.03-0.06 → **DELAYED** (require OTP/verification)
- Score < 0.03 → **APPROVED**

## Feature Mapping

| Category | Features | Count |
|----------|----------|-------|
| Amount | amount, log_amount, is_round_amount | 3 |
| Temporal | hour_of_day, day_of_week, is_weekend, is_night, is_business_hours | 5 |
| Velocity | tx_count_1min, tx_count_5min, tx_count_1h, tx_count_6h, tx_count_24h | 5 |
| Behavioral | is_new_recipient, recipient_tx_count, is_new_device, device_count, is_p2m | 5 |
| Statistical | amount_mean, amount_std, amount_max, amount_deviation | 4 |
| Risk | merchant_risk_score, is_qr_channel, is_web_channel | 3 |
| **Total** | | **25** |

## Error Handling

The module gracefully handles:
- Missing features (defaults to 0.0)
- Divide-by-zero in statistical calculations
- No ML models available (uses feature-based reasoning)
- Empty fraud reasons list (returns fallback "normal pattern")

## Testing

Built-in test examples in `fraud_reasons.py`:

```bash
python -c "from app.fraud_reasons import *; exec(open('app/fraud_reasons.py').read())" 
```

Or run the `__main__` block directly:

```bash
python app/fraud_reasons.py
```

## Best Practices

1. **Always provide all 25 features** from `feature_engine.extract_features()`
2. **Use ensemble scores** from `score_with_ensemble()` for better accuracy
3. **Cache results** if processing the same transaction multiple times
4. **Log all reasons** for audit trails and model improvement
5. **Review critical reasons** manually for high-value transactions
6. **Monitor reason distribution** to detect changing fraud patterns

## Example: Integration with FastAPI

```python
from fastapi import FastAPI
from app.scoring import score_transaction, extract_features
from app.fraud_reasons import generate_fraud_reasons, categorize_fraud_risk

app = FastAPI()

@app.post("/api/score")
async def score_transaction_endpoint(tx: dict):
    try:
        features = extract_features(tx)
        scores = score_with_ensemble(features)
        reasons, _ = generate_fraud_reasons(features, scores)
        categorization = categorize_fraud_risk(scores["ensemble"], reasons)
        
        return {
            "status": "success",
            "transaction_id": tx.get("id"),
            "risk_level": categorization["risk_level"],
            "action": categorization["action"],
            "reasons": [r.to_dict() for r in reasons[:5]]  # Top 5 reasons
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
```

## Performance Notes

- **Processing time**: ~5-10ms per transaction
- **Memory usage**: ~1MB per instance
- **Model loading**: One-time overhead (~500ms)
- **Scalability**: Thread-safe, supports concurrent requests

