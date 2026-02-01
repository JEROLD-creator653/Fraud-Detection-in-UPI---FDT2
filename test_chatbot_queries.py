#!/usr/bin/env python
"""Test chatbot with various queries"""
import os
from dotenv import load_dotenv
load_dotenv()

from app.chatbot import FraudDetectionChatbot

# Get DB URL
DB_URL = os.getenv("DB_URL", "postgresql://fdt:fdtpass@localhost:5432/fdt_db")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize chatbot
chatbot = FraudDetectionChatbot(db_url=DB_URL, groq_api_key=GROQ_API_KEY)

test_queries = [
    "What's the fraud rate in the last 24 hours?",
    "Show me high-risk transactions",
    "Analyze last 5 transactions"
]

for i, query in enumerate(test_queries, 1):
    print(f"\n{'='*60}")
    print(f"TEST {i}: {query}")
    print('='*60)
    result = chatbot.chat(query, "24h")
    print(result.get("response", "No response"))
    print(f"\nContext: {result.get('context_used', {})}")
