-- FDT Database Schema
-- This script creates all necessary tables for the FDT application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 10000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- User devices table
CREATE TABLE IF NOT EXISTS user_devices (
    device_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT FALSE
);

-- Transactions table (enhanced)
CREATE TABLE IF NOT EXISTS transactions (
    tx_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id),
    device_id VARCHAR(100),
    ts TIMESTAMP NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    recipient_vpa VARCHAR(255) NOT NULL,
    tx_type VARCHAR(10) DEFAULT 'P2P',
    channel VARCHAR(20) DEFAULT 'app',
    risk_score DECIMAL(5, 4),
    action VARCHAR(20) DEFAULT 'ALLOW',
    db_status VARCHAR(20) DEFAULT 'pending',
    remarks TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
    alert_id SERIAL PRIMARY KEY,
    tx_id VARCHAR(100) REFERENCES transactions(tx_id),
    user_id VARCHAR(100) REFERENCES users(user_id),
    alert_type VARCHAR(50),
    risk_score DECIMAL(5, 4),
    reason TEXT,
    user_decision VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- User behavior profiles table
CREATE TABLE IF NOT EXISTS user_behavior (
    profile_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id),
    avg_transaction_amount DECIMAL(15, 2),
    transaction_count INTEGER DEFAULT 0,
    last_transaction_date TIMESTAMP,
    common_recipients TEXT[],
    common_transaction_times INTEGER[],
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Push notification tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id),
    fcm_token TEXT NOT NULL,
    device_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_tx_id ON fraud_alerts(tx_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Insert demo users for testing
INSERT INTO users (user_id, name, phone, email, password_hash, balance) 
VALUES 
    ('user_001', 'Rajesh Kumar', '+919876543210', 'rajesh@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpXw/6Nti', 25000.00),
    ('user_002', 'Priya Sharma', '+919876543211', 'priya@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpXw/6Nti', 15000.00),
    ('user_003', 'Amit Patel', '+919876543212', 'amit@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpXw/6Nti', 30000.00)
ON CONFLICT (user_id) DO NOTHING;

-- Insert demo devices
INSERT INTO user_devices (device_id, user_id, device_name, device_type, is_trusted) 
VALUES 
    ('device_001', 'user_001', 'Rajesh iPhone', 'iOS', TRUE),
    ('device_002', 'user_002', 'Priya Android', 'Android', TRUE),
    ('device_003', 'user_003', 'Amit Samsung', 'Android', TRUE)
ON CONFLICT (device_id) DO NOTHING;
