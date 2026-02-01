#!/usr/bin/env python
"""Quick test of chatbot functionality"""
import os
from dotenv import load_dotenv
load_dotenv()

from app.chatbot import FraudDetectionChatbot

# Get DB URL
DB_URL = os.getenv("DB_URL", "postgresql://fdt:fdtpass@localhost:5432/fdt_db")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

print("=" * 60)
print("Testing Chatbot Functionality")
print("=" * 60)
print(f"DB_URL: {DB_URL}")
print(f"GROQ_API_KEY: {'SET' if GROQ_API_KEY else 'NOT SET'}")
print()

try:
    # Initialize chatbot
    print("Initializing chatbot...")
    chatbot = FraudDetectionChatbot(
        db_url=DB_URL,
        groq_api_key=GROQ_API_KEY
    )
    print(f"✓ Chatbot initialized successfully!")
    print(f"  AI Provider: {chatbot.ai_provider}")
    print(f"  Use AI: {chatbot.use_ai}")
    print()
    
    # Test chat
    print("Testing chat with message 'hello'...")
    result = chatbot.chat("hello", "24h")
    print("✓ Chat response received!")
    print()
    print("Response:")
    print("-" * 60)
    print(result.get("response", "No response"))
    print("-" * 60)
    print()
    print("Context used:")
    print(result.get("context_used", {}))
    print()
    print("✓ CHATBOT IS WORKING!")
    
except Exception as e:
    print(f"✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
