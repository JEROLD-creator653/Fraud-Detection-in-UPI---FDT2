#!/usr/bin/env python3
"""Test all dashboard endpoints"""
import requests

endpoints = [
    '/dashboard-data?time_range=24h',
    '/recent-transactions?limit=50&time_range=24h',
    '/pattern-analytics?time_range=24h',
    '/model-accuracy',
]

print("Testing Dashboard Endpoints\n" + "="*50)
for endpoint in endpoints:
    try:
        r = requests.get(f'http://localhost:8000{endpoint}')
        print(f"✓ {endpoint:50} → {r.status_code}")
        if r.status_code != 200:
            print(f"  Error: {r.text[:200]}")
        else:
            data = r.json()
            if endpoint.endswith('recent-transactions?limit=50&time_range=24h'):
                print(f"  Transactions: {len(data.get('transactions', []))}")
            elif 'dashboard-data' in endpoint:
                stats = data.get('stats', {})
                print(f"  Stats: {stats}")
    except Exception as e:
        print(f"✗ {endpoint:50} → ERROR: {e}")

print("\n" + "="*50)
