import requests
import json

try:
    print("Testing /api/chatbot endpoint...")
    response = requests.post(
        'http://localhost:8000/api/chatbot',
        json={
            'message': 'What is the total number of transactions?',
            'time_range': '24h',
            'history': []
        },
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Chatbot Response:\n{data.get('response', 'No response')}")
    else:
        print(f"❌ Error Response: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("❌ Connection Error: Server not running on port 8000")
    print("Please start the server with: python -m uvicorn app.main:app --reload --port 8000")
except Exception as e:
    print(f"❌ Error: {e}")
