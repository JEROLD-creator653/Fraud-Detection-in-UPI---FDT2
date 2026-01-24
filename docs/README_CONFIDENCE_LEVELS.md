# Confidence Levels (Confidence Band)

## What it is
- `confidence_level` is an ensemble-quality signal derived from how far apart the per-model fraud probabilities are.
- It is informational only; actions and thresholds are unchanged. The field is included in API responses and WebSocket messages.

## How it is computed (current logic)
- Compute per-model scores (`iforest`, `random_forest`, `xgboost`).
- Take the mean of the available model scores as `final_risk_score` (ensemble remains the weighted score).
- Compute `disagreement = max(model_scores) - min(model_scores)`.
- Map disagreement to a band:
  - `< 0.10` → `HIGH`
  - `0.10–0.25` → `MEDIUM`
  - `> 0.25` → `LOW`
- If no model scores are available (or only one score), disagreement is `0.0`, so confidence defaults to `HIGH`.
- Implementation lives in [app/scoring.py](app/scoring.py) inside `score_with_ensemble` and `score_transaction`.

## Where it appears
- REST: `/transactions` (insert), `/recent-transactions`.
- WebSocket: `tx_inserted`, `tx_updated` payloads.
- UI: Admin list badge, dashboard recent table, high-risk alert warning badge.

## Why you might only see HIGH
- Only one model is loaded (e.g., only Isolation Forest); with a single score the spread is 0, so confidence stays `HIGH`.
- Multiple models load but produce nearly identical scores (disagreement < 0.10).
- All models failed to load, falling back to the rule-based score (also yields `HIGH`).

## Troubleshooting
1) Check model load logs on API start (look for "Loaded Isolation Forest", "Loaded Random Forest", "Loaded XGBoost").
2) Verify model files exist under `models/`:
   - `models/iforest.joblib`
   - `models/random_forest.joblib`
   - `models/xgboost.joblib`
   - `models/metadata.json`
3) Send a test transaction with varied attributes (amount, channel, tx_type) and inspect `/recent-transactions` or WebSocket payloads for differing per-model scores.
4) If only one model is available and you want confidence variation, train/restore the missing models or adjust the disagreement thresholds in [app/scoring.py](app/scoring.py).

## Adjusting the band (optional)
- To make `MEDIUM`/`LOW` appear more often, lower the thresholds in the disagreement mapping.
- To be stricter, raise the thresholds (e.g., `HIGH` < 0.05, `MEDIUM` ≤ 0.15).

## Testing checklist
- Start API with all three models present; confirm logs show each model loading.
- POST a few diverse transactions; confirm `/recent-transactions` returns `confidence_level` and the UI shows colored badges.
- Confirm `tx_inserted`/`tx_updated` WebSocket messages include `confidence_level`.
