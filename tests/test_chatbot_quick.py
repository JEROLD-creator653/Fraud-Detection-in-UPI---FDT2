import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Check if API key is loaded
api_key = os.getenv("GROQ_API_KEY")
print(f"GROQ_API_KEY: {api_key[:20] if api_key else 'NOT FOUND'}...")

# Test Groq import
try:
    from groq import Groq
    print("✓ Groq module imported successfully")
    
    # Test Groq client initialization
    client = Groq(api_key=api_key)
    print("✓ Groq client initialized successfully")
    
    # Test simple API call
    print("\nTesting Groq API call...")
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say 'Hello, I am working!'"}],
        max_tokens=50
    )
    print(f"✓ API Response: {response.choices[0].message.content}")
    print("\n✅ Groq API is working correctly!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nTroubleshooting:")
    print("1. Check your API key in .env file")
    print("2. Verify you have internet connection")
    print("3. Visit https://console.groq.com to check your API key status")
