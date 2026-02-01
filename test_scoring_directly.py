#!/usr/bin/env python3
"""
Direct test of scoring module to check if it's working correctly.
"""
import sys
sys.path.insert(0, 'C:/Users/jerol/SEC/FDT/app')

from datetime import datetime, timezone
import scoring

# Test transaction
tx = {
    'tx_id': 'test123',
    'user_id': 'user1',
    'device_id': 'device1',
    'ts': datetime.now(timezone.utc).isoformat(),
    'amount': 5000,
    'recipient_vpa': 'merchant1@upi',
    'tx_type': 'P2M',
    'channel': 'web'
}

print('=' * 80)
print('Testing Scoring Module Directly')
print('=' * 80)

print('\n1. Loading models...')
scoring.load_models()

print('\n2. Extracting features...')
features = scoring.extract_features(tx)
print(f'   Extracted {len(features)} features')
print(f'   Sample features: amount={features.get("amount")}, is_night={features.get("is_night")}, tx_count_1h={features.get("tx_count_1h")}')

print('\n3. Scoring transaction...')
result = scoring.score_transaction(tx, return_details=True)

print('\n4. Results:')
print(f'   Risk score: {result.get("risk_score")}')
print(f'   Final risk score: {result.get("final_risk_score")}')
print(f'   Confidence: {result.get("confidence_level")}')
print(f'   Disagreement: {result.get("disagreement")}')
print(f'   Model scores: {result.get("model_scores")}')
print(f'   Reasons: {result.get("reasons")}')

print('\n' + '=' * 80)
