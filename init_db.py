#!/usr/bin/env python3
"""
Database initialization script for FDT
Creates all necessary tables and inserts demo data
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

DB_URL = os.getenv('DB_URL', 'postgresql://fdt:fdt_password@postgres:5432/fdt_db')

def init_database():
    """Initialize database with schema"""
    print("🔄 Initializing FDT database...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Read and execute schema file
        with open('/app/backend/init_schema.sql', 'r') as f:
            schema_sql = f.read()
        
        # Execute schema
        cur.execute(schema_sql)
        
        print("✅ Database schema created successfully")
        print("✅ Demo users created:")
        print("   - Rajesh Kumar: +919876543210 / password: password123")
        print("   - Priya Sharma: +919876543211 / password: password123")
        print("   - Amit Patel: +919876543212 / password: password123")
        
        cur.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

if __name__ == '__main__':
    success = init_database()
    sys.exit(0 if success else 1)
