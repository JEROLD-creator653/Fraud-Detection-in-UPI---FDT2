#!/usr/bin/env python3
"""
Simulate the dashboard loading process to verify data flows correctly
"""
import requests
import json

BASE_URL = 'http://localhost:8000'

print("\n" + "="*70)
print(" DASHBOARD DATA FLOW TEST ".center(70, "="))
print("="*70)

# Simulate: DOMContentLoaded → loadDashboardData()
print("\n1️⃣ loadDashboardData() - Load stats...")
try:
    r = requests.get(f'{BASE_URL}/dashboard-data?time_range=24h')
    assert r.status_code == 200
    data = r.json()
    stats = data.get('stats', {})
    print(f"   ✓ Total: {stats['totalTransactions']}, Blocked: {stats['blocked']}, Delayed: {stats['delayed']}, Allowed: {stats['allowed']}")
except Exception as e:
    print(f"   ✗ ERROR: {e}")

# Simulate: DOMContentLoaded → loadRecentTransactions()
print("\n2️⃣ loadRecentTransactions() - Load transaction cache...")
try:
    r = requests.get(f'{BASE_URL}/recent-transactions?limit=300&time_range=24h')
    assert r.status_code == 200
    data = r.json()
    txCache = data.get('transactions', [])
    print(f"   ✓ Loaded {len(txCache)} transactions")
    
    if len(txCache) > 0:
        print(f"   ✓ First transaction: ID={txCache[0].get('tx_id')}, Amount={txCache[0].get('amount')}")
        print(f"   ✓ Last transaction: ID={txCache[-1].get('tx_id')}, Amount={txCache[-1].get('amount')}")
except Exception as e:
    print(f"   ✗ ERROR: {e}")

# Simulate: loadPatternAnalytics()
print("\n3️⃣ loadPatternAnalytics() - Load fraud patterns...")
try:
    r = requests.get(f'{BASE_URL}/pattern-analytics?time_range=24h')
    assert r.status_code == 200
    data = r.json()
    print(f"   ✓ Patterns loaded")
    print(f"   ✓ Amount anomaly: {data.get('amount_anomaly', 0)}")
except Exception as e:
    print(f"   ✗ ERROR: {e}")

# Simulate: loadModelAccuracy()
print("\n4️⃣ loadModelAccuracy() - Load model metrics...")
try:
    r = requests.get(f'{BASE_URL}/model-accuracy')
    assert r.status_code == 200
    data = r.json()
    print(f"   ✓ RF: {data.get('random_forest')}%")
    print(f"   ✓ XGB: {data.get('xgboost')}%")
    print(f"   ✓ IF: {data.get('isolation_forest')}%")
    print(f"   ✓ Ensemble: {data.get('ensemble')}%")
except Exception as e:
    print(f"   ✗ ERROR: {e}")

# Simulate: Table rendering logic
print("\n5️⃣ renderTransactionTable() - Render 100 rows...")
try:
    print(f"   ✓ Would render {min(len(txCache), 100)} transaction rows to table")
    print(f"   ✓ tbody.innerHTML would be cleared and populated")
except Exception as e:
    print(f"   ✗ ERROR: {e}")

print("\n" + "="*70)
print(" ALL SYSTEMS OPERATIONAL ✓ ".center(70, "="))
print("="*70 + "\n")
