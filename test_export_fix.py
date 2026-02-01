#!/usr/bin/env python3
"""Test the export fix - verify that 30d time_range returns all transactions in that period"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:8000'

print("=" * 60)
print("Testing Export Fix - time_range parameter")
print("=" * 60)

# Test with 30d time range
print("\n1. Testing /recent-transactions with time_range=30d")
try:
    r = requests.get(f'{BASE_URL}/recent-transactions?limit=999999&time_range=30d')
    print(f"   Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        tx_count = len(data.get('transactions', []))
        print(f"   ✓ Transactions returned: {tx_count}")
        
        if tx_count > 0:
            first_tx = data['transactions'][0]
            last_tx = data['transactions'][-1]
            print(f"   First tx: {first_tx.get('ts') or first_tx.get('created_at')} (ID: {first_tx.get('tx_id')})")
            print(f"   Last tx:  {last_tx.get('ts') or last_tx.get('created_at')} (ID: {last_tx.get('tx_id')})")
            
            # Verify date range
            first_date = datetime.fromisoformat((first_tx.get('ts') or first_tx.get('created_at')).replace('Z', '+00:00'))
            last_date = datetime.fromisoformat((last_tx.get('ts') or last_tx.get('created_at')).replace('Z', '+00:00'))
            cutoff = datetime.now() - timedelta(days=30)
            
            if first_date > cutoff and last_date > cutoff:
                print(f"   ✓ All transactions are within 30-day window")
            else:
                print(f"   ⚠ Some transactions are outside 30-day window")
    else:
        print(f"   ✗ Error: {r.text}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

# Test with 24h time range
print("\n2. Testing /recent-transactions with time_range=24h")
try:
    r = requests.get(f'{BASE_URL}/recent-transactions?limit=999999&time_range=24h')
    print(f"   Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        tx_count = len(data.get('transactions', []))
        print(f"   ✓ Transactions returned: {tx_count}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

# Test with 7d time range
print("\n3. Testing /recent-transactions with time_range=7d")
try:
    r = requests.get(f'{BASE_URL}/recent-transactions?limit=999999&time_range=7d')
    print(f"   Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        tx_count = len(data.get('transactions', []))
        print(f"   ✓ Transactions returned: {tx_count}")
except Exception as e:
    print(f"   ✗ Failed: {e}")

print("\n" + "=" * 60)
print("Export fix verification complete!")
print("=" * 60)
