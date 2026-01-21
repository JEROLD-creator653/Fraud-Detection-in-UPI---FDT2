#!/usr/bin/env python3
"""Test chatbot API"""
import requests
import json

url = "http://localhost:8000/api/chatbot"
headers = {"Content-Type": "application/json"}

# Test 1: Basic greeting
payload = {
    "message": "hello",
    "time_range": "24h"
}

print("Testing chatbot endpoint...")
print(f"URL: {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")
print("\nResponse:")

try:
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
