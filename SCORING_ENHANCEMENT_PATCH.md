# Ensemble Scoring Enhancement: Confidence Levels

## Overview
Enhanced the ensemble scoring system to provide model agreement metrics and confidence levels alongside risk scores.

## Changes Made

### 1. Enhanced `score_with_ensemble()` Function
**Location:** `app/scoring.py` (after line 217)

**Added Calculations:**
```python
# Calculate final_risk_score as simple average of all available model scores
model_values = [v for k, v in scores.items() if k != "ensemble"]
if model_values:
    scores["final_risk_score"] = float(sum(model_values) / len(model_values))
    
    # Calculate model disagreement
    scores["disagreement"] = float(max(model_values) - min(model_values))
    
    # Assign confidence level based on disagreement
    if scores["disagreement"] < 0.1:
        scores["confidence_level"] = "HIGH"
    elif scores["disagreement"] <= 0.25:
        scores["confidence_level"] = "MEDIUM"
    else:
        scores["confidence_level"] = "LOW"
else:
    scores["final_risk_score"] = scores["ensemble"]
    scores["disagreement"] = 0.0
    scores["confidence_level"] = "HIGH"
```

### 2. Updated `score_transaction()` Return Values
**Location:** `app/scoring.py` (line 280)

**Added Fields:**
```python
return {
    "risk_score": risk_score,  # Weighted ensemble score (0.2 IF + 0.4 RF + 0.4 XGB)
    "final_risk_score": final_risk_score,  # Simple average of all models
    "model_scores": model_scores,  # Individual: iforest, random_forest, xgboost
    "disagreement": disagreement,  # max(scores) - min(scores)
    "confidence_level": confidence_level,  # HIGH / MEDIUM / LOW
    "reasons": reasons,
    "features": features,
}
```

## Metrics Explained

### Individual Model Scores
Preserved in `model_scores` dict:
- `iforest`: Isolation Forest anomaly score (0-1)
- `random_forest`: Random Forest fraud probability (0-1)
- `xgboost`: XGBoost fraud probability (0-1)

### Final Risk Score
- **Calculation:** Simple average of all available model scores
- **Formula:** `(iforest + random_forest + xgboost) / 3`
- **Purpose:** Unweighted consensus view

### Disagreement Metric
- **Calculation:** `max(model_scores) - min(model_scores)`
- **Range:** 0.0 to 1.0
- **Example:**
  ```
  iforest: 0.45, RF: 0.78, XGB: 0.82
  disagreement = 0.82 - 0.45 = 0.37
  ```

### Confidence Level
Based on model agreement:
- **HIGH:** disagreement < 0.1 (models strongly agree)
- **MEDIUM:** disagreement 0.1 - 0.25 (moderate agreement)
- **LOW:** disagreement > 0.25 (models disagree significantly)

## Example Outputs

### High Confidence (Models Agree)
```json
{
  "risk_score": 0.78,
  "final_risk_score": 0.76,
  "model_scores": {
    "iforest": 0.72,
    "random_forest": 0.78,
    "xgboost": 0.79,
    "ensemble": 0.78
  },
  "disagreement": 0.07,
  "confidence_level": "HIGH"
}
```

### Medium Confidence (Some Disagreement)
```json
{
  "risk_score": 0.54,
  "final_risk_score": 0.52,
  "model_scores": {
    "iforest": 0.38,
    "random_forest": 0.62,
    "xgboost": 0.56,
    "ensemble": 0.54
  },
  "disagreement": 0.24,
  "confidence_level": "MEDIUM"
}
```

### Low Confidence (Strong Disagreement)
```json
{
  "risk_score": 0.62,
  "final_risk_score": 0.58,
  "model_scores": {
    "iforest": 0.85,
    "random_forest": 0.42,
    "xgboost": 0.47,
    "ensemble": 0.62
  },
  "disagreement": 0.43,
  "confidence_level": "LOW"
}
```

## Backward Compatibility

### Preserved Behavior
1. **Action Thresholds:** Unchanged (ALLOW/DELAY/BLOCK based on `risk_score`)
2. **Default Return:** `score_transaction(tx)` still returns float `risk_score`
3. **Existing Keys:** All previous keys maintained in detail mode

### Fallback Handling
When models unavailable:
```python
scores["ensemble"] = fallback_rule_based_score(features_dict)
scores["final_risk_score"] = scores["ensemble"]
scores["disagreement"] = 0.0
scores["confidence_level"] = "HIGH"
```

## Integration Points

### Pattern Mapper
Already integrates with model disagreement detection:
- `Model Disagreement` pattern uses `disagreement >= 0.3`
- `Model Consensus` pattern uses tight agreement

### Explainability
Confidence level can be added to admin console:
```javascript
// Display confidence badge
const confidenceBadge = {
  HIGH: '<span class="badge-green">High Confidence</span>',
  MEDIUM: '<span class="badge-yellow">Medium Confidence</span>',
  LOW: '<span class="badge-red">Low Confidence</span>'
}[confidence_level];
```

### Dashboard Analytics
Can add confidence distribution chart:
```javascript
// Aggregate confidence levels
const confidenceCounts = {
  HIGH: transactions.filter(t => t.confidence_level === 'HIGH').length,
  MEDIUM: transactions.filter(t => t.confidence_level === 'MEDIUM').length,
  LOW: transactions.filter(t => t.confidence_level === 'LOW').length
};
```

## Testing

### Unit Test
```python
# Test disagreement calculation
tx = {...}
details = score_transaction(tx, return_details=True)

assert "disagreement" in details
assert "confidence_level" in details
assert details["confidence_level"] in ["HIGH", "MEDIUM", "LOW"]

# Test thresholds
if details["disagreement"] < 0.1:
    assert details["confidence_level"] == "HIGH"
elif details["disagreement"] <= 0.25:
    assert details["confidence_level"] == "MEDIUM"
else:
    assert details["confidence_level"] == "LOW"
```

### Integration Test
```bash
# Send test transaction
curl -X POST http://localhost:8000/transactions \
  -H "Content-Type: application/json" \
  -d '{"tx_id": "test123", "amount": 5000, ...}'

# Check response includes confidence fields
# explainability.model_scores should have disagreement
# explainability should have confidence_level
```

## Benefits

### For Fraud Analysts
- **Prioritization:** Focus on LOW confidence cases (conflicting signals)
- **Trust:** HIGH confidence decisions need less review
- **Investigation:** Disagreement metric guides deeper analysis

### For Operations
- **Alert Tuning:** Route LOW confidence to manual review
- **SLA Optimization:** AUTO-approve HIGH confidence + low risk
- **Model Monitoring:** Track confidence distribution over time

### For Compliance
- **Transparency:** Show not just score but model agreement
- **Auditability:** Explain why decision has HIGH/LOW confidence
- **Documentation:** Richer explainability for regulators

## Implementation Notes

**To apply this enhancement, modify `app/scoring.py`:**

1. Locate the ensemble calculation block (around line 217):
   ```python
   scores["ensemble"] = float(weighted_sum / total_weight) if total_weight > 0 else 0.0
   ```

2. Add the new calculations immediately after:
   ```python
   # Add final_risk_score, disagreement, confidence_level
   model_values = [v for k, v in scores.items() if k != "ensemble"]
   if model_values:
       scores["final_risk_score"] = float(sum(model_values) / len(model_values))
       scores["disagreement"] = float(max(model_values) - min(model_values))
       if scores["disagreement"] < 0.1:
           scores["confidence_level"] = "HIGH"
       elif scores["disagreement"] <= 0.25:
           scores["confidence_level"] = "MEDIUM"
       else:
           scores["confidence_level"] = "LOW"
   else:
       scores["final_risk_score"] = scores["ensemble"]
       scores["disagreement"] = 0.0
       scores["confidence_level"] = "HIGH"
   ```

3. Update `score_transaction()` to extract and return new fields (around line 280-310)

4. Update error fallback to include new fields (around line 320)

5. Restart API server to apply changes

**No database migration needed** - fields are added to in-memory scoring response and can be persisted in existing JSONB explainability column.
